<template>
    <div class="max-w-2xl mx-auto px-4 sm:px-0 space-y-4">
        <h1 class="sr-only">Mi scorecard</h1>
        <!-- Volver -->
        <button
            @click="$router.back()"
            class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
            </svg>
            Volver
        </button>

        <!-- Header de la pelea -->
        <div class="bg-gradient-to-br from-[#7A0A1C]/40 via-[#1C1C1C] to-[#1C1C1C] border border-zinc-800 rounded-xl p-4">
            <div class="flex items-center justify-between gap-2 mb-3">
                <span v-if="eventId" class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest truncate">
                    {{ prettyEvent }}
                </span>
                <span v-if="isLive" class="text-[10px] font-bold text-[#C41E3A] uppercase tracking-wider bg-[#C41E3A]/10 border border-[#C41E3A]/40 px-2 py-0.5 rounded shrink-0">
                    ● En vivo
                </span>
            </div>
            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div class="flex flex-col items-center gap-2 text-center">
                    <div class="w-14 h-14 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#7A0A1C] flex items-center justify-center text-[#0D0D0D] font-bold text-lg">
                        {{ initials(fighterAName) }}
                    </div>
                    <p class="text-sm font-semibold text-white leading-tight">{{ fighterAName }}</p>
                </div>
                <div class="text-xs font-bold text-zinc-600">VS</div>
                <div class="flex flex-col items-center gap-2 text-center">
                    <div class="w-14 h-14 rounded-full bg-gradient-to-br from-[#C41E3A] to-[#7A0A1C] flex items-center justify-center text-white font-bold text-lg">
                        {{ initials(fighterBName) }}
                    </div>
                    <p class="text-sm font-semibold text-white leading-tight">{{ fighterBName }}</p>
                </div>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="card.loading.value && !card.rounds.value.length" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]"></div>
        </div>

        <!-- ===================== MODO FORMULARIO ===================== -->
        <template v-else-if="!card.submitted.value">
            <div class="bg-[#1C1C1C] border border-zinc-800 rounded-xl overflow-hidden">
                <div class="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/40">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Puntuá cada round</p>
                </div>

                <div class="divide-y divide-zinc-800">
                    <div v-for="(r, idx) in card.rounds.value" :key="r.round" class="p-3">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-gray-400 w-7 shrink-0">R{{ r.round }}</span>

                            <!-- Fighter A -->
                            <button
                                type="button"
                                @click="card.pickWinner(idx, fighterAId)"
                                :class="cellClass(r, fighterAId)"
                            >
                                <span class="truncate">{{ fighterAName }}</span>
                                <span v-if="r.winner_id === fighterAId" class="text-[11px] font-bold shrink-0 ml-1">
                                    {{ r.score_winner }}-{{ r.score_loser }}
                                </span>
                            </button>

                            <!-- Fighter B -->
                            <button
                                type="button"
                                @click="card.pickWinner(idx, fighterBId)"
                                :class="cellClass(r, fighterBId)"
                            >
                                <span v-if="r.winner_id === fighterBId" class="text-[11px] font-bold shrink-0 mr-1">
                                    {{ r.score_winner }}-{{ r.score_loser }}
                                </span>
                                <span class="truncate">{{ fighterBName }}</span>
                            </button>
                        </div>

                        <!-- Toggle 10-8 (dominante) -->
                        <div v-if="r.winner_id" class="flex justify-center mt-1.5">
                            <button
                                type="button"
                                @click="card.setDominant(idx, r.score_loser !== 8)"
                                :class="[
                                    'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border transition-colors',
                                    r.score_loser === 8
                                        ? 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/50'
                                        : 'bg-zinc-800 text-gray-400 border-zinc-700 hover:text-gray-200'
                                ]"
                            >
                                {{ r.score_loser === 8 ? '★ Round dominante (10-8)' : 'Marcar 10-8' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Totales en vivo -->
            <div class="bg-[#1C1C1C] border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div class="text-center flex-1">
                    <p class="text-2xl font-bold" :class="card.liveTotals.value.verdict === 'fighter_a' ? 'text-[#D4AF37]' : 'text-white'">
                        {{ card.liveTotals.value.total_a }}
                    </p>
                    <p class="text-[10px] text-gray-400 truncate">{{ fighterAName }}</p>
                </div>
                <div class="text-[10px] text-gray-500 font-bold px-2">TARJETA</div>
                <div class="text-center flex-1">
                    <p class="text-2xl font-bold" :class="card.liveTotals.value.verdict === 'fighter_b' ? 'text-[#D4AF37]' : 'text-white'">
                        {{ card.liveTotals.value.total_b }}
                    </p>
                    <p class="text-[10px] text-gray-400 truncate">{{ fighterBName }}</p>
                </div>
            </div>

            <p v-if="card.error.value" class="text-xs text-[#C41E3A] text-center">{{ card.error.value }}</p>

            <!-- Enviar -->
            <button
                @click="handleSubmit"
                :disabled="!card.canSubmit.value || card.loading.value"
                class="w-full py-3 px-4 bg-[#D4AF37] hover:bg-amber-400 text-[#0D0D0D] font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-wide text-sm"
            >
                <span v-if="card.loading.value">Enviando…</span>
                <span v-else-if="!card.canSubmit.value">Puntuá todos los rounds</span>
                <span v-else>Enviar scorecard</span>
            </button>
        </template>

        <!-- ===================== MODO RESULTADO ===================== -->
        <template v-else>
            <div class="bg-gradient-to-br from-[#D4AF37]/15 via-[#1C1C1C] to-[#1C1C1C] border border-[#D4AF37]/30 rounded-xl p-5 text-center">
                <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-2">Tu tarjeta</p>
                <p class="text-3xl font-bold text-white">{{ resultScore }}</p>
                <p class="text-sm text-[#D4AF37] font-semibold mt-1">{{ resultVerdict }}</p>
                <p v-if="xpGained > 0" class="mt-3 inline-block text-xs font-bold text-[#0D0D0D] bg-[#D4AF37] px-3 py-1 rounded-full">
                    +{{ xpGained }} XP por live scoring
                </p>
            </div>

            <!-- Detalle de rounds -->
            <div class="bg-[#1C1C1C] border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
                <div v-for="r in card.rounds.value" :key="r.round" class="px-4 py-2 flex items-center justify-between text-sm">
                    <span class="text-xs font-bold text-gray-400 w-7">R{{ r.round }}</span>
                    <span :class="r.winner_id === fighterAId ? 'text-[#D4AF37] font-semibold' : 'text-gray-500'" class="flex-1 truncate">
                        {{ fighterAName }}
                    </span>
                    <span class="text-xs font-bold text-white px-2">
                        {{ r.winner_id === fighterAId ? r.score_winner : r.score_loser }}-{{ r.winner_id === fighterAId ? r.score_loser : r.score_winner }}
                    </span>
                    <span :class="r.winner_id === fighterBId ? 'text-[#D4AF37] font-semibold' : 'text-gray-500'" class="flex-1 truncate text-right">
                        {{ fighterBName }}
                    </span>
                </div>
            </div>

            <!-- Toggle comunitario -->
            <button
                @click="showCommunity = !showCommunity"
                class="w-full py-2.5 px-4 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 font-bold rounded-lg transition-colors uppercase tracking-wide text-sm flex items-center justify-center gap-2"
            >
                {{ showCommunity ? 'Ocultar' : 'Ver' }} scorecard comunitario
                <svg aria-hidden="true" class="w-4 h-4 transition-transform" :class="showCommunity ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>

            <CommunityScorecard
                v-if="showCommunity"
                :fightId="fightId"
                :fighterAName="fighterAName"
                :fighterBName="fighterBName"
                :fighterAId="fighterAId"
            />
        </template>
    </div>
</template>

<script>
import { getInitials } from '../utils/format.js';
import { useScorecard } from '../composables/useScorecard.js';
import { useProfile } from '../composables/useProfile.js';
import { eventNameFromSlug } from '../services/sports/index.js';
import CommunityScorecard from '../components/CommunityScorecard.vue';

export default {
    name: 'Scorecard',
    components: { CommunityScorecard },
    setup() {
        const card = useScorecard();
        const { refreshCurrentProfile } = useProfile();
        return { card, refreshCurrentProfile };
    },
    data() {
        return {
            fightId: '',
            eventId: '',
            fighterAId: '',
            fighterBId: '',
            fighterAName: 'Peleador A',
            fighterBName: 'Peleador B',
            totalRounds: 3,
            isLive: false,
            showCommunity: false
        };
    },
    computed: {
        prettyEvent() {
            return eventNameFromSlug(this.eventId) || this.eventId;
        },
        resultScore() {
            const c = this.card.existingCard.value;
            if (!c) return '';
            if (c.verdict === 'draw') return `${c.total_a}—${c.total_b}`;
            const hi = Math.max(c.total_a, c.total_b);
            const lo = Math.min(c.total_a, c.total_b);
            return `${hi}—${lo}`;
        },
        resultVerdict() {
            const c = this.card.existingCard.value;
            if (!c) return '';
            if (c.verdict === 'draw') return 'Empate';
            const name = c.verdict === 'fighter_a' ? c.fighter_a_name : c.fighter_b_name;
            return name.toUpperCase();
        },
        /** XP otorgada: 2 por round, solo si fue en vivo (espejo del trigger SQL). */
        xpGained() {
            const c = this.card.existingCard.value;
            if (!c || !c.is_live) return 0;
            return (c.rounds?.length || 0) * 2;
        }
    },
    methods: {
        initials: (name) => getInitials(name, '?'),
        cellClass(r, fighterId) {
            const selected = r.winner_id === fighterId;
            const otherSelected = r.winner_id && r.winner_id !== fighterId;
            return [
                'flex-1 min-w-0 flex items-center justify-center px-2.5 py-2 rounded-lg border text-sm font-medium transition-all',
                selected
                    ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]'
                    : otherSelected
                        ? 'bg-zinc-800/50 border-zinc-800 text-gray-500'
                        : 'bg-zinc-800 border-zinc-700 text-gray-200 hover:border-zinc-600'
            ];
        },
        async handleSubmit() {
            const { success } = await this.card.submitCard({
                fight_id: this.fightId,
                event_id: this.eventId,
                fighter_a_name: this.fighterAName,
                fighter_b_name: this.fighterBName
            }, this.isLive);
            if (success) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // Si fue en vivo, el trigger sumó XP → refrescar perfil
                if (this.isLive) {
                    try { await this.refreshCurrentProfile(); } catch (e) { /* noop */ }
                }
            }
        }
    },
    async mounted() {
        const route = this.$route;
        this.fightId = route.params.fight_id;
        this.eventId = route.query.event_id || '';
        this.fighterAId = route.query.fighter_a_id ? String(route.query.fighter_a_id) : '';
        this.fighterBId = route.query.fighter_b_id ? String(route.query.fighter_b_id) : '';
        this.fighterAName = route.query.fighter_a_name || 'Peleador A';
        this.fighterBName = route.query.fighter_b_name || 'Peleador B';
        this.totalRounds = parseInt(route.query.total_rounds, 10) || 3;
        this.isLive = route.query.is_live === 'true';

        // Cargar scorecard existente (si lo hay, queda en modo resultado)
        const existing = await this.card.loadExisting(this.fightId);
        if (existing) {
            // Usar los nombres/ids guardados (fuente de verdad)
            this.fighterAId = String(existing.fighter_a_id);
            this.fighterBId = String(existing.fighter_b_id);
            this.fighterAName = existing.fighter_a_name;
            this.fighterBName = existing.fighter_b_name;
            this.eventId = existing.event_id;
        } else {
            // Modo formulario: inicializar rounds
            this.card.initRounds(this.totalRounds, this.fighterAId, this.fighterBId);
        }
    }
};
</script>
