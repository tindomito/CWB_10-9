/**
 * Hall of Fame · Modo competitivo (sec 4 del PDF).
 *
 * Espejo client-side de funciones SQL `division_from_rating` y
 * `calculate_elo_delta`. Solo lectura — toda la lógica de update vive en SQL.
 */
import { supabase } from './supabase.js';

/** Divisiones ordenadas con sus umbrales (sec 4.2). */
export const DIVISIONS = Object.freeze([
    {
        id: 'Bronze',
        label: 'Hall of Fame: Bronze',
        ratingMin: 1500,
        ratingMax: 1649,
        color:   '#CD7F32',
        bgClass: 'bg-[#CD7F32]/15 text-[#E8B788] border-[#CD7F32]/40'
    },
    {
        id: 'Silver',
        label: 'Hall of Fame: Silver',
        ratingMin: 1650,
        ratingMax: 1799,
        color:   '#C0C0C0',
        bgClass: 'bg-zinc-400/15 text-zinc-200 border-zinc-400/40'
    },
    {
        id: 'Gold',
        label: 'Hall of Fame: Gold',
        ratingMin: 1800,
        ratingMax: 1949,
        color:   '#D4AF37',
        bgClass: 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/40'
    },
    {
        id: 'Diamond',
        label: 'Hall of Fame: Diamond',
        ratingMin: 1950,
        ratingMax: 2099,
        color:   '#7DD3FC',
        bgClass: 'bg-sky-300/15 text-sky-300 border-sky-300/40'
    },
    {
        id: 'GOAT',
        label: 'Hall of Fame: GOAT',
        ratingMin: 2100,
        ratingMax: Infinity,
        color:   '#C41E3A',
        bgClass: 'bg-gradient-to-r from-[#7A0A1C]/40 to-[#D4AF37]/30 text-[#D4AF37] border-[#D4AF37]/60'
    }
]);

export const RATING_FLOOR = 1200;
export const RATING_INITIAL = 1500;
export const INACTIVE_DAYS = 60;

export function divisionFromRating(rating) {
    const safe = Number(rating) || RATING_INITIAL;
    for (let i = DIVISIONS.length - 1; i >= 0; i--) {
        if (safe >= DIVISIONS[i].ratingMin) return DIVISIONS[i];
    }
    return DIVISIONS[0];
}

export function nextDivisionFromRating(rating) {
    const safe = Number(rating) || RATING_INITIAL;
    for (const d of DIVISIONS) {
        if (safe < d.ratingMin) return d;
    }
    return null;
}

/**
 * Progreso hacia la siguiente división, para mostrar barra.
 */
export function progressInDivision(rating) {
    const safe = Math.max(RATING_FLOOR, Number(rating) || RATING_INITIAL);
    const current = divisionFromRating(safe);
    const next = nextDivisionFromRating(safe);

    if (!next) {
        return { current, next: null, percent: 100, intoCurrent: safe - current.ratingMin, span: null };
    }
    const span = next.ratingMin - current.ratingMin;
    const intoCurrent = safe - current.ratingMin;
    return {
        current,
        next,
        percent: Math.max(0, Math.min(100, Math.round((intoCurrent / span) * 100))),
        intoCurrent,
        span
    };
}

/** Trae el rating del usuario actual (o null si no está en HoF). */
export async function getMyCompetitiveRating(userId) {
    if (!userId) return { rating: null, error: null };
    const { data, error } = await supabase
        .from('competitive_ratings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) return { rating: null, error };
    return { rating: data, error: null };
}

/** Leaderboard global de Hall of Fame ordenado por rating. */
export async function getHallOfFameLeaderboard(limit = 50) {
    const { data, error } = await supabase
        .from('hall_of_fame_leaderboard')
        .select('*')
        .limit(limit);
    if (error) return { rows: [], error };
    return { rows: data || [], error: null };
}

/**
 * Auto-inscripción manual al Hall of Fame.
 * El trigger SQL ya lo hace automáticamente al subir a nivel 10, pero esta
 * función queda como escape hatch (ej. si alguien quedó sin row por bug).
 */
export async function joinHallOfFame() {
    const { data, error } = await supabase.rpc('join_hall_of_fame');
    if (error) return { rating: null, error };
    return { rating: data, error: null };
}
