-- ============================================================================
-- Rediseño de chat global: canales múltiples + rate limit + admin override
-- Versión idempotente robusta — soporta tablas chat_channels pre-existentes.
-- Ejecutar en Supabase SQL editor (de una sola pasada).
-- ============================================================================

-- 1. Crear tabla si no existe (mínimo)
CREATE TABLE IF NOT EXISTS public.chat_channels (
    id text PRIMARY KEY
);

-- 2. Normalizar columnas (sirve aun si la tabla ya existía con otro esquema)
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS name               text;
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS description        text;
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS weekend_only       boolean     NOT NULL DEFAULT false;
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS rate_limit_seconds integer     NOT NULL DEFAULT 15;
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS sort_order         integer     NOT NULL DEFAULT 0;
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS created_at         timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS updated_at         timestamptz NOT NULL DEFAULT now();

-- admin_override: si quedó con tipo incorrecto (p.ej. boolean), recrearla como text
DO $$
DECLARE
    v_type text;
BEGIN
    SELECT data_type INTO v_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_channels'
      AND column_name = 'admin_override';

    IF v_type IS NOT NULL AND v_type <> 'text' THEN
        EXECUTE 'ALTER TABLE public.chat_channels DROP COLUMN admin_override';
    END IF;
END $$;

ALTER TABLE public.chat_channels
    ADD COLUMN IF NOT EXISTS admin_override text NOT NULL DEFAULT 'auto';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chat_channels_admin_override_check'
    ) THEN
        ALTER TABLE public.chat_channels
            ADD CONSTRAINT chat_channels_admin_override_check
            CHECK (admin_override IN ('auto', 'open', 'closed'));
    END IF;
END $$;

UPDATE public.chat_channels SET name = id WHERE name IS NULL;
ALTER TABLE public.chat_channels ALTER COLUMN name SET NOT NULL;

-- 3. Seed de canales (UPSERT — actualiza si ya existían con otra config)
INSERT INTO public.chat_channels (id, name, description, weekend_only, sort_order)
VALUES
    ('global',      'Chat Global',     'Conecta con la comunidad MMA en cualquier momento.',          false, 1),
    ('live-fights', 'Peleas en Vivo',  'Solo abierto los sábados y domingos. Para discutir cards en directo.', true,  2)
ON CONFLICT (id) DO UPDATE SET
    name         = EXCLUDED.name,
    description  = EXCLUDED.description,
    weekend_only = EXCLUDED.weekend_only,
    sort_order   = EXCLUDED.sort_order;

-- 4. Agregar channel_id a global_chat_messages
ALTER TABLE public.global_chat_messages
    ADD COLUMN IF NOT EXISTS channel_id text NOT NULL DEFAULT 'global'
        REFERENCES public.chat_channels(id);

CREATE INDEX IF NOT EXISTS idx_global_chat_messages_channel
    ON public.global_chat_messages (channel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_global_chat_messages_user_channel
    ON public.global_chat_messages (user_id, channel_id, created_at DESC);

-- 5. Función: ¿el canal está abierto en este momento?
CREATE OR REPLACE FUNCTION public.is_channel_open(p_channel_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_channel  public.chat_channels%ROWTYPE;
    v_natural  boolean;
    v_dow      integer;
BEGIN
    SELECT * INTO v_channel FROM public.chat_channels WHERE id = p_channel_id;
    IF NOT FOUND THEN RETURN false; END IF;

    IF v_channel.weekend_only THEN
        v_dow := EXTRACT(DOW FROM (now() AT TIME ZONE 'America/Argentina/Buenos_Aires'))::int;
        v_natural := v_dow IN (0, 6); -- 0 = domingo, 6 = sábado
    ELSE
        v_natural := true;
    END IF;

    IF v_channel.admin_override = 'open' THEN RETURN true;
    ELSIF v_channel.admin_override = 'closed' THEN RETURN false;
    ELSE RETURN v_natural;
    END IF;
END;
$$;

-- 6. Trigger: validar canal abierto + rate limit antes de insertar mensaje
CREATE OR REPLACE FUNCTION public.validate_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin           boolean;
    v_rate_limit         integer;
    v_last_message_time  timestamptz;
BEGIN
    IF NOT public.is_channel_open(NEW.channel_id) THEN
        RAISE EXCEPTION 'El canal "%" está cerrado en este momento', NEW.channel_id
            USING ERRCODE = 'check_violation';
    END IF;

    SELECT COALESCE(pro, false) INTO v_is_admin
    FROM public.profiles WHERE id = NEW.user_id;

    IF NOT COALESCE(v_is_admin, false) THEN
        SELECT rate_limit_seconds INTO v_rate_limit
        FROM public.chat_channels WHERE id = NEW.channel_id;

        SELECT MAX(created_at) INTO v_last_message_time
        FROM public.global_chat_messages
        WHERE user_id = NEW.user_id AND channel_id = NEW.channel_id;

        IF v_last_message_time IS NOT NULL
           AND (now() - v_last_message_time) < make_interval(secs => v_rate_limit) THEN
            RAISE EXCEPTION 'Esperá % segundos entre mensajes', v_rate_limit
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_chat_message ON public.global_chat_messages;
CREATE TRIGGER trg_validate_chat_message
    BEFORE INSERT ON public.global_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_chat_message();

-- 7. Trigger: mantener updated_at en chat_channels
CREATE OR REPLACE FUNCTION public.touch_chat_channel_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_chat_channel_updated_at ON public.chat_channels;
CREATE TRIGGER trg_touch_chat_channel_updated_at
    BEFORE UPDATE ON public.chat_channels
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_chat_channel_updated_at();

-- 8. Vista chat_messages_with_users incluyendo channel_id
DROP VIEW IF EXISTS public.chat_messages_with_users;
CREATE VIEW public.chat_messages_with_users AS
SELECT
    m.id,
    m.user_id,
    m.content,
    m.created_at,
    m.channel_id,
    p.display_name,
    p.avatar_url,
    COALESCE(p.pro, false) AS is_admin
FROM public.global_chat_messages m
LEFT JOIN public.profiles p ON p.id = m.user_id;

-- 9. RLS para chat_channels
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_channels_select_all" ON public.chat_channels;
CREATE POLICY "chat_channels_select_all"
    ON public.chat_channels FOR SELECT USING (true);

DROP POLICY IF EXISTS "chat_channels_update_admin" ON public.chat_channels;
CREATE POLICY "chat_channels_update_admin"
    ON public.chat_channels FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND COALESCE(profiles.pro, false) = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND COALESCE(profiles.pro, false) = true
        )
    );

-- 10. Habilitar Realtime para chat_channels
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_channels'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
    END IF;
END $$;
