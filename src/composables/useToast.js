import { ref } from 'vue';

// Estado global de toasts
const toasts = ref([]);
let toastId = 0;

/**
 * Composable para manejar notificaciones toast
 */
export function useToast() {
    /**
     * Muestra una notificación toast
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de notificación: 'success', 'error', 'info', 'warning'
     * @param {number} duration - Duración en ms (por defecto 3000)
     */
    const showToast = (message, type = 'info', duration = 3000) => {
        const id = toastId++;
        const toast = {
            id,
            message,
            type,
            visible: true
        };

        toasts.value.push(toast);

        // Auto-eliminar después de la duración especificada
        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    };

    /**
     * Elimina un toast específico
     */
    const removeToast = (id) => {
        const index = toasts.value.findIndex(t => t.id === id);
        if (index !== -1) {
            toasts.value[index].visible = false;
            // Esperar a que termine la animación antes de eliminar
            setTimeout(() => {
                toasts.value = toasts.value.filter(t => t.id !== id);
            }, 300);
        }
    };

    /**
     * Métodos de conveniencia para diferentes tipos de notificaciones
     */
    const success = (message, duration) => showToast(message, 'success', duration);
    const error = (message, duration) => showToast(message, 'error', duration);
    const info = (message, duration) => showToast(message, 'info', duration);
    const warning = (message, duration) => showToast(message, 'warning', duration);

    return {
        toasts,
        showToast,
        removeToast,
        success,
        error,
        info,
        warning
    };
}
