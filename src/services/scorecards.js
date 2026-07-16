/**
 * Servicio de scorecards (live scoring + post-fight).
 * Tabla: scorecards   ·   Vista comunitaria: community_scorecards
 *
 * El scorecard es inmutable una vez enviado (un registro por user+fight).
 * Los totales se calculan en el cliente (composable useScorecard).
 */
import { supabase } from './supabase.js';

/**
 * Inserta un scorecard completo.
 * @param {Object} payload - { fight_id, event_id, fighter_a_id, fighter_b_id,
 *   fighter_a_name, fighter_b_name, rounds, total_a, total_b, verdict, is_live }
 * @returns {Promise<{scorecard: Object|null, error: Object|null}>}
 */
export async function submitScorecard(payload) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return { scorecard: null, error: { message: 'Usuario no autenticado' } };
        }

        const insertData = {
            user_id: user.id,
            fight_id: payload.fight_id,
            event_id: payload.event_id,
            fighter_a_id: payload.fighter_a_id,
            fighter_b_id: payload.fighter_b_id,
            fighter_a_name: payload.fighter_a_name,
            fighter_b_name: payload.fighter_b_name,
            rounds: payload.rounds,
            total_a: payload.total_a,
            total_b: payload.total_b,
            verdict: payload.verdict,
            is_live: !!payload.is_live
        };

        const { data, error } = await supabase
            .from('scorecards')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('Error submitting scorecard:', error);
            return { scorecard: null, error };
        }
        return { scorecard: data, error: null };
    } catch (error) {
        console.error('Unexpected error submitting scorecard:', error);
        return { scorecard: null, error: { message: 'Error al enviar el scorecard' } };
    }
}

/**
 * Scorecard del usuario autenticado para una pelea (o null si no existe).
 * @returns {Promise<{scorecard: Object|null, error: Object|null}>}
 */
export async function getUserScorecard(fightId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { scorecard: null, error: null };

        const { data, error } = await supabase
            .from('scorecards')
            .select('*')
            .eq('user_id', user.id)
            .eq('fight_id', fightId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching user scorecard:', error);
            return { scorecard: null, error };
        }
        return { scorecard: data, error: null };
    } catch (error) {
        console.error('Unexpected error fetching user scorecard:', error);
        return { scorecard: null, error: { message: 'Error al obtener el scorecard' } };
    }
}

/**
 * Filas agregadas de la comunidad para una pelea (vista community_scorecards).
 * @returns {Promise<{rows: Array, error: Object|null}>}
 *   rows: [{ fight_id, round_num, winner_id, votes, vote_pct }]
 */
export async function getCommunityScorecard(fightId) {
    try {
        // Vía RPC SECURITY DEFINER: agregación confiable sin filtrar datos individuales.
        const { data, error } = await supabase.rpc('get_community_scorecard', {
            p_fight_id: fightId
        });

        if (error) {
            console.error('Error fetching community scorecard:', error);
            return { rows: [], error };
        }
        // Normalizar shape para que coincida con el de la vista (incluye fight_id)
        const rows = (data || []).map(r => ({
            fight_id: fightId,
            round_num: r.round_num,
            winner_id: r.winner_id,
            votes: r.votes,
            vote_pct: r.vote_pct
        }));
        return { rows, error: null };
    } catch (error) {
        console.error('Unexpected error fetching community scorecard:', error);
        return { rows: [], error: { message: 'Error al obtener scorecard comunitario' } };
    }
}

/**
 * Últimos N scorecards del usuario (para el historial del perfil).
 * @returns {Promise<{scorecards: Array, error: Object|null}>}
 */
export async function getUserScorecardHistory(limit = 20) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { scorecards: [], error: null };

        const { data, error } = await supabase
            .from('scorecards')
            .select('*')
            .eq('user_id', user.id)
            .order('submitted_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching scorecard history:', error);
            return { scorecards: [], error };
        }
        return { scorecards: data || [], error: null };
    } catch (error) {
        console.error('Unexpected error fetching scorecard history:', error);
        return { scorecards: [], error: { message: 'Error al obtener historial' } };
    }
}

/**
 * Scorecards de OTRO usuario (para mostrar en su perfil público).
 * RLS solo permite ver los propios, así que esto solo funciona para uno mismo;
 * para perfiles ajenos devuelve [] (placeholder hasta exponer vista pública).
 */
export async function getScorecardHistoryByUser(userId, limit = 20) {
    try {
        const { data, error } = await supabase
            .from('scorecards')
            .select('*')
            .eq('user_id', userId)
            .order('submitted_at', { ascending: false })
            .limit(limit);
        if (error) return { scorecards: [], error };
        return { scorecards: data || [], error: null };
    } catch (error) {
        return { scorecards: [], error: { message: 'Error al obtener historial' } };
    }
}

/**
 * Realtime: votos nuevos de la comunidad para una pelea (live scoring).
 * @param {string} fightId
 * @param {Function} onChange
 */
export function subscribeToFightScorecards(fightId, onChange) {
    if (!fightId) return null;
    const channel = supabase.channel(`scorecards_${fightId}`);
    channel
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'scorecards',
            filter: `fight_id=eq.${fightId}`
        }, (payload) => onChange?.(payload))
        .subscribe();
    return channel;
}

export function unsubscribeScorecards(channel) {
    if (channel) channel.unsubscribe();
}
