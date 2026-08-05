-- ============================================================================
-- 17. Correcciones sobre objetos creados desde el panel de Supabase
--
-- Las tablas `profiles`, `publications` y `private_messages` (y sus vistas) se
-- crearon desde el dashboard, así que no tienen un archivo propio en esta
-- carpeta. Los arreglos que se les fueron aplicando viven acá para que el
-- esquema sea reproducible: si alguien levanta el proyecto de cero, tiene que
-- correr este archivo también.
--
-- Todo es idempotente: se puede ejecutar más de una vez sin efectos.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Vistas sobre datos privados: aplicar el RLS de la tabla subyacente
--
-- En Postgres una vista NO hereda el RLS de sus tablas: corre con los permisos
-- de su dueño salvo que se marque `security_invoker`. Estas dos vistas exponen
-- datos personales y el cliente las consulta confiando en RLS, así que sin esta
-- opción devolvían las filas de TODOS los usuarios:
--
--   * notifications_enriched      → las notificaciones de cualquiera
--   * private_messages_with_users → los mensajes directos de cualquiera
--
-- Las políticas de las tablas base ya son correctas (`auth.uid() = user_id` en
-- notifications; sender/receiver en private_messages); lo que faltaba era que
-- las vistas las respetaran.
-- ----------------------------------------------------------------------------
ALTER VIEW public.notifications_enriched     SET (security_invoker = true);
ALTER VIEW public.private_messages_with_users SET (security_invoker = true);


-- ----------------------------------------------------------------------------
-- 2. profiles.rango: default coherente con el CHECK
--
-- Al renombrar los rangos se agregó el CHECK con los nombres nuevos
-- ('Amateur', 'Prospecto', ...) pero el DEFAULT de la columna quedó en
-- 'Novato', que ya no es un valor válido.
--
-- Efecto: el trigger handle_new_user() inserta el perfil sin especificar rango,
-- tomaba el default inválido, el CHECK lo rechazaba y el alta fallaba con
-- "Database error saving new user". Ningún usuario nuevo podía registrarse.
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ALTER COLUMN rango SET DEFAULT 'Amateur';


-- ----------------------------------------------------------------------------
-- 3. publications: permitir que un admin borre cualquier publicación
--
-- El frontend muestra el botón de borrar al dueño Y a los admins, pero en la
-- base solo existía la política del dueño. Un DELETE bloqueado por RLS no
-- devuelve error (afecta 0 filas), así que la UI daba el borrado por exitoso y
-- la publicación reaparecía al recargar.
--
-- Convive con "Users can delete their own publications": basta con que UNA
-- política permita la operación.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "publications_delete_admin" ON public.publications;
CREATE POLICY "publications_delete_admin"
    ON public.publications FOR DELETE
    USING ((SELECT pro FROM public.profiles WHERE id = auth.uid()) = true);
