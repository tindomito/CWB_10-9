-- ============================================================================
-- 10-9 · Social en rankings: likes + comentarios
--
-- Da a los rankings publicados las funcionalidades básicas de las publicaciones:
--   · Likes (tabla ranking_likes, reusa el servicio likes.js con target 'ranking')
--   · Comentarios (tabla ranking_comments + vista)
--   · Notificaciones al autor (like_ranking / comment_on_ranking)
--
-- NOTA: sin XP para rankings (evita farmeo y no fue pedido). "Guardar" y
-- "Compartir" quedan como placeholders en la UI (igual que en publicaciones).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. ranking_likes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ranking_likes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    ranking_id  uuid NOT NULL REFERENCES public.fighter_rankings(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, ranking_id)
);

CREATE INDEX IF NOT EXISTS idx_ranking_likes_ranking ON public.ranking_likes (ranking_id);
CREATE INDEX IF NOT EXISTS idx_ranking_likes_user    ON public.ranking_likes (user_id);

ALTER TABLE public.ranking_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ranking_likes_select_all" ON public.ranking_likes;
CREATE POLICY "ranking_likes_select_all" ON public.ranking_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "ranking_likes_insert_own" ON public.ranking_likes;
CREATE POLICY "ranking_likes_insert_own" ON public.ranking_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ranking_likes_delete_own" ON public.ranking_likes;
CREATE POLICY "ranking_likes_delete_own" ON public.ranking_likes
    FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. ranking_comments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ranking_comments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ranking_id  uuid NOT NULL REFERENCES public.fighter_rankings(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content     text NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ranking_comments_ranking ON public.ranking_comments (ranking_id, created_at);

ALTER TABLE public.ranking_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ranking_comments_select_all" ON public.ranking_comments;
CREATE POLICY "ranking_comments_select_all" ON public.ranking_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "ranking_comments_insert_own" ON public.ranking_comments;
CREATE POLICY "ranking_comments_insert_own" ON public.ranking_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Borrar: el autor del comentario, o un admin (profiles.pro = true)
DROP POLICY IF EXISTS "ranking_comments_delete_own_or_admin" ON public.ranking_comments;
CREATE POLICY "ranking_comments_delete_own_or_admin" ON public.ranking_comments
    FOR DELETE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND COALESCE(profiles.pro, false) = true
        )
    );

-- ----------------------------------------------------------------------------
-- 3. Vista de comentarios con datos del autor
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.ranking_comments_with_users;
CREATE VIEW public.ranking_comments_with_users
WITH (security_invoker = true)
AS
SELECT
    c.id,
    c.ranking_id,
    c.user_id,
    c.content,
    c.created_at,
    p.display_name,
    p.avatar_url,
    COALESCE(p.pro, false) AS is_admin
FROM public.ranking_comments c
LEFT JOIN public.profiles p ON p.id = c.user_id;

-- ----------------------------------------------------------------------------
-- 4. Realtime
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND tablename = 'ranking_likes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ranking_likes;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND tablename = 'ranking_comments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ranking_comments;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Notificaciones (like_ranking / comment_on_ranking)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_notify_ranking_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_author_id uuid;
    v_division  text;
BEGIN
    SELECT user_id, division INTO v_author_id, v_division
    FROM public.fighter_rankings WHERE id = NEW.ranking_id;

    IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN
        RETURN NEW;
    END IF;

    PERFORM public.create_notification(
        v_author_id,
        NEW.user_id,
        'like_ranking',
        jsonb_build_object('ranking_id', NEW.ranking_id, 'division', v_division)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_ranking_like ON public.ranking_likes;
CREATE TRIGGER trg_notif_ranking_like
    AFTER INSERT ON public.ranking_likes
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_ranking_like();

CREATE OR REPLACE FUNCTION public.trg_notify_ranking_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_author_id uuid;
    v_division  text;
BEGIN
    SELECT user_id, division INTO v_author_id, v_division
    FROM public.fighter_rankings WHERE id = NEW.ranking_id;

    IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN
        RETURN NEW;
    END IF;

    PERFORM public.create_notification(
        v_author_id,
        NEW.user_id,
        'comment_on_ranking',
        jsonb_build_object(
            'ranking_id', NEW.ranking_id,
            'division', v_division,
            'comment_excerpt', LEFT(NEW.content, 80)
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_ranking_comment ON public.ranking_comments;
CREATE TRIGGER trg_notif_ranking_comment
    AFTER INSERT ON public.ranking_comments
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_ranking_comment();
