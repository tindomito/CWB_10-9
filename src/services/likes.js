/**
 * Servicio unificado para likes de publicaciones y comentarios.
 *
 * Cada función está parametrizada por `target` ('publication' | 'comment')
 * para reutilizar la misma lógica entre ambas entidades.
 *
 * El XP por engagement (sec 3.5 del PDF) lo manejan triggers SQL:
 *   - +1 XP al author cuando recibe like en publicación (cap 15/día)
 *   - +2 XP al author cuando un comentario alcanza 4 likes (cap 10/día)
 */
import { supabase } from './supabase.js';

const TABLES = {
    publication: { table: 'publication_likes', column: 'publication_id' },
    comment:     { table: 'comment_likes',     column: 'comment_id' },
    ranking:     { table: 'ranking_likes',     column: 'ranking_id' }
};

function tableFor(target) {
    const t = TABLES[target];
    if (!t) throw new Error(`Target inválido: ${target}`);
    return t;
}

/**
 * Devuelve el conteo de likes para un target.
 */
export async function getLikesCount(target, targetId) {
    const { table, column } = tableFor(target);
    const { count, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq(column, targetId);
    if (error) return { count: 0, error };
    return { count: count || 0, error: null };
}

/**
 * Chequea si el usuario actual likeó este target.
 */
export async function hasUserLiked(target, targetId, userId) {
    if (!userId) return { liked: false, error: null };
    const { table, column } = tableFor(target);
    const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq(column, targetId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) return { liked: false, error };
    return { liked: !!data, error: null };
}

/**
 * Atajo: devuelve count + likedByMe en paralelo.
 */
export async function getLikeState(target, targetId, userId) {
    const [counts, liked] = await Promise.all([
        getLikesCount(target, targetId),
        hasUserLiked(target, targetId, userId)
    ]);
    return {
        count: counts.count,
        likedByMe: liked.liked,
        error: counts.error || liked.error || null
    };
}

/** Da like. Si ya existe (UNIQUE), devuelve éxito silencioso. */
export async function like(target, targetId, userId) {
    if (!userId) return { success: false, error: { message: 'No autenticado' } };
    const { table, column } = tableFor(target);
    const { error } = await supabase
        .from(table)
        .insert({ user_id: userId, [column]: targetId });
    if (error && error.code !== '23505') {
        return { success: false, error };
    }
    return { success: true, error: null };
}

/** Quita like. */
export async function unlike(target, targetId, userId) {
    if (!userId) return { success: false, error: { message: 'No autenticado' } };
    const { table, column } = tableFor(target);
    const { error } = await supabase
        .from(table)
        .delete()
        .eq(column, targetId)
        .eq('user_id', userId);
    if (error) return { success: false, error };
    return { success: true, error: null };
}

/** Toggle: like si no estaba, unlike si estaba. Devuelve el nuevo estado. */
export async function toggleLike(target, targetId, userId, currentlyLiked) {
    if (currentlyLiked) {
        const { success, error } = await unlike(target, targetId, userId);
        return { likedByMe: !success ? currentlyLiked : false, error };
    } else {
        const { success, error } = await like(target, targetId, userId);
        return { likedByMe: !success ? currentlyLiked : true, error };
    }
}

/**
 * Bulk: dado un array de target IDs, devuelve un Map { id → count }.
 * Útil para cards en listas (1 query por lista en vez de N).
 */
export async function getLikesCountBatch(target, targetIds) {
    if (!targetIds?.length) return { counts: new Map(), error: null };
    const { table, column } = tableFor(target);
    const { data, error } = await supabase
        .from(table)
        .select(column)
        .in(column, targetIds);
    if (error) return { counts: new Map(), error };
    const counts = new Map();
    for (const row of data || []) {
        const id = row[column];
        counts.set(id, (counts.get(id) || 0) + 1);
    }
    return { counts, error: null };
}

/**
 * Bulk: dado un array de target IDs y un userId, devuelve un Set con los IDs
 * que el usuario likeó.
 */
export async function getMyLikedSet(target, targetIds, userId) {
    if (!userId || !targetIds?.length) return { likedSet: new Set(), error: null };
    const { table, column } = tableFor(target);
    const { data, error } = await supabase
        .from(table)
        .select(column)
        .in(column, targetIds)
        .eq('user_id', userId);
    if (error) return { likedSet: new Set(), error };
    return { likedSet: new Set((data || []).map(r => r[column])), error: null };
}

/**
 * Realtime: suscribirse a cambios de likes para un target específico.
 */
export function subscribeToLikes(target, targetId, onChange) {
    const { table, column } = tableFor(target);
    const channel = supabase.channel(`${table}_${targetId}`);
    channel
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table,
            filter: `${column}=eq.${targetId}`
        }, (payload) => onChange?.(payload))
        .subscribe();
    return channel;
}

export function unsubscribeLikes(channel) {
    if (channel) channel.unsubscribe();
}
