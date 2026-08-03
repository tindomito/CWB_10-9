/**
 * Datos semilla (DEMO) de organizaciones distintas a UFC.
 *
 * Contexto: el proveedor de datos actual (API-Sports) solo cubre UFC de forma
 * fiable. Para demostrar que la app soporta múltiples organizaciones, se cargan
 * acá eventos de PFL y Bellator como fixtures. NO son datos en vivo: son
 * ejemplos curados a mano para ejercitar todo el sistema (predicciones, XP,
 * detalle de evento, resultados) end-to-end.
 *
 * Hay dos tipos de evento semilla:
 *   - PRÓXIMOS (status NS): fecha futura, predecibles. Alimentan Predicciones,
 *     Home (próximas peleas) y detalle de evento.
 *   - FINALIZADOS (status FT): fecha pasada, con resultado cargado. Alimentan
 *     Home (resultados recientes) y detalle de evento.
 *
 * Cuando exista un proveedor multi-organización real, este archivo se borra y
 * su lugar lo ocupa el adapter correspondiente. Nada más cambia.
 *
 * --- Forma de los datos ---
 * Cada pelea se define en la MISMA forma cruda que devuelve API-Sports, de modo
 * que Home la consume sin adaptación y el resto de la app la obtiene como
 * InternalFight reutilizando el mapRawFightToInternal del adapter.
 */

// ---------------------------------------------------------------------------
// Identificadores de organización (sirven para el filtro de visibilidad)
// ---------------------------------------------------------------------------
export const SEED_ORGS = Object.freeze({
    PFL: 'pfl',
    BELLATOR: 'bellator'
});

export const SEED_ORG_LABELS = Object.freeze({
    pfl: 'PFL',
    bellator: 'Bellator'
});

/**
 * Avatar genérico para peleadores sin foto (silueta sobre gris), embebido como
 * data-URI para no depender de un archivo ni de la red.
 */
export const FIGHTER_PLACEHOLDER_PHOTO =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%234a4a4a'/%3E%3Ccircle cx='32' cy='24' r='13' fill='%23111111'/%3E%3Cpath d='M32 42c-11 0-20 9-20 20v2h40v-2c0-11-9-20-20-20z' fill='%23111111'/%3E%3C/svg%3E";

// ---------------------------------------------------------------------------
// Helpers de construcción
// ---------------------------------------------------------------------------
/** Fecha a X días desde hoy (negativo = pasado), a una hora fija UTC. */
function daysFromNow(days, hourUtc = 23) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setUTCHours(hourUtc, 0, 0, 0);
    return d;
}

/**
 * Construye una pelea en la forma cruda de API-Sports.
 * Los IDs de peleador son negativos para no colisionar con los IDs reales.
 * @param status 'NS' (próxima) | 'FT' (finalizada)
 * @param result null | { winner: 1|2, method: 'KO/TKO'|'Submission'|'Decision', round?: number }
 */
function rawFight({ org, fightId, slug, category, isMain, date, f1, f2, status = 'NS', result = null }) {
    const ts = Math.floor(date.getTime() / 1000);
    const win1 = result ? result.winner === 1 : null;
    const win2 = result ? result.winner === 2 : null;
    return {
        id: fightId,
        slug,
        category,
        is_main: !!isMain,
        status: { long: status === 'FT' ? 'Finished' : 'Not Started', short: status },
        timestamp: ts,
        date: date.toISOString(),
        time: date.toISOString().slice(11, 16),
        method: result ? result.method : null,
        round: result ? (result.round ?? null) : null,
        _seedOrg: org,
        fighters: {
            first: { id: f1.id, name: f1.name, logo: f1.logo || FIGHTER_PLACEHOLDER_PHOTO, winner: win1 },
            second: { id: f2.id, name: f2.name, logo: f2.logo || FIGHTER_PLACEHOLDER_PHOTO, winner: win2 }
        }
    };
}

