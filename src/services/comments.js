// Servicios para manejar comentarios en publicaciones
// Interactúa con la tabla comments de Supabase
import { supabase } from './supabase.js';

/**
 * Crea un nuevo comentario
 * @param {Object} commentData - Datos del comentario
 * @returns {Promise<{comment: Object|null, error: Object|null}>}
 */
export async function createComment(commentData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { comment: null, error: { message: 'Usuario no autenticado' } };
        }

        const { data, error } = await supabase
            .from('comments')
            .insert({
                post_id: commentData.post_id,
                user_id: user.id,
                content: commentData.content
            })
            .select()
            .single();

        if (error) {
            return { comment: null, error };
        }

        return { comment: data, error: null };
    } catch (error) {
        return { comment: null, error: { message: 'Error al crear comentario' } };
    }
}

/**
 * Obtiene comentarios de una publicación
 * @param {string} postId - ID de la publicación
 * @param {number} page - Página actual (empezando en 0)
 * @param {number} pageSize - Tamaño de página
 * @returns {Promise<{comments: Array, error: Object|null}>}
 */
export async function getCommentsByPost(postId, page = 0, pageSize = 50) {
    try {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
            .from('comments_with_users')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true })
            .range(from, to);

        if (error) {
            return { comments: [], error };
        }

        return { comments: data || [], error: null };
    } catch (error) {
        return { comments: [], error: { message: 'Error al obtener comentarios' } };
    }
}

/**
 * Obtiene un comentario específico por ID
 * @param {string} commentId - ID del comentario
 * @returns {Promise<{comment: Object|null, error: Object|null}>}
 */
export async function getComment(commentId) {
    try {
        const { data, error } = await supabase
            .from('comments_with_users')
            .select('*')
            .eq('id', commentId)
            .single();

        if (error) {
            return { comment: null, error };
        }

        return { comment: data, error: null };
    } catch (error) {
        return { comment: null, error: { message: 'Error al obtener comentario' } };
    }
}

/**
 * Actualiza un comentario existente
 * @param {string} commentId - ID del comentario
 * @param {Object} updates - Datos a actualizar
 * @returns {Promise<{comment: Object|null, error: Object|null}>}
 */
export async function updateComment(commentId, updates) {
    try {
        const { data, error } = await supabase
            .from('comments')
            .update(updates)
            .eq('id', commentId)
            .select()
            .single();

        if (error) {
            return { comment: null, error };
        }

        return { comment: data, error: null };
    } catch (error) {
        return { comment: null, error: { message: 'Error al actualizar comentario' } };
    }
}

/**
 * Elimina un comentario
 * @param {string} commentId - ID del comentario
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deleteComment(commentId) {
    try {
        // `.select()` para distinguir "borrado" de "RLS lo rechazó": un DELETE
        // bloqueado no devuelve error, solo afecta 0 filas.
        const { data: deleted, error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId)
            .select('id');

        if (error) {
            return { success: false, error };
        }
        if (!deleted || deleted.length === 0) {
            return {
                success: false,
                error: { message: 'No se pudo eliminar el comentario: no existe o no tenés permisos.' }
            };
        }

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: { message: 'Error al eliminar comentario' } };
    }
}

/**
 * Obtiene el conteo de comentarios para una publicación
 * @param {string} postId - ID de la publicación
 * @returns {Promise<{count: number, error: Object|null}>}
 */
export async function getCommentsCount(postId) {
    try {
        const { count, error } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        if (error) {
            return { count: 0, error };
        }

        return { count: count || 0, error: null };
    } catch (error) {
        return { count: 0, error: { message: 'Error al obtener conteo de comentarios' } };
    }
}

/**
 * Suscribe a cambios en tiempo real de comentarios de una publicación
 * @param {string} postId - ID de la publicación
 * @param {Function} onInsert - Callback cuando se inserta un comentario
 * @param {Function} onUpdate - Callback cuando se actualiza un comentario
 * @param {Function} onDelete - Callback cuando se elimina un comentario
 * @returns {Object} Subscription object
 */
export function subscribeToCommentsChanges(postId, onInsert, onUpdate, onDelete) {
    const channel = supabase.channel(`comments_${postId}`);

    if (onInsert) {
        channel.on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'comments',
            filter: `post_id=eq.${postId}`
        }, async (payload) => {
            // Obtener el comentario completo con datos del usuario
            const { comment } = await getComment(payload.new.id);
            if (comment) {
                onInsert(comment);
            }
        });
    }

    if (onUpdate) {
        channel.on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'comments',
            filter: `post_id=eq.${postId}`
        }, async (payload) => {
            const { comment } = await getComment(payload.new.id);
            if (comment) {
                onUpdate(comment);
            }
        });
    }

    if (onDelete) {
        channel.on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'comments',
            filter: `post_id=eq.${postId}`
        }, (payload) => {
            onDelete(payload.old.id);
        });
    }

    channel.subscribe();
    return channel;
}
