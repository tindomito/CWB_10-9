/**
  Composable para manejar el estado de perfiles
  Proporciona reactividad y métodos para trabajar con perfiles
 */
import { ref, computed } from 'vue';
import {
    getCurrentProfile,
    updateProfile,
    getProfile,
    RANGOS,
    getRangoIndex
} from '../services/profiles.js';

// Estado global reactivo para el perfil actual
const currentProfile = ref(null);
const profileLoading = ref(false);

/**
 * Composable useProfile que maneja el estado del perfil
 * @returns {Object} Estado y métodos del perfil
 */
export function useProfile() {
    // Computed properties para el perfil actual
    const hasProfile = computed(() => !!currentProfile.value);
    const displayName = computed(() => currentProfile.value?.display_name || '');
    const bio = computed(() => currentProfile.value?.bio || '');
    const avatarUrl = computed(() => currentProfile.value?.avatar_url || '');
    const rango = computed(() => currentProfile.value?.rango || 'Amateur');
    const isPro = computed(() => currentProfile.value?.pro || false);
    const profileId = computed(() => currentProfile.value?.id || null);

    // Computed para información del rango
    const rangoIndex = computed(() => getRangoIndex(rango.value));
    const rangoProgress = computed(() => {
        const index = rangoIndex.value;
        return ((index + 1) / RANGOS.length) * 100;
    });

    /**
      Carga el perfil del usuario actual
     */
    async function loadCurrentProfile() {
        profileLoading.value = true;
        try {
            const { profile, error } = await getCurrentProfile();

            if (error) {
                console.error('Error loading profile:', error);
                currentProfile.value = null;
                return { success: false, error };
            }

            currentProfile.value = profile;
            return { success: true, profile };
        } catch (error) {
            console.error('Unexpected error loading profile:', error);
            currentProfile.value = null;
            return { success: false, error };
        } finally {
            profileLoading.value = false;
        }
    }

    /**
     * Actualiza el perfil actual
     * @param {Object} updates - Datos a actualizar
     */
    async function updateCurrentProfile(updates) {
        profileLoading.value = true;
        try {
            const { profile, error } = await updateProfile(updates);

            if (error) {
                return { success: false, error };
            }

            // Actualizar el estado local
            currentProfile.value = profile;
            return { success: true, profile };
        } catch (error) {
            console.error('Error updating profile:', error);
            return { success: false, error };
        } finally {
            profileLoading.value = false;
        }
    }

    //limpia el perfil actual (al hacer logout)
    function clearCurrentProfile() {
        currentProfile.value = null;
    }

    /**
      Refresca el perfil actual desde la base de datos
     */
    async function refreshCurrentProfile() {
        return await loadCurrentProfile();
    }

    return {
        // Estado
        currentProfile: computed(() => currentProfile.value),
        profileLoading: computed(() => profileLoading.value),
        hasProfile,

        // Datos del perfil
        displayName,
        bio,
        avatarUrl,
        rango,
        isPro,
        profileId,

        // Informacion del rango
        rangoIndex,
        rangoProgress,

        // Metodos
        loadCurrentProfile,
        updateCurrentProfile,
        clearCurrentProfile,
        refreshCurrentProfile
    };
}

/**
 * Composable para manejar perfiles de otros usuarios
 * @returns {Object} Métodos para cargar perfiles externos
 */
export function useExternalProfile() {
    const profiles = ref(new Map()); // Cache de perfiles por ID
    const loading = ref(new Set()); // Set de IDs que están cargando

    /**
     * Carga un perfil específico por ID
     * @param {string} userId - ID del usuario
     */
    async function loadProfile(userId) {
        if (!userId) return { success: false, error: { message: 'ID de usuario requerido' } };

        // Si ya está cargando, no hacer otra petición
        if (loading.value.has(userId)) {
            return { success: false, error: { message: 'Perfil ya cargando' } };
        }

        loading.value.add(userId);

        try {
            const { profile, error } = await getProfile(userId);

            if (error) {
                return { success: false, error };
            }

            // Guardar en cache
            profiles.value.set(userId, profile);
            return { success: true, profile };
        } catch (error) {
            console.error('Error loading external profile:', error);
            return { success: false, error };
        } finally {
            loading.value.delete(userId);
        }
    }

    /**
     * Obtiene un perfil del cache
     * @param {string} userId - ID del usuario
     * @returns {Object|null} Perfil o null si no está en cache
     */
    function getCachedProfile(userId) {
        return profiles.value.get(userId) || null;
    }

    /**
     * Verifica si un perfil está cargando
     * @param {string} userId - ID del usuario
     * @returns {boolean}
     */
    function isProfileLoading(userId) {
        return loading.value.has(userId);
    }

    /**
     * Limpia el cache de perfiles
     */
    function clearProfileCache() {
        profiles.value.clear();
        loading.value.clear();
    }

    return {
        // Estado
        profiles: computed(() => profiles.value),

        // Métodos
        loadProfile,
        getCachedProfile,
        isProfileLoading,
        clearProfileCache
    };
}