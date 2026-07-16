/**
 * Servicio de notificaciones in-app.
 *
 * Trabaja contra la vista `notifications_enriched` (trae actor display_name +
 * avatar joineados) y los triggers SQL definidos en sql/09_notifications_system.sql.
 *
 * Cualquier evento nuevo (ej: invitación a grupo) se agrega como un type nuevo,
 * un trigger nuevo y un caso nuevo en el componente NotificationItem.
 */
import { supabase } from './supabase.js';

/**
 * Lista de notificaciones del usuario actual, más nuevas primero.
 */
export async function getNotifications({ limit = 20, offset = 0 } = {}) {
    try {
        const { data, error } = await supabase
            .from('notifications_enriched')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) return { notifications: [], error };
        return { notifications: data || [], error: null };
    } catch (e) {
        return { notifications: [], error: { message: e.message || 'Error al cargar notificaciones' } };
    }
}

/** Conteo de no-leídas (head=true para no traer payload). */
export async function getUnreadCount() {
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .is('read_at', null);
        if (error) return { count: 0, error };
        return { count: count || 0, error: null };
    } catch (e) {
        return { count: 0, error: { message: e.message || 'Error' } };
    }
}

/** Marca todas las notificaciones del usuario como leídas. */
export async function markAllAsRead() {
    try {
        const { data, error } = await supabase.rpc('mark_all_notifications_read');
        if (error) return { count: 0, error };
        return { count: data || 0, error: null };
    } catch (e) {
        return { count: 0, error: { message: e.message || 'Error' } };
    }
}

/** Marca una notificación específica como leída. */
export async function markAsRead(notificationId) {
    if (!notificationId) return { success: false, error: { message: 'Falta id' } };
    const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
    if (error) return { success: false, error };
    return { success: true, error: null };
}

/** Borra una notificación. */
export async function deleteNotification(notificationId) {
    if (!notificationId) return { success: false, error: { message: 'Falta id' } };
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
    if (error) return { success: false, error };
    return { success: true, error: null };
}

/**
 * Suscribe a cambios en notificaciones del usuario actual.
 * @param {string} userId
 * @param {(payload: object) => void} onChange
 */
export function subscribeToNotifications(userId, onChange) {
    if (!userId) return null;
    const channel = supabase.channel(`notifications_${userId}`);
    channel
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
        }, (payload) => onChange?.(payload))
        .subscribe();
    return channel;
}

export function unsubscribeNotifications(channel) {
    if (channel) channel.unsubscribe();
}

// ---------------------------------------------------------------------------
// Renderizado: helpers que la UI usa para mostrar cada tipo
// ---------------------------------------------------------------------------

/** Icono emoji por tipo de notificación. */
export function iconForType(type) {
    switch (type) {
        case 'like_publication':       return '❤️';
        case 'like_comment':           return '❤️';
        case 'comment_on_publication': return '💬';
        case 'new_follower':           return '➕';
        case 'prediction_resolved':    return '🎯';
        case 'suspension_received':    return '🛡️';
        case 'suspension_lifted':      return '✅';
        case 'level_up':               return '⭐';
        case 'group_invite':           return '👥';
        case 'like_ranking':           return '❤️';
        case 'comment_on_ranking':     return '💬';
        default:                       return '🔔';
    }
}

/**
 * Texto principal de la notificación. Devuelve string con HTML mínimo.
 * Por simplicidad usamos texto plano + el componente arma el JSX/Vue.
 */
export function describeNotification(notif) {
    const actor = notif.actor_display_name || 'Alguien';
    const p = notif.payload || {};
    switch (notif.type) {
        case 'like_publication':
            return `${actor} le dio like a tu publicación${p.publication_title ? ` "${p.publication_title}"` : ''}.`;
        case 'like_comment':
            return `${actor} le dio like a tu comentario${p.comment_excerpt ? `: "${p.comment_excerpt}"` : ''}.`;
        case 'comment_on_publication':
            return `${actor} comentó tu publicación${p.publication_title ? ` "${p.publication_title}"` : ''}${p.comment_excerpt ? `: "${p.comment_excerpt}"` : ''}.`;
        case 'new_follower':
            return `${actor} te empezó a seguir.`;
        case 'prediction_resolved': {
            const matchup = p.fighter1_name && p.fighter2_name
                ? `${p.fighter1_name} vs ${p.fighter2_name}`
                : (p.event_name || 'tu predicción');
            const verb = p.is_winner_correct ? 'Acertaste' : 'Fallaste';
            const xp = Number(p.xp_awarded) || 0;
            return xp > 0
                ? `${verb} ${matchup} · +${xp} XP`
                : `${verb} ${matchup}`;
        }
        case 'suspension_received': {
            const where = p.channel_name ? `del canal "${p.channel_name}"` : 'de todos los chats globales';
            const until = p.expires_at
                ? ` hasta ${new Date(p.expires_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                : ' (permanente)';
            return `Fuiste suspendido ${where}${until}.${p.reason ? ` Razón: "${p.reason}".` : ''}`;
        }
        case 'suspension_lifted':
            return `Un admin levantó tu suspensión${p.channel_name ? ` en "${p.channel_name}"` : ''}.`;
        case 'level_up':
            return `Subiste a nivel ${p.new_level} · ${p.new_name}.`;
        case 'group_invite':
            return `${actor} te invitó al grupo "${p.group_name || ''}".`;
        case 'like_ranking':
            return `${actor} le dio like a tu ranking${p.division ? ` de ${p.division}` : ''}.`;
        case 'comment_on_ranking':
            return `${actor} comentó tu ranking${p.division ? ` de ${p.division}` : ''}${p.comment_excerpt ? `: "${p.comment_excerpt}"` : ''}.`;
        default:
            return `${actor} interactuó con vos.`;
    }
}

/** Devuelve la ruta a la que debería ir si el usuario clickea la notificación. */
export function targetRouteFor(notif) {
    const p = notif.payload || {};
    const actor = notif.actor_display_name;
    switch (notif.type) {
        case 'like_publication':
        case 'comment_on_publication':
            return p.publication_id ? '/publicaciones' : null;
        case 'like_comment':
            return p.publication_id ? '/publicaciones' : null;
        case 'new_follower':
            // Slug de display_name: lo arma quien lo consume con createSlugFromDisplayName
            return actor ? { name: 'follower-profile', actor } : null;
        case 'prediction_resolved':
            return '/predicciones';
        case 'suspension_received':
        case 'suspension_lifted':
            return '/chat';
        case 'level_up':
            return '/predicciones';
        case 'group_invite':
            // Va a /messages — ahí está el panel "Invitaciones pendientes"
            return '/mensajes';
        case 'like_ranking':
        case 'comment_on_ranking':
            return p.ranking_id ? `/rankings/${p.ranking_id}` : null;
        default:
            return null;
    }
}
