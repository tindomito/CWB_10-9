/**
 * Punto único de acceso al proveedor de datos deportivos.
 *
 * Es un COMPOSITE: combina el adapter del proveedor real (API-Sports, solo UFC)
 * con datos semilla de otras organizaciones (PFL, Bellator) definidos en
 * ./seed-multi-org.js. Las páginas importan siempre desde acá, así que la mezcla
 * es transparente para el resto de la app.
 *
 * Para cambiar el proveedor real: reemplazar el import de './adapter-api-sports.js'.
 * Para quitar la demo multi-organización: borrar los merges con la semilla y el
 * archivo seed-multi-org.js. Nada de las páginas cambia.
 */
import * as api from './adapter-api-sports.js';
import { mapRawFightToInternal } from './adapter-api-sports.js';
import { buildFightId, eventNameFromSlug } from './normalize.js';
import {
    getSeedRawUpcoming,
    getSeedRawResults,
    getSeedEvents,
    getSeedUpcomingEvents,
    findSeedRawFightById,
    isSeedSlug,
    findSeedFighterById,
    searchSeedFighters,
    getSeedFightsForFighter,
    getSeedFighterRecord,
    getSeedFightersByDivision
} from './seed-multi-org.js';
import { getVisibleSeedOrgs } from './org-visibility.js';

// ---------------------------------------------------------------------------
// Semilla → modelo interno
// ---------------------------------------------------------------------------
/**
 * Convierte una pelea semilla (forma cruda) a InternalFight, reutilizando el
 * mapeo del adapter y corrigiendo la identidad para que refleje la organización
 * real (provider "pfl"/"bellator", no "api-sports").
 */
function seedRawToInternal(raw) {
    const internal = mapRawFightToInternal(raw);
    const org = raw._seedOrg;
    internal.provider = org;
    internal.providerFightId = String(raw.id);
    internal.id = buildFightId(org, String(raw.id));
    return internal;
}

/** Ordena poniendo el main event primero (para la cartelera). */
function mainEventFirst(fights) {
    return [...fights].sort((a, b) => (b.isMainEvent ? 1 : 0) - (a.isMainEvent ? 1 : 0));
}

// ---------------------------------------------------------------------------
// Funciones compuestas (API real + semilla)
// ---------------------------------------------------------------------------

