-- ============================================================================
-- 19. Políticas de Storage para las fotos de portada
--
-- Contexto: los archivos del bucket siguen tres patrones distintos, y solo dos
-- estaban contemplados en las políticas:
--
--   <uid>/<timestamp>.ext   imágenes de publicaciones  → "…their own images"
--   avatars/<uid>.ext       avatar de perfil           → "…their own avatar"
--   covers/<uid>.ext        foto de portada            → SIN POLÍTICA
--
-- La política genérica de imágenes valida `foldername(name)[1] = auth.uid()`,
-- que para "covers/<uid>.png" evalúa la carpeta "covers" y nunca coincide. Las
-- portadas funcionaban solo porque existía una política suelta con la condición
-- `auth.uid() IS NOT NULL`, que permitía a cualquiera modificar cualquier
-- archivo; al eliminarla (ver 18_seguridad.sql) las portadas se quedaron sin
-- ninguna regla que las habilitara.
--
-- Se agregan las tres que faltaban, calcadas de las del avatar: cada usuario
-- puede subir, reemplazar y borrar únicamente la portada que lleva su id.
-- ============================================================================

DROP POLICY IF EXISTS "Users can upload their own cover" ON storage.objects;
CREATE POLICY "Users can upload their own cover"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'post-images'
        AND name LIKE 'covers/' || auth.uid()::text || '.%'
    );

DROP POLICY IF EXISTS "Users can update their own cover" ON storage.objects;
CREATE POLICY "Users can update their own cover"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
        bucket_id = 'post-images'
        AND name LIKE 'covers/' || auth.uid()::text || '.%'
    )
    WITH CHECK (
        bucket_id = 'post-images'
        AND name LIKE 'covers/' || auth.uid()::text || '.%'
    );

DROP POLICY IF EXISTS "Users can delete their own cover" ON storage.objects;
CREATE POLICY "Users can delete their own cover"
    ON storage.objects FOR DELETE TO authenticated
    USING (
        bucket_id = 'post-images'
        AND name LIKE 'covers/' || auth.uid()::text || '.%'
    );


-- ----------------------------------------------------------------------------
-- Limpieza de los archivos "undefined"
--
-- Un error en el frontend (no se desestructuraba el resultado de
-- getCurrentUser(), así que el id llegaba como undefined) hizo que todos los
-- avatares y portadas se guardaran como "avatars/undefined.ext" y
-- "covers/undefined.ext": un único archivo por extensión, compartido por toda
-- la app. Cada usuario que subía una foto pisaba la del anterior.
--
-- Corregido el frontend, estos archivos quedan huérfanos. Los perfiles que aún
-- los referencien pierden la imagen y tendrán que volver a subirla — es
-- inevitable: esas fotos ya no pertenecían a nadie en particular.
--
-- Se listan primero; el DELETE queda comentado para ejecutarlo a conciencia.
-- ----------------------------------------------------------------------------
SELECT name, owner_id, created_at
  FROM storage.objects
 WHERE bucket_id = 'post-images'
   AND (name LIKE 'avatars/undefined.%' OR name LIKE 'covers/undefined.%')
 ORDER BY name;

-- DELETE FROM storage.objects
--  WHERE bucket_id = 'post-images'
--    AND (name LIKE 'avatars/undefined.%' OR name LIKE 'covers/undefined.%');
