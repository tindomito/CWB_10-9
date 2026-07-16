/**
 * Servicios para manejar seguidores/seguidos
 * Interactúa con la tabla follows de Supabase
 */
import { supabase } from './supabase.js';

/**
 * Sigue a un usuario
 * @param {string} followingId - ID del usuario a seguir
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function followUser(followingId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: { message: 'Usuario no autenticado' } };
        }

        // No permitir seguirse a sí mismo
        if (user.id === followingId) {
            return { success: false, error: { message: 'No puedes seguirte a ti mismo' } };
        }

        const { error } = await supabase
            .from('follows')
            .insert({
                follower_id: user.id,
                following_id: followingId
            });

        if (error) {
            // Si ya existe el follow, ignorar el error
            if (error.code === '23505') {
                return { success: true, error: null };
            }
            return { success: false, error };
        }

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: { message: 'Error al seguir usuario' } };
    }
}

/**
 * Deja de seguir a un usuario
 * @param {string} followingId - ID del usuario a dejar de seguir
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function unfollowUser(followingId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { success: false, error: { message: 'Usuario no autenticado' } };
        }

        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', followingId);

        if (error) {
            return { success: false, error };
        }

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: { message: 'Error al dejar de seguir usuario' } };
    }
}

/**
 * Verifica si el usuario actual sigue a otro usuario
 * @param {string} followingId - ID del usuario a verificar
 * @returns {Promise<{isFollowing: boolean, error: Object|null}>}
 */
export async function checkIsFollowing(followingId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { isFollowing: false, error: null };
        }

        const { data, error } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', followingId)
            .maybeSingle();

        if (error) {
            return { isFollowing: false, error };
        }

        return { isFollowing: !!data, error: null };
    } catch (error) {
        return { isFollowing: false, error: { message: 'Error al verificar seguimiento' } };
    }
}

/**
 * Obtiene el número de seguidores de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<{count: number, error: Object|null}>}
 */
export async function getFollowersCount(userId) {
    try {
        const { count, error } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId);

        if (error) {
            return { count: 0, error };
        }

        return { count: count || 0, error: null };
    } catch (error) {
        return { count: 0, error: { message: 'Error al obtener seguidores' } };
    }
}

/**
 * Obtiene el número de usuarios que sigue un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<{count: number, error: Object|null}>}
 */
export async function getFollowingCount(userId) {
    try {
        const { count, error } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', userId);

        if (error) {
            return { count: 0, error };
        }

        return { count: count || 0, error: null };
    } catch (error) {
        return { count: 0, error: { message: 'Error al obtener seguidos' } };
    }
}

/**
 * Obtiene la lista de seguidores de un usuario
 * @param {string} userId - ID del usuario
 * @param {number} limit - Límite de resultados
 * @param {number} offset - Desplazamiento para paginación
 * @returns {Promise<{followers: Array, error: Object|null}>}
 */
export async function getFollowers(userId, limit = 20, offset = 0) {
    try {
        const { data, error } = await supabase
            .from('follows')
            .select(`
                follower_id,
                created_at,
                profiles!follows_follower_id_fkey (
                    id,
                    display_name,
                    avatar_url,
                    rango,
                    pro
                )
            `)
            .eq('following_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            return { followers: [], error };
        }

        // Aplanar la estructura
        const followers = (data || []).map(item => ({
            ...item.profiles,
            followed_at: item.created_at
        }));

        return { followers, error: null };
    } catch (error) {
        return { followers: [], error: { message: 'Error al obtener seguidores' } };
    }
}

/**
 * Obtiene solo los IDs de los usuarios que sigue un usuario.
 * Más liviano que getFollowing() — pensado para filtros (feed siguiendo, etc.)
 * @param {string} userId - ID del usuario
 * @returns {Promise<{ids: string[], error: Object|null}>}
 */
export async function getFollowingIds(userId) {
    try {
        if (!userId) {
            return { ids: [], error: { message: 'ID de usuario requerido' } };
        }

        const { data, error } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', userId);

        if (error) {
            return { ids: [], error };
        }

        const ids = (data || []).map(row => row.following_id);
        return { ids, error: null };
    } catch (error) {
        return { ids: [], error: { message: 'Error al obtener IDs seguidos' } };
    }
}

/**
 * Obtiene la lista de usuarios que sigue un usuario
 * @param {string} userId - ID del usuario
 * @param {number} limit - Límite de resultados
 * @param {number} offset - Desplazamiento para paginación
 * @returns {Promise<{following: Array, error: Object|null}>}
 */
export async function getFollowing(userId, limit = 20, offset = 0) {
    try {
        const { data, error } = await supabase
            .from('follows')
            .select(`
                following_id,
                created_at,
                profiles!follows_following_id_fkey (
                    id,
                    display_name,
                    avatar_url,
                    rango,
                    pro
                )
            `)
            .eq('follower_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            return { following: [], error };
        }

        // Aplanar la estructura
        const following = (data || []).map(item => ({
            ...item.profiles,
            followed_at: item.created_at
        }));

        return { following, error: null };
    } catch (error) {
        return { following: [], error: { message: 'Error al obtener seguidos' } };
    }
}
