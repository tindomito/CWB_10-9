/**
 * Comentarios de rankings de peleadores.
 * Tabla: ranking_comments   ·   Vista: ranking_comments_with_users
 */
import { supabase } from './supabase.js';

export async function getRankingComments(rankingId, page = 0, pageSize = 50) {
    try {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const { data, error } = await supabase
            .from('ranking_comments_with_users')
            .select('*')
            .eq('ranking_id', rankingId)
            .order('created_at', { ascending: true })
            .range(from, to);
        if (error) return { comments: [], error };
        return { comments: data || [], error: null };
    } catch (e) {
        return { comments: [], error: { message: e.message || 'Error al obtener comentarios' } };
    }
}

export async function getRankingCommentsCount(rankingId) {
    try {
        const { count, error } = await supabase
            .from('ranking_comments')
            .select('id', { count: 'exact', head: true })
            .eq('ranking_id', rankingId);
        if (error) return { count: 0, error };
        return { count: count || 0, error: null };
    } catch (e) {
        return { count: 0, error: { message: e.message || 'Error' } };
    }
}

export async function createRankingComment(rankingId, content) {
    if (!content || !content.trim()) {
        return { comment: null, error: { message: 'El comentario no puede estar vacío' } };
    }
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { comment: null, error: { message: 'Usuario no autenticado' } };

        const { data, error } = await supabase
            .from('ranking_comments')
            .insert({ ranking_id: rankingId, user_id: user.id, content: content.trim() })
            .select()
            .single();
        if (error) return { comment: null, error };
        return { comment: data, error: null };
    } catch (e) {
        return { comment: null, error: { message: e.message || 'Error al comentar' } };
    }
}

export async function deleteRankingComment(commentId) {
    try {
        // `.select()` para detectar el borrado rechazado por RLS (0 filas, sin error).
        const { data: deleted, error } = await supabase
            .from('ranking_comments').delete().eq('id', commentId).select('id');
        if (error) return { success: false, error };
        if (!deleted || deleted.length === 0) {
            return { success: false, error: { message: 'No se pudo borrar el comentario: no existe o no tenés permisos.' } };
        }
        return { success: true, error: null };
    } catch (e) {
        return { success: false, error: { message: e.message || 'Error al borrar' } };
    }
}

/** Trae un comentario único con datos del autor (para realtime). */
export async function getRankingCommentById(commentId) {
    try {
        const { data, error } = await supabase
            .from('ranking_comments_with_users')
            .select('*')
            .eq('id', commentId)
            .single();
        if (error) return { comment: null, error };
        return { comment: data, error: null };
    } catch (e) {
        return { comment: null, error: { message: e.message || 'Error' } };
    }
}

export function subscribeToRankingComments(rankingId, { onInsert, onDelete } = {}) {
    const channel = supabase.channel(`ranking_comments_${rankingId}`);
    channel
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'ranking_comments',
            filter: `ranking_id=eq.${rankingId}`
        }, async (payload) => {
            const { comment } = await getRankingCommentById(payload.new.id);
            if (comment && onInsert) onInsert(comment);
        })
        .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'ranking_comments',
            filter: `ranking_id=eq.${rankingId}`
        }, (payload) => {
            if (onDelete) onDelete(payload.old.id);
        })
        .subscribe();
    return channel;
}

export function unsubscribeRankingComments(channel) {
    if (channel) channel.unsubscribe();
}
