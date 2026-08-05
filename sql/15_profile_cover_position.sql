-- ============================================================================
-- 10-9 · Posición vertical de la foto de portada
--
-- cover_position: 0 = mostrar la parte superior de la imagen,
--                 100 = mostrar la parte inferior. Se aplica como object-position Y%.
-- Permite encuadrar una imagen ancha en el banner bajo del perfil.
-- ============================================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS cover_position int NOT NULL DEFAULT 50;
