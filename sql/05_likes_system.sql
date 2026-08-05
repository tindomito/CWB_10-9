-- ============================================================================
-- 10-9 · Sistema de likes en publicaciones y comentarios
-- Cumple definitivamente sec 3.5 del PDF:
--   - Recibir like en publicación propia: +1 XP (cap 15/día)
--   - Comentario con engagement (>3 likes = 4+): +2 XP (cap 10/día), una sola vez
--
-- Reemplaza el trigger temporal "+2 XP al crear comentario" por uno basado en
-- engagement real, según especifica el PDF.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla publication_likes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publication_likes (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
    publication_id  uuid        NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, publication_id)
);

CREATE INDEX IF NOT EXISTS idx_pub_likes_pub  ON public.publication_likes (publication_id);
CREATE INDEX IF NOT EXISTS idx_pub_likes_user ON public.publication_likes (user_id);

-- ----------------------------------------------------------------------------
-- 2. Tabla comment_likes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comment_likes (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment_id  uuid        NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON public.comment_likes (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user    ON public.comment_likes (user_id);

-- ----------------------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.publication_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes     ENABLE ROW LEVEL SECURITY;

-- publication_likes: lectura pública (necesario para count y "lo di yo")
DROP POLICY IF EXISTS "publication_likes_select_all" ON public.publication_likes;
CREATE POLICY "publication_likes_select_all" ON public.publication_likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "publication_likes_insert_own" ON public.publication_likes;
CREATE POLICY "publication_likes_insert_own" ON public.publication_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "publication_likes_delete_own" ON public.publication_likes;
CREATE POLICY "publication_likes_delete_own" ON public.publication_likes
    FOR DELETE USING (auth.uid() = user_id);

-- comment_likes: idem
DROP POLICY IF EXISTS "comment_likes_select_all" ON public.comment_likes;
CREATE POLICY "comment_likes_select_all" ON public.comment_likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "comment_likes_insert_own" ON public.comment_likes;
CREATE POLICY "comment_likes_insert_own" ON public.comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comment_likes_delete_own" ON public.comment_likes;
CREATE POLICY "comment_likes_delete_own" ON public.comment_likes
    FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Realtime
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND tablename = 'publication_likes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.publication_likes;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND tablename = 'comment_likes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. SACAR el trigger temporal de XP por crear comentario
--    (lo reemplaza el de engagement abajo)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_comments_xp ON public.comments;
DROP FUNCTION IF EXISTS public.trg_award_xp_on_comment();

-- ----------------------------------------------------------------------------
-- 6. Trigger: +1 XP al author de publicación cuando recibe un like
--    Cap: 15 XP/día por categoría 'social_like'.
--    No se otorga XP por likearse a uno mismo.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_award_xp_on_publication_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_author_id uuid;
    v_today_xp  int;
BEGIN
    SELECT user_id INTO v_author_id FROM public.publications WHERE id = NEW.publication_id;
    IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(xp_amount), 0) INTO v_today_xp
      FROM public.xp_daily_log
     WHERE user_id = v_author_id
       AND awarded_date = CURRENT_DATE
       AND source = 'social_like';

    IF v_today_xp >= 15 THEN
        RETURN NEW;
    END IF;

    PERFORM public.award_xp(
        v_author_id,
        1,
        'social_like',
        jsonb_build_object('publication_id', NEW.publication_id, 'liker_id', NEW.user_id)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publication_likes_xp ON public.publication_likes;
CREATE TRIGGER trg_publication_likes_xp
    AFTER INSERT ON public.publication_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_award_xp_on_publication_like();

-- ----------------------------------------------------------------------------
-- 7. Trigger: +2 XP al author del comentario cuando alcanza 4 likes
--    Solo se otorga UNA vez por comentario (chequeo en xp_daily_log).
--    Cap: 10 XP/día por categoría 'social_comment'.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_award_xp_on_comment_engagement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_like_count        int;
    v_author_id         uuid;
    v_already_awarded   boolean;
    v_today_xp          int;
BEGIN
    SELECT COUNT(*) INTO v_like_count
      FROM public.comment_likes
     WHERE comment_id = NEW.comment_id;

    -- Solo cuando cruza el umbral hacia arriba (>3 = exactamente 4)
    IF v_like_count <> 4 THEN
        RETURN NEW;
    END IF;

    SELECT user_id INTO v_author_id FROM public.comments WHERE id = NEW.comment_id;
    IF v_author_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Chequear que aún no se le haya otorgado XP por este comentario
    SELECT EXISTS (
        SELECT 1 FROM public.xp_daily_log
         WHERE source = 'social_comment'
           AND metadata->>'comment_id' = NEW.comment_id::text
    ) INTO v_already_awarded;

    IF v_already_awarded THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(xp_amount), 0) INTO v_today_xp
      FROM public.xp_daily_log
     WHERE user_id = v_author_id
       AND awarded_date = CURRENT_DATE
       AND source = 'social_comment';

    IF v_today_xp >= 10 THEN
        RETURN NEW;
    END IF;

    PERFORM public.award_xp(
        v_author_id,
        2,
        'social_comment',
        jsonb_build_object('comment_id', NEW.comment_id)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comment_likes_xp ON public.comment_likes;
CREATE TRIGGER trg_comment_likes_xp
    AFTER INSERT ON public.comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_award_xp_on_comment_engagement();
