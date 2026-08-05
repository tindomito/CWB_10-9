-- ============================================================================
-- 10-9 · Sistema de XP avanzado: multiplicadores, rachas, bonus PPV
-- Implementa Sec 3.2, 3.3 y bonus PPV de Sec 3.2 del documento de niveles.
-- También deja la infraestructura de cap diario lista para social/live scoring.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Snapshot de votos de la comunidad por pelea
--    Se cristaliza al cierre de la pelea para calcular multiplicadores upset.
-- ----------------------------------------------------------------------------
ALTER TABLE public.fights
    ADD COLUMN IF NOT EXISTS community_snapshot jsonb;
-- Forma del JSON:
-- {
--   "votes_by_fighter": { "<external_id_1>": 65, "<external_id_2>": 35 },
--   "total_votes": 100
-- }

-- ----------------------------------------------------------------------------
-- 2. Columnas de racha en profiles
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_streak  int NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_streak  int NOT NULL DEFAULT 0;

-- ----------------------------------------------------------------------------
-- 3. Log diario de XP (también soporta el cap diario para social/live)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.xp_daily_log (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    awarded_date    date        NOT NULL DEFAULT CURRENT_DATE,
    xp_amount       int         NOT NULL,
    source          text        NOT NULL,
    metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_log_user_date
    ON public.xp_daily_log (user_id, awarded_date DESC);
CREATE INDEX IF NOT EXISTS idx_xp_log_source
    ON public.xp_daily_log (source);

ALTER TABLE public.xp_daily_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xp_log_select_all" ON public.xp_daily_log;
CREATE POLICY "xp_log_select_all" ON public.xp_daily_log FOR SELECT USING (true);
-- INSERT solo vía SECURITY DEFINER (la función award_xp).

-- ----------------------------------------------------------------------------
-- 4. Helper: award_xp
--    Único punto donde se modifica profiles.xp / level + se loggea.
--    Aplica el cap diario solo para fuentes "sociales".
--    Eventos en vivo (predicciones, rachas, multiplicadores, ppv, live scoring)
--    están exentos del cap por diseño (ver PDF sec "CAP DIARIO TOTAL").
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_xp(
    p_user_id   uuid,
    p_amount    int,
    p_source    text,
    p_metadata  jsonb DEFAULT '{}'::jsonb
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_capped_sources text[] := ARRAY['social_post','social_comment','social_like'];
    v_daily_cap      constant int := 100;
    v_already_today  int;
    v_remaining      int;
    v_to_award       int;
    v_new_xp         int;
BEGIN
    IF p_amount <= 0 THEN RETURN 0; END IF;

    v_to_award := p_amount;

    -- Cap solo para fuentes sociales
    IF p_source = ANY(v_capped_sources) THEN
        SELECT COALESCE(SUM(xp_amount), 0) INTO v_already_today
        FROM public.xp_daily_log
        WHERE user_id = p_user_id
          AND awarded_date = CURRENT_DATE
          AND source = ANY(v_capped_sources);

        v_remaining := GREATEST(0, v_daily_cap - v_already_today);
        v_to_award := LEAST(p_amount, v_remaining);
    END IF;

    IF v_to_award <= 0 THEN RETURN 0; END IF;

    INSERT INTO public.xp_daily_log (user_id, xp_amount, source, metadata)
    VALUES (p_user_id, v_to_award, p_source, p_metadata);

    UPDATE public.profiles
       SET xp    = COALESCE(xp, 0) + v_to_award,
           level = public.level_from_xp(COALESCE(xp, 0) + v_to_award)
     WHERE id = p_user_id
    RETURNING xp INTO v_new_xp;

    RETURN v_to_award;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Helper: snapshot del % de la comunidad para una pelea
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.snapshot_community_for_fight(p_fight_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total int;
    v_votes jsonb;
BEGIN
    SELECT COUNT(*) INTO v_total FROM public.predictions WHERE fight_id = p_fight_id;

    SELECT COALESCE(jsonb_object_agg(predicted_winner_external_id, cnt), '{}'::jsonb)
      INTO v_votes
    FROM (
        SELECT predicted_winner_external_id, COUNT(*) AS cnt
        FROM public.predictions
        WHERE fight_id = p_fight_id
        GROUP BY predicted_winner_external_id
    ) t;

    RETURN jsonb_build_object('votes_by_fighter', v_votes, 'total_votes', v_total);
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Helper: bonus de cartelera completa PPV
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_award_ppv_bonus(p_event_slug text)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user                      RECORD;
    v_finished_count            int;
    v_total_count               int;
    v_already_awarded           boolean;
    v_users_awarded             int := 0;
BEGIN
    -- Solo si el evento es PPV
    IF NOT EXISTS (SELECT 1 FROM public.fights
                   WHERE event_slug = p_event_slug AND is_ppv = true) THEN
        RETURN 0;
    END IF;

    SELECT
        COUNT(*) FILTER (WHERE status = 'finished'),
        COUNT(*) FILTER (WHERE status <> 'cancelled')
      INTO v_finished_count, v_total_count
    FROM public.fights WHERE event_slug = p_event_slug;

    -- Si todavía no terminaron todas las peleas no canceladas, no hay bonus
    IF v_finished_count < v_total_count OR v_total_count = 0 THEN
        RETURN 0;
    END IF;

    FOR v_user IN
        SELECT
            p.user_id,
            COUNT(*) FILTER (WHERE p.is_winner_correct = true) AS correct,
            COUNT(*) AS total
        FROM public.predictions p
        JOIN public.fights f ON f.id = p.fight_id
        WHERE f.event_slug = p_event_slug AND f.status = 'finished'
        GROUP BY p.user_id
    LOOP
        IF v_user.total = v_total_count AND v_user.correct = v_total_count THEN
            SELECT EXISTS (
                SELECT 1 FROM public.xp_daily_log
                WHERE user_id = v_user.user_id
                  AND source = 'ppv_bonus'
                  AND metadata->>'event_slug' = p_event_slug
            ) INTO v_already_awarded;

            IF NOT v_already_awarded THEN
                PERFORM public.award_xp(
                    v_user.user_id,
                    50,
                    'ppv_bonus',
                    jsonb_build_object('event_slug', p_event_slug)
                );
                v_users_awarded := v_users_awarded + 1;
            END IF;
        END IF;
    END LOOP;

    RETURN v_users_awarded;
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. RECREAR resolve_fight_predictions con multiplicadores + rachas + PPV
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

    -- Snapshot de comunidad (cristalizar al primer resolve)
    IF v_fight.community_snapshot IS NULL THEN
        UPDATE public.fights
           SET community_snapshot = public.snapshot_community_for_fight(p_fight_id)
         WHERE id = p_fight_id
        RETURNING * INTO v_fight;
    END IF;

    -- Calcular ratio de votos del ganador
    v_total_votes  := COALESCE((v_fight.community_snapshot->>'total_votes')::int, 0);
    v_winner_votes := COALESCE(
        (v_fight.community_snapshot->'votes_by_fighter'->>v_fight.winner_external_id)::int,
        0
    );

    IF v_total_votes > 0 THEN
        v_winner_ratio := v_winner_votes::numeric / v_total_votes::numeric;
    ELSE
        v_winner_ratio := 1.0;  -- sin datos suficientes, asumimos favorito (sin multiplicador)
    END IF;

    -- Multiplicador (sec 3.2)
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

        -- Multiplicador solo si acertó el ganador
        v_total_xp := v_base_xp * (CASE WHEN v_winner_correct THEN v_multiplier ELSE 1 END);

        -- Actualizar racha (sec 3.3)
        v_streak_bonus := 0;
        v_new_streak := 0;
        IF v_winner_correct THEN
            UPDATE public.profiles
               SET current_streak = current_streak + 1
             WHERE id = v_pred.user_id
            RETURNING current_streak INTO v_new_streak;

            v_streak_bonus := CASE v_new_streak
                WHEN 3  THEN 10
                WHEN 5  THEN 25
                WHEN 10 THEN 75
                ELSE 0
            END;
            v_total_xp := v_total_xp + v_streak_bonus;

            UPDATE public.profiles
               SET longest_streak = GREATEST(longest_streak, v_new_streak)
             WHERE id = v_pred.user_id;
        ELSE
            UPDATE public.profiles SET current_streak = 0 WHERE id = v_pred.user_id;
        END IF;

        -- Marcar predicción como resuelta
        UPDATE public.predictions SET
            resolved_at        = now(),
            is_winner_correct  = v_winner_correct,
            is_method_correct  = v_method_correct,
            is_round_correct   = v_round_correct,
            xp_awarded         = v_total_xp
        WHERE id = v_pred.id;

        -- Sumar XP al perfil + log (no aplica cap a predicciones)
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

        v_count := v_count + 1;
    END LOOP;

    -- Bonus de cartelera PPV completa (sec 3.2)
    IF v_fight.is_ppv AND v_fight.event_slug IS NOT NULL THEN
        PERFORM public.check_and_award_ppv_bonus(v_fight.event_slug);
    END IF;

    RETURN v_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- 8. Backfill: profiles existentes con xp ya cargado deben tener su xp re-loggeado?
--    NO. xp_daily_log es para nuevas concesiones. profiles.xp queda como verdad
--    actual. La inconsistencia histórica no afecta nada (solo leaderboards
--    "por mes" que arrancan vacíos hasta el primer XP nuevo).
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 9. Realtime: que la UI vea cambios en xp_daily_log para mostrar bonus al instante
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'xp_daily_log'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_daily_log;
    END IF;
END $$;
