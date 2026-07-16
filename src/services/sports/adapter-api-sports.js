/**
 * Adapter para API-Sports MMA (https://www.api-sports.io/documentation/mma/v1).
 *
 * Toda la lógica acoplada al proveedor vive acá. El resto de la app consume
 * los modelos definidos en ./normalize.js.
 *
 * Para reemplazar este proveedor por otro (SportsDataIO, Sportradar, etc.):
 *   1. Crear src/services/sports/adapter-<nombre>.js con la misma firma pública.
 *   2. Cambiar el import en src/services/sports/index.js.
 *   3. No tocar nada más.
 *
 * --- DEMO MODE ---
 * El plan free de API-Sports solo expone temporadas 2022-2024. Anclamos "hoy"
 * 2 años atrás para que el dataset funcione como temporada activa. Quitar el
 * offset cuando se migre a un plan que cubra el año real.
 */
import {
    FIGHT_STATUS,
    FIGHT_METHODS,
    buildFightId,
    isUfcPpv,
    eventNameFromSlug
} from './normalize.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const PROVIDER = 'api-sports';
const API_KEY = import.meta.env.VITE_MMA_API_KEY;
const BASE_URL = import.meta.env.VITE_MMA_API_BASE_URL;
const HEADERS = { 'x-apisports-key': API_KEY };

const AVAILABLE_SEASONS = [2022, 2023, 2024, 2025, 2026];
const DEMO_YEAR_OFFSET = 2;
const SEASON_CACHE_TTL_MS = 5 * 60 * 1000;

let seasonCache = null;
let seasonCacheTs = 0;

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------
export function getDemoNow() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - DEMO_YEAR_OFFSET);
    return d;
}
const demoNowSec = () => Math.floor(getDemoNow().getTime() / 1000);

function hasErrors(data) {
    if (!data || !data.errors) return false;
    return Array.isArray(data.errors)
        ? data.errors.length > 0
        : Object.keys(data.errors).length > 0;
}

function errorsToMessage(data) {
    const errs = Array.isArray(data.errors) ? data.errors : Object.values(data.errors);
    return errs.join(', ');
}

/** Construye un ISO datetime a partir de date + time + timestamp. */
function toIsoDate(raw) {
    if (raw.timestamp) {
        return new Date(raw.timestamp * 1000).toISOString();
    }
    if (raw.date) {
        const time = raw.time || '00:00';
        return new Date(`${raw.date}T${time}:00Z`).toISOString();
    }
    return null;
}

/**
 * Mapea el método de finalización crudo de la API a nuestro enum interno.
 * API-Sports devuelve strings libres ("KO/TKO", "Submission", "Decision",
 * "Decision - Unanimous", etc.). Normalizamos por keyword.
 */
function mapMethod(rawMethod) {
    if (!rawMethod) return null;
    const m = String(rawMethod).toLowerCase();
    if (m.includes('ko') || m.includes('tko') || m.includes('knockout')) return FIGHT_METHODS.KO_TKO;
    if (m.includes('sub') || m.includes('tap') || m.includes('choke')) return FIGHT_METHODS.SUBMISSION;
    if (m.includes('decision') || m.includes('decisi')) return FIGHT_METHODS.DECISION;
    return null;
}

function mapStatus(rawStatus) {
    if (!rawStatus) return FIGHT_STATUS.SCHEDULED;
    const code = (rawStatus.short || rawStatus.long || '').toUpperCase();
    if (code === 'FT') return FIGHT_STATUS.FINISHED;
    if (code === 'CANC' || code === 'CANCELLED' || code === 'CANCELED') return FIGHT_STATUS.CANCELLED;
    return FIGHT_STATUS.SCHEDULED;
}

// ---------------------------------------------------------------------------
// Mapeo crudo → modelo interno
// ---------------------------------------------------------------------------
/**
 * Convierte un objeto fight de API-Sports al modelo interno InternalFight.
 * @param {object} raw - respuesta cruda de /fights
 * @returns {import('./normalize.js').InternalFight}
 */
