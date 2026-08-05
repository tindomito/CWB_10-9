-- ============================================================================
-- 10-9 · Guardados / favoritos (publicaciones y rankings)
--
-- Tabla polimórfica: un usuario guarda items de distintos tipos.
-- Los guardados son privados (solo el dueño los ve).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.saved_items (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_type   text NOT NULL CHECK (item_type IN ('publication', 'ranking')),
    item_id     uuid NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_items_user ON public.saved_items (user_id, created_at DESC);

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_items_select_own" ON public.saved_items;
CREATE POLICY "saved_items_select_own"
    ON public.saved_items FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_items_insert_own" ON public.saved_items;
CREATE POLICY "saved_items_insert_own"
    ON public.saved_items FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_items_delete_own" ON public.saved_items;
CREATE POLICY "saved_items_delete_own"
    ON public.saved_items FOR DELETE USING (auth.uid() = user_id);
