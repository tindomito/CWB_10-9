-- ============================================================================
-- 10-9 · Chats grupales (estilo WhatsApp / Instagram)
--
-- Permite a cualquier usuario crear grupos, invitar miembros, mandar mensajes
-- en común. Las invitaciones aparecen como notificaciones tipo "group_invite"
-- en el sistema de notificaciones existente.
--
-- Roles: owner (1 por grupo), admin (varios), member (resto).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Tablas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_groups (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
    description text,
    avatar_url  text,
    creator_id  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_group_members (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    uuid        NOT NULL REFERENCES public.chat_groups(id)  ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES public.profiles(id)     ON DELETE CASCADE,
    role        text        NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
    joined_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user  ON public.chat_group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.chat_group_members (group_id);

CREATE TABLE IF NOT EXISTS public.chat_group_messages (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    uuid        NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    sender_id   uuid        NOT NULL REFERENCES public.profiles(id)    ON DELETE CASCADE,
    content     text        NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_date
    ON public.chat_group_messages (group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.chat_group_invitations (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id        uuid        NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
    inviter_id      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    invitee_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status          text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','accepted','rejected','cancelled')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    responded_at    timestamptz,
    -- Solo una invitación pendiente por (grupo, invitee) a la vez
    UNIQUE (group_id, invitee_id, status)
);

CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee_pending
    ON public.chat_group_invitations (invitee_id)
    WHERE status = 'pending';

-- ----------------------------------------------------------------------------
-- 2. Helpers: ¿el usuario es miembro / admin del grupo?
--    IMPORTANTE: SECURITY DEFINER es obligatorio. Estas funciones se usan
--    desde las propias policies de chat_group_members, y si corrieran como
--    SECURITY INVOKER aplicarían RLS al SELECT interno → recursión infinita
--    (Postgres lo corta devolviendo filas vacías sin error visible).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE group_id = p_group_id AND user_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(p_group_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE group_id = p_group_id
          AND user_id = p_user_id
          AND role IN ('owner','admin')
    );
$$;

-- ----------------------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE public.chat_groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_group_invitations ENABLE ROW LEVEL SECURITY;

-- chat_groups: lectura si soy miembro o tengo invitación pendiente
DROP POLICY IF EXISTS "groups_select_member_or_invited" ON public.chat_groups;
CREATE POLICY "groups_select_member_or_invited" ON public.chat_groups FOR SELECT
    USING (
        public.is_group_member(id, auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.chat_group_invitations
            WHERE group_id = chat_groups.id
              AND invitee_id = auth.uid()
              AND status = 'pending'
        )
    );

-- chat_group_members: lectura si comparto el grupo
DROP POLICY IF EXISTS "group_members_select_shared" ON public.chat_group_members;
CREATE POLICY "group_members_select_shared" ON public.chat_group_members FOR SELECT
    USING (public.is_group_member(group_id, auth.uid()));

-- chat_group_messages: lectura solo si soy miembro
DROP POLICY IF EXISTS "group_messages_select_member" ON public.chat_group_messages;
CREATE POLICY "group_messages_select_member" ON public.chat_group_messages FOR SELECT
    USING (public.is_group_member(group_id, auth.uid()));

-- chat_group_messages: insert solo si soy miembro y soy el sender
DROP POLICY IF EXISTS "group_messages_insert_member" ON public.chat_group_messages;
CREATE POLICY "group_messages_insert_member" ON public.chat_group_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND public.is_group_member(group_id, auth.uid())
    );

-- chat_group_messages: delete solo el sender o admin/owner del grupo
DROP POLICY IF EXISTS "group_messages_delete_owner_or_admin" ON public.chat_group_messages;
CREATE POLICY "group_messages_delete_owner_or_admin" ON public.chat_group_messages FOR DELETE
    USING (
        auth.uid() = sender_id
        OR public.is_group_admin(group_id, auth.uid())
    );

-- chat_group_invitations: lectura solo si soy invitee o inviter
DROP POLICY IF EXISTS "group_invitations_select_involved" ON public.chat_group_invitations;
CREATE POLICY "group_invitations_select_involved" ON public.chat_group_invitations FOR SELECT
    USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);

-- Resto de mutaciones (groups, members, invitations) van vía RPCs SECURITY DEFINER.

-- ----------------------------------------------------------------------------
-- 4. Realtime
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND tablename = 'chat_group_messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND tablename = 'chat_group_invitations') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_invitations;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND tablename = 'chat_group_members') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_members;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND tablename = 'chat_groups') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_groups;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Vistas enriquecidas
-- ----------------------------------------------------------------------------

-- Grupos donde el usuario actual es miembro, con preview del último mensaje
DROP VIEW IF EXISTS public.my_groups;
CREATE VIEW public.my_groups
WITH (security_invoker = true)  -- respeta RLS del invocador
AS
SELECT
    g.id,
    g.name,
    g.description,
    g.avatar_url,
    g.creator_id,
    g.created_at,
    g.updated_at,
    me.role             AS my_role,
    me.joined_at        AS my_joined_at,
    (SELECT COUNT(*) FROM public.chat_group_members WHERE group_id = g.id)::int AS member_count,
    last_msg.content    AS last_message,
    last_msg.created_at AS last_message_at,
    last_msg.sender_id  AS last_message_sender_id,
    last_sender.display_name AS last_message_sender_name
FROM public.chat_groups g
JOIN public.chat_group_members me ON me.group_id = g.id AND me.user_id = auth.uid()
LEFT JOIN LATERAL (
    SELECT content, created_at, sender_id
      FROM public.chat_group_messages
     WHERE group_id = g.id
     ORDER BY created_at DESC
     LIMIT 1
) last_msg ON true
LEFT JOIN public.profiles last_sender ON last_sender.id = last_msg.sender_id;

-- Miembros de un grupo con display_name + avatar
DROP VIEW IF EXISTS public.group_members_enriched;
CREATE VIEW public.group_members_enriched
WITH (security_invoker = true)
AS
SELECT
    m.id,
    m.group_id,
    m.user_id,
    m.role,
    m.joined_at,
    p.display_name,
    p.avatar_url,
    p.rango,
    p.level
FROM public.chat_group_members m
JOIN public.profiles p ON p.id = m.user_id;

-- Mensajes con info del sender
DROP VIEW IF EXISTS public.chat_group_messages_enriched;
CREATE VIEW public.chat_group_messages_enriched
WITH (security_invoker = true)
AS
SELECT
    m.id,
    m.group_id,
    m.sender_id,
    m.content,
    m.created_at,
    p.display_name AS sender_display_name,
    p.avatar_url   AS sender_avatar_url,
    COALESCE(p.pro, false) AS sender_is_admin
FROM public.chat_group_messages m
LEFT JOIN public.profiles p ON p.id = m.sender_id;

-- Invitaciones pendientes para el usuario actual, con info de grupo/inviter
DROP VIEW IF EXISTS public.my_pending_invitations;
CREATE VIEW public.my_pending_invitations
WITH (security_invoker = true)
AS
SELECT
    i.id,
    i.group_id,
    i.inviter_id,
    i.created_at,
    g.name              AS group_name,
    g.avatar_url        AS group_avatar_url,
    g.description       AS group_description,
    (SELECT COUNT(*) FROM public.chat_group_members WHERE group_id = g.id)::int AS group_member_count,
    inviter.display_name AS inviter_display_name,
    inviter.avatar_url   AS inviter_avatar_url
FROM public.chat_group_invitations i
JOIN public.chat_groups g ON g.id = i.group_id
LEFT JOIN public.profiles inviter ON inviter.id = i.inviter_id
WHERE i.invitee_id = auth.uid()
  AND i.status = 'pending';

-- ============================================================================
-- 6. RPCs (todas SECURITY DEFINER)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- create_group: crea grupo + agrega creator como owner
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_group(
    p_name        text,
    p_description text DEFAULT NULL,
    p_avatar_url  text DEFAULT NULL
)
RETURNS public.chat_groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_group public.chat_groups%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
        RAISE EXCEPTION 'El nombre del grupo es obligatorio';
    END IF;

    INSERT INTO public.chat_groups (name, description, avatar_url, creator_id)
    VALUES (trim(p_name), nullif(trim(p_description), ''), nullif(trim(p_avatar_url), ''), auth.uid())
    RETURNING * INTO v_group;

    INSERT INTO public.chat_group_members (group_id, user_id, role)
    VALUES (v_group.id, auth.uid(), 'owner');

    RETURN v_group;
END;
$$;

-- ----------------------------------------------------------------------------
-- update_group: editar info del grupo (owner/admin)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_group(
    p_group_id    uuid,
    p_name        text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_avatar_url  text DEFAULT NULL
)
RETURNS public.chat_groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_group public.chat_groups%ROWTYPE;
BEGIN
    IF NOT public.is_group_admin(p_group_id, auth.uid()) THEN
        RAISE EXCEPTION 'Solo owner o admin pueden editar el grupo';
    END IF;

    UPDATE public.chat_groups
       SET name        = COALESCE(nullif(trim(p_name), ''), name),
           description = CASE WHEN p_description IS NULL THEN description ELSE nullif(trim(p_description), '') END,
           avatar_url  = CASE WHEN p_avatar_url  IS NULL THEN avatar_url  ELSE nullif(trim(p_avatar_url),  '') END,
           updated_at  = now()
     WHERE id = p_group_id
    RETURNING * INTO v_group;

    RETURN v_group;
END;
$$;

-- ----------------------------------------------------------------------------
-- invite_to_group: enviar invitación (cualquier miembro puede invitar)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invite_to_group(
    p_group_id   uuid,
    p_invitee_id uuid
)
RETURNS public.chat_group_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.chat_group_invitations%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF NOT public.is_group_member(p_group_id, auth.uid()) THEN
        RAISE EXCEPTION 'Solo miembros del grupo pueden invitar';
    END IF;
    IF p_invitee_id = auth.uid() THEN
        RAISE EXCEPTION 'No te podés invitar a vos mismo';
    END IF;
    IF public.is_group_member(p_group_id, p_invitee_id) THEN
        RAISE EXCEPTION 'Ese usuario ya es miembro del grupo';
    END IF;

    -- Si existe invitación pendiente, devolverla en vez de duplicar
    SELECT * INTO v_row
    FROM public.chat_group_invitations
    WHERE group_id = p_group_id
      AND invitee_id = p_invitee_id
      AND status = 'pending';

    IF FOUND THEN
        RETURN v_row;
    END IF;

    INSERT INTO public.chat_group_invitations (group_id, inviter_id, invitee_id, status)
    VALUES (p_group_id, auth.uid(), p_invitee_id, 'pending')
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$;

-- ----------------------------------------------------------------------------
-- accept_invitation: el invitee acepta y se agrega como member
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_invitation(p_invitation_id uuid)
RETURNS public.chat_group_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv    public.chat_group_invitations%ROWTYPE;
    v_member public.chat_group_members%ROWTYPE;
BEGIN
    SELECT * INTO v_inv FROM public.chat_group_invitations WHERE id = p_invitation_id;
    IF NOT FOUND OR v_inv.invitee_id <> auth.uid() THEN
        RAISE EXCEPTION 'Invitación no encontrada';
    END IF;
    IF v_inv.status <> 'pending' THEN
        RAISE EXCEPTION 'Esta invitación ya fue respondida (%)', v_inv.status;
    END IF;

    -- Agregar como member (si ya era, no hacemos nada por el UNIQUE)
    INSERT INTO public.chat_group_members (group_id, user_id, role)
    VALUES (v_inv.group_id, auth.uid(), 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING
    RETURNING * INTO v_member;

    -- Si ya existía como miembro, traerlo
    IF v_member.id IS NULL THEN
        SELECT * INTO v_member
        FROM public.chat_group_members
        WHERE group_id = v_inv.group_id AND user_id = auth.uid();
    END IF;

    UPDATE public.chat_group_invitations
       SET status = 'accepted', responded_at = now()
     WHERE id = p_invitation_id;

    RETURN v_member;
END;
$$;

-- ----------------------------------------------------------------------------
-- reject_invitation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv public.chat_group_invitations%ROWTYPE;
BEGIN
    SELECT * INTO v_inv FROM public.chat_group_invitations WHERE id = p_invitation_id;
    IF NOT FOUND OR v_inv.invitee_id <> auth.uid() THEN
        RAISE EXCEPTION 'Invitación no encontrada';
    END IF;
    IF v_inv.status <> 'pending' THEN
        RAISE EXCEPTION 'Esta invitación ya fue respondida';
    END IF;

    UPDATE public.chat_group_invitations
       SET status = 'rejected', responded_at = now()
     WHERE id = p_invitation_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- leave_group: el miembro se va. Si era el último owner, promueve al admin
-- más antiguo o al member más antiguo. Si era el último miembro, borra grupo.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_group(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_my_role text;
    v_remaining int;
    v_next_owner uuid;
BEGIN
    SELECT role INTO v_my_role
    FROM public.chat_group_members
    WHERE group_id = p_group_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No sos miembro de este grupo';
    END IF;

    DELETE FROM public.chat_group_members
    WHERE group_id = p_group_id AND user_id = auth.uid();

    -- ¿Quedan miembros?
    SELECT COUNT(*) INTO v_remaining
    FROM public.chat_group_members
    WHERE group_id = p_group_id;

    IF v_remaining = 0 THEN
        DELETE FROM public.chat_groups WHERE id = p_group_id;
        RETURN;
    END IF;

    -- Si yo era el único owner, promover a alguien
    IF v_my_role = 'owner' AND NOT EXISTS (
        SELECT 1 FROM public.chat_group_members
        WHERE group_id = p_group_id AND role = 'owner'
    ) THEN
        SELECT user_id INTO v_next_owner
        FROM public.chat_group_members
        WHERE group_id = p_group_id
        ORDER BY (role = 'admin') DESC, joined_at ASC
        LIMIT 1;

        UPDATE public.chat_group_members
           SET role = 'owner'
         WHERE group_id = p_group_id AND user_id = v_next_owner;
    END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- remove_member: kick. Solo owner/admin. No se puede remover al owner.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_group_member(
    p_group_id uuid,
    p_user_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_role text;
BEGIN
    IF NOT public.is_group_admin(p_group_id, auth.uid()) THEN
        RAISE EXCEPTION 'Solo owner o admin pueden remover miembros';
    END IF;
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Usá leave_group para salirte vos mismo';
    END IF;

    SELECT role INTO v_target_role
    FROM public.chat_group_members
    WHERE group_id = p_group_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El usuario no es miembro del grupo';
    END IF;
    IF v_target_role = 'owner' THEN
        RAISE EXCEPTION 'No se puede remover al owner';
    END IF;

    DELETE FROM public.chat_group_members
    WHERE group_id = p_group_id AND user_id = p_user_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- change_member_role: solo owner. Promueve member→admin o demota admin→member.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.change_member_role(
    p_group_id uuid,
    p_user_id  uuid,
    p_role     text
)
RETURNS public.chat_group_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_my_role text;
    v_row     public.chat_group_members%ROWTYPE;
BEGIN
    IF p_role NOT IN ('admin','member') THEN
        RAISE EXCEPTION 'Rol inválido (solo admin o member; el owner se transfiere con leave_group)';
    END IF;

    SELECT role INTO v_my_role
    FROM public.chat_group_members
    WHERE group_id = p_group_id AND user_id = auth.uid();

    IF v_my_role <> 'owner' THEN
        RAISE EXCEPTION 'Solo el owner puede cambiar roles';
    END IF;
    IF p_user_id = auth.uid() THEN
        RAISE EXCEPTION 'No podés cambiar tu propio rol';
    END IF;

    UPDATE public.chat_group_members
       SET role = p_role
     WHERE group_id = p_group_id AND user_id = p_user_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El usuario no es miembro del grupo';
    END IF;
    RETURN v_row;
END;
$$;

-- ----------------------------------------------------------------------------
-- transfer_group_ownership: pasa el rol owner a otro miembro.
-- El owner actual queda como admin. Solo el owner puede hacerlo.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_group_ownership(
    p_group_id      uuid,
    p_new_owner_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_my_role     text;
    v_target_role text;
BEGIN
    SELECT role INTO v_my_role
      FROM public.chat_group_members
     WHERE group_id = p_group_id AND user_id = auth.uid();

    IF v_my_role IS NULL OR v_my_role <> 'owner' THEN
        RAISE EXCEPTION 'Solo el owner puede transferir ownership';
    END IF;
    IF p_new_owner_id = auth.uid() THEN
        RAISE EXCEPTION 'Ya sos el owner';
    END IF;

    SELECT role INTO v_target_role
      FROM public.chat_group_members
     WHERE group_id = p_group_id AND user_id = p_new_owner_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El usuario no es miembro del grupo';
    END IF;

    UPDATE public.chat_group_members SET role = 'admin'
     WHERE group_id = p_group_id AND user_id = auth.uid();

    UPDATE public.chat_group_members SET role = 'owner'
     WHERE group_id = p_group_id AND user_id = p_new_owner_id;
END;
$$;

-- ============================================================================
-- 7. Trigger: invitación enviada → crear notificación tipo group_invite
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_notify_group_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_group_name text;
BEGIN
    SELECT name INTO v_group_name FROM public.chat_groups WHERE id = NEW.group_id;

    PERFORM public.create_notification(
        NEW.invitee_id,
        NEW.inviter_id,
        'group_invite',
        jsonb_build_object(
            'invitation_id', NEW.id,
            'group_id', NEW.group_id,
            'group_name', v_group_name
        )
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_group_invite ON public.chat_group_invitations;
CREATE TRIGGER trg_notif_group_invite
    AFTER INSERT ON public.chat_group_invitations
    FOR EACH ROW
    WHEN (NEW.status = 'pending')
    EXECUTE FUNCTION public.trg_notify_group_invitation();
