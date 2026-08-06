/**
 * Imágenes de respaldo para peleadores.
 *
 * El proveedor devuelve SIEMPRE una URL de foto con el formato
 * `https://media.api-sports.io/mma/fighters/<id>.png`, exista o no el archivo:
 * para los peleadores menos conocidos esa dirección responde 404. Como la URL
 * nunca viene vacía, no alcanza con un `v-if="photo"` — hay que reaccionar
 * cuando la imagen falla al cargar.
 */

/** Silueta genérica sobre gris. Va embebida para no depender de la red. */
export const FIGHTER_PLACEHOLDER =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%234a4a4a'/%3E%3Ccircle cx='32' cy='24' r='13' fill='%23111111'/%3E%3Cpath d='M32 42c-11 0-20 9-20 20v2h40v-2c0-11-9-20-20-20z' fill='%23111111'/%3E%3C/svg%3E";

/** URL de la foto, o la silueta si el peleador no tiene ninguna cargada. */
export function fighterPhoto(url) {
    return url || FIGHTER_PLACEHOLDER;
}

/**
 * Handler de `@error` para las fotos de peleador: sustituye la imagen rota por
 * la silueta en lugar de ocultarla, que dejaba un círculo vacío.
 *
 * La comparación previa evita un bucle si el propio placeholder fallara.
 */
export function onFighterImageError(event) {
    const img = event?.target;
    if (img && img.src !== FIGHTER_PLACEHOLDER) {
        img.src = FIGHTER_PLACEHOLDER;
    }
}
