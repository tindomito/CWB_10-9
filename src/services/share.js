/**
 * Compartir un link: usa la Web Share API nativa (mobile) y cae a copiar al
 * portapapeles en desktop / navegadores sin soporte.
 *
 * @returns {Promise<{method: 'native'|'clipboard'|'cancelled'|'failed', url: string}>}
 */
export async function shareLink({ title = '10-9', text = '', url }) {
    // 1. Web Share API (típicamente mobile)
    if (navigator.share) {
        try {
            await navigator.share({ title, text, url });
            return { method: 'native', url };
        } catch (e) {
            // El usuario canceló el diálogo de compartir
            if (e && e.name === 'AbortError') return { method: 'cancelled', url };
            // Cualquier otro error → intentar fallback
        }
    }

    // 2. Fallback: copiar al portapapeles
    try {
        await navigator.clipboard.writeText(url);
        return { method: 'clipboard', url };
    } catch {
        return { method: 'failed', url };
    }
}

/** Construye una URL absoluta a partir de un path relativo. */
export function absoluteUrl(path) {
    if (typeof window === 'undefined') return path;
    return `${window.location.origin}${path}`;
}
