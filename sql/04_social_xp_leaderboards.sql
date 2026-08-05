-- ============================================================================
-- 10-9 · XP por actividad social + Leaderboards
-- Implementa parcialmente sec 3.5 del PDF (lo que las tablas existentes permiten)
-- y sec 4.4 (leaderboards: all-time, mensual, por evento, amigos).
--
-- Notas sobre sec 3.5 NO implementado:
--   - "Comentario con engagement (más de 3 likes)" requiere tabla `comment_likes`
--     que no existe todavía. Por ahora se otorga XP al CREAR comentario.
--   - "Recibir like en publicación propia" requiere tabla `publication_likes`
--     que tampoco existe. Cuando se agregue, sumar trigger AFTER INSERT.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Trigger: +3 XP al crear publicación (cap 9 XP/día = 3 posts/día)
--    Cap manejado por award_xp() porque source='social_post' está en la lista.
--    EXTRA cap por categoría: 9 XP/día social_post (3 posts) — chequeado abajo.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_award_xp_on_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today_count int;
    v_today_xp    int;
BEGIN
    -- Cap por categoría: máx 3 posts (9 XP) por día
    SELECT COALESCE(SUM(xp_amount), 0) INTO v_today_xp
      FROM public.xp_daily_log
     WHERE user_id = NEW.user_id
       AND awarded_date = CURRENT_DATE
       AND source = 'social_post';

    IF v_today_xp >= 9 THEN
        RETURN NEW;  -- ya alcanzó el cap por categoría
    END IF;

    PERFORM public.award_xp(
        NEW.user_id,
        3,
        'social_post',
        jsonb_build_object('publication_id', NEW.id)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publications_xp ON public.publications;
CREATE TRIGGER trg_publications_xp
    AFTER INSERT ON public.publications
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_award_xp_on_publication();

-- ----------------------------------------------------------------------------
-- 2. Trigger: +2 XP al crear comentario (cap 10 XP/día)
--    NOTA: el PDF pide "comentario con engagement (más de 3 likes)". Hasta que
--    exista una tabla de likes, otorgamos al crear. Cuando exista, mover esta
--    lógica al trigger de likes y sacar este.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_award_xp_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today_xp int;
BEGIN
    SELECT COALESCE(SUM(xp_amount), 0) INTO v_today_xp
      FROM public.xp_daily_log
     WHERE user_id = NEW.user_id
       AND awarded_date = CURRENT_DATE
       AND source = 'social_comment';

    IF v_today_xp >= 10 THEN
        RETURN NEW;
    END IF;

    PERFORM public.award_xp(
        NEW.user_id,
        2,
        'social_comment',
        jsonb_build_object('comment_id', NEW.id, 'post_id', NEW.post_id)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_xp ON public.comments;
CREATE TRIGGER trg_comments_xp
    AFTER INSERT ON public.comments
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_award_xp_on_comment();

-- ============================================================================
-- LEADERBOARDS (sec 4.4)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3. Vista: leaderboard global all-time (por XP total)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.leaderboard_alltime;
CREATE VIEW public.leaderboard_alltime AS
SELECT
    p.id            AS user_id,
    p.display_name,
    p.avatar_url,
    p.rango,
    p.level,
    p.xp,
    p.current_streak,
    p.longest_streak,
    ROW_NUMBER() OVER (ORDER BY p.xp DESC, p.created_at ASC) AS rank
FROM public.profiles p
WHERE p.xp > 0
ORDER BY p.xp DESC;

-- ----------------------------------------------------------------------------
-- 4. Vista: leaderboard mensual (XP del mes calendario actual)
--    Se calcula en vivo desde xp_daily_log.
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.leaderboard_monthly;
CREATE VIEW public.leaderboard_monthly AS
SELECT
    log.user_id,
    p.display_name,
    p.avatar_url,
    p.level,
    p.rango,
    SUM(log.xp_amount)::int AS xp_this_month,
    ROW_NUMBER() OVER (ORDER BY SUM(log.xp_amount) DESC) AS rank
FROM public.xp_daily_log log
JOIN public.profiles p ON p.id = log.user_id
WHERE log.awarded_date >= date_trunc('month', CURRENT_DATE)::date
  AND log.awarded_date <  (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
GROUP BY log.user_id, p.display_name, p.avatar_url, p.level, p.rango
ORDER BY xp_this_month DESC;

-- ----------------------------------------------------------------------------
-- 5. Vista helper: lista de eventos con predicciones
--    Para que la UI pueda armar el dropdown del leaderboard "por evento".
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.events_with_predictions;
CREATE VIEW public.events_with_predictions AS
SELECT
    f.event_slug,
    MAX(f.event_name) AS event_name,
    MAX(f.fight_date) AS event_date,
    COUNT(*)::int AS fight_count,
    COUNT(*) FILTER (WHERE f.status = 'finished')::int AS finished_count,
    bool_or(f.is_ppv) AS is_ppv,
    COUNT(DISTINCT pred.user_id)::int AS predictors_count
FROM public.fights f
LEFT JOIN public.predictions pred ON pred.fight_id = f.id
WHERE f.event_slug IS NOT NULL
GROUP BY f.event_slug
HAVING COUNT(DISTINCT pred.user_id) > 0
ORDER BY MAX(f.fight_date) DESC;

-- ----------------------------------------------------------------------------
-- 6. RPC: leaderboard por evento
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leaderboard_by_event(p_event_slug text)
RETURNS TABLE (
    user_id          uuid,
    display_name     text,
    avatar_url       text,
    level            int,
    rango            text,
    correct_count    int,
    total_count      int,
    xp_earned        int,
    rank             bigint
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        pr.id            AS user_id,
        pr.display_name,
        pr.avatar_url,
        pr.level,
        pr.rango,
        COUNT(*) FILTER (WHERE p.is_winner_correct = true)::int AS correct_count,
        COUNT(*)::int AS total_count,
        COALESCE(SUM(p.xp_awarded), 0)::int AS xp_earned,
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(p.xp_awarded), 0) DESC,
                                    COUNT(*) FILTER (WHERE p.is_winner_correct = true) DESC) AS rank
    FROM public.predictions p
    JOIN public.fights f      ON f.id  = p.fight_id
    JOIN public.profiles pr   ON pr.id = p.user_id
    WHERE f.event_slug = p_event_slug
    GROUP BY pr.id, pr.display_name, pr.avatar_url, pr.level, pr.rango
    ORDER BY xp_earned DESC, correct_count DESC;
$$;

-- ----------------------------------------------------------------------------
-- 7. RPC: leaderboard de amigos (los que sigo + yo)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leaderboard_friends(p_user_id uuid)
RETURNS TABLE (
    user_id          uuid,
    display_name     text,
    avatar_url       text,
    rango            text,
    level            int,
    xp               int,
    current_streak   int,
    longest_streak   int,
    rank             bigint
)
LANGUAGE sql
STABLE
AS $$
    WITH friends AS (
        SELECT following_id AS uid FROM public.follows WHERE follower_id = p_user_id
        UNION
        SELECT p_user_id
    )
    SELECT
        p.id           AS user_id,
        p.display_name,
        p.avatar_url,
        p.rango,
        p.level,
        p.xp,
        p.current_streak,
        p.longest_streak,
        ROW_NUMBER() OVER (ORDER BY p.xp DESC, p.created_at ASC) AS rank
    FROM public.profiles p
    JOIN friends ON friends.uid = p.id
    ORDER BY p.xp DESC;
$$;
