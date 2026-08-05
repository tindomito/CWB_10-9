// Servicios de autenticación usando Supabase Auth
// Maneja registro, login, logout y gestión del estado del usuario
import { supabase } from './supabase.js';

/**
 * Registra un nuevo usuario en la aplicación
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @param {string} displayName - Nombre para mostrar del usuario
 * @returns {Promise<{user: Object|null, error: Object|null}>}
 */
export async function register(email, password, displayName) {
    try {
        // Registrar usuario en Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName,
                }
            }
        });

        if (error) {
            return { user: null, error };
        }

        return { user: data.user, error: null };
    } catch (error) {
        return { user: null, error: { message: 'Error inesperado durante el registro' } };
    }
}

/**
 * Inicia sesión con email y contraseña
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<{user: Object|null, error: Object|null}>}
 */
export async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return { user: null, error };
        }

        return { user: data.user, error: null };
    } catch (error) {
        return { user: null, error: { message: 'Error inesperado durante el login' } };
    }
}

/**
 * Cierra la sesión del usuario actual
 * @returns {Promise<{error: Object|null}>}
 */
export async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        return { error };
    } catch (error) {
        return { error: { message: 'Error inesperado durante el logout' } };
    }
}

/**
 * Obtiene el usuario autenticado actual
 * @returns {Promise<{user: Object|null, error: Object|null}>}
 */
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        return { user, error };
    } catch (error) {
        return { user: null, error: { message: 'Error al obtener usuario actual' } };
    }
}

/**
 * Actualiza el perfil del usuario actual
 * @param {Object} updates - Datos a actualizar
 * @returns {Promise<{user: Object|null, error: Object|null}>}
 */
export async function updateProfile(updates) {
    try {
        const { data, error } = await supabase.auth.updateUser({
            data: updates
        });

        if (error) {
            return { user: null, error };
        }

        return { user: data.user, error: null };
    } catch (error) {
        return { user: null, error: { message: 'Error al actualizar perfil' } };
    }
}

/**
 * Actualiza la contraseña del usuario actual
 * @param {string} newPassword - Nueva contraseña
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
/**
 * Envía el correo de recuperación de contraseña.
 *
 * `redirectTo` es la página a la que vuelve el usuario desde el enlace del
 * mail; se arma con el origen actual para que funcione igual en desarrollo y
 * en producción. Esa URL debe estar autorizada en Supabase
 * (Authentication → URL Configuration → Redirect URLs).
 *
 * Siempre responde como si el envío hubiera salido bien: confirmar si un email
 * existe o no permitiría averiguar quién tiene cuenta en la app.
 *
 * @param {string} email
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function sendPasswordReset(email) {
    if (!email) {
        return { success: false, error: { message: 'Ingresá tu email' } };
    }
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/restablecer-password`
        });

        // Un error del proveedor (por ejemplo, demasiados intentos seguidos) sí
        // se informa; que el email no exista no se distingue a propósito.
        if (error && error.status !== 400) {
            return { success: false, error };
        }
        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: { message: 'No se pudo enviar el correo de recuperación' } };
    }
}

export async function updatePassword(newPassword) {
    try {
        // Validación básica
        if (!newPassword || newPassword.length < 6) {
            return {
                success: false,
                error: { message: 'La contraseña debe tener al menos 6 caracteres' }
            };
        }

        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            return { success: false, error };
        }

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: { message: 'Error al actualizar la contraseña' } };
    }
}

/**
 * Suscribe a cambios en el estado de autenticación
 * @param {Function} callback - Función que se ejecuta cuando cambia el estado
 * @returns {Object} Subscription object
 */
export function subscribeToAuthChanges(callback) {
    return supabase.auth.onAuthStateChange(callback);
}