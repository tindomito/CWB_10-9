-- ============================================================================
-- 10-9 · Sub-canales del chat global
--
-- Convierte "Peleas en Vivo" en un GRUPO (label sin mensajes propios) y agrega
-- 4 hijos: UFC, PFL, Boxeo, ONE. Cada hijo es un canal completo independiente
-- (con su propio rate limit, su propio admin_override, etc.).
--
-- Reglas:
--   - Un canal con is_group=true NO acepta mensajes directos (sirve solo como
--     agrupador visual en la UI).
--   - parent_id apunta al canal grupo. NULL = canal de primer nivel.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Nuevas columnas
-- ----------------------------------------------------------------------------
ALTER TABLE public.chat_channels
    ADD COLUMN IF NOT EXISTS parent_id text REFERENCES public.chat_channels(id) ON DELETE SET NULL;

ALTER TABLE public.chat_channels
    ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chat_channels_parent ON public.chat_channels (parent_id);

-- ----------------------------------------------------------------------------
-- 2. Migrar mensajes existentes en 'live-fights' (si los hay) a 'live-ufc'
--    Tiene que correr ANTES de marcar live-fights como is_group.
-- ----------------------------------------------------------------------------
-- Primero crear los 4 hijos (sin mensajes todavía)
INSERT INTO public.chat_channels (id, name, description, weekend_only, sort_order, parent_id, is_group)
VALUES
    ('live-ufc',   'UFC',   'Peleas UFC en vivo. Solo fines de semana.',                true, 3, 'live-fights', false),
    ('live-pfl',   'PFL',   'Peleas PFL en vivo. Solo fines de semana.',                true, 4, 'live-fights', false),
    ('live-boxeo', 'Boxeo', 'Combates de boxeo en vivo. Solo fines de semana.',         true, 5, 'live-fights', false),
    ('live-one',   'ONE',   'Peleas ONE Championship en vivo. Solo fines de semana.',   true, 6, 'live-fights', false)
ON CONFLICT (id) DO UPDATE SET
    name         = EXCLUDED.name,
    description  = EXCLUDED.description,
    weekend_only = EXCLUDED.weekend_only,
    sort_order   = EXCLUDED.sort_order,
    parent_id    = EXCLUDED.parent_id,
    is_group     = EXCLUDED.is_group;

-- Mover mensajes huérfanos que apuntaran a 'live-fights' → 'live-ufc' (default)
UPDATE public.global_chat_messages
   SET channel_id = 'live-ufc'
 WHERE channel_id = 'live-fights';

-- ----------------------------------------------------------------------------
-- 3. Promover 'live-fights' a GRUPO (deja de aceptar mensajes directos)
-- ----------------------------------------------------------------------------
UPDATE public.chat_channels
   SET is_group    = true,
       name        = 'Peleas en Vivo',
       description = 'Carteleras de combate por liga. Elegí una para discutir en vivo.',
       weekend_only = true,
       sort_order  = 2
 WHERE id = 'live-fights';

-- ----------------------------------------------------------------------------
-- 4. Modificar validate_chat_message: rechazar mensajes a canales grupo
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_channel            public.chat_channels%ROWTYPE;
    v_is_admin           boolean;
    v_rate_limit         integer;
    v_last_message_time  timestamptz;
BEGIN
    -- Cargar canal una sola vez para los checks
    SELECT * INTO v_channel FROM public.chat_channels WHERE id = NEW.channel_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Canal % no existe', NEW.channel_id
            USING ERRCODE = 'check_violation';
    END IF;

    -- 0a) Canal grupo: no se puede postear directamente
    IF v_channel.is_group THEN
        RAISE EXCEPTION 'No se puede enviar mensajes a un canal grupo. Elegí una sub-categoría.'
            USING ERRCODE = 'check_violation';
    END IF;

    -- 0b) ¿Está suspendido?
    IF public.is_user_suspended(NEW.user_id, NEW.channel_id) THEN
        RAISE EXCEPTION 'Estás suspendido en este canal'
            USING ERRCODE = 'check_violation';
    END IF;

    -- 1) Canal abierto
    IF NOT public.is_channel_open(NEW.channel_id) THEN
        RAISE EXCEPTION 'El canal "%" está cerrado en este momento', NEW.channel_id
            USING ERRCODE = 'check_violation';
    END IF;

    -- 2) Rate limit (skip para admins)
    SELECT COALESCE(pro, false) INTO v_is_admin
    FROM public.profiles WHERE id = NEW.user_id;

    IF NOT COALESCE(v_is_admin, false) THEN
        v_rate_limit := v_channel.rate_limit_seconds;

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
