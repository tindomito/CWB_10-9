/**
  Composable para manejar el estado de autenticación
  Proporciona reactividad y estado global del usuario
 */
import { ref, computed } from 'vue';
import { subscribeToAuthChanges, getCurrentUser } from '../services/auth.js';

// Estado global reactivo
const user = ref(null);
const loading = ref(true);
const initialized = ref(false);

/**
 * Composable useAuth que proporciona estado y métodos de autenticación
 * @returns {Object} Estado y métodos de autenticación
 */
export function useAuth() {
    // Computed properties
    const isAuthenticated = computed(() => !!user.value);
    const userEmail = computed(() => user.value?.email || null);
    const userDisplayName = computed(() => user.value?.user_metadata?.display_name || null);
    const userId = computed(() => user.value?.id || null);

    /**
      Inicializa el estado de autenticación
     */
    async function initialize() {
        if (initialized.value) {
            return;
        }

        loading.value = true;

        try {
            // Obtener usuario actual si existe
            const { user: currentUser } = await getCurrentUser();
            user.value = currentUser;

            // Suscribirse a cambios de autenticación
            subscribeToAuthChanges((event, session) => {
                user.value = session?.user || null;
                loading.value = false;
            });

            loading.value = false;
            initialized.value = true;
        } catch (error) {
            console.error('Error initializing auth:', error);
            loading.value = false;
        }
    }

    /**
      Actualiza manualmente el usuario
     */
    async function refreshUser() {
        const { user: currentUser } = await getCurrentUser();
        user.value = currentUser;
    }

    // Limpia el estado del usuario
    function clearUser() {
        user.value = null;
    }

    return {
        // Estado
        user: computed(() => user.value),
        loading: computed(() => loading.value),
        isAuthenticated,
        userEmail,
        userDisplayName,
        userId,

        // Métodos
        initialize,
        refreshUser,
        clearUser
    };
}