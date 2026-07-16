/**
 * Servicio de chats grupales.
 * Tablas: chat_groups, chat_group_members, chat_group_messages, chat_group_invitations.
 * Vistas: my_groups, group_members_enriched, chat_group_messages_enriched, my_pending_invitations.
 *
 * Toda mutación de grupos / miembros / invitaciones va vía RPC SECURITY DEFINER
 * (definido en sql/10_chat_groups.sql).
 */
import { supabase } from './supabase.js';

// ---------------------------------------------------------------------------
// Grupos
// ---------------------------------------------------------------------------

/** Lista los grupos donde soy miembro, ordenados por último mensaje. */
export async function getMyGroups() {
    const { data, error } = await supabase
        .from('my_groups')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });
    if (error) return { groups: [], error };
    return { groups: data || [], error: null };
}

/** Trae un grupo (solo si soy miembro o tengo invitación pendiente). */
export async function getGroup(groupId) {
    const { data, error } = await supabase
        .from('chat_groups')
        .select('*')
        .eq('id', groupId)
        .single();
    if (error) return { group: null, error };
    return { group: data, error: null };
}

export async function createGroup({ name, description = null, avatarUrl = null } = {}) {
    if (!name || !name.trim()) {
        return { group: null, error: { message: 'El nombre del grupo es obligatorio' } };
    }
    const { data, error } = await supabase.rpc('create_group', {
        p_name: name,
        p_description: description,
        p_avatar_url: avatarUrl
    });
    if (error) return { group: null, error };
    return { group: data, error: null };
}

export async function updateGroup(groupId, { name, description, avatarUrl } = {}) {
    if (!groupId) return { group: null, error: { message: 'Falta groupId' } };
    const { data, error } = await supabase.rpc('update_group', {
        p_group_id: groupId,
        p_name: name ?? null,
        p_description: description ?? null,
        p_avatar_url: avatarUrl ?? null
    });
    if (error) return { group: null, error };
    return { group: data, error: null };
}

// ---------------------------------------------------------------------------
// Miembros
// ---------------------------------------------------------------------------

export async function getGroupMembers(groupId) {
    const { data, error } = await supabase
        .from('group_members_enriched')
        .select('*')
        .eq('group_id', groupId)
        .order('role', { ascending: true })  // owner < admin < member alfabéticamente
        .order('joined_at', { ascending: true });
    if (error) return { members: [], error };
    return { members: data || [], error: null };
}

export async function removeMember(groupId, userId) {
    const { error } = await supabase.rpc('remove_group_member', {
        p_group_id: groupId,
        p_user_id: userId
    });
    if (error) return { success: false, error };
    return { success: true, error: null };
}

export async function changeMemberRole(groupId, userId, role) {
    if (!['admin', 'member'].includes(role)) {
        return { member: null, error: { message: 'Rol inválido' } };
    }
    const { data, error } = await supabase.rpc('change_member_role', {
        p_group_id: groupId,
        p_user_id: userId,
        p_role: role
    });
    if (error) return { member: null, error };
    return { member: data, error: null };
}

/**
 * Transferir ownership de un grupo a otro miembro.
 * El owner actual queda como admin.
 */
export async function transferOwnership(groupId, newOwnerId) {
    const { error } = await supabase.rpc('transfer_group_ownership', {
        p_group_id: groupId,
        p_new_owner_id: newOwnerId
    });
    if (error) return { success: false, error };
    return { success: true, error: null };
}

export async function leaveGroup(groupId) {
    const { error } = await supabase.rpc('leave_group', { p_group_id: groupId });
    if (error) return { success: false, error };
    return { success: true, error: null };
}

// ---------------------------------------------------------------------------
// Invitaciones
// ---------------------------------------------------------------------------

export async function inviteToGroup(groupId, inviteeId) {
    const { data, error } = await supabase.rpc('invite_to_group', {
        p_group_id: groupId,
        p_invitee_id: inviteeId
    });
    if (error) return { invitation: null, error };
    return { invitation: data, error: null };
}

export async function getMyPendingInvitations() {
    const { data, error } = await supabase
        .from('my_pending_invitations')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) return { invitations: [], error };
    return { invitations: data || [], error: null };
}

export async function acceptInvitation(invitationId) {
    const { data, error } = await supabase.rpc('accept_invitation', {
        p_invitation_id: invitationId
    });
    if (error) return { member: null, error };
    return { member: data, error: null };
}

export async function rejectInvitation(invitationId) {
    const { error } = await supabase.rpc('reject_invitation', {
        p_invitation_id: invitationId
    });
    if (error) return { success: false, error };
    return { success: true, error: null };
}

// ---------------------------------------------------------------------------
// Mensajes del grupo
// ---------------------------------------------------------------------------

/**
 * Últimos `limit` mensajes del grupo, en orden cronológico.
 * Descendente + limit para quedarnos con los más NUEVOS (con ascendente,
 * al superar el límite se mostraban los 200 más viejos y los mensajes
 * recientes quedaban afuera). Se invierte antes de devolver.
 */
export async function getGroupMessages(groupId, { limit = 100 } = {}) {
    const { data, error } = await supabase
        .from('chat_group_messages_enriched')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(limit);
    if (error) return { messages: [], error };
    return { messages: (data || []).reverse(), error: null };
}

export async function sendGroupMessage(groupId, senderId, content) {
    if (!content || !content.trim()) {
        return { message: null, error: { message: 'El mensaje no puede estar vacío' } };
    }
    const { data, error } = await supabase
        .from('chat_group_messages')
        .insert({ group_id: groupId, sender_id: senderId, content: content.trim() })
        .select()
        .single();
    if (error) return { message: null, error };
    return { message: data, error: null };
}

export async function deleteGroupMessage(messageId) {
    const { error } = await supabase
        .from('chat_group_messages')
        .delete()
        .eq('id', messageId);
    if (error) return { success: false, error };
    return { success: true, error: null };
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

export function subscribeToGroupMessages(groupId, onNewMessage) {
    if (!groupId) return null;
    const channel = supabase.channel(`group_messages_${groupId}`);
    channel
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_group_messages',
            filter: `group_id=eq.${groupId}`
        }, async (payload) => {
            // Releer con la vista enriquecida para tener sender_display_name
            const { data } = await supabase
                .from('chat_group_messages_enriched')
                .select('*')
                .eq('id', payload.new.id)
                .single();
            if (data && onNewMessage) onNewMessage(data);
        })
        .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'chat_group_messages',
            filter: `group_id=eq.${groupId}`
        }, (payload) => {
            if (onNewMessage) onNewMessage({ _deleted: true, id: payload.old.id });
        })
        .subscribe();
    return channel;
}

/** Realtime para que la lista de grupos se actualice cuando llegan mensajes nuevos. */
export function subscribeToMyGroups(onChange) {
    const channel = supabase.channel('my_groups_changes');
    channel
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'chat_group_messages'
        }, () => onChange?.())
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'chat_group_members'
        }, () => onChange?.())
        .subscribe();
    return channel;
}

/** Realtime para invitaciones pendientes (badge). */
export function subscribeToMyInvitations(userId, onChange) {
    if (!userId) return null;
    const channel = supabase.channel(`my_invitations_${userId}`);
    channel
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'chat_group_invitations',
            filter: `invitee_id=eq.${userId}`
        }, () => onChange?.())
        .subscribe();
    return channel;
}

export function unsubscribeGroupChannel(channel) {
    if (channel) channel.unsubscribe();
}
