-- ============================================================================
-- 10-9 · Sistema de notificaciones in-app (estilo Instagram)
--
-- Una sola tabla `notifications` agrega TODOS los tipos de actividad relevante
-- para el usuario. Triggers automáticos en likes, comments, follows, predictions,
-- suspensions y level-ups insertan las notis sin que la app tenga que hacer
-- llamadas extra.
--
-- Tipos definidos:
--   - like_publication          : alguien likeó tu publicación
--   - like_comment              : alguien likeó tu comentario
--   - comment_on_publication    : alguien comentó tu publicación
--   - new_follower              : nuevo seguidor
--   - prediction_resolved       : se resolvió una predicción tuya (con XP)
--   - suspension_received       : un admin te suspendió de un chat
--   - suspension_lifted         : un admin te levantó la suspensión
--   - level_up                  : subiste de nivel
--   - group_invite              : (futuro) invitación a grupo
--
-- Para mantener el sistema extensible, `type` es text libre y `payload` es jsonb.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Tabla notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    actor_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    type        text        NOT NULL,
    payload     jsonb       NOT NULL DEFAULT '{}'::jsonb,
    read_at     timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_all
    ON public.notifications (user_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2. Helper: create_notification
--    Punto único de inserción. Aplica reglas:
--      - No se notifica a uno mismo (user_id = actor_id → noop).
--      - Si user_id no existe, falla silencioso.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id   uuid,
    p_actor_id  uuid,
    p_type      text,
    p_payload   jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    IF p_user_id IS NULL THEN RETURN NULL; END IF;
    IF p_actor_id IS NOT NULL AND p_user_id = p_actor_id THEN RETURN NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN RETURN NULL; END IF;

    INSERT INTO public.notifications (user_id, actor_id, type, payload)
    VALUES (p_user_id, p_actor_id, p_type, p_payload)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. RLS
--    Cada usuario solo ve / actualiza / borra sus propias notificaciones.
--    Inserts: solo via create_notification (SECURITY DEFINER).
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
    ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
    ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Realtime
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Vista enriquecida: trae datos del actor para mostrar sin queries extra
--
--    security_invoker = true es OBLIGATORIO. Sin esa opción la vista corre con
--    los permisos de su dueño y se saltea el RLS de `notifications`, con lo cual
--    devolvería las notificaciones de TODOS los usuarios (el cliente consulta
--    esta vista sin filtrar por user_id: confía en RLS).
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.notifications_enriched;
CREATE VIEW public.notifications_enriched
WITH (security_invoker = true) AS
SELECT
    n.id,
    n.user_id,
    n.actor_id,
    n.type,
    n.payload,
    n.read_at,
    n.created_at,
    p.display_name AS actor_display_name,
    p.avatar_url   AS actor_avatar_url
FROM public.notifications n
LEFT JOIN public.profiles p ON p.id = n.actor_id;

-- ============================================================================
-- TRIGGERS POR EVENTO
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1 Like en publicación → notificar al author
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_publication_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_author_id uuid;
    v_title     text;
BEGIN
    SELECT user_id, title INTO v_author_id, v_title
    FROM public.publications WHERE id = NEW.publication_id;

    IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN
        RETURN NEW;
    END IF;

    PERFORM public.create_notification(
        v_author_id,
        NEW.user_id,
        'like_publication',
        jsonb_build_object('publication_id', NEW.publication_id, 'publication_title', v_title)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_publication_like ON public.publication_likes;
CREATE TRIGGER trg_notif_publication_like
    AFTER INSERT ON public.publication_likes
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_publication_like();

-- ----------------------------------------------------------------------------
-- 6.2 Like en comentario → notificar al author del comentario
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_comment_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_author_id    uuid;
    v_excerpt      text;
    v_post_id      uuid;
BEGIN
    SELECT user_id, LEFT(content, 80), post_id
      INTO v_author_id, v_excerpt, v_post_id
    FROM public.comments WHERE id = NEW.comment_id;

    IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN
        RETURN NEW;
    END IF;

    PERFORM public.create_notification(
        v_author_id,
        NEW.user_id,
        'like_comment',
        jsonb_build_object(
            'comment_id', NEW.comment_id,
            'publication_id', v_post_id,
            'comment_excerpt', v_excerpt
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_comment_like ON public.comment_likes;
CREATE TRIGGER trg_notif_comment_like
    AFTER INSERT ON public.comment_likes
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_comment_like();

-- ----------------------------------------------------------------------------
-- 6.3 Nuevo comentario en publicación → notificar al author
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_new_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pub_author uuid;
    v_pub_title  text;
BEGIN
    SELECT user_id, title INTO v_pub_author, v_pub_title
    FROM public.publications WHERE id = NEW.post_id;

    IF v_pub_author IS NULL OR v_pub_author = NEW.user_id THEN
        RETURN NEW;
    END IF;

    PERFORM public.create_notification(
        v_pub_author,
        NEW.user_id,
        'comment_on_publication',
        jsonb_build_object(
            'comment_id', NEW.id,
            'publication_id', NEW.post_id,
            'publication_title', v_pub_title,
            'comment_excerpt', LEFT(NEW.content, 80)
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_new_comment ON public.comments;
CREATE TRIGGER trg_notif_new_comment
    AFTER INSERT ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_comment();

-- ----------------------------------------------------------------------------
-- 6.4 Nuevo follower → notificar al seguido
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_new_follower()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.create_notification(
        NEW.following_id,
        NEW.follower_id,
        'new_follower',
        '{}'::jsonb
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_new_follower ON public.follows;
CREATE TRIGGER trg_notif_new_follower
    AFTER INSERT ON public.follows
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_follower();

-- ----------------------------------------------------------------------------
-- 6.5 Predicción resuelta → notificar al predictor (con XP ganada)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_prediction_resolved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_f1_name text;
    v_f2_name text;
    v_event_name text;
BEGIN
    -- Solo cuando recién se resuelve (transición null → not null)
    IF NEW.resolved_at IS NULL OR OLD.resolved_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT fighter1_name, fighter2_name, event_name
      INTO v_f1_name, v_f2_name, v_event_name
    FROM public.fights WHERE id = NEW.fight_id;

    PERFORM public.create_notification(
        NEW.user_id,
        NULL,  -- sistema
        'prediction_resolved',
        jsonb_build_object(
            'fight_id', NEW.fight_id,
            'xp_awarded', NEW.xp_awarded,
            'is_winner_correct', NEW.is_winner_correct,
            'is_method_correct', NEW.is_method_correct,
            'is_round_correct', NEW.is_round_correct,
            'fighter1_name', v_f1_name,
            'fighter2_name', v_f2_name,
            'event_name', v_event_name
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_prediction_resolved ON public.predictions;
CREATE TRIGGER trg_notif_prediction_resolved
    AFTER UPDATE ON public.predictions
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_prediction_resolved();

-- ----------------------------------------------------------------------------
-- 6.6 Suspensión recibida → notificar al usuario
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_suspension_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_channel_name text;
BEGIN
    IF NEW.channel_id IS NOT NULL THEN
        SELECT name INTO v_channel_name FROM public.chat_channels WHERE id = NEW.channel_id;
    END IF;

    PERFORM public.create_notification(
        NEW.user_id,
        NEW.suspended_by,
        'suspension_received',
        jsonb_build_object(
            'suspension_id', NEW.id,
            'channel_id', NEW.channel_id,
            'channel_name', v_channel_name,
            'expires_at', NEW.expires_at,
            'reason', NEW.reason
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_suspension_received ON public.chat_suspensions;
CREATE TRIGGER trg_notif_suspension_received
    AFTER INSERT ON public.chat_suspensions
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_suspension_received();

-- ----------------------------------------------------------------------------
-- 6.7 Suspensión levantada → notificar al usuario
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_suspension_lifted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_channel_name text;
BEGIN
    IF OLD.lifted_at IS NOT NULL OR NEW.lifted_at IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.channel_id IS NOT NULL THEN
        SELECT name INTO v_channel_name FROM public.chat_channels WHERE id = NEW.channel_id;
    END IF;

    PERFORM public.create_notification(
        NEW.user_id,
        NEW.lifted_by,
        'suspension_lifted',
        jsonb_build_object(
            'suspension_id', NEW.id,
            'channel_id', NEW.channel_id,
            'channel_name', v_channel_name
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_suspension_lifted ON public.chat_suspensions;
CREATE TRIGGER trg_notif_suspension_lifted
    AFTER UPDATE ON public.chat_suspensions
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_suspension_lifted();

-- ----------------------------------------------------------------------------
-- 6.8 Level up → notificar al usuario cuando sube de nivel
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_level_up()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_level_names constant text[] := ARRAY[
        'Amateur','Prospecto','Local Card','Co-Main','Main Event',
        'Ranked','Top 10','Top 5','Contender','Champion'
    ];
BEGIN
    IF COALESCE(NEW.level, 0) <= COALESCE(OLD.level, 0) THEN
        RETURN NEW;
    END IF;

    PERFORM public.create_notification(
        NEW.id,
        NULL,
        'level_up',
        jsonb_build_object(
            'new_level', NEW.level,
            'new_name', v_level_names[NEW.level],
            'xp', NEW.xp
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_level_up ON public.profiles;
CREATE TRIGGER trg_notif_level_up
    AFTER UPDATE OF level ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_level_up();

-- ============================================================================
-- 7. RPC para operaciones del usuario
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count int;
BEGIN
    UPDATE public.notifications
       SET read_at = now()
     WHERE user_id = auth.uid()
       AND read_at IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;