export function mapRawFightToInternal(raw) {
    const slug = raw.slug || null;
    const f1 = raw.fighters?.first || {};
    const f2 = raw.fighters?.second || {};
    const status = mapStatus(raw.status);

    let winnerExternalId = null;
    if (status === FIGHT_STATUS.FINISHED) {
        if (f1.winner === true) winnerExternalId = f1.id != null ? String(f1.id) : null;
        else if (f2.winner === true) winnerExternalId = f2.id != null ? String(f2.id) : null;
    }

    const method = status === FIGHT_STATUS.FINISHED ? mapMethod(raw.method) : null;
    const round = status === FIGHT_STATUS.FINISHED && raw.round != null
        ? Number(raw.round)
        : null;

    return {
        id: buildFightId(PROVIDER, String(raw.id)),
        provider: PROVIDER,
        providerFightId: String(raw.id),
        eventName: eventNameFromSlug(slug),
        eventSlug: slug,
        weightClass: raw.category || null,
        isMainEvent: !!raw.is_main,
        isPpv: isUfcPpv(slug),
        dateIso: toIsoDate(raw),
        status,
        fighter1: {
            externalId: f1.id != null ? String(f1.id) : null,
            name: f1.name || null,
            photo: f1.logo || null
        },
        fighter2: {
            externalId: f2.id != null ? String(f2.id) : null,
            name: f2.name || null,
            photo: f2.logo || null
        },
        result: status === FIGHT_STATUS.FINISHED && winnerExternalId ? {
            winnerExternalId,
            method,
            round: method && method !== FIGHT_METHODS.DECISION ? round : null
        } : null
    };
}

// ---------------------------------------------------------------------------
// Llamadas a la API
// ---------------------------------------------------------------------------
async function fetchSeasonFights() {
    const now = Date.now();
    if (seasonCache && (now - seasonCacheTs) < SEASON_CACHE_TTL_MS) {
        return seasonCache;
    }

    const currentYear = getDemoNow().getFullYear();
    const seasonsToTry = AVAILABLE_SEASONS.includes(currentYear)
        ? [currentYear, currentYear - 1].filter(s => AVAILABLE_SEASONS.includes(s))
        : AVAILABLE_SEASONS.slice(-2);

    try {
        const requests = seasonsToTry.map(season =>
            fetch(`${BASE_URL}/fights?season=${season}`, { headers: HEADERS })
                .then(r => r.json())
                .then(data => (hasErrors(data) ? [] : (data.response || [])))
                .catch(() => [])
        );
        const results = await Promise.all(requests);
        seasonCache = results.flat();
        seasonCacheTs = now;
        return seasonCache;
    } catch (error) {
        console.error('[adapter-api-sports] Error fetching season fights:', error);
        return [];
    }
}

// ---------------------------------------------------------------------------
// API pública del adapter (esto es lo que index.js reexporta)
// ---------------------------------------------------------------------------

export async function searchFighters(name) {
    if (!name || name.length < 2) return { fighters: [], error: null };
    try {
        const response = await fetch(
            `${BASE_URL}/fighters?search=${encodeURIComponent(name)}`,
            { headers: HEADERS }
        );
        const data = await response.json();
        if (hasErrors(data)) return { fighters: [], error: errorsToMessage(data) };
        return { fighters: data.response || [], error: null };
    } catch (error) {
        console.error('[adapter-api-sports] Error searching fighters:', error);
        return { fighters: [], error: 'Error al conectar con la API' };
    }
}

export async function getFighterFights(fighterId) {
    try {
        const requests = AVAILABLE_SEASONS.map(season =>
            fetch(`${BASE_URL}/fights?fighter=${fighterId}&season=${season}`, { headers: HEADERS })
                .then(r => r.json())
                .then(data => (hasErrors(data) ? [] : (data.response || [])))
                .catch(() => [])
        );
        const results = await Promise.all(requests);
        const allFights = results.flat();
        allFights.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return { fights: allFights, error: null };
    } catch (error) {
        console.error('[adapter-api-sports] Error getting fighter fights:', error);
        return { fights: [], error: 'Error al cargar peleas' };
    }
}

export async function getUpcomingFights(limit = 10) {
    const all = await fetchSeasonFights();
    const nowSec = demoNowSec();
    const upcoming = all
        .filter(f => f.timestamp && f.timestamp > nowSec)
        .sort((a, b) => a.timestamp - b.timestamp);
    return { fights: upcoming.slice(0, limit), error: null };
}