// ---------------------------------------------------------------------------
// Slugs y fechas de eventos
// ---------------------------------------------------------------------------
const PFL_SLUG = 'PFL 8: Braga vs. Pinedo';
const BELLATOR_SLUG = 'Bellator Champions Series: Nurmagomedov vs. Hughes';
const PFL_PAST_SLUG = 'PFL 3: Khaybulaev vs. Jenkins';
const BELLATOR_PAST_SLUG = 'Bellator 301: Bader vs. Vassell';

const PFL_DATE = daysFromNow(26);        // ~próximo mes
const BELLATOR_DATE = daysFromNow(47);   // ~mes y medio
const PFL_PAST_DATE = daysFromNow(-95);  // ~3 meses atrás
const BELLATOR_PAST_DATE = daysFromNow(-124);

// ---------------------------------------------------------------------------
// Eventos semilla
// ---------------------------------------------------------------------------
const SEED_RAW_FIGHTS = [
    // ==== PRÓXIMOS ====
    // ---- PFL 8 ----
    rawFight({
        org: SEED_ORGS.PFL, fightId: 8001, slug: PFL_SLUG, category: 'Featherweight',
        isMain: true, date: PFL_DATE,
        f1: { id: -8001, name: 'Gabriel Braga' }, f2: { id: -8002, name: 'Jesus Pinedo' }
    }),
    rawFight({
        org: SEED_ORGS.PFL, fightId: 8003, slug: PFL_SLUG, category: 'Lightweight',
        isMain: false, date: PFL_DATE,
        f1: { id: -8003, name: 'Clay Collard' }, f2: { id: -8004, name: 'Bruno Miranda' }
    }),
    rawFight({
        org: SEED_ORGS.PFL, fightId: 8005, slug: PFL_SLUG, category: 'Light Heavyweight',
        isMain: false, date: PFL_DATE,
        f1: { id: -8005, name: 'Impa Kasanganay' }, f2: { id: -8006, name: 'Josh Silveira' }
    }),
    rawFight({
        org: SEED_ORGS.PFL, fightId: 8007, slug: PFL_SLUG, category: "Women's Flyweight",
        isMain: false, date: PFL_DATE,
        f1: { id: -8007, name: 'Dakota Ditcheva' }, f2: { id: -8008, name: 'Taila Santos' }
    }),

    // ---- Bellator Champions Series ----
    rawFight({
        org: SEED_ORGS.BELLATOR, fightId: 9001, slug: BELLATOR_SLUG, category: 'Lightweight',
        isMain: true, date: BELLATOR_DATE,
        f1: { id: -9001, name: 'Usman Nurmagomedov' }, f2: { id: -9002, name: 'Paul Hughes' }
    }),
    rawFight({
        org: SEED_ORGS.BELLATOR, fightId: 9003, slug: BELLATOR_SLUG, category: 'Middleweight',
        isMain: false, date: BELLATOR_DATE,
        f1: { id: -9003, name: 'Johnny Eblen' }, f2: { id: -9004, name: 'Fabian Edwards' }
    }),
    rawFight({
        org: SEED_ORGS.BELLATOR, fightId: 9005, slug: BELLATOR_SLUG, category: 'Bantamweight',
        isMain: false, date: BELLATOR_DATE,
        f1: { id: -9005, name: 'Patchy Mix' }, f2: { id: -9006, name: 'Marcos Breno' }
    }),
    rawFight({
        org: SEED_ORGS.BELLATOR, fightId: 9007, slug: BELLATOR_SLUG, category: "Women's Featherweight",
        isMain: false, date: BELLATOR_DATE,
        f1: { id: -9007, name: 'Leah McCourt' }, f2: { id: -9008, name: 'Sara Collins' }
    }),

    // ==== FINALIZADOS (para Resultados / detalle de evento) ====
    // ---- PFL 3 (pasado) ----
    rawFight({
        org: SEED_ORGS.PFL, fightId: 8101, slug: PFL_PAST_SLUG, category: 'Featherweight',
        isMain: true, date: PFL_PAST_DATE,
        f1: { id: -8101, name: 'Movlid Khaybulaev' }, f2: { id: -8102, name: 'Bubba Jenkins' },
        status: 'FT', result: { winner: 1, method: 'KO/TKO', round: 1 }
    }),
    rawFight({
        org: SEED_ORGS.PFL, fightId: 8103, slug: PFL_PAST_SLUG, category: 'Lightweight',
        isMain: false, date: PFL_PAST_DATE,
        f1: { id: -8103, name: 'Olivier Aubin-Mercier' }, f2: { id: -8104, name: 'Shane Burgos' },
        status: 'FT', result: { winner: 1, method: 'Decision' }
    }),
    rawFight({
        org: SEED_ORGS.PFL, fightId: 8105, slug: PFL_PAST_SLUG, category: 'Bantamweight',
        isMain: false, date: PFL_PAST_DATE,
        f1: { id: -8105, name: 'Marlon Moraes' }, f2: { id: -8106, name: 'Brendan Loughnane' },
        status: 'FT', result: { winner: 2, method: 'Submission', round: 2 }
    }),

    // ---- Bellator 301 (pasado) ----
    rawFight({
        org: SEED_ORGS.BELLATOR, fightId: 9101, slug: BELLATOR_PAST_SLUG, category: 'Light Heavyweight',
        isMain: true, date: BELLATOR_PAST_DATE,
        f1: { id: -9101, name: 'Ryan Bader' }, f2: { id: -9102, name: 'Linton Vassell' },
        status: 'FT', result: { winner: 1, method: 'KO/TKO', round: 1 }
    }),
    rawFight({
        org: SEED_ORGS.BELLATOR, fightId: 9103, slug: BELLATOR_PAST_SLUG, category: 'Featherweight',
        isMain: false, date: BELLATOR_PAST_DATE,
        f1: { id: -9103, name: 'Patricio Freire' }, f2: { id: -9104, name: 'Jeremy Kennedy' },
        status: 'FT', result: { winner: 1, method: 'Decision' }
    }),
    rawFight({
        org: SEED_ORGS.BELLATOR, fightId: 9105, slug: BELLATOR_PAST_SLUG, category: 'Bantamweight',
        isMain: false, date: BELLATOR_PAST_DATE,
        f1: { id: -9105, name: 'Sergio Pettis' }, f2: { id: -9106, name: 'Danny Sabatello' },
        status: 'FT', result: { winner: 1, method: 'Decision' }
    })
];

