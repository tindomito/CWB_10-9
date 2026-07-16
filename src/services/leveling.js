/**
 * Sistema de niveles y XP de 10-9 (sec 2.1 del documento).
 *
 * Espejo client-side de la función SQL `level_from_xp(int)`. Los umbrales acá
 * y en `sql/02_predictions_system.sql` deben mantenerse sincronizados.
 *
 * También centraliza las constantes XP del sistema de predicciones (sec 3.1).
 */

/** Niveles base ordenados, con su umbral de XP acumulada para entrar. */
export const LEVELS = Object.freeze([
    { level: 1,  name: 'Amateur',    xpRequired: 0,    description: 'Punto de partida. Recién registrado.' },
    { level: 2,  name: 'Prospecto',  xpRequired: 150,  description: 'Comienza a ganar terreno.' },
    { level: 3,  name: 'Local Card', xpRequired: 330,  description: 'Ya pelea en carteleras.' },
    { level: 4,  name: 'Co-Main',    xpRequired: 545,  description: 'Co-estelar de la cartelera.' },
    { level: 5,  name: 'Main Event', xpRequired: 805,  description: 'Pelea estelar de la noche.' },
    { level: 6,  name: 'Ranked',     xpRequired: 1115, description: 'Entra al ranking oficial.' },
    { level: 7,  name: 'Top 10',     xpRequired: 1490, description: 'Entre los diez mejores.' },
    { level: 8,  name: 'Top 5',      xpRequired: 1940, description: 'Élite de la división.' },
    { level: 9,  name: 'Contender',  xpRequired: 2480, description: 'Aspirante al título.' },
    { level: 10, name: 'Champion',   xpRequired: 3130, description: 'Campeón. Desbloquea Hall of Fame.' }
]);

export const MAX_LEVEL = 10;

/** XP otorgada por cada acierto de predicción (sec 3.1). */
export const PREDICTION_XP = Object.freeze({
    WINNER: 20,
    METHOD: 8,
    ROUND: 12,
    /** Predicción perfecta: 20 + 8 + 12 = 40. */
    PERFECT: 40
});

/** Devuelve el objeto LEVELS correspondiente a una cantidad de XP dada. */
export function levelFromXp(xp) {
    const safeXp = Math.max(0, Number(xp) || 0);
    let current = LEVELS[0];
    for (const lvl of LEVELS) {
        if (safeXp >= lvl.xpRequired) current = lvl;
        else break;
    }
    return current;
}

/** Devuelve el siguiente nivel, o null si ya estás en Champion. */
export function nextLevelFrom(xp) {
    const current = levelFromXp(xp);
    if (current.level >= MAX_LEVEL) return null;
    return LEVELS[current.level]; // index level es 0-based, current.level es 1-based
}

/**
 * Información de progreso para mostrar la barra de XP en la UI.
 * @returns {{
 *   currentLevel: object,
 *   nextLevel: object|null,
 *   xpInCurrent: number,
 *   xpForNext: number|null,
 *   percent: number  // 0-100
 * }}
 */
export function progressFromXp(xp) {
    const safeXp = Math.max(0, Number(xp) || 0);
    const currentLevel = levelFromXp(safeXp);
    const nextLevel = nextLevelFrom(safeXp);

    if (!nextLevel) {
        return {
            currentLevel,
            nextLevel: null,
            xpInCurrent: safeXp - currentLevel.xpRequired,
            xpForNext: null,
            percent: 100
        };
    }

    const xpInCurrent = safeXp - currentLevel.xpRequired;
    const xpForNext = nextLevel.xpRequired - currentLevel.xpRequired;
    const percent = Math.min(100, Math.max(0, Math.round((xpInCurrent / xpForNext) * 100)));

    return { currentLevel, nextLevel, xpInCurrent, xpForNext, percent };
}

/** Helpers para iconografía / estética en la UI. */
export function isMaxLevel(xpOrLevel) {
    if (typeof xpOrLevel === 'number' && xpOrLevel <= MAX_LEVEL) {
        return xpOrLevel >= MAX_LEVEL; // se asume "level" si es ≤10
    }
    return levelFromXp(xpOrLevel).level >= MAX_LEVEL;
}
