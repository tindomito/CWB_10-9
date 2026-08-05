-- ============================================================================
-- 10-9 · Scorecards & Live Scoring (sec 3.4 del documento de niveles, sin XP)
--
-- El usuario puntúa cualquier pelea round a round respetando el 10 point must
-- system: ganador del round = 10, perdedor = 9 (o 10-8 en round dominante).
-- Un scorecard por (user, fight). Inmutable una vez enviado.
--
-- NOTA: XP por live scoring se implementa en una fase separada (no acá).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Tabla scorecards
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scorecards (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fight_id        text NOT NULL,          -- "provider:fightId" (api-sports)
    event_id        text NOT NULL,          -- slug / id del evento padre
    fighter_a_id    text NOT NULL,
    fighter_b_id    text NOT NULL,
    fighter_a_name  text NOT NULL,
    fighter_b_name  text NOT NULL,
    rounds          jsonb NOT NULL,
    -- Estructura de rounds:
    -- [{ "round": 1, "winner_id": "123", "score_winner": 10, "score_loser": 9 }, ...]
    total_a         int  NOT NULL,
    total_b         int  NOT NULL,
    verdict         text NOT NULL CHECK (verdict IN ('fighter_a','fighter_b','draw')),
    is_live         boolean NOT NULL DEFAULT false,
    submitted_at    timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now(),

    -- Un scorecard por usuario por pelea
    UNIQUE (user_id, fight_id)
);

CREATE INDEX IF NOT EXISTS idx_scorecards_fight ON public.scorecards (fight_id);
CREATE INDEX IF NOT EXISTS idx_scorecards_user_date ON public.scorecards (user_id, submitted_at DESC);

-- ----------------------------------------------------------------------------
-- 2. RLS — cada usuario solo ve / inserta / actualiza lo suyo.
--    La agregación comunitaria sale de la vista (definer) que bypasea RLS.
-- ----------------------------------------------------------------------------
ALTER TABLE public.scorecards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scorecards_select_own" ON public.scorecards;
CREATE POLICY "scorecards_select_own"
    ON public.scorecards FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scorecards_insert_own" ON public.scorecards;
CREATE POLICY "scorecards_insert_own"
    ON public.scorecards FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scorecards_update_own" ON public.scorecards;
CREATE POLICY "scorecards_update_own"
    ON public.scorecards FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "scorecards_delete_own" ON public.scorecards;
CREATE POLICY "scorecards_delete_own"
    ON public.scorecards FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. Vista comunitaria: % de votos por round por pelea.
--    Definer por defecto (owner = postgres) → agrega sobre TODOS los scorecards
--    sin exponer datos individuales (solo conteos / porcentajes anónimos).
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.community_scorecards;
CREATE VIEW public.community_scorecards AS
SELECT
    s.fight_id,
    (round_data->>'round')::int    AS round_num,
    round_data->>'winner_id'       AS winner_id,
    count(*)                       AS votes,
    round(
        count(*) * 100.0 / sum(count(*)) OVER (
            PARTITION BY s.fight_id, (round_data->>'round')::int
        ),
        1
    )                              AS vote_pct
FROM public.scorecards s,
     jsonb_array_elements(s.rounds) AS round_data
GROUP BY s.fight_id, round_num, winner_id;

GRANT SELECT ON public.community_scorecards TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 3b. Función SECURITY DEFINER para la agregación comunitaria.
--     Path confiable: garantiza la agregación sobre TODOS los scorecards sin
--     depender del comportamiento RLS de la vista, y sin exponer filas
--     individuales (solo conteos / porcentajes anónimos por round).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_community_scorecard(p_fight_id text)
RETURNS TABLE (
    round_num  int,
    winner_id  text,
    votes      bigint,
    vote_pct   numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        (round_data->>'round')::int    AS round_num,
        round_data->>'winner_id'       AS winner_id,
        count(*)                       AS votes,
        round(
            count(*) * 100.0 / sum(count(*)) OVER (
                PARTITION BY (round_data->>'round')::int
            ),
            1
        )                              AS vote_pct
    FROM public.scorecards s,
         jsonb_array_elements(s.rounds) AS round_data
    WHERE s.fight_id = p_fight_id
    GROUP BY round_num, winner_id
    ORDER BY round_num;
$$;

-- ----------------------------------------------------------------------------
-- 4. Realtime para live scoring (la comunidad ve cómo se mueven los votos)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'scorecards'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.scorecards;
    END IF;
END $$;
