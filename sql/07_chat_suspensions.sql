-- ============================================================================
-- 10-9 · Suspensiones de chat (moderación admin)
--
-- Permite a un admin silenciar a un usuario en un canal específico o en TODOS
-- los chats globales, por una cantidad de tiempo configurable o de forma
-- permanente. La suspensión bloquea solo el INSERT de mensajes; el usuario
-- sigue pudiendo LEER el chat.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla chat_suspensions
--    channel_id NULL = aplica a TODOS los canales
--    expires_at NULL = permanente (hasta que un admin la levante)
--    lifted_at NOT NULL = ya no está activa (sigue como histórico/auditoría)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_suspensions (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel_id      text        REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    suspended_by    uuid        REFERENCES public.profiles(id),
    reason          text,
    started_at      timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz,
    lifted_at       timestamptz,
    lifted_by       uuid        REFERENCES public.profiles(id),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_suspensions_user_active
    ON public.chat_suspensions (user_id)
    WHERE lifted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_suspensions_channel
    ON public.chat_suspensions (channel_id)
    WHERE lifted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 2. Función: ¿el usuario está suspendido (en este canal)?
--    Considera suspensiones globales (channel_id NULL) + por canal.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_user_suspended(
    p_user_id    uuid,
    p_channel_id text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.chat_suspensions
         WHERE user_id = p_user_id
           AND (channel_id IS NULL OR channel_id = p_channel_id)
           AND lifted_at IS NULL
           AND (expires_at IS NULL OR expires_at > now())
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Modificar validate_chat_message: chequear suspensión PRIMERO.
--    El resto de la lógica (canal abierto + rate limit) se mantiene igual.
-- ----------------------------------------------------------------------------
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
    -- 0) ¿Está suspendido?
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

-- (El trigger ya está creado en sql/01, no hay que recrearlo)

-- ----------------------------------------------------------------------------
-- 4. RPC: admin_suspend_user
--    p_channel_id NULL = todos los canales
--    p_duration_minutes NULL = permanente
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_suspend_user(
    p_user_id           uuid,
    p_channel_id        text DEFAULT NULL,
    p_duration_minutes  int  DEFAULT NULL,
    p_reason            text DEFAULT NULL
)
RETURNS public.chat_suspensions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin       boolean;
    v_target_is_admin boolean;
    v_expires        timestamptz;
    v_row            public.chat_suspensions%ROWTYPE;
BEGIN
    SELECT COALESCE(pro, false) INTO v_is_admin
      FROM public.profiles WHERE id = auth.uid();
    IF NOT COALESCE(v_is_admin, false) THEN
        RAISE EXCEPTION 'Solo admins pueden suspender usuarios';
    END IF;

    -- No suspenderse a uno mismo
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'No te podés suspender a vos mismo';
    END IF;

    -- No suspender a otros admins
    SELECT COALESCE(pro, false) INTO v_target_is_admin
      FROM public.profiles WHERE id = p_user_id;
    IF COALESCE(v_target_is_admin, false) THEN
        RAISE EXCEPTION 'No se puede suspender a otro admin';
    END IF;

    -- Validar canal si se especifica
    IF p_channel_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.chat_channels WHERE id = p_channel_id
    ) THEN
        RAISE EXCEPTION 'Canal % no existe', p_channel_id;
    END IF;

    IF p_duration_minutes IS NOT NULL AND p_duration_minutes > 0 THEN
        v_expires := now() + make_interval(mins => p_duration_minutes);
    ELSE
        v_expires := NULL;  -- permanente
    END IF;

    INSERT INTO public.chat_suspensions (
        user_id, channel_id, suspended_by, reason, expires_at
    ) VALUES (
        p_user_id, p_channel_id, auth.uid(), p_reason, v_expires
    )
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC: admin_lift_suspension
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_lift_suspension(p_suspension_id uuid)
RETURNS public.chat_suspensions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin boolean;
    v_row      public.chat_suspensions%ROWTYPE;
BEGIN
    SELECT COALESCE(pro, false) INTO v_is_admin
      FROM public.profiles WHERE id = auth.uid();
    IF NOT COALESCE(v_is_admin, false) THEN
        RAISE EXCEPTION 'Solo admins';
    END IF;

    UPDATE public.chat_suspensions
       SET lifted_at = now(),
           lifted_by = auth.uid()
     WHERE id = p_suspension_id
       AND lifted_at IS NULL
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Suspensión no encontrada o ya estaba levantada';
    END IF;

    RETURN v_row;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Vista: suspensiones activas con datos joineados
--    Solo se llena para admins (ver RLS abajo).
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.chat_active_suspensions;
CREATE VIEW public.chat_active_suspensions AS
SELECT
    s.id,
    s.user_id,
    s.channel_id,
    s.suspended_by,
    s.reason,
    s.started_at,
    s.expires_at,
    s.created_at,
    p.display_name      AS user_display_name,
    p.avatar_url        AS user_avatar_url,
    ab.display_name     AS suspended_by_display_name,
    c.name              AS channel_name
FROM public.chat_suspensions s
LEFT JOIN public.profiles      p  ON p.id  = s.user_id
LEFT JOIN public.profiles      ab ON ab.id = s.suspended_by
LEFT JOIN public.chat_channels c  ON c.id  = s.channel_id
WHERE s.lifted_at IS NULL
  AND (s.expires_at IS NULL OR s.expires_at > now())
ORDER BY s.created_at DESC;

-- ----------------------------------------------------------------------------
-- 7. RLS
--    - Usuario: puede ver SUS PROPIAS suspensiones activas (para que la UI
--      pueda mostrar el banner explicativo).
--    - Admin (profiles.pro = true): puede ver TODAS las suspensiones.
--    - Modificaciones: solo vía RPC SECURITY DEFINER (admin_suspend_user /
--      admin_lift_suspension).
-- ----------------------------------------------------------------------------
ALTER TABLE public.chat_suspensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_suspensions_select_own_or_admin" ON public.chat_suspensions;
CREATE POLICY "chat_suspensions_select_own_or_admin"
    ON public.chat_suspensions FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
             WHERE profiles.id = auth.uid()
               AND COALESCE(profiles.pro, false) = true
        )
    );

-- ----------------------------------------------------------------------------
-- 8. Realtime
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND tablename = 'chat_suspensions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_suspensions;
    END IF;
END $$;