// ---------------------------------------------------------------------------
// Fichas de peleador (semilla)
// ---------------------------------------------------------------------------
/**
 * Perfiles de los peleadores que aparecen en los eventos semilla, en la misma
 * forma que devuelve /fighters de API-Sports (más un `record` propio que usa
 * getFighterRecord).
 *
 * NOTA: los atributos físicos y los récords son APROXIMADOS, con fines de
 * demostración. No son datos verificados de esas personas.
 *
 * Dato de contexto: la API real devuelve estas fichas casi vacías (nickname,
 * height, reach, stance, team y category vienen en null), así que estas fichas
 * semilla están más completas que las de UFC.
 */
function seedFighter(id, name, o = {}) {
    return {
        id,
        name,
        nickname: o.nickname ?? null,
        photo: o.photo ?? FIGHTER_PLACEHOLDER_PHOTO,
        gender: o.gender ?? 'M',
        birth_date: o.birth ?? null,
        age: o.age ?? null,
        height: o.height ?? null,
        weight: o.weight ?? null,
        reach: o.reach ?? null,
        stance: o.stance ?? 'Orthodox',
        category: o.category ?? null,
        team: { id: null, name: o.team ?? null },
        record: o.record ?? null,
        _seedOrg: o.org
    };
}

const P = SEED_ORGS.PFL;
const B = SEED_ORGS.BELLATOR;

