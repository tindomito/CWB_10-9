-- ============================================================================
-- 10-9 · XP por Live Scoring (sec 3.4 del documento de niveles)
--
-- Otorga XP al enviar un scorecard EN VIVO (is_live = true):
--   · 2 XP por cada round puntuado  → participación.
--
-- NOTA sobre el resto de sec 3.4 (NO implementado):
--   · "+5 XP por coincidir con jueces oficiales" y "+3 XP score exacto" requieren
--     los scores round-a-round de los jueces, que la API actual NO expone.
--     Se implementarán cuando: (a) migremos a una API que los traiga, o
--     (b) el admin cargue los scores oficiales manualmente.
--   · "+2 XP por coincidir con el promedio de la comunidad" requiere cristalizar
--     un consenso final; queda para una fase con snapshot post-evento.
--
-- Diseño anti-farmeo: solo los scorecards EN VIVO (is_live) dan XP. Puntuar
-- peleas viejas/post-fight construye tu historial y alimenta el scorecard
-- comunitario, pero no otorga XP (evita farmear puntuando cientos de peleas).
-- La XP de live scoring está exenta del cap diario (ver award_xp en sql/03).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_award_xp_on_scorecard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rounds int;
BEGIN
    IF NOT NEW.is_live THEN
        RETURN NEW;  -- post-fight / peleas viejas: sin XP
    END IF;

    v_rounds := COALESCE(jsonb_array_length(NEW.rounds), 0);
    IF v_rounds > 0 THEN
        PERFORM public.award_xp(
            NEW.user_id,
            v_rounds * 2,
            'live_scoring',
            jsonb_build_object(
                'fight_id', NEW.fight_id,
                'rounds', v_rounds
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scorecard_xp ON public.scorecards;
CREATE TRIGGER trg_scorecard_xp
    AFTER INSERT ON public.scorecards
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_award_xp_on_scorecard();
