/**
 * Servicios para manejar publicaciones (publications)
 * Sistema independiente del Feed - Interactúa con la tabla publications de Supabase
 */
import { supabase } from './supabase.js';
import { deletePostImage } from './storage.js';

/**
 * Categorías disponibles para publicaciones
 */
export const PUBLICATION_CATEGORIES = [
    { id: 'articulo', name: 'Artículo', icon: '📝' },
    { id: 'tutorial', name: 'Tutorial', icon: '📚' },
    { id: 'opinion', name: 'Opinión', icon: '💭' },
    { id: 'review', name: 'Review', icon: '⭐' },
    { id: 'guia', name: 'Guía', icon: '🗺️' },
    { id: 'entrevista', name: 'Entrevista', icon: '🎤' },
    { id: 'historia', name: 'Historia', icon: '📖' }
];

/**
 * Crea una nueva publicación
 * @param {Object} publicationData - Datos de la publicación
 * @returns {Promise<{publication: Object|null, error: Object|null}>}
 */
export async function createPublication(publicationData) {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { publication: null, error: { message: 'Usuario no autenticado' } };
        }

        const insertData = {
            user_id: user.id,
            title: publicationData.title,
            content: publicationData.content,
            category: publicationData.category || 'articulo'
        };

        // Agregar image_url si existe
        if (publicationData.image_url) {
            insertData.image_url = publicationData.image_url;
        }

        const { data, error } = await supabase
            .from('publications')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            return { publication: null, error };
        }

        return { publication: data, error: null };
    } catch (error) {
        return { publication: null, error: { message: 'Error al crear publicación' } };
    }
}

/**
 * Obtiene todas las publicaciones con paginación
 * @param {number} page - Página actual (empezando en 0)
 * @param {number} pageSize - Tamaño de página
 * @param {string} category - Filtrar por categoría (opcional)
 * @param {string[]|null} userIds - Filtrar por user_id (opcional). Si es array vacío, devuelve [] sin consultar.
 * @returns {Promise<{publications: Array, error: Object|null}>}
 */
export async function getPublications(page = 0, pageSize = 20, category = null, userIds = null) {
    try {
        // Si se pide filtrar por usuarios y la lista está vacía, no hay nada que devolver
        if (Array.isArray(userIds) && userIds.length === 0) {
            return { publications: [], error: null };
        }

        const from = page * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
            .from('publications_with_users')
            .select('*')
            .order('created_at', { ascending: false })
            .range(from, to);

        // Filtrar por categoría si se especifica
        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        // Filtrar por lista de user_id (feed "siguiendo")
        if (Array.isArray(userIds) && userIds.length > 0) {
            query = query.in('user_id', userIds);
        }

        const { data, error } = await query;

        if (error) {
            return { publications: [], error };
        }

        return { publications: data || [], error: null };
    } catch (error) {
        return { publications: [], error: { message: 'Error al obtener publicaciones' } };
    }
}

/**
 * Obtiene una publicación específica por ID
 * @param {string} publicationId - ID de la publicación
 * @returns {Promise<{publication: Object|null, error: Object|null}>}
 */
export async function getPublication(publicationId) {
    try {
        const { data, error } = await supabase
            .from('publications_with_users')
            .select('*')
            .eq('id', publicationId)
            .single();

        if (error) {
            return { publication: null, error };
        }

        return { publication: data, error: null };
    } catch (error) {
        return { publication: null, error: { message: 'Error al obtener publicación' } };
    }
}

/**
 * Obtiene publicaciones de un usuario específico
 * @param {string} userId - ID del usuario
 * @param {number} page - Página actual
 * @param {number} pageSize - Tamaño de página
 * @returns {Promise<{publications: Array, error: Object|null}>}
 */
export async function getPublicationsByUser(userId, page = 0, pageSize = 20) {
    try {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
            .from('publications_with_users')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            return { publications: [], error };
        }

        return { publications: data || [], error: null };
    } catch (error) {
        return { publications: [], error: { message: 'Error al obtener publicaciones del usuario' } };
    }
}

/**
 * Actualiza una publicación existente
 * @param {string} publicationId - ID de la publicación
 * @param {Object} updates - Datos a actualizar
 * @returns {Promise<{publication: Object|null, error: Object|null}>}
 */
export async function updatePublication(publicationId, updates) {
    try {
        const { data, error } = await supabase
            .from('publications')
            .update(updates)
            .eq('id', publicationId)
            .select()
            .single();

        if (error) {
            return { publication: null, error };
        }

        return { publication: data, error: null };
    } catch (error) {
        return { publication: null, error: { message: 'Error al actualizar publicación' } };
    }
}

/**
 * Elimina una publicación
 *
 * Un DELETE bloqueado por RLS no devuelve error: simplemente afecta 0 filas.
 * Por eso se pide `.select()` y se comprueba cuántas se borraron — si no se
 * verificara, la UI daría por exitoso un borrado que la base rechazó y la
 * publicación reaparecería al recargar.
 *
 * @param {string} publicationId - ID de la publicación
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function deletePublication(publicationId) {
    try {
        // Primero obtener la publicación para saber si tiene imagen
        const { data: publication } = await supabase
            .from('publications')
            .select('image_url')
            .eq('id', publicationId)
            .single();

        // Eliminar la publicación (devuelve las filas efectivamente borradas)
        const { data: deleted, error } = await supabase
            .from('publications')
            .delete()
            .eq('id', publicationId)
            .select('id');

        if (error) {
            return { success: false, error };
        }

        if (!deleted || deleted.length === 0) {
            return {
                success: false,
                error: { message: 'No se pudo eliminar la publicación: no existe o no tenés permisos.' }
            };
        }

        // Eliminar la imagen si existe
        if (publication?.image_url) {
            await deletePostImage(publication.image_url);
        }

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: { message: 'Error al eliminar publicación' } };
    }
}

/**
 * Suscribe a cambios en tiempo real de publicaciones
 * @param {Function} onInsert - Callback cuando se inserta una publicación
 * @param {Function} onUpdate - Callback cuando se actualiza una publicación
 * @param {Function} onDelete - Callback cuando se elimina una publicación
 * @returns {Object} Subscription object
 */
export function subscribeToPublicationsChanges(onInsert, onUpdate, onDelete) {
    const channel = supabase.channel('publications_changes');

    if (onInsert) {
        channel.on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'publications'
        }, async (payload) => {
            // Obtener la publicación completa con datos del usuario
            const { publication } = await getPublication(payload.new.id);
            if (publication) {
                onInsert(publication);
            }
        });
    }

    if (onUpdate) {
        channel.on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'publications'
        }, async (payload) => {
            const { publication } = await getPublication(payload.new.id);
            if (publication) {
                onUpdate(publication);
            }
        });
    }

    if (onDelete) {
        channel.on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'publications'
        }, (payload) => {
            onDelete(payload.old.id);
        });
    }

    channel.subscribe();
    return channel;
}

/**
 * Obtiene el nombre de una categoría
 * @param {string} categoryId - ID de la categoría
 * @returns {string} Nombre de la categoría
 */
export function getPublicationCategoryName(categoryId) {
    const category = PUBLICATION_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.name : 'Artículo';
}

/**
 * Obtiene el icono de una categoría
 * @param {string} categoryId - ID de la categoría
 * @returns {string} Icono de la categoría
 */
export function getPublicationCategoryIcon(categoryId) {
    const category = PUBLICATION_CATEGORIES.find(cat => cat.id === categoryId);
    return category ? category.icon : '📝';
}