/** Home · carrusel de próximas peleas. Forma cruda + semilla próxima visible. */
export async function getUpcomingFights(limit = 10) {
    const { fights, error } = await api.getUpcomingFights(limit);
    const seed = getSeedRawUpcoming(getVisibleSeedOrgs());
    const merged = [...(fights || []), ...seed].sort(
        (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
    );
    return { fights: merged, error };
}

/** Home · resultados recientes. Forma cruda + resultados semilla visibles. */
export async function getRecentResults(limit = 10) {
    const { fights, error } = await api.getRecentResults(limit);
    const seed = getSeedRawResults(getVisibleSeedOrgs());
    const merged = [...(fights || []), ...seed].sort(
        (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
    );
    return { fights: merged, error };
}

/**
 * Detalle de evento. Si el slug es de la semilla, se arma el evento desde los
 * fixtures; si no, va al proveedor real.
 */
export async function getEventBySlug(slug) {
    if (isSeedSlug(slug)) {
        const ev = getSeedEvents().find(e => e.slug === slug);
        if (!ev) return { event: null, fights: [], error: null };
        const fights = mainEventFirst(ev.fights.map(seedRawToInternal));
        return {
            event: {
                slug: ev.slug,
                name: eventNameFromSlug(ev.slug),
                dateIso: new Date(ev.timestamp * 1000).toISOString(),
                isPpv: false,
                fightCount: fights.length
            },
            fights,
            error: null
        };
    }
    return api.getEventBySlug(slug);
}

/**
 * Próximo evento a destacar en el Home, según la organización elegida por el
 * usuario. UFC (default) usa el proveedor real; una organización semilla arma
 * el evento desde sus fixtures, en la misma forma que consume el hero del Home.
 */
export async function getNextEventForOrg(org) {
    if (!org || org === 'ufc') return api.getNextEvent();

    const events = getSeedUpcomingEvents([org])
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    if (events.length === 0) return { event: null, error: null };

    const ev = events[0];
    const mainEvent = ev.fights.find(f => f.is_main) || ev.fights[0];
    return {
        event: {
            slug: ev.slug,
            name: eventNameFromSlug(ev.slug),
            date: ev.date,
            timestamp: ev.timestamp,
            category: mainEvent?.category || null,
            isPpv: false,
            mainEvent,
            fightCount: ev.fights.length,
            rawFights: ev.fights
        },
        error: null
    };
}

/** Detalle de pelea. Resuelve primero contra la semilla, después al proveedor. */
export async function getFightById(providerFightId) {
    const seedRaw = findSeedRawFightById(providerFightId);
    if (seedRaw) return { fight: seedRawToInternal(seedRaw), error: null };
    return api.getFightById(providerFightId);
}

// ---------------------------------------------------------------------------
// Funciones sin cambios (solo proveedor real, por ahora solo UFC)
// ---------------------------------------------------------------------------
export const getNextEvent = api.getNextEvent;
export const getNextEventFights = api.getNextEventFights;

// ---------------------------------------------------------------------------
// Peleadores (proveedor real + fichas semilla)
// ---------------------------------------------------------------------------

/** Búsqueda de peleadores: resultados del proveedor + fichas semilla visibles. */
export async function searchFighters(name) {
    const { fighters, error } = await api.searchFighters(name);
    const seed = searchSeedFighters(name, getVisibleSeedOrgs());
    return { fighters: [...(fighters || []), ...seed], error };
}

/** Ficha de peleador. Resuelve primero contra la semilla. */
export async function getFighterById(id, name = null) {
    const seed = findSeedFighterById(id);
    if (seed) return { fighter: seed, error: null };
    return api.getFighterById(id, name);
}

/** Récord de peleador. Para peleadores semilla sale de su ficha. */
export async function getFighterRecord(id) {
    const seed = getSeedFighterRecord(id);
    if (seed) return { ...seed, error: null };
    return api.getFighterRecord(id);
}

/** Historial de peleas de un peleador (semilla o proveedor). */
export async function getFighterFights(fighterId) {
    const seedFights = getSeedFightsForFighter(fighterId);
    if (seedFights.length > 0) return { fights: seedFights, error: null };
    return api.getFighterFights(fighterId);
}

/** Peleadores de una división: los del proveedor + los de la semilla visible. */
export async function getFightersByDivision(division, limit = 16) {
    const { fighters, error } = await api.getFightersByDivision(division, limit);
    const seed = getSeedFightersByDivision(division, getVisibleSeedOrgs()).map(f => ({
        externalId: String(f.id),
        name: f.name,
        photo: f.photo
    }));
    return { fighters: [...(fighters || []), ...seed], error };
}
export const PROVIDER_NAME = api.PROVIDER_NAME;

export { mapRawFightToInternal };

// ---------------------------------------------------------------------------
// Helpers de dominio (sin cambios)
// ---------------------------------------------------------------------------
export {
    FIGHT_METHODS,
    FIGHT_METHOD_LABELS,
    FIGHT_STATUS,
    buildFightId,
    buildFighterId,
    isUfcPpv,
    eventNameFromSlug
} from './normalize.js';

// ---------------------------------------------------------------------------
// Semilla multi-organización (para Predicciones y Settings)
// ---------------------------------------------------------------------------
export { seedRawToInternal };
export { getSeedEvents, getSeedUpcomingEvents } from './seed-multi-org.js';
export { SEED_ORGS, SEED_ORG_LABELS } from './seed-multi-org.js';
export {
    getVisibleSeedOrgs,
    isOrgVisible,
    setOrgVisible,
    allSeedOrgs,
    UFC_ORG,
    homeEventOrgOptions,
    getHomeEventOrg,
    setHomeEventOrg,
    isOnboardingDone,
    setOnboardingDone
} from './org-visibility.js';
