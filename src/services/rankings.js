/**
 * Servicio de rankings de peleadores personalizados (tier list por división).
 * Tabla: fighter_rankings   ·   Vista: fighter_rankings_with_users
 */
import { supabase } from './supabase.js';

/** Divisiones (deben coincidir con los `category` que devuelve la API). */
export const DIVISIONS = [
    'Flyweight',
    'Bantamweight',
    'Featherweight',
    'Lightweight',
    'Welterweight',
    'Middleweight',
    'Light Heavyweight',
    'Heavyweight',
    "Women's Strawweight",
    "Women's Flyweight",
    "Women's Bantamweight",
    "Women's Featherweight"
];

/** Máximo de puestos: campeón + 15. */
export const MAX_ENTRIES = 16;

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createRanking({ division, entries, isPublic = false }) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { ranking: null, error: { message: 'Usuario no autenticado' } };
        if (!division) return { ranking: null, error: { message: 'Falta la división' } };

        const { data, error } = await supabase
            .from('fighter_rankings')
            .insert({
                user_id: user.id,
                division,
                entries: sanitizeEntries(entries),
                is_public: !!isPublic
            })
            .select()
            .single();

        if (error) return { ranking: null, error };
        return { ranking: data, error: null };
    } catch (e) {
        return { ranking: null, error: { message: e.message || 'Error al crear ranking' } };
    }
}

export async function updateRanking(id, { division, entries, isPublic }) {
    try {
        const updates = {};
        if (division !== undefined) updates.division = division;
        if (entries !== undefined) updates.entries = sanitizeEntries(entries);
        if (isPublic !== undefined) updates.is_public = !!isPublic;

        const { data, error } = await supabase
            .from('fighter_rankings')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) return { ranking: null, error };
        return { ranking: data, error: null };
    } catch (e) {
        return { ranking: null, error: { message: e.message || 'Error al actualizar ranking' } };
    }
}

export async function deleteRanking(id) {
    try {
        // `.select()` para detectar el borrado rechazado por RLS (0 filas, sin error).
        const { data: deleted, error } = await supabase
            .from('fighter_rankings').delete().eq('id', id).select('id');
        if (error) return { success: false, error };
        if (!deleted || deleted.length === 0) {
            return { success: false, error: { message: 'No se pudo borrar el ranking: no existe o no tenés permisos.' } };
        }
        return { success: true, error: null };
    } catch (e) {
        return { success: false, error: { message: e.message || 'Error al borrar ranking' } };
    }
}

/** Un ranking por id (con datos del autor). RLS deja ver públicos + propios. */
export async function getRanking(id) {
    try {
        const { data, error } = await supabase
            .from('fighter_rankings_with_users')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return { ranking: null, error };
        return { ranking: data, error: null };
    } catch (e) {
        return { ranking: null, error: { message: e.message || 'Error al obtener ranking' } };
    }
}

/** Rankings públicos de la comunidad, opcionalmente filtrados por división. */
export async function getPublicRankings({ division = null, limit = 50 } = {}) {
    try {
        let query = supabase
            .from('fighter_rankings_with_users')
            .select('*')
            .eq('is_public', true)
            .order('updated_at', { ascending: false })
            .limit(limit);
        if (division) query = query.eq('division', division);

        const { data, error } = await query;
        if (error) return { rankings: [], error };
        return { rankings: data || [], error: null };
    } catch (e) {
        return { rankings: [], error: { message: e.message || 'Error al obtener rankings' } };
    }
}

/**
 * Rankings de un usuario. Si es uno mismo, RLS devuelve públicos + privados;
 * si es otro usuario, solo los públicos.
 */
export async function getRankingsByUser(userId, limit = 50) {
    try {
        const { data, error } = await supabase
            .from('fighter_rankings_with_users')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(limit);
        if (error) return { rankings: [], error };
        return { rankings: data || [], error: null };
    } catch (e) {
        return { rankings: [], error: { message: e.message || 'Error al obtener rankings' } };
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normaliza las entradas antes de guardar (recorta, valida shape, cap). */
function sanitizeEntries(entries) {
    if (!Array.isArray(entries)) return [];
    return entries
        .filter(e => e && typeof e.name === 'string' && e.name.trim().length > 0)
        .slice(0, MAX_ENTRIES)
        .map(e => ({
            name: e.name.trim().slice(0, 80),
            external_id: e.external_id != null ? String(e.external_id) : null,
            photo: e.photo || null
        }));
}

/** Suscripción realtime a cambios de rankings públicos (sección comunidad). */
export function subscribeToPublicRankings(onChange) {
    const channel = supabase.channel('public_rankings');
    channel
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'fighter_rankings'
        }, (payload) => onChange?.(payload))
        .subscribe();
    return channel;
}

export function unsubscribeRankings(channel) {
    if (channel) channel.unsubscribe();
}