const SEED_FIGHTERS = [
    // ---- PFL · próximos ----
    seedFighter(-8001, 'Gabriel Braga', { org: P, age: 30, height: "5' 9'", weight: '145 lbs', reach: "71'", category: 'Featherweight', team: 'Nova União', record: { wins: 12, losses: 2, draws: 0 } }),
    seedFighter(-8002, 'Jesus Pinedo', { org: P, nickname: 'Zorro', age: 30, height: "5' 11'", weight: '145 lbs', reach: "73'", category: 'Featherweight', team: 'Pitbull Team', record: { wins: 24, losses: 11, draws: 1 } }),
    seedFighter(-8003, 'Clay Collard', { org: P, age: 32, height: "5' 10'", weight: '155 lbs', reach: "72'", category: 'Lightweight', team: 'Team Alpha', record: { wins: 25, losses: 11, draws: 0 } }),
    seedFighter(-8004, 'Bruno Miranda', { org: P, age: 30, height: "5' 11'", weight: '155 lbs', reach: "73'", category: 'Lightweight', team: 'Chute Boxe', record: { wins: 15, losses: 5, draws: 0 } }),
    seedFighter(-8005, 'Impa Kasanganay', { org: P, nickname: 'Tshilobo', age: 32, height: "6' 2'", weight: '205 lbs', reach: "77'", category: 'Light Heavyweight', team: 'Team Alpha Male', record: { wins: 18, losses: 6, draws: 0 } }),
    seedFighter(-8006, 'Josh Silveira', { org: P, age: 31, height: "6' 3'", weight: '205 lbs', reach: "78'", category: 'Light Heavyweight', team: 'American Top Team', record: { wins: 14, losses: 2, draws: 0 } }),
    seedFighter(-8007, 'Dakota Ditcheva', { org: P, gender: 'F', age: 27, height: "5' 7'", weight: '125 lbs', reach: "68'", category: "Women's Flyweight", team: 'Team Kaobon', record: { wins: 15, losses: 0, draws: 0 } }),
    seedFighter(-8008, 'Taila Santos', { org: P, gender: 'F', age: 32, height: "5' 5'", weight: '125 lbs', reach: "66'", category: "Women's Flyweight", team: 'Astra Fight Team', record: { wins: 21, losses: 3, draws: 0 } }),

    // ---- Bellator · próximos ----
    seedFighter(-9001, 'Usman Nurmagomedov', { org: B, age: 27, height: "5' 11'", weight: '155 lbs', reach: "73'", category: 'Lightweight', team: 'Eagles MMA', record: { wins: 19, losses: 1, draws: 0 } }),
    seedFighter(-9002, 'Paul Hughes', { org: B, nickname: 'Big News', age: 30, height: "5' 11'", weight: '155 lbs', reach: "72'", category: 'Lightweight', team: 'SBG Ireland', record: { wins: 14, losses: 2, draws: 0 } }),
    seedFighter(-9003, 'Johnny Eblen', { org: B, age: 34, height: "6' 1'", weight: '185 lbs', reach: "76'", category: 'Middleweight', team: 'American Top Team', record: { wins: 16, losses: 0, draws: 0 } }),
    seedFighter(-9004, 'Fabian Edwards', { org: B, age: 32, height: "6' 1'", weight: '185 lbs', reach: "75'", stance: 'Southpaw', category: 'Middleweight', team: 'Team Renegade', record: { wins: 14, losses: 4, draws: 0 } }),
    seedFighter(-9005, 'Patchy Mix', { org: B, age: 32, height: "5' 9'", weight: '135 lbs', reach: "71'", category: 'Bantamweight', team: 'Team Mix', record: { wins: 20, losses: 1, draws: 0 } }),
    seedFighter(-9006, 'Marcos Breno', { org: B, age: 29, height: "5' 7'", weight: '135 lbs', reach: "69'", category: 'Bantamweight', team: 'Nova União', record: { wins: 12, losses: 3, draws: 0 } }),
    seedFighter(-9007, 'Leah McCourt', { org: B, gender: 'F', age: 33, height: "5' 8'", weight: '145 lbs', reach: "70'", category: "Women's Featherweight", team: 'SBG Ireland', record: { wins: 8, losses: 3, draws: 0 } }),
    seedFighter(-9008, 'Sara Collins', { org: B, gender: 'F', age: 31, height: "5' 7'", weight: '145 lbs', reach: "68'", category: "Women's Featherweight", team: 'Team Ryano', record: { wins: 6, losses: 2, draws: 0 } }),

    // ---- PFL · evento pasado ----
    seedFighter(-8101, 'Movlid Khaybulaev', { org: P, age: 32, height: "5' 9'", weight: '145 lbs', reach: "71'", category: 'Featherweight', team: 'Eagles MMA', record: { wins: 22, losses: 0, draws: 1 } }),
    seedFighter(-8102, 'Bubba Jenkins', { org: P, age: 38, height: "5' 10'", weight: '145 lbs', reach: "72'", category: 'Featherweight', team: 'Alliance MMA', record: { wins: 20, losses: 8, draws: 0 } }),
    seedFighter(-8103, 'Olivier Aubin-Mercier', { org: P, nickname: 'The Canadian Gangster', age: 36, height: "5' 10'", weight: '155 lbs', reach: "72'", category: 'Lightweight', team: 'Tristar Gym', record: { wins: 20, losses: 5, draws: 0 } }),
    seedFighter(-8104, 'Shane Burgos', { org: P, nickname: 'Hurricane', age: 35, height: "5' 11'", weight: '155 lbs', reach: "73'", category: 'Lightweight', team: 'Tiger Schulmann', record: { wins: 16, losses: 4, draws: 0 } }),
    seedFighter(-8105, 'Marlon Moraes', { org: P, nickname: 'Magic', age: 37, height: "5' 6'", weight: '135 lbs', reach: "69'", category: 'Bantamweight', team: 'Mark Henry', record: { wins: 23, losses: 11, draws: 1 } }),
    seedFighter(-8106, 'Brendan Loughnane', { org: P, age: 35, height: "5' 9'", weight: '135 lbs', reach: "71'", category: 'Bantamweight', team: 'Sanford MMA', record: { wins: 27, losses: 5, draws: 0 } }),

    // ---- Bellator · evento pasado ----
    seedFighter(-9101, 'Ryan Bader', { org: B, nickname: 'Darth', age: 42, height: "6' 2'", weight: '205 lbs', reach: "76'", category: 'Light Heavyweight', team: 'Power MMA', record: { wins: 31, losses: 8, draws: 0 } }),
    seedFighter(-9102, 'Linton Vassell', { org: B, nickname: 'The Swarm', age: 42, height: "6' 4'", weight: '205 lbs', reach: "79'", category: 'Light Heavyweight', team: 'Team Titan', record: { wins: 24, losses: 9, draws: 0 } }),
    seedFighter(-9103, 'Patricio Freire', { org: B, nickname: 'Pitbull', age: 38, height: "5' 7'", weight: '145 lbs', reach: "70'", category: 'Featherweight', team: 'Pitbull Brothers', record: { wins: 36, losses: 7, draws: 0 } }),
    seedFighter(-9104, 'Jeremy Kennedy', { org: B, age: 33, height: "5' 9'", weight: '145 lbs', reach: "71'", category: 'Featherweight', team: 'Team Alpha Male', record: { wins: 19, losses: 3, draws: 0 } }),
    seedFighter(-9105, 'Sergio Pettis', { org: B, nickname: 'The Phenom', age: 32, height: "5' 6'", weight: '135 lbs', reach: "69'", category: 'Bantamweight', team: 'Roufusport', record: { wins: 23, losses: 6, draws: 0 } }),
    seedFighter(-9106, 'Danny Sabatello', { org: B, nickname: 'The Italian Gangster', age: 33, height: "5' 6'", weight: '135 lbs', reach: "68'", category: 'Bantamweight', team: 'Roufusport', record: { wins: 14, losses: 3, draws: 0 } })
];

