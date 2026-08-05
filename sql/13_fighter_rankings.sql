-- ============================================================================
-- 10-9 · Rankings de peleadores personalizados (tier list por división)
--
-- El usuario arma su propio ranking de una división: campeón + hasta 15 puestos.
-- Precarga peleadores reales de la API y permite reordenar, renombrar, borrar y
-- agregar peleadores custom. Se puede guardar privado o publicar.
--
-- entries (jsonb, ORDENADO): el índice 0 es el campeón, el resto #1, #2, ...
--   [{ "name": "Islam Makhachev", "external_id": "123", "photo": "https://..." }, ...]
--   external_id y photo pueden ser null (peleador custom escrito a mano).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.fighter_rankings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    division    text NOT NULL,
    entries     jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_public   boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rankings_user ON public.fighter_rankings (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_rankings_public ON public.fighter_rankings (updated_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_rankings_division ON public.fighter_rankings (division) WHERE is_public = true;

-- ----------------------------------------------------------------------------
-- Trigger updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_fighter_ranking_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_ranking ON public.fighter_rankings;
CREATE TRIGGER trg_touch_ranking
    BEFORE UPDATE ON public.fighter_rankings
    FOR EACH ROW EXECUTE FUNCTION public.touch_fighter_ranking_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.fighter_rankings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rankings_select_public_or_own" ON public.fighter_rankings;
CREATE POLICY "rankings_select_public_or_own"
    ON public.fighter_rankings FOR SELECT
    USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "rankings_insert_own" ON public.fighter_rankings;
CREATE POLICY "rankings_insert_own"
    ON public.fighter_rankings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rankings_update_own" ON public.fighter_rankings;
CREATE POLICY "rankings_update_own"
    ON public.fighter_rankings FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rankings_delete_own" ON public.fighter_rankings;
CREATE POLICY "rankings_delete_own"
    ON public.fighter_rankings FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Vista enriquecida con datos del autor (respeta RLS del invocador)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.fighter_rankings_with_users;
CREATE VIEW public.fighter_rankings_with_users
WITH (security_invoker = true)
AS
SELECT
    r.id,
    r.user_id,
    r.division,
    r.entries,
    r.is_public,
    r.created_at,
    r.updated_at,
    p.display_name AS author_display_name,
    p.avatar_url   AS author_avatar_url
FROM public.fighter_rankings r
LEFT JOIN public.profiles p ON p.id = r.user_id;

-- ----------------------------------------------------------------------------
-- Realtime
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND tablename = 'fighter_rankings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.fighter_rankings;
    END IF;
END $$;
