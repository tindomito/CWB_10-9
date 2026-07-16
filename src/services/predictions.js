/**
 * Servicio de predicciones de peleas (sec 3.1 del documento).
 *
 * Responsabilidades:
 *   - Sincronizar peleas del proveedor activo a la tabla local `fights`.
 *   - Crear/actualizar/leer las predicciones del usuario.
 *   - Resolver predicciones manualmente (admin).
 *
 * NO hace cálculos de XP — eso vive 100% en SQL (resolve_fight_predictions).
 * NO importa adapters de proveedor directamente — usa la fachada `./sports`.
 */
import { supabase } from './supabase.js';
import { getNextEventFights, FIGHT_METHODS } from './sports/index.js';

// ---------------------------------------------------------------------------
// Sync con proveedor
// ---------------------------------------------------------------------------

/**
 * Persiste una pelea (formato InternalFight) en la tabla `fights` vía RPC.
 * Idempotente: ya existe → actualiza campos seguros.
 */
export async function syncFight(fight) {
    if (!fight || !fight.id) {
        return { fight: null, error: { message: 'Fight inválida' } };
    }
    try {
        const { data, error } = await supabase.rpc('upsert_fight_from_provider', {
            p_id: fight.id,
            p_provider: fight.provider,
            p_provider_fight_id: fight.providerFightId,
            p_event_name: fight.eventName,
            p_event_slug: fight.eventSlug,
            p_weight_class: fight.weightClass,
            p_is_main_event: !!fight.isMainEvent,
            p_is_ppv: !!fight.isPpv,
            p_fight_date: fight.dateIso,
            p_status: fight.status,
            p_fighter1_external_id: fight.fighter1?.externalId,
            p_fighter1_name: fight.fighter1?.name,
            p_fighter1_photo: fight.fighter1?.photo,
            p_fighter2_external_id: fight.fighter2?.externalId,
            p_fighter2_name: fight.fighter2?.name,
            p_fighter2_photo: fight.fighter2?.photo,
            p_winner_external_id: fight.result?.winnerExternalId ?? null,
            p_result_method: fight.result?.method ?? null,
            p_result_round: fight.result?.round ?? null
        });
        if (error) return { fight: null, error };
        return { fight: data, error: null };
    } catch (e) {
        return { fight: null, error: { message: e.message || 'Error al sincronizar pelea' } };
    }
}

/** Sincroniza un array de peleas en paralelo. */
export async function syncFights(fights) {
    if (!Array.isArray(fights) || fights.length === 0) return { synced: 0, errors: [] };
    const results = await Promise.all(fights.map(syncFight));
    const errors = results.filter(r => r.error).map(r => r.error);
    return { synced: results.length - errors.length, errors };
}

/**
 * Carga el próximo evento UFC desde el provider, sincroniza sus peleas en DB
 * y devuelve la lista lista para mostrar.
 *
 * @returns {Promise<{ event: object|null, fights: Array, error: object|null }>}
 *   `fights` viene en el shape de la tabla `fights` (no del provider).
 */
export async function loadAndSyncNextEvent() {
    const { event, fights, error } = await getNextEventFights();
    if (error) return { event: null, fights: [], error };
    if (!event) return { event: null, fights: [], error: null };

    await syncFights(fights);

    // Releer desde la DB para tener la "verdad oficial" (incluyendo updates
    // que un admin hubiera hecho manualmente).
    const ids = fights.map(f => f.id);
    const { data, error: fetchError } = await supabase
        .from('fights')
        .select('*')
        .in('id', ids)
        .order('fight_date', { ascending: true });

    if (fetchError) return { event, fights: [], error: fetchError };

    return { event, fights: data || [], error: null };
}

// ---------------------------------------------------------------------------
// Predicciones del usuario
// ---------------------------------------------------------------------------

/** Trae las predicciones del usuario para una lista de peleas. */
export async function getUserPredictionsForFights(userId, fightIds) {
    if (!userId || !fightIds?.length) return { predictions: [], error: null };
    const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', userId)
        .in('fight_id', fightIds);
    if (error) return { predictions: [], error };
    return { predictions: data || [], error: null };
}

/**
 * Trae las predicciones de un usuario (con datos de la pelea), paginadas.
 * @param {string} userId
 * @param {number} page - página 0-based
 * @param {number} pageSize - tamaño de página
 */
export async function getUserPredictionsHistory(userId, page = 0, pageSize = 20) {
    if (!userId) return { predictions: [], error: null };
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase
        .from('predictions_with_fights')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);
    if (error) return { predictions: [], error };
    return { predictions: data || [], error: null };
}

/**
 * Estadísticas del historial de predicciones de un usuario, calculadas sobre
 * TODAS sus predicciones pero trayendo solo las columnas mínimas (booleans,
 * xp y estado). Así la lista pesada puede paginarse sin romper los números.
 */