// ---------------------------------------------------------------------------
// API del módulo semilla
// ---------------------------------------------------------------------------

/**
 * Peleas semilla en forma cruda, filtradas por organizaciones visibles.
 * `visibleOrgs` es un Set/array de ids de org; null = todas.
 */
export function getSeedRawFights(visibleOrgs = null) {
    if (!visibleOrgs) return SEED_RAW_FIGHTS;
    const set = visibleOrgs instanceof Set ? visibleOrgs : new Set(visibleOrgs);
    return SEED_RAW_FIGHTS.filter(f => set.has(f._seedOrg));
}

/** Peleas semilla PRÓXIMAS (predecibles) en forma cruda. */
export function getSeedRawUpcoming(visibleOrgs = null) {
    return getSeedRawFights(visibleOrgs).filter(f => f.status.short !== 'FT');
}

/** Peleas semilla FINALIZADAS (con resultado) en forma cruda. */
export function getSeedRawResults(visibleOrgs = null) {
    return getSeedRawFights(visibleOrgs).filter(f => f.status.short === 'FT');
}

/** Agrupa peleas crudas en eventos (por slug). */
function groupIntoEvents(fights) {
    const bySlug = new Map();
    for (const f of fights) {
        if (!bySlug.has(f.slug)) {
            bySlug.set(f.slug, {
                slug: f.slug,
                org: f._seedOrg,
                date: f.date,
                timestamp: f.timestamp,
                finished: f.status.short === 'FT',
                fights: []
            });
        }
        bySlug.get(f.slug).fights.push(f);
    }
    return [...bySlug.values()];
}

