<!--
    Fila del historial de scorecards en el perfil: matchup, resultado de la
    tarjeta (49—46, apellido del ganador) y si se puntuó en vivo. Toda la
    card linkea al scorecard completo de esa pelea.
-->
<template>
    <RouterLink
        :to="{ name: 'Scorecard', params: { fight_id: scorecard.fight_id }, query: { event_id: scorecard.event_id } }"
        class="block bg-[#1C1C1C] border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition-colors"
    >
        <div class="flex items-center justify-between gap-3">
            <!-- Matchup -->
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                    <span
                        class="text-sm font-semibold truncate"
                        :class="scorecard.verdict === 'fighter_a' ? 'text-[#D4AF37]' : 'text-gray-300'"
                    >{{ scorecard.fighter_a_name }}</span>
                    <span class="text-[10px] text-zinc-600 font-bold shrink-0">vs</span>
                    <span
                        class="text-sm font-semibold truncate"
                        :class="scorecard.verdict === 'fighter_b' ? 'text-[#D4AF37]' : 'text-gray-300'"
                    >{{ scorecard.fighter_b_name }}</span>
                </div>
                <p class="text-[11px] text-gray-500">
                    {{ formattedResult }}
                    <span class="mx-1">·</span>
                    {{ formattedDate }}
                </p>
            </div>

            <!-- Badge live + score -->
            <div class="flex flex-col items-end gap-1 shrink-0">
                <span
                    v-if="scorecard.is_live"
                    class="text-[9px] font-bold text-[#C41E3A] uppercase tracking-wider bg-[#C41E3A]/10 border border-[#C41E3A]/40 px-1.5 py-0.5 rounded"
                >
                    ● Live
                </span>
                <span class="text-sm font-bold text-white">{{ scoreLabel }}</span>
            </div>
        </div>
    </RouterLink>
</template>

<script>
export default {
    name: 'ScorecardHistoryCard',
    props: {
        scorecard: { type: Object, required: true }
    },
    computed: {
        // El puntaje se muestra siempre con el número mayor primero
        // (convención de tarjetas: "49—46", no "46—49")
        scoreLabel() {
            const { total_a, total_b, verdict } = this.scorecard;
            if (verdict === 'draw') return `${total_a}—${total_b}`;
            const hi = Math.max(total_a, total_b);
            const lo = Math.min(total_a, total_b);
            return `${hi}—${lo}`;
        },
        winnerName() {
            const { verdict, fighter_a_name, fighter_b_name } = this.scorecard;
            if (verdict === 'fighter_a') return fighter_a_name;
            if (verdict === 'fighter_b') return fighter_b_name;
            return null;
        },
        formattedResult() {
            if (!this.winnerName) return `${this.scoreLabel} · Empate`;
            const lastName = this.winnerName.split(' ').pop().toUpperCase();
            return `${this.scoreLabel} · ${lastName}`;
        },
        formattedDate() {
            const d = new Date(this.scorecard.submitted_at);
            return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    }
};
</script>