export async function getUserPredictionsStats(userId) {
    const empty = {
        total: 0, resolved: 0, correct: 0, perfect: 0,
        methodHits: 0, roundHits: 0, totalXp: 0, pending: 0, accuracy: 0
    };
    if (!userId) return { stats: empty, error: null };

    const { data, error } = await supabase
        .from('predictions_with_fights')
        .select('resolved_at, is_winner_correct, is_method_correct, is_round_correct, xp_awarded, fight_status')
        .eq('user_id', userId);
    if (error) return { stats: empty, error };

    const all = data || [];
    const resolved = all.filter(p => p.resolved_at);
    const correct = resolved.filter(p => p.is_winner_correct);
    const perfect = resolved.filter(p => p.is_winner_correct && p.is_method_correct && p.is_round_correct);
    return {
        stats: {
            total: all.length,
            resolved: resolved.length,
            correct: correct.length,
            perfect: perfect.length,
            methodHits: resolved.filter(p => p.is_method_correct).length,
            roundHits: resolved.filter(p => p.is_round_correct).length,
            totalXp: all.reduce((s, p) => s + (p.xp_awarded || 0), 0),
            pending: all.filter(p => !p.resolved_at && p.fight_status !== 'cancelled').length,
            accuracy: resolved.length ? Math.round((correct.length / resolved.length) * 100) : 0
        },
        error: null
    };
}

/**
 * Crea o actualiza la predicción del usuario para una pelea.
 * El trigger `validate_prediction` en SQL valida lock, peleadores válidos, etc.
 */
export async function upsertPrediction({
    userId,
    fightId,
    winnerExternalId,
    method = null,
    round = null
}) {
    if (!userId)         return { prediction: null, error: { message: 'No autenticado' } };
    if (!fightId)        return { prediction: null, error: { message: 'Falta fight_id' } };
    if (!winnerExternalId) return { prediction: null, error: { message: 'Falta el ganador' } };

    // Si el método no permite round, lo limpiamos client-side también
    const safeRound = method === FIGHT_METHODS.DECISION ? null : round;

    const payload = {
        user_id: userId,
        fight_id: fightId,
        predicted_winner_external_id: winnerExternalId,
        predicted_method: method,
        predicted_round: safeRound
    };

    const { data, error } = await supabase
        .from('predictions')
        .upsert(payload, { onConflict: 'user_id,fight_id' })
        .select()
        .single();

    if (error) return { prediction: null, error };
    return { prediction: data, error: null };
}

export async function deletePrediction(userId, fightId) {
    if (!userId || !fightId) return { success: false, error: { message: 'Faltan parámetros' } };
    const { error } = await supabase
        .from('predictions')
        .delete()
        .eq('user_id', userId)
        .eq('fight_id', fightId);
    if (error) return { success: false, error };
    return { success: true, error: null };
}

// ---------------------------------------------------------------------------
// % de votos por peleador (para mostrar "consenso de la comunidad")
// ---------------------------------------------------------------------------
/**
 * Cuenta cuántos usuarios eligieron cada peleador en una pelea.
 * Útil tanto para mostrar el consenso como para detectar upsets en el futuro.
 */
export async function getCommunityBreakdown(fightId) {
    if (!fightId) return { counts: {}, total: 0, error: null };

    const { data, error } = await supabase
        .from('predictions')
        .select('predicted_winner_external_id')
        .eq('fight_id', fightId);

    if (error) return { counts: {}, total: 0, error };

    const counts = {};
    for (const row of data || []) {
        counts[row.predicted_winner_external_id] = (counts[row.predicted_winner_external_id] || 0) + 1;
    }
    return { counts, total: (data || []).length, error: null };
}

// ---------------------------------------------------------------------------
// Admin: resolver pelea manualmente
// ---------------------------------------------------------------------------
export async function adminResolveFight({ fightId, winnerExternalId, method, round = null }) {
    if (!fightId || !winnerExternalId || !method) {
        return { fight: null, error: { message: 'Faltan campos para resolver la pelea' } };
    }
    const { data, error } = await supabase.rpc('admin_resolve_fight', {
        p_fight_id: fightId,
        p_winner_external_id: winnerExternalId,
        p_result_method: method,
        p_result_round: method === FIGHT_METHODS.DECISION ? null : round
    });
    if (error) return { fight: null, error };
    return { fight: data, error: null };
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------
/** Suscribe a cambios en las predicciones de una pelea (para el % comunidad). */
export function subscribeToFightPredictions(fightId, onChange) {
    const channel = supabase.channel(`predictions_${fightId}`);
    channel
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'predictions',
            filter: `fight_id=eq.${fightId}`
        }, (payload) => onChange?.(payload))
        .subscribe();
    return channel;
}

/** Suscribe a updates en una pelea (status cambia, resultado se carga). */
export function subscribeToFights(fightIds, onUpdate) {
    if (!fightIds?.length) return null;
    const channel = supabase.channel('fights_changes');
    channel
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'fights'
        }, (payload) => {
            if (fightIds.includes(payload.new?.id)) {
                onUpdate?.(payload.new);
            }
        })
        .subscribe();
    return channel;
}

export function unsubscribePredictionsChannel(channel) {
    if (channel) channel.unsubscribe();
}