/** Todos los eventos semilla (próximos y finalizados). */
export function getSeedEvents(visibleOrgs = null) {
    return groupIntoEvents(getSeedRawFights(visibleOrgs));
}

/** Solo los eventos semilla PRÓXIMOS (los que se pueden predecir). */
export function getSeedUpcomingEvents(visibleOrgs = null) {
    return groupIntoEvents(getSeedRawUpcoming(visibleOrgs));
}

/**
 * Devuelve la pelea semilla cruda cuyo providerFightId coincide, o null.
 * Se compara contra los datos reales de la semilla (no por heurística de
 * strings), así nunca se confunde con un id de API-Sports.
 */
export function findSeedRawFightById(providerFightId) {
    if (providerFightId == null) return null;
    return SEED_RAW_FIGHTS.find(f => String(f.id) === String(providerFightId)) || null;
}

/** ¿Este slug de evento pertenece a la semilla? */
export function isSeedSlug(slug) {
    return getSeedEvents().some(e => e.slug === slug);
}

// ---------------------------------------------------------------------------
// Peleadores semilla
// ---------------------------------------------------------------------------

/** Ficha semilla por id (acepta number o string), o null. */
export function findSeedFighterById(id) {
    if (id == null) return null;
    return SEED_FIGHTERS.find(f => String(f.id) === String(id)) || null;
}

/** Fichas semilla cuyo nombre/apodo coincida con la búsqueda. */
export function searchSeedFighters(query, visibleOrgs = null) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase().trim();
    const set = visibleOrgs
        ? (visibleOrgs instanceof Set ? visibleOrgs : new Set(visibleOrgs))
        : null;
    return SEED_FIGHTERS.filter(f => {
        if (set && !set.has(f._seedOrg)) return false;
        return f.name.toLowerCase().includes(q)
            || (f.nickname || '').toLowerCase().includes(q);
    });
}

/** Peleas semilla (crudas) en las que participa un peleador, más recientes primero. */
export function getSeedFightsForFighter(fighterId, visibleOrgs = null) {
    if (fighterId == null) return [];
    const id = String(fighterId);
    return getSeedRawFights(visibleOrgs)
        .filter(f => String(f.fighters.first.id) === id || String(f.fighters.second.id) === id)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/**
 * Récord de un peleador semilla, en el mismo formato que devuelve el adapter:
 * { record: { wins, losses, draws, total }, recent: [peleas crudas] }.
 * El récord sale de la ficha (carrera completa), no solo de las peleas semilla.
 */
export function getSeedFighterRecord(fighterId) {
    const fighter = findSeedFighterById(fighterId);
    if (!fighter) return null;
    const r = fighter.record;
    const record = r
        ? { ...r, total: r.wins + r.losses + r.draws }
        : { wins: 0, losses: 0, draws: 0, total: 0 };
    return { record, recent: getSeedFightsForFighter(fighterId).slice(0, 5) };
}

/** Fichas semilla de una división (para precargar rankings). */
export function getSeedFightersByDivision(division, visibleOrgs = null) {
    if (!division) return [];
    const set = visibleOrgs
        ? (visibleOrgs instanceof Set ? visibleOrgs : new Set(visibleOrgs))
        : null;
    return SEED_FIGHTERS.filter(f => {
        if (set && !set.has(f._seedOrg)) return false;
        return f.category === division;
    });
}
