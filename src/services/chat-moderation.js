/**
 * Servicios de moderación de chats globales.
 * Trabaja con la tabla chat_suspensions y los RPCs admin_suspend_user /
 * admin_lift_suspension.
 *
 * RLS permite que cada usuario vea sus propias suspensiones (para el banner)
 * y que los admins vean todas (para el panel de moderación).
 */
import { supabase } from './supabase.js';

/** Presets de duración usados en la UI. minutes=null significa permanente. */
export const SUSPENSION_DURATIONS = Object.freeze([
    { id: '15m',  label: '15 minutos',       minutes: 15 },
    { id: '1h',   label: '1 hora',           minutes: 60 },
    { id: '24h',  label: '24 horas',         minutes: 60 * 24 },
    { id: '7d',   label: '7 días',           minutes: 60 * 24 * 7 },
    { id: 'perm', label: 'Hasta levantarla', minutes: null }
]);

/**
 * Suspende a un usuario. Solo admins.
 * @param {object} opts
 * @param {string} opts.userId          - usuario a suspender
 * @param {string|null} opts.channelId  - null = todos los canales
 * @param {number|null} opts.minutes    - null = permanente
 * @param {string|null} opts.reason
 */
export async function suspendUser({ userId, channelId = null, minutes = null, reason = null }) {
    if (!userId) return { suspension: null, error: { message: 'Falta user_id' } };
    const { data, error } = await supabase.rpc('admin_suspend_user', {
        p_user_id: userId,
        p_channel_id: channelId,
        p_duration_minutes: minutes,
        p_reason: reason
    });
    if (error) return { suspension: null, error };
    return { suspension: data, error: null };
}

/** Levanta una suspensión activa. Solo admins. */
export async function liftSuspension(suspensionId) {
    if (!suspensionId) return { suspension: null, error: { message: 'Falta suspension_id' } };
    const { data, error } = await supabase.rpc('admin_lift_suspension', {
        p_suspension_id: suspensionId
    });
    if (error) return { suspension: null, error };
    return { suspension: data, error: null };
}

/**
 * Lista todas las suspensiones activas con datos joineados.
 * Solo admins ven datos completos (RLS).
 */
export async function getActiveSuspensions() {
    const { data, error } = await supabase
        .from('chat_active_suspensions')
        .select('*');
    if (error) return { suspensions: [], error };
    return { suspensions: data || [], error: null };
}

/**
 * Trae la suspensión activa del usuario actual para un canal específico,
 * si existe. Considera suspensiones globales (channel_id NULL).
 */
export async function getMyActiveSuspensionForChannel(userId, channelId) {
    if (!userId) return { suspension: null, error: null };
    const { data, error } = await supabase
        .from('chat_suspensions')
        .select('*')
        .eq('user_id', userId)
        .is('lifted_at', null)
        .or(`channel_id.is.null,channel_id.eq.${channelId}`)
        .order('created_at', { ascending: false });
    if (error) return { suspension: null, error };

    // Filtrar las expiradas client-side (la condición server-side es compleja con or)
    const now = Date.now();
    const active = (data || []).find(s =>
        !s.expires_at || new Date(s.expires_at).getTime() > now
    );
    return { suspension: active || null, error: null };
}

/** Realtime: ver inserts/updates en suspensiones de un usuario específico. */
export function subscribeToMySuspensions(userId, onChange) {
    if (!userId) return null;
    const channel = supabase.channel(`my_suspensions_${userId}`);
    channel
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'chat_suspensions',
            filter: `user_id=eq.${userId}`
        }, (payload) => onChange?.(payload))
        .subscribe();
    return channel;
}

/** Realtime: para el panel admin, ver todos los cambios. */
export function subscribeToAllSuspensions(onChange) {
    const channel = supabase.channel('all_suspensions');
    channel
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'chat_suspensions'
        }, (payload) => onChange?.(payload))
        .subscribe();
    return channel;
}

export function unsubscribeSuspensions(channel) {
    if (channel) channel.unsubscribe();
}