export async function getRecentResults(limit = 10) {
    const all = await fetchSeasonFights();
    const nowSec = demoNowSec();
    const recent = all
        .filter(f => f.timestamp && f.timestamp < nowSec)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return { fights: recent.slice(0, limit), error: null };
}

export async function getNextEvent() {
    const all = await fetchSeasonFights();
    const nowSec = demoNowSec();
    const upcoming = all.filter(f => f.timestamp && f.timestamp > nowSec);
    if (upcoming.length === 0) return { event: null, error: null };

    const groups = new Map();
    for (const fight of upcoming) {
        const key = fight.slug || `event-${fight.date}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(fight);
    }

    let nextEvent = null;
    let earliest = Infinity;
    for (const [slug, fights] of groups.entries()) {
        const minTs = Math.min(...fights.map(f => f.timestamp));
        if (minTs < earliest) {
            earliest = minTs;
            const main = fights.find(f => f.is_main) || fights[0];
            nextEvent = {
                slug,
                name: eventNameFromSlug(slug),
                date: main.date,
                timestamp: minTs,
                category: main.category,
                isPpv: isUfcPpv(slug),
                mainEvent: main,
                fightCount: fights.length,
                rawFights: fights
            };
        }
    }
    return { event: nextEvent, error: null };
}

/**
 * Adelanta una fecha por DEMO_YEAR_OFFSET años. Usado para "remapear" peleas
 * del dataset viejo de la API-Sports a fechas reales en el futuro, así el
 * sistema de predicciones (que valida `fight_date > now()` en SQL y JS) no
 * rechaza peleas que en demo-time son futuras pero en tiempo real ya pasaron.
 */
function shiftDateByDemoOffset(timestampSec) {
    if (!timestampSec) return null;
    const d = new Date(timestampSec * 1000);
    if (DEMO_YEAR_OFFSET > 0) d.setFullYear(d.getFullYear() + DEMO_YEAR_OFFSET);
    return d.toISOString();
}

/**
 * En demo mode, peleas "futuras en demo-time" se simulan como `scheduled`
 * sin resultado y con fecha adelantada al futuro real. Así se pueden predecir.
 *
 * La API-Sports free tier solo expone temporadas 2022-2024, así que peleas
 * de "el próximo sábado en demo-time" en realidad ya ocurrieron hace ~2 años
 * y vienen con winner cargado. El admin puede resolver manualmente cada pelea
 * vía `admin_resolve_fight` RPC para simular el cierre del evento.
 */
function adjustForDemoMode(internal, raw) {
    if (DEMO_YEAR_OFFSET <= 0) return internal;
    if (!raw.timestamp) return internal;
    if (raw.timestamp <= demoNowSec()) return internal;

    return {
        ...internal,
        status: FIGHT_STATUS.SCHEDULED,
        result: null,
        dateIso: shiftDateByDemoOffset(raw.timestamp)
    };
}

// ---------------------------------------------------------------------------
// Limpieza del dataset crudo (heurísticas)
// ---------------------------------------------------------------------------
// El dataset de API-Sports tiene 3 problemas frecuentes que arreglamos acá:
//   1. Peleas "fantasma" con timestamp arbitrario (12:00 UTC típicamente)
//      cuando la card real arranca varias horas después.
//   2. El mismo peleador aparece en 2 peleas del mismo evento.
//   3. El mismo par de peleadores aparece en 2 peleas con IDs distintos.
// Si en el futuro migramos a SportsDataIO (que sí trae BoutOrder), este
// bloque entero se puede borrar.

const SIX_HOURS_SECS = 6 * 60 * 60;

/** Moda simple sobre un array de números. */
function mode(arr) {
    if (!arr.length) return null;
    const counts = new Map();
    let best = arr[0], bestCount = 0;
    for (const v of arr) {
        const c = (counts.get(v) || 0) + 1;
        counts.set(v, c);
        if (c > bestCount) { bestCount = c; best = v; }
    }
    return best;
}

/**
 * Timestamp "base" del evento: el más común entre las peleas marcadas
 * is_main=true (todo el main card las trae). Si no hay, usamos la moda
 * de todas. Sirve para descartar peleas-fantasma con timestamps anómalos.
 */
function pickBaseTimestamp(rawFights) {
    const mainTs = rawFights.filter(f => f.is_main && f.timestamp).map(f => f.timestamp);
    if (mainTs.length) return mode(mainTs);
    const allTs = rawFights.filter(f => f.timestamp).map(f => f.timestamp);
    return allTs.length ? mode(allTs) : null;
}

/** Descarta peleas cuyo timestamp esté más de 6 horas alejado del base. */
function filterByBaseTimestamp(rawFights, baseTimestamp) {
    if (!baseTimestamp) return rawFights;
    return rawFights.filter(f => {
        if (!f.timestamp) return true;
        return Math.abs(f.timestamp - baseTimestamp) <= SIX_HOURS_SECS;
    });
}

/** Compara dos raw fights y devuelve la "mejor" (más probable de ser real). */
function preferBetter(a, b) {
    // is_main DESC
    if (!!a.is_main !== !!b.is_main) return a.is_main ? a : b;
    // timestamp DESC
    if ((a.timestamp || 0) !== (b.timestamp || 0)) {
        return (a.timestamp || 0) > (b.timestamp || 0) ? a : b;
    }
    // id DESC
    return (a.id || 0) > (b.id || 0) ? a : b;
}

/**
 * Si un peleador aparece en >1 pelea, dejar solo una (la mejor según preferBetter).
 * Las restantes se eliminan completas (no se pueden "partir" porque la otra
 * mitad de la pelea también es sospechosa).
 */
function dedupByFighter(rawFights) {
    const fighterToFights = new Map(); // fighterId -> Array<raw>
    for (const f of rawFights) {
        for (const slot of ['first', 'second']) {
            const fid = f.fighters?.[slot]?.id;
            if (fid == null) continue;
            if (!fighterToFights.has(fid)) fighterToFights.set(fid, []);
            fighterToFights.get(fid).push(f);
        }
    }

    const discard = new Set();
    for (const fights of fighterToFights.values()) {
        if (fights.length < 2) continue;
        // Encontrar la mejor
        let best = fights[0];
        for (let i = 1; i < fights.length; i++) best = preferBetter(best, fights[i]);
        // Marcar el resto para descartar
        for (const f of fights) {
            if (f.id !== best.id) discard.add(f.id);
        }
    }
    return rawFights.filter(f => !discard.has(f.id));
}

/** Si dos peleas tienen el mismo par {fighter1Id, fighter2Id}, conservar la mejor. */
function dedupByPair(rawFights) {
    const byPair = new Map();
    for (const f of rawFights) {
        const a = f.fighters?.first?.id;
        const b = f.fighters?.second?.id;
        if (a == null || b == null) {
            // Sin par válido: la mantenemos con clave única
            byPair.set(`solo-${f.id}`, f);
            continue;
        }
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        const existing = byPair.get(key);
        byPair.set(key, existing ? preferBetter(existing, f) : f);
    }
    return [...byPair.values()];
}

/**
 * Extrae los apellidos del main event del slug del evento.
 * Slugs típicos: "UFC Fight Night: Barboza vs. Murphy" → ['barboza', 'murphy']
 *                "UFC 305: Du Plessis vs Adesanya"   → ['du plessis', 'adesanya']
 *                "UFC 305"                            → null (PPV sin nombres)
 */
function parseMainEventFromSlug(slug) {
    if (!slug) return null;
    const m = slug.match(/:\s*(.+?)\s+vs\.?\s+(.+?)\s*$/i);
    if (!m) return null;
    return [m[1].toLowerCase().trim(), m[2].toLowerCase().trim()];
}

/** ¿Esta pelea matchea los apellidos del main event? */
function isMainEventByName(fight, names) {
    if (!names) return false;
    const [a, b] = names;
    const n1 = (fight.fighter1?.name || '').toLowerCase();
    const n2 = (fight.fighter2?.name || '').toLowerCase();
    return (n1.includes(a) && n2.includes(b)) || (n1.includes(b) && n2.includes(a));
}

/**
 * Orden de cartelera UFC heurístico:
 *   0. Si una pelea matchea los apellidos del slug ("Barboza vs Murphy"), va primera.
 *   1. is_main=true primero, is_main=false después
 *   2. Dentro de cada grupo: timestamp DESC (main event va último cronológicamente)
 *   3. Tiebreak final: providerFightId DESC
 */
function sortByCardOrder(internalFights, mainEventNames = null) {
    return [...internalFights].sort((a, b) => {
        // 0. Main event explícito por nombre del slug
        const aMain = isMainEventByName(a, mainEventNames) ? 1 : 0;
        const bMain = isMainEventByName(b, mainEventNames) ? 1 : 0;
        if (aMain !== bMain) return bMain - aMain;

        // 1. Main card vs prelims
        const am = a.isMainEvent ? 1 : 0;
        const bm = b.isMainEvent ? 1 : 0;
        if (am !== bm) return bm - am;

        // 2. Timestamp DESC
        const at = a.dateIso ? new Date(a.dateIso).getTime() : 0;
        const bt = b.dateIso ? new Date(b.dateIso).getTime() : 0;
        if (at !== bt) return bt - at;

        // 3. ID DESC
        return (Number(b.providerFightId) || 0) - (Number(a.providerFightId) || 0);
    });
}

/**
 * Devuelve todas las peleas del próximo evento en formato InternalFight.
 * Esta es la función que usa el sistema de predicciones.
 *
 * Pipeline:
 *   1. Limpieza del dataset crudo (filtro de timestamps fantasma, dedup).
 *   2. Mapeo a InternalFight + ajuste demo mode (forzar scheduled si futuro).
 *   3. Ordenado como cartelera UFC.
 */
/**
 * Pipeline de limpieza + ordenado compartido: toma peleas crudas de un mismo
 * evento y devuelve InternalFights ordenadas como cartelera UFC.
 */
function cleanAndSortRawFights(rawFights, slug) {
    let cleaned = rawFights;
    const baseTs = pickBaseTimestamp(cleaned);
    cleaned = filterByBaseTimestamp(cleaned, baseTs);
    cleaned = dedupByFighter(cleaned);
    cleaned = dedupByPair(cleaned);

    const fights = cleaned.map((raw) => adjustForDemoMode(mapRawFightToInternal(raw), raw));
    const mainEventNames = parseMainEventFromSlug(slug);
    return sortByCardOrder(fights, mainEventNames);
}

export async function getNextEventFights() {
    const { event, error } = await getNextEvent();
    if (error || !event) return { event: null, fights: [], error };

    const sortedFights = cleanAndSortRawFights(event.rawFights, event.slug);

    // El header del evento usa la misma fecha adelantada para mantener coherencia
    const eventDateIso = DEMO_YEAR_OFFSET > 0
        ? shiftDateByDemoOffset(event.timestamp)
        : (event.timestamp ? new Date(event.timestamp * 1000).toISOString() : null);

    return {
        event: {
            slug: event.slug,
            name: event.name,
            dateIso: eventDateIso,
            isPpv: event.isPpv,
            fightCount: sortedFights.length
        },
        fights: sortedFights,
        error: null
    };
}

/**
 * Devuelve un evento completo (peleas limpias y ordenadas como cartelera) a
 * partir de su slug. Usado por la vista de detalle de evento.
 */
export async function getEventBySlug(slug) {
    if (!slug) return { event: null, fights: [], error: null };
    const all = await fetchSeasonFights();
    const raw = all.filter(f => (f.slug || '') === slug);
    if (raw.length === 0) return { event: null, fights: [], error: null };

    const sortedFights = cleanAndSortRawFights(raw, slug);
    const baseTs = pickBaseTimestamp(raw);
    const eventDateIso = DEMO_YEAR_OFFSET > 0
        ? shiftDateByDemoOffset(baseTs)
        : (baseTs ? new Date(baseTs * 1000).toISOString() : null);

    return {
        event: {
            slug,
            name: eventNameFromSlug(slug),
            dateIso: eventDateIso,
            isPpv: isUfcPpv(slug),
            fightCount: sortedFights.length
        },
        fights: sortedFights,
        error: null
    };
}

/**
 * Busca una pelea puntual por su ID nativo del proveedor y la devuelve en
 * formato InternalFight. Usado por la vista "tale of the tape".
 */
export async function getFightById(providerFightId) {
    if (!providerFightId) return { fight: null, error: null };
    const all = await fetchSeasonFights();
    const raw = all.find(f => String(f.id) === String(providerFightId));
    if (!raw) return { fight: null, error: null };
    return { fight: adjustForDemoMode(mapRawFightToInternal(raw), raw), error: null };
}

/**
 * Trae el detalle completo de un peleador (altura, peso, alcance, postura,
 * edad, equipo, etc.). El plan free de API-Sports responde de forma fiable a
 * /fighters?search=<nombre>, así que buscamos por nombre y matcheamos por id.
 */
export async function getFighterById(id, name = null) {
    if (name) {
        const { fighters } = await searchFighters(name);
        const list = fighters || [];
        const exact = list.find((f) => String(f.id) === String(id));
        if (exact) return { fighter: exact, error: null };
        if (list.length > 0) return { fighter: list[0], error: null };
    }
    try {
        const res = await fetch(`${BASE_URL}/fighters?id=${id}`, { headers: HEADERS });
        const data = await res.json();
        if (!hasErrors(data) && Array.isArray(data.response) && data.response[0]) {
            return { fighter: data.response[0], error: null };
        }
    } catch (e) {
        console.error('[adapter-api-sports] getFighterById error:', e);
    }
    return { fighter: null, error: null };
}

/**
 * Calcula el récord (V-D-E) de un peleador y sus últimas peleas a partir del
 * cache de temporadas que ya se carga para el evento (vía fetchSeasonFights).
 * No hace requests extra: reutiliza las 2 temporadas cacheadas. Cubre menos
 * historia que un pull completo, pero alcanza mientras la app no necesite
 * datos 100% actualizados (todavía no está en mercado).
 */
export async function getFighterRecord(id) {
    if (!id) return { record: null, recent: [], error: null };

    const all = await fetchSeasonFights();
    const mine = all
        .filter((f) => {
            const a = f.fighters?.first?.id;
            const b = f.fighters?.second?.id;
            return String(a) === String(id) || String(b) === String(id);
        })
        .sort((x, y) => (y.timestamp || 0) - (x.timestamp || 0));

    const finished = mine.filter((f) => (f.status?.short || '').toUpperCase() === 'FT');
    let wins = 0, losses = 0, draws = 0;
    for (const f of finished) {
        const isF1 = f.fighters?.first && String(f.fighters.first.id) === String(id);
        const me = isF1 ? f.fighters.first : f.fighters.second;
        const opp = isF1 ? f.fighters.second : f.fighters.first;
        if (me?.winner === true) wins++;
        else if (opp?.winner === true) losses++;
        else draws++;
    }
    return {
        record: { wins, losses, draws, total: finished.length },
        recent: mine.slice(0, 5),
        error: null
    };
}

/**
 * Devuelve peleadores de una división, derivados de las peleas de temporada
 * cacheadas (la API free no tiene endpoint de "fighters por división").
 * Se agregan los peleadores cuya categoría coincide y se ordenan por cantidad
 * de apariciones (proxy de relevancia). Sirve para precargar un ranking.
 *
 * @param {string} division - categoría exacta (ej: "Lightweight", "Women's Strawweight")
 * @param {number} limit
 * @returns {Promise<{fighters: Array<{externalId, name, photo}>, error: null}>}
 */
export async function getFightersByDivision(division, limit = 16) {
    if (!division) return { fighters: [], error: null };
    const all = await fetchSeasonFights();
    const map = new Map(); // id -> { externalId, name, photo, count, lastTs }
    for (const f of all) {
        if (f.category !== division) continue;
        for (const slot of ['first', 'second']) {
            const fi = f.fighters?.[slot];
            if (!fi || fi.id == null) continue;
            const id = String(fi.id);
            if (!map.has(id)) {
                map.set(id, { externalId: id, name: fi.name, photo: fi.logo || null, count: 0, lastTs: 0 });
            }
            const entry = map.get(id);
            entry.count += 1;
            if ((f.timestamp || 0) > entry.lastTs) entry.lastTs = f.timestamp || 0;
        }
    }
    const list = [...map.values()]
        .sort((a, b) => (b.count - a.count) || (b.lastTs - a.lastTs))
        .slice(0, limit)
        .map(({ externalId, name, photo }) => ({ externalId, name, photo }));
    return { fighters: list, error: null };
}

export const PROVIDER_NAME = PROVIDER;
