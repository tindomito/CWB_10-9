/**
 * Servicios para manejar perfiles de usuarios
 * Interactúa con la tabla profiles de Supabase
 */
import { supabase } from './supabase.js';

/**
 * Lista de rangos disponibles en orden, según el sistema de niveles del PDF
 * "Sistema de Niveles y Experiencia" (sec 2.1).
 *
 * Mapeo histórico (legacy → nuevo) — la migración SQL en
 * sql/02_predictions_system.sql actualiza profiles existentes:
 *   Novato       → Amateur
 *   Aprendiz     → Prospecto
 *   Luchador     → Local Card
 *   Guerrero     → Co-Main
 *   Veterano     → Main Event
 *   Experto      → Ranked
 *   Maestro      → Top 10
 *   Leyenda      → Top 5
 *   Campeón      → Contender
 *   Hall of Fame → Champion
 */
export const RANGOS = [
    'Amateur',
    'Prospecto',
    'Local Card',
    'Co-Main',
    'Main Event',
    'Ranked',
    'Top 10',
    'Top 5',
    'Contender',
    'Champion'
];

/**
 * Obtiene el perfil de un usuario por su ID
 * @param {string} userId - ID del usuario
 * @returns {Promise<{profile: Object|null, error: Object|null}>}
 */
export async function getProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            return { profile: null, error };
        }

        return { profile: data, error: null };
    } catch (error) {
        return { profile: null, error: { message: 'Error al obtener perfil' } };
    }
}

/**
 * Convierte un display_name a un slug válido para URL
 * @param {string} displayName - Nombre a convertir
 * @returns {string} Slug válido
 */
export function createSlugFromDisplayName(displayName) {
    if (!displayName) return '';
    
    return displayName
        .toLowerCase()
        .trim()
        // Reemplazar espacios y caracteres especiales con guiones
        .replace(/[^a-z0-9áéíóúñü]/g, '-')
        // Reemplazar múltiples guiones seguidos con uno solo
        .replace(/-+/g, '-')
        // Remover guiones al inicio y final
        .replace(/^-+|-+$/g, '')
        // Limitar longitud
        .substring(0, 50);
}

/**
 * Obtiene el perfil por display_name slug o ID
 * @param {string} identifier - Slug del display_name o UUID
 * @returns {Promise<{profile: Object|null, error: Object|null}>}
 */
export async function getProfileByIdentifier(identifier) {
    try {
        // Primero intentar buscar por ID (UUID)
        if (identifier.length === 36 && identifier.includes('-')) {
            return await getProfile(identifier);
        }
        
        // Si no es UUID, buscar por display_name slug
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .ilike('display_name', identifier.replace(/-/g, ' '))
            .single();

        if (error) {
            // Si no encuentra por display_name exacto, buscar coincidencias similares
            const { data: similarProfiles, error: searchError } = await supabase
                .from('profiles')
                .select('*')
                .textSearch('display_name', identifier.replace(/-/g, ' & '), {
                    type: 'websearch'
                })
                .limit(5);

            if (searchError || !similarProfiles || similarProfiles.length === 0) {
                return { profile: null, error: { message: 'Perfil no encontrado' } };
            }

            // Buscar coincidencia exacta en los resultados
            const exactMatch = similarProfiles.find(profile => 
                createSlugFromDisplayName(profile.display_name) === identifier
            );

            if (exactMatch) {
                return { profile: exactMatch, error: null };
            }

            // Si no hay coincidencia exacta, devolver el primer resultado
            return { profile: similarProfiles[0], error: null };
        }

        return { profile: data, error: null };
    } catch (error) {
        return { profile: null, error: { message: 'Error al buscar perfil' } };
    }
}

/**
 * Busca perfiles por nombre de usuario con autocompletado
 * @param {string} searchTerm - Término de búsqueda
 * @param {number} limit - Límite de resultados
 * @returns {Promise<{profiles: Array, error: Object|null}>}
 */
export async function searchProfilesByUsername(searchTerm, limit = 10) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name')
            .ilike('display_name', `%${searchTerm}%`)
            .limit(limit);

        if (error) {
            return { profiles: [], error };
        }

        // Agregar slug a cada perfil
        const profilesWithSlug = (data || []).map(profile => ({
            ...profile,
            slug: createSlugFromDisplayName(profile.display_name)
        }));

        return { profiles: profilesWithSlug, error: null };
    } catch (error) {
        return { profiles: [], error: { message: 'Error en búsqueda de perfiles' } };
    }
}

/**
 * Obtiene el perfil del usuario actual autenticado
 * @returns {Promise<{profile: Object|null, error: Object|null}>}
 */
