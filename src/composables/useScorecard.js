/**
 * Composable para puntuar una pelea round a round (10 point must system).
 *
 * No es singleton: cada vista de scorecard crea su propia instancia de estado.
 */
import { ref, computed } from 'vue';
import { submitScorecard, getUserScorecard } from '../services/scorecards.js';

export function useScorecard() {
    // Estado reactivo
    const rounds = ref([]);          // [{ round, winner_id, score_winner, score_loser }]
    const submitted = ref(false);
    const loading = ref(false);
    const error = ref(null);
    const existingCard = ref(null);  // scorecard previo del usuario para esta pelea

    // IDs de peleadores (para mapear winner → A/B)
    const fighterAId = ref(null);
    const fighterBId = ref(null);

    /** Inicializa el array de rounds con winner_id null. */
    function initRounds(totalRounds, aId, bId) {
        fighterAId.value = aId != null ? String(aId) : null;
        fighterBId.value = bId != null ? String(bId) : null;
        rounds.value = Array.from({ length: totalRounds }, (_, i) => ({
            round: i + 1,
            winner_id: null,
            score_winner: 10,
            score_loser: 9
        }));
    }

    /**
     * Asigna ganador del round. 10 al ganador, 9 al perdedor (o 8 si dominante).
     * Si el round ya tenía ganador, lo reemplaza (conservando el flag dominante).
     */
    function pickWinner(roundIndex, winnerId, dominant = null) {
        const r = rounds.value[roundIndex];
        if (!r) return;
        // Si no se especifica dominant, conservar el estado actual (10-8 vs 10-9)
        const keepDominant = dominant === null ? r.score_loser === 8 : dominant;
        r.winner_id = String(winnerId);
        r.score_winner = 10;
        r.score_loser = keepDominant ? 8 : 9;
    }

    /** Marca/desmarca un round como dominante (10-8). Requiere ganador asignado. */
    function setDominant(roundIndex, dominant) {
        const r = rounds.value[roundIndex];
        if (!r || !r.winner_id) return;
        r.score_loser = dominant ? 8 : 9;
    }

    /** Limpia el ganador de un round (vuelve a neutro). */
    function clearRound(roundIndex) {
        const r = rounds.value[roundIndex];
        if (!r) return;
        r.winner_id = null;
        r.score_winner = 10;
        r.score_loser = 9;
    }

    /** Suma puntajes por peleador y determina el verdict. */
    function computeTotals() {
        let total_a = 0;
        let total_b = 0;
        for (const r of rounds.value) {
            if (!r.winner_id) continue;
            if (r.winner_id === fighterAId.value) {
                total_a += r.score_winner;
                total_b += r.score_loser;
            } else {
                total_b += r.score_winner;
                total_a += r.score_loser;
            }
        }
        let verdict = 'draw';
        if (total_a > total_b) verdict = 'fighter_a';
        else if (total_b > total_a) verdict = 'fighter_b';
        return { total_a, total_b, verdict };
    }

    /** true solo si todos los rounds tienen ganador. */
    const canSubmit = computed(() =>
        rounds.value.length > 0 && rounds.value.every(r => !!r.winner_id)
    );

    /** Totales reactivos para mostrar en vivo. */
    const liveTotals = computed(() => computeTotals());

    /** Envía el scorecard. */
    async function submitCard(fightMeta, isLive = false) {
        loading.value = true;
        error.value = null;
        try {
            const { total_a, total_b, verdict } = computeTotals();
            const payload = {
                fight_id: fightMeta.fight_id,
                event_id: fightMeta.event_id,
                fighter_a_id: fighterAId.value,
                fighter_b_id: fighterBId.value,
                fighter_a_name: fightMeta.fighter_a_name,
                fighter_b_name: fightMeta.fighter_b_name,
                rounds: rounds.value.map(r => ({
                    round: r.round,
                    winner_id: r.winner_id,
                    score_winner: r.score_winner,
                    score_loser: r.score_loser
                })),
                total_a,
                total_b,
                verdict,
                is_live: isLive
            };

            const { scorecard, error: err } = await submitScorecard(payload);
            if (err) {
                error.value = err.message || 'Error al enviar el scorecard';
                return { success: false, error: err };
            }
            submitted.value = true;
            existingCard.value = scorecard;
            return { success: true, scorecard };
        } catch (e) {
            error.value = 'Error inesperado al enviar el scorecard';
            return { success: false, error: e };
        } finally {
            loading.value = false;
        }
    }

    /** Carga el scorecard existente y reconstruye el estado si lo hay. */
    async function loadExisting(fightId) {
        loading.value = true;
        error.value = null;
        try {
            const { scorecard } = await getUserScorecard(fightId);
            if (scorecard) {
                existingCard.value = scorecard;
                submitted.value = true;
                fighterAId.value = String(scorecard.fighter_a_id);
                fighterBId.value = String(scorecard.fighter_b_id);
                rounds.value = (scorecard.rounds || []).map(r => ({
                    round: r.round,
                    winner_id: r.winner_id != null ? String(r.winner_id) : null,
                    score_winner: r.score_winner,
                    score_loser: r.score_loser
                }));
            }
            return scorecard;
        } finally {
            loading.value = false;
        }
    }

    return {
        // Estado
        rounds,
        submitted,
        loading,
        error,
        existingCard,
        fighterAId,
        fighterBId,
        // Computed
        canSubmit,
        liveTotals,
        // Métodos
        initRounds,
        pickWinner,
        setDominant,
        clearRound,
        computeTotals,
        submitCard,
        loadExisting
    };
}
