/**
 * Modelos internos de dominio (provider-agnostic).
 *
 * Cualquier adapter de proveedor (api-sports, sportsdataio, etc.) debe devolver
 * objetos con esta forma. El resto de la app (componentes, servicios DB, UI)
 * NUNCA debe depender directamente de la respuesta cruda de un proveedor.
 *
 * Este archivo también centraliza:
 *   - Las constantes de método de finalización (FIGHT_METHODS).
 *   - Helpers para serializar IDs estables ("provider:externalId").
 *
 * --- Cambiar de proveedor en el futuro ---
 * 1. Crear src/services/sports/adapter-<provider>.js exportando la misma API
 *    pública que adapter-api-sports.js (las funciones que usa index.js).
 * 2. Cambiar el import en src/services/sports/index.js.
 * 3. Listo. Nada más se toca.
 */

/** Métodos de finalización normalizados que la app entiende. */
export const FIGHT_METHODS = Object.freeze({
    KO_TKO: 'ko_tko',
    SUBMISSION: 'submission',
    DECISION: 'decision'
});

export const FIGHT_METHOD_LABELS = Object.freeze({
    ko_tko: 'KO / TKO',
    submission: 'Sumisión',
    decision: 'Decisión'
});

/** Estados posibles de una pelea (matchea con el CHECK de fights.status en SQL). */
export const FIGHT_STATUS = Object.freeze({
    SCHEDULED: 'scheduled',
    FINISHED: 'finished',
    CANCELLED: 'cancelled'
});

/**
 * Construye un ID estable y único combinando proveedor + ID nativo.
 * Este es el ID que se guarda en la tabla `fights` y se usa como FK.
 */
export function buildFightId(provider, providerFightId) {
    return `${provider}:${providerFightId}`;
}

/**
 * Construye un ID estable de peleador. No se usa como FK pero ayuda a
 * desambiguar cuando el mismo nombre aparece en distintas APIs.
 */
export function buildFighterId(provider, providerFighterId) {
    return `${provider}:${providerFighterId}`;
}

/**
 * Forma de un Fight en el modelo interno. Esta es la "interfaz" que cualquier
 * adapter debe respetar.
 *
 * @typedef {Object} InternalFight
 * @property {string} id                        - "provider:fightId"
 * @property {string} provider                  - "api-sports", "sportsdataio", etc.
 * @property {string} providerFightId           - ID nativo del proveedor
 * @property {string|null} eventName            - Nombre del evento ("UFC 305", "PFL 8")
 * @property {string|null} eventSlug            - Slug del evento ("ufc-305")
 * @property {string|null} weightClass          - Categoría de peso
 * @property {boolean} isMainEvent
 * @property {boolean} isPpv                    - True si es UFC numerado
 * @property {string|null} dateIso              - Fecha+hora ISO 8601 con TZ
 * @property {'scheduled'|'finished'|'cancelled'} status
 * @property {InternalFighter} fighter1
 * @property {InternalFighter} fighter2
 * @property {InternalResult|null} result
 *
 * @typedef {Object} InternalFighter
 * @property {string|null} externalId           - ID del proveedor (string para uniformidad)
 * @property {string|null} name
 * @property {string|null} photo
 *
 * @typedef {Object} InternalResult
 * @property {string|null} winnerExternalId
 * @property {'ko_tko'|'submission'|'decision'|null} method
 * @property {number|null} round
 */

/**
 * Heurística para detectar si un evento es PPV UFC numerado a partir del slug.
 * La regla es simple: el slug empieza con "ufc-" seguido de dígitos (ufc-305, ufc-310...).
 * Cards con nombre (UFC Fight Night, UFC on ABC, UFC on ESPN) NO son PPV.
 */
export function isUfcPpv(slug) {
    if (!slug) return false;
    return /^ufc-\d+(-|$)/i.test(slug);
}

/**
 * Genera un nombre de evento legible a partir de un slug ("ufc-305" → "UFC 305").
 */
export function eventNameFromSlug(slug) {
    if (!slug) return '';
    return slug.replace(/-/g, ' ').toUpperCase();
}