export async function getCurrentProfile() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { profile: null, error: { message: 'Usuario no autenticado' } };
        }

        return await getProfile(user.id);
    } catch (error) {
        return { profile: null, error: { message: 'Error al obtener perfil actual' } };
    }
}

/**
 * Actualiza el perfil del usuario actual
 * @param {Object} updates - Datos a actualizar
 * @returns {Promise<{profile: Object|null, error: Object|null}>}
 */
export async function updateProfile(updates) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return { profile: null, error: { message: 'Usuario no autenticado' } };
        }

        // Validar rango si está incluido en la actualización
        if (updates.rango && !RANGOS.includes(updates.rango)) {
            return { 
                profile: null, 
                error: { message: 'Rango no válido' } 
            };
        }

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();

        if (error) {
            return { profile: null, error };
        }

        return { profile: data, error: null };
    } catch (error) {
        return { profile: null, error: { message: 'Error al actualizar perfil' } };
    }
}

/**
 * Crea un perfil para un usuario (si no existe)
 * @param {string} userId - ID del usuario
 * @param {Object} profileData - Datos iniciales del perfil
 * @returns {Promise<{profile: Object|null, error: Object|null}>}
 */
export async function createProfile(userId, profileData = {}) {
    try {
        const profileToCreate = {
            id: userId,
            display_name: profileData.display_name || '',
            bio: profileData.bio || '',
            avatar_url: profileData.avatar_url || '',
            rango: profileData.rango || 'Amateur',
            pro: profileData.pro || false,
            ...profileData
        };

        const { data, error } = await supabase
            .from('profiles')
            .insert(profileToCreate)
            .select()
            .single();

        if (error) {
            return { profile: null, error };
        }

        return { profile: data, error: null };
    } catch (error) {
        return { profile: null, error: { message: 'Error al crear perfil' } };
    }
}

/**
 * Busca perfiles por nombre de usuario
 * @param {string} searchTerm - Término de búsqueda
 * @param {number} limit - Límite de resultados
 * @returns {Promise<{profiles: Array, error: Object|null}>}
 */
export async function searchProfiles(searchTerm, limit = 10) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .ilike('display_name', `%${searchTerm}%`)
            .limit(limit);

        if (error) {
            return { profiles: [], error };
        }

        // Agregar slug a cada perfil, usando id como fallback
        const profilesWithSlug = (data || []).map(profile => ({
            ...profile,
            slug: profile.display_name 
                ? createSlugFromDisplayName(profile.display_name) 
                : profile.id  // USAR ID COMO FALLBACK
        }));

        return { profiles: profilesWithSlug, error: null };
    } catch (error) {
        return { profiles: [], error: { message: 'Error en búsqueda de perfiles' } };
    }
}

/**
 * Obtiene perfiles con paginación
 * @param {number} page - Página actual (empezando en 0)
 * @param {number} pageSize - Tamaño de página
 * @param {string} orderBy - Campo por el cual ordenar
 * @param {boolean} ascending - Orden ascendente o descendente
 * @returns {Promise<{profiles: Array, error: Object|null}>}
 */
export async function getProfiles(page = 0, pageSize = 20, orderBy = 'created_at', ascending = false) {
    try {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order(orderBy, { ascending })
            .range(from, to);

        if (error) {
            return { profiles: [], error };
        }

        return { profiles: data || [], error: null };
    } catch (error) {
        return { profiles: [], error: { message: 'Error al obtener perfiles' } };
    }
}

/**
 * Obtiene estadísticas del perfil
 * @param {string} userId - ID del usuario
 * @returns {Promise<{stats: Object|null, error: Object|null}>}
 */
export async function getProfileStats(userId) {
    try {
        // Por ahora devolvemos stats básicas
        // Más adelante se pueden agregar conteos de posts, seguidores, etc.
        const { profile, error } = await getProfile(userId);
        
        if (error) {
            return { stats: null, error };
        }

        const stats = {
            memberSince: profile?.created_at,
            rango: profile?.rango,
            pro: profile?.pro,
            // Futuros: postsCount, followersCount, followingCount
        };

        return { stats, error: null };
    } catch (error) {
        return { stats: null, error: { message: 'Error al obtener estadísticas' } };
    }
}

/**
 * Obtiene el índice numérico de un rango
 * @param {string} rango - Nombre del rango
 * @returns {number} Índice del rango (0-9)
 */
export function getRangoIndex(rango) {
    return RANGOS.indexOf(rango);
}

/**
 * Obtiene el rango por su índice
 * @param {number} index - Índice del rango (0-9)
 * @returns {string} Nombre del rango
 */
export function getRangoByIndex(index) {
    return RANGOS[index] || 'Amateur';
}