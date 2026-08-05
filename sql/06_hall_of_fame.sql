-- ============================================================================
-- 10-9 · Hall of Fame · Modo competitivo (sec 4 del PDF)
-- Implementa rating ELO con divisiones, piso 1200, congelado por inactividad,
-- auto-inscripción al alcanzar nivel 10 y leaderboard competitivo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla competitive_ratings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.competitive_ratings (
    user_id           uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating            int         NOT NULL DEFAULT 1500 CHECK (rating >= 1200),
    peak_rating       int         NOT NULL DEFAULT 1500,
    fights_resolved   int         NOT NULL DEFAULT 0,
    correct_count     int         NOT NULL DEFAULT 0,
    last_active_at    timestamptz,
    joined_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitive_rating ON public.competitive_ratings (rating DESC);

-- ----------------------------------------------------------------------------
-- 2. Helpers: división a partir del rating (sec 4.2)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.division_from_rating(p_rating int)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE
        WHEN p_rating >= 2100 THEN 'GOAT'
        WHEN p_rating >= 1950 THEN 'Diamond'
        WHEN p_rating >= 1800 THEN 'Gold'
        WHEN p_rating >= 1650 THEN 'Silver'
        ELSE 'Bronze'
    END;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Cálculo de delta ELO (sec 4.3)
--    Usa el winner_ratio (% comunidad que votó por el ganador real) para
--    catalogar la dificultad de la predicción y devuelve el delta a aplicar.
--    Se usan valores medios de cada rango del PDF:
--      Favorito (>70%):  +7 acertando / -17 fallando
--      Pareja  (30-70%): +17 acertando / -12 fallando
--      Upset    (<30%):  +32 acertando / -5  fallando
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_elo_delta(
    p_winner_ratio numeric,
    p_was_correct  boolean
)
RETURNS int
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_winner_ratio < 0.30 THEN
        RETURN CASE WHEN p_was_correct THEN  32 ELSE  -5 END;
    ELSIF p_winner_ratio > 0.70 THEN
        RETURN CASE WHEN p_was_correct THEN   7 ELSE -17 END;
    ELSE
        RETURN CASE WHEN p_was_correct THEN  17 ELSE -12 END;
    END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Actualizar el rating de un usuario en base al resultado de una pelea.
--    Solo afecta a usuarios level >= 10 (que ya completaron la progresión base).
--    Aplica piso 1200 y actualiza peak_rating.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_elo_for_user(
    p_user_id     uuid,
    p_fight_id    text,
    p_was_correct boolean
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_level     int;
    v_fight          public.fights%ROWTYPE;
    v_winner_ratio   numeric;
    v_total_votes    int;
    v_winner_votes   int;
    v_delta          int;
    v_new_rating     int;
    v_current_rating int;
BEGIN
    -- Solo usuarios level 10+ entran al modo competitivo
    SELECT level INTO v_user_level FROM public.profiles WHERE id = p_user_id;
    IF COALESCE(v_user_level, 1) < 10 THEN
        RETURN NULL;
    END IF;

    -- Asegurar que el usuario tiene fila en competitive_ratings
    INSERT INTO public.competitive_ratings (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Cargar la pelea y el ratio
    SELECT * INTO v_fight FROM public.fights WHERE id = p_fight_id;
    IF v_fight.community_snapshot IS NULL THEN
        RETURN NULL;
    END IF;

    v_total_votes  := COALESCE((v_fight.community_snapshot->>'total_votes')::int, 0);
    v_winner_votes := COALESCE(
        (v_fight.community_snapshot->'votes_by_fighter'->>v_fight.winner_external_id)::int,
        0
    );

    IF v_total_votes = 0 THEN
        RETURN NULL;
    END IF;

    v_winner_ratio := v_winner_votes::numeric / v_total_votes::numeric;
    v_delta        := public.calculate_elo_delta(v_winner_ratio, p_was_correct);

    SELECT rating INTO v_current_rating
      FROM public.competitive_ratings
     WHERE user_id = p_user_id;

    -- Aplicar delta con piso 1200
    v_new_rating := GREATEST(1200, v_current_rating + v_delta);

    UPDATE public.competitive_ratings
       SET rating          = v_new_rating,
           peak_rating     = GREATEST(peak_rating, v_new_rating),
           fights_resolved = fights_resolved + 1,
           correct_count   = correct_count + (CASE WHEN p_was_correct THEN 1 ELSE 0 END),
           last_active_at  = now()
     WHERE user_id = p_user_id;

    RETURN v_delta;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Auto-inscripción al alcanzar nivel 10 (sec 4)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_auto_enroll_hall_of_fame()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.level >= 10 AND (OLD.level IS NULL OR OLD.level < 10) THEN
        INSERT INTO public.competitive_ratings (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_auto_enroll_hof ON public.profiles;
CREATE TRIGGER trg_profiles_auto_enroll_hof
    AFTER UPDATE OF level ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_auto_enroll_hall_of_fame();

-- Inscribir retroactivamente a los profiles que ya están en nivel 10+
INSERT INTO public.competitive_ratings (user_id)
SELECT id FROM public.profiles WHERE level >= 10
ON CONFLICT (user_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. Modificar resolve_fight_predictions: tras resolver cada predicción,
--    actualizar el ELO del usuario si está en Hall of Fame.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_fight_predictions(p_fight_id text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_fight             public.fights%ROWTYPE;
    v_pred              public.predictions%ROWTYPE;
    v_count             int := 0;
    v_winner_correct    boolean;
    v_method_correct    boolean;
    v_round_correct     boolean;
    v_base_xp           int;
    v_total_xp          int;
    v_winner_votes      int;
    v_total_votes       int;
    v_winner_ratio      numeric;
    v_multiplier        int := 1;
    v_new_streak        int;
    v_streak_bonus      int;
    -- XP del PDF sec 3.1
    v_xp_winner constant int := 20;
    v_xp_method constant int := 8;
    v_xp_round  constant int := 12;
BEGIN
    SELECT * INTO v_fight FROM public.fights WHERE id = p_fight_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pelea % no encontrada', p_fight_id;
    END IF;
    IF v_fight.status <> 'finished' THEN
        RAISE EXCEPTION 'La pelea no está finalizada';
    END IF;
    IF v_fight.winner_external_id IS NULL THEN
        RAISE EXCEPTION 'La pelea no tiene ganador registrado';
    END IF;

    -- Snapshot de comunidad
    IF v_fight.community_snapshot IS NULL THEN
        UPDATE public.fights
           SET community_snapshot = public.snapshot_community_for_fight(p_fight_id)
         WHERE id = p_fight_id
        RETURNING * INTO v_fight;
    END IF;

    v_total_votes  := COALESCE((v_fight.community_snapshot->>'total_votes')::int, 0);
    v_winner_votes := COALESCE(
        (v_fight.community_snapshot->'votes_by_fighter'->>v_fight.winner_external_id)::int,
        0
    );
    v_winner_ratio := CASE WHEN v_total_votes > 0
                           THEN v_winner_votes::numeric / v_total_votes::numeric
                           ELSE 1.0 END;

    IF v_winner_ratio < 0.15 THEN
        v_multiplier := 3;
    ELSIF v_winner_ratio < 0.30 THEN
        v_multiplier := 2;
    ELSE
        v_multiplier := 1;
    END IF;

    FOR v_pred IN
        SELECT * FROM public.predictions
         WHERE fight_id = p_fight_id AND resolved_at IS NULL
    LOOP
        v_winner_correct := v_pred.predicted_winner_external_id = v_fight.winner_external_id;
        v_method_correct := v_winner_correct
            AND v_pred.predicted_method IS NOT NULL
            AND v_fight.result_method IS NOT NULL
            AND v_pred.predicted_method = v_fight.result_method;
        v_round_correct  := v_method_correct
            AND v_fight.result_method IN ('ko_tko','submission')
            AND v_pred.predicted_round IS NOT NULL
            AND v_fight.result_round IS NOT NULL
            AND v_pred.predicted_round = v_fight.result_round;

        v_base_xp := 0;
        IF v_winner_correct THEN v_base_xp := v_base_xp + v_xp_winner; END IF;
        IF v_method_correct THEN v_base_xp := v_base_xp + v_xp_method; END IF;
        IF v_round_correct  THEN v_base_xp := v_base_xp + v_xp_round;  END IF;

        v_total_xp := v_base_xp * (CASE WHEN v_winner_correct THEN v_multiplier ELSE 1 END);

        -- Racha
        v_streak_bonus := 0;
        v_new_streak := 0;
        IF v_winner_correct THEN
            UPDATE public.profiles SET current_streak = current_streak + 1
             WHERE id = v_pred.user_id RETURNING current_streak INTO v_new_streak;

            v_streak_bonus := CASE v_new_streak
                WHEN 3  THEN 10
                WHEN 5  THEN 25
                WHEN 10 THEN 75
                ELSE 0
            END;
            v_total_xp := v_total_xp + v_streak_bonus;

            UPDATE public.profiles SET longest_streak = GREATEST(longest_streak, v_new_streak)
             WHERE id = v_pred.user_id;
        ELSE
            UPDATE public.profiles SET current_streak = 0 WHERE id = v_pred.user_id;
        END IF;

        UPDATE public.predictions SET
            resolved_at        = now(),
            is_winner_correct  = v_winner_correct,
            is_method_correct  = v_method_correct,
            is_round_correct   = v_round_correct,
            xp_awarded         = v_total_xp
        WHERE id = v_pred.id;

        IF v_total_xp > 0 THEN
            PERFORM public.award_xp(
                v_pred.user_id,
                v_total_xp,
                'prediction',
                jsonb_build_object(
                    'fight_id',     p_fight_id,
                    'base_xp',      v_base_xp,
                    'multiplier',   v_multiplier,
                    'streak_bonus', v_streak_bonus,
                    'streak',       v_new_streak,
                    'winner_ratio', v_winner_ratio
                )
            );
        END IF;

        -- ELO (solo si el usuario está en Hall of Fame, level >= 10)
        PERFORM public.update_elo_for_user(v_pred.user_id, p_fight_id, v_winner_correct);

        v_count := v_count + 1;
    END LOOP;

    -- Bonus PPV completo
    IF v_fight.is_ppv AND v_fight.event_slug IS NOT NULL THEN
        PERFORM public.check_and_award_ppv_bonus(v_fight.event_slug);
    END IF;

    RETURN v_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. Vista: leaderboard Hall of Fame
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.hall_of_fame_leaderboard;
CREATE VIEW public.hall_of_fame_leaderboard AS
SELECT
    cr.user_id,
    p.display_name,
    p.avatar_url,
    p.level,
    cr.rating,
    cr.peak_rating,
    cr.fights_resolved,
    cr.correct_count,
    cr.last_active_at,
    cr.joined_at,
    public.division_from_rating(cr.rating) AS division,
    (cr.last_active_at IS NOT NULL
        AND cr.last_active_at < (now() - interval '60 days')) AS is_inactive,
    ROW_NUMBER() OVER (ORDER BY cr.rating DESC, cr.peak_rating DESC) AS rank
FROM public.competitive_ratings cr
JOIN public.profiles p ON p.id = cr.user_id
ORDER BY cr.rating DESC;

-- ----------------------------------------------------------------------------
-- 8. RPC: inscribirme manualmente al Hall of Fame
--    (el trigger ya hace auto-enroll, pero por si quedó alguno sin row)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_hall_of_fame()
RETURNS public.competitive_ratings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_level int;
    v_row        public.competitive_ratings%ROWTYPE;
BEGIN
    SELECT level INTO v_user_level FROM public.profiles WHERE id = auth.uid();
    IF COALESCE(v_user_level, 1) < 10 THEN
        RAISE EXCEPTION 'Necesitás llegar a Champion (nivel 10) para entrar al Hall of Fame';
    END IF;

    INSERT INTO public.competitive_ratings (user_id)
    VALUES (auth.uid())
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_row FROM public.competitive_ratings WHERE user_id = auth.uid();
    RETURN v_row;
END;
$$;

-- ----------------------------------------------------------------------------
-- 9. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.competitive_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competitive_ratings_select_all" ON public.competitive_ratings;
CREATE POLICY "competitive_ratings_select_all" ON public.competitive_ratings
    FOR SELECT USING (true);
-- INSERT/UPDATE solo vía SECURITY DEFINER (triggers / update_elo_for_user / join_hall_of_fame).

-- ----------------------------------------------------------------------------
-- 10. Realtime
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND tablename = 'competitive_ratings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.competitive_ratings;
    END IF;
END $$;
