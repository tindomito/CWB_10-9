/**
 * Leaderboards (sec 4.4 del documento de niveles).
 *
 * Cuatro variantes:
 *   - alltime  → vista leaderboard_alltime (XP total)
 *   - monthly  → vista leaderboard_monthly (XP del mes calendario)
 *   - byEvent  → RPC leaderboard_by_event(event_slug)
 *   - friends  → RPC leaderboard_friends(user_id)
 *
 * Cada función devuelve { rows, error }. La forma de cada row depende del tipo.
 */
import { supabase } from './supabase.js';

const DEFAULT_LIMIT = 50;

export async function getAlltimeLeaderboard(limit = DEFAULT_LIMIT) {
    try {
        const { data, error } = await supabase
            .from('leaderboard_alltime')
            .select('*')
            .limit(limit);
        if (error) return { rows: [], error };
        return { rows: data || [], error: null };
    } catch (e) {
        return { rows: [], error: { message: e.message || 'Error al cargar leaderboard' } };
    }
}

export async function getMonthlyLeaderboard(limit = DEFAULT_LIMIT) {
    try {
        const { data, error } = await supabase
            .from('leaderboard_monthly')
            .select('*')
            .limit(limit);
        if (error) return { rows: [], error };
        return { rows: data || [], error: null };
    } catch (e) {
        return { rows: [], error: { message: e.message || 'Error al cargar leaderboard mensual' } };
    }
}

/**
 * Lista de eventos para el dropdown del leaderboard "por evento".
 */
export async function getEventsWithPredictions(limit = 30) {
    try {
        const { data, error } = await supabase
            .from('events_with_predictions')
            .select('*')
            .limit(limit);
        if (error) return { events: [], error };
        return { events: data || [], error: null };
    } catch (e) {
        return { events: [], error: { message: e.message || 'Error al cargar eventos' } };
    }
}

export async function getEventLeaderboard(eventSlug) {
    if (!eventSlug) return { rows: [], error: { message: 'Falta event_slug' } };
    try {
        const { data, error } = await supabase.rpc('leaderboard_by_event', {
            p_event_slug: eventSlug
        });
        if (error) return { rows: [], error };
        return { rows: data || [], error: null };
    } catch (e) {
        return { rows: [], error: { message: e.message || 'Error al cargar leaderboard del evento' } };
    }
}

export async function getFriendsLeaderboard(userId) {
    if (!userId) return { rows: [], error: { message: 'Iniciá sesión para ver el leaderboard entre amigos' } };
    try {
        const { data, error } = await supabase.rpc('leaderboard_friends', {
            p_user_id: userId
        });
        if (error) return { rows: [], error };
        return { rows: data || [], error: null };
    } catch (e) {
        return { rows: [], error: { message: e.message || 'Error al cargar leaderboard de amigos' } };
    }
}
