/**
 * Punto único de acceso al proveedor de datos deportivos.
 *
 * Toda la app importa desde acá, no desde el adapter directamente.
 * Para cambiar de proveedor en el futuro: cambiar el import de abajo y listo.
 */
export {
    searchFighters,
    getFighterFights,
    getUpcomingFights,
    getRecentResults,
    getNextEvent,
    getNextEventFights,
    getEventBySlug,
    getFightById,
    getFighterById,
    getFighterRecord,
    getFightersByDivision,
    getDemoNow,
    PROVIDER_NAME,
    mapRawFightToInternal
} from './adapter-api-sports.js';

export {
    FIGHT_METHODS,
    FIGHT_METHOD_LABELS,
    FIGHT_STATUS,
    buildFightId,
    buildFighterId,
    isUfcPpv,
    eventNameFromSlug
} from './normalize.js';
