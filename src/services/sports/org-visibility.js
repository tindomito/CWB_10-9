/**
 * Preferencia por usuario de qué organizaciones (además de UFC) se muestran.
 *
 * Se guarda en localStorage: no requiere migración de base y alcanza para el
 * caso de uso (un fan que solo mira UFC puede ocultar PFL/Bellator de su feed).
 * UFC siempre está visible; el toggle aplica solo a las organizaciones semilla.
 *
 * Default: todas visibles (para que la demo se vea multi-organización de una).
 */
import { SEED_ORGS } from './seed-multi-org.js';

const STORAGE_KEY = 'ten9.hiddenOrgs';
const HOME_EVENT_ORG_KEY = 'ten9.homeEventOrg';
const ONBOARDING_KEY = 'ten9.onboardingDone';

/** UFC siempre disponible como opción, primero. */
export const UFC_ORG = 'ufc';

/** Lee el set de orgs ocultas desde localStorage (tolerante a errores). */
function readHidden() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Set();
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? new Set(arr) : new Set();
    } catch {
        return new Set();
    }
}

function writeHidden(set) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    } catch {
        /* almacenamiento no disponible: la preferencia simplemente no persiste */
    }
}

/** Todas las organizaciones semilla que existen (para pintar el toggle). */
export function allSeedOrgs() {
    return Object.values(SEED_ORGS);
}

/** ¿Está visible esta organización? */
export function isOrgVisible(org) {
    return !readHidden().has(org);
}

/** Set de organizaciones semilla actualmente visibles. */
export function getVisibleSeedOrgs() {
    const hidden = readHidden();
    return new Set(allSeedOrgs().filter(org => !hidden.has(org)));
}

/** Muestra u oculta una organización. */
export function setOrgVisible(org, visible) {
    const hidden = readHidden();
    if (visible) hidden.delete(org);
    else hidden.add(org);
    writeHidden(hidden);
}

// ---------------------------------------------------------------------------
// Preferencia: organización del "próximo evento" del Home
// ---------------------------------------------------------------------------
/** Organizaciones elegibles para el próximo evento del Home (UFC + semilla). */
export function homeEventOrgOptions() {
    return [UFC_ORG, ...allSeedOrgs()];
}

/** Organización cuyo próximo evento se muestra en el Home. Default: UFC. */
export function getHomeEventOrg() {
    try {
        const v = localStorage.getItem(HOME_EVENT_ORG_KEY);
        return v && homeEventOrgOptions().includes(v) ? v : UFC_ORG;
    } catch {
        return UFC_ORG;
    }
}

export function setHomeEventOrg(org) {
    try {
        localStorage.setItem(HOME_EVENT_ORG_KEY, org || UFC_ORG);
    } catch { /* almacenamiento no disponible */ }
}

// ---------------------------------------------------------------------------
// Onboarding: mostrar el cartel de preferencias una sola vez
// ---------------------------------------------------------------------------
export function isOnboardingDone() {
    try {
        return localStorage.getItem(ONBOARDING_KEY) === '1';
    } catch {
        return true; // si no hay storage, no molestamos con el onboarding
    }
}

export function setOnboardingDone() {
    try {
        localStorage.setItem(ONBOARDING_KEY, '1');
    } catch { /* almacenamiento no disponible */ }
}
