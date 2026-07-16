/**
 * Helpers de formato compartidos por toda la app.
 *
 * Antes cada componente tenía su propia copia de estas funciones (había 17
 * versiones de getInitials y una docena de formateadores de fecha, algunos
 * con locales distintos). Acá viven una sola vez.
 *
 * Todas las fechas usan el locale es-AR.
 */

const LOCALE = 'es-AR';

/** Minutos transcurridos desde una fecha. Negativo si es futura. */
function minutesSince(value) {
    return Math.floor((Date.now() - new Date(value).getTime()) / 60000);
}

/**
 * Iniciales para avatares sin foto: "Teo Indomito" → "TI".
 * @param {string} name
 * @param {string} fallback - qué mostrar si no hay nombre ('U' usuario, 'G' grupo, '?' desconocido)
 */
export function getInitials(name, fallback = 'U') {
    if (!name) return fallback;
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Antigüedad de un evento: "Recién · Hace 5 min · Hace 3h · Hace 2d".
 * Se usa en notificaciones y en el panel de moderación.
 */
export function formatRelativeTime(value) {
    if (!value) return '';
    const mins = minutesSince(value);
    if (mins < 1) return 'Recién';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
}

/**
 * Hora de una burbuja de chat: "Ahora · Hace 5m · Hace 3h · 5 mar".
 * Pasadas las 24h muestra la fecha corta.
 */
export function formatMessageTime(value) {
    if (!value) return '';
    const mins = minutesSince(value);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return formatShortDate(value);
}

/**
 * Fecha del último mensaje en la lista de conversaciones:
 * "Ahora · Hace 5m · Hace 3h · Ayer · Hace 3d · 05/03".
 */
export function formatConversationDate(value) {
    if (!value) return '';
    const mins = minutesSince(value);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days}d`;
    return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit' })
        .format(new Date(value));
}

/** "5 mar" */
export function formatShortDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString(LOCALE, {
        day: 'numeric',
        month: 'short'
    });
}

/** "5 mar 2026" */
export function formatMediumDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString(LOCALE, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/** "5 de marzo de 2026" */
export function formatLongDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString(LOCALE, {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/** "domingo, 5 de marzo de 2026" — para encabezados de evento */
export function formatFullDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString(LOCALE, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

/** "5 mar 2026, 14:30" */
export function formatDateTime(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString(LOCALE, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Cuánto falta para que algo expire (suspensiones de chat):
 * "Permanente · Expirando… · Quedan 5 min · Quedan 3h · Quedan 2d".
 */
export function formatExpiry(expiresAt) {
    if (!expiresAt) return 'Permanente';
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Expirando…';
    const mins = Math.ceil(diffMs / 60000);
    if (mins < 60) return `Quedan ${mins} min`;
    const hours = Math.ceil(mins / 60);
    if (hours < 24) return `Quedan ${hours}h`;
    return `Quedan ${Math.ceil(hours / 24)}d`;
}
