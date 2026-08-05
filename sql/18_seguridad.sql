-- ============================================================================
-- 18. Correcciones de seguridad
--
-- Hallazgos de una auditoría sobre RLS, funciones SECURITY DEFINER y Storage.
-- Ordenado por severidad. Todo es idempotente.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- CRÍTICO 1 · Cualquier usuario podía otorgarse XP ilimitado
--
-- award_xp() y compañía son SECURITY DEFINER (escriben saltando RLS) y estaban
-- expuestas a `anon` y `authenticated` vía PostgREST. Reciben el user_id por
-- parámetro y NO lo validan contra auth.uid(), así que bastaba con:
--
--     supabase.rpc('award_xp', { p_user_id: <mi id>, p_amount: 999999, ... })
--
-- para subir a Champion y encabezar el leaderboard. Lo mismo permitía crear
-- notificaciones a nombre de cualquiera.
--
-- Estas funciones son INTERNAS: las llaman triggers y otras funciones
-- SECURITY DEFINER (que conservan los privilegios del dueño), nunca el cliente
-- —verificado contra los .rpc() del frontend—. Por eso se revoca el acceso
-- directo en lugar de agregarles validaciones.
-- ----------------------------------------------------------------------------
-- Se revoca de PUBLIC, no de `anon`/`authenticated`: Postgres otorga EXECUTE a
-- PUBLIC al crear una función, y esos dos roles lo heredan de ahí. Revocarles
-- el permiso directo no alcanza — la función sigue siendo invocable.
-- `service_role` y `postgres` mantienen su grant explícito.
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, int, text, jsonb)             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_fight_predictions(text)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_award_ppv_bonus(text)              FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.snapshot_community_for_fight(text)           FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                            FROM PUBLIC;

-- NOTA: admin_resolve_fight, admin_suspend_user y admin_lift_suspension SÍ
-- siguen expuestas — son RPC que usa la app — pero validan internamente que
-- quien llama sea admin (profiles.pro), así que están bien.


-- ----------------------------------------------------------------------------
-- CRÍTICO 2 · Cualquier usuario logueado podía borrar o pisar CUALQUIER imagen
--
-- Dos políticas creadas desde el panel quedaron con la condición
-- `auth.uid() IS NOT NULL`: se llaman "their own" pero no comprueban la
-- pertenencia del archivo. Como las políticas se combinan con OR, la permisiva
-- anulaba a la correcta.
--
-- Efecto: un usuario cualquiera podía borrar todas las fotos de perfil y las
-- imágenes de todas las publicaciones de la app.
--
-- Se eliminan. Quedan vigentes las que sí validan la carpeta del usuario:
--   · "Users can delete their own images"  → (auth.uid())::text = foldername(name)[1]
--   · "Users can delete their own avatar"  → name LIKE 'avatars/<uid>.%'
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can delete their own images 1hys5dx_0" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images 1hys5dx_0" ON storage.objects;


-- ----------------------------------------------------------------------------
-- CRÍTICO 3 · La tabla follows no tenía RLS
--
-- Era la única tabla del esquema público sin RLS ni políticas: cualquiera podía
-- insertar o borrar follows en nombre de otro usuario (inflar seguidores, o
-- hacer que alguien dejara de seguir a otro).
-- ----------------------------------------------------------------------------
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Quién sigue a quién es información pública en la app (se muestran los
-- contadores y las listas de seguidores).
DROP POLICY IF EXISTS "follows_select_all" ON public.follows;
CREATE POLICY "follows_select_all"
    ON public.follows FOR SELECT USING (true);

-- Pero solo uno mismo puede seguir o dejar de seguir.
DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
CREATE POLICY "follows_insert_own"
    ON public.follows FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "follows_delete_own" ON public.follows;
CREATE POLICY "follows_delete_own"
    ON public.follows FOR DELETE
    USING (auth.uid() = follower_id);


-- ----------------------------------------------------------------------------
-- MEDIO 4 · El bucket aceptaba cualquier archivo, de cualquier tamaño
--
-- La validación de tipo y peso vivía solo en el cliente (`validateImageFile`),
-- que se puede saltear llamando a la API de Storage directamente. Sin límites
-- en el servidor era posible subir archivos enormes o, peor, un .html: el
-- bucket es público y Supabase lo serviría con su content-type, quedando un
-- XSS alojado en el dominio del proyecto.
--
-- Se replican en el servidor los límites del cliente. La lista es idéntica a la
-- de validateImageFile() para que ningún archivo que el cliente acepta sea
-- rechazado después por el servidor (incluye 'image/jpg', que no es un tipo
-- estándar pero algunos navegadores envían).
--
-- Deliberadamente NO incluye 'image/svg+xml': un SVG puede contener JavaScript
-- y el bucket es público.
--
-- Verificado sobre los 44 archivos ya subidos (png, jpeg, webp; el mayor pesa
-- 1,1 MB): ninguno queda fuera de estos límites.
-- ----------------------------------------------------------------------------
UPDATE storage.buckets
   SET file_size_limit = 5242880,  -- 5 MB, igual que validateImageFile()
       allowed_mime_types = ARRAY[
           'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
       ]
 WHERE id = 'post-images';


-- ----------------------------------------------------------------------------
-- MEDIO 5 · Vistas que ignoran el RLS de sus tablas
--
-- Sin `security_invoker` una vista corre con los permisos de su dueño. Estas
-- exponen datos que hoy YA son públicos por las políticas de sus tablas, así
-- que no hay fuga actual — pero si mañana se restringe alguna tabla, la vista
-- seguiría entregando todo. Se alinean por defensa en profundidad.
--
-- (notifications_enriched y private_messages_with_users se corrigieron antes;
--  ver 17_fixes_objetos_dashboard.sql.)
-- ----------------------------------------------------------------------------
ALTER VIEW public.publications_with_users   SET (security_invoker = true);
ALTER VIEW public.posts_with_users          SET (security_invoker = true);
ALTER VIEW public.comments_with_users       SET (security_invoker = true);
ALTER VIEW public.predictions_with_fights   SET (security_invoker = true);
ALTER VIEW public.community_scorecards      SET (security_invoker = true);
ALTER VIEW public.chat_messages_with_users  SET (security_invoker = true);
ALTER VIEW public.chat_active_suspensions   SET (security_invoker = true);
ALTER VIEW public.hall_of_fame_leaderboard  SET (security_invoker = true);
ALTER VIEW public.leaderboard_alltime       SET (security_invoker = true);
ALTER VIEW public.leaderboard_monthly       SET (security_invoker = true);
ALTER VIEW public.events_with_predictions   SET (security_invoker = true);
