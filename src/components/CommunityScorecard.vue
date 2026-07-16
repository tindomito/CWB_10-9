<template>
    <div class="space-y-3">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-7 w-7 border-b-2 border-[#D4AF37]"></div>
        </div>

        <!-- Vacío -->
        <div v-else-if="roundList.length === 0" class="bg-[#1C1C1C] border border-zinc-800 rounded-xl p-6 text-center">
            <p class="text-sm text-gray-300 font-medium">Todavía no hay scorecards de la comunidad</p>
            <p class="text-xs text-gray-500 mt-1">Sé el primero en puntuar esta pelea.</p>
        </div>

        <template v-else>
            <!-- Resumen TU PICK vs comunidad -->
            <div v-if="myScorecard" class="bg-[#1C1C1C] border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                    <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Tu pick vs comunidad</p>
                    <p class="text-sm text-white mt-0.5">
                        Coincidís en
                        <span class="font-bold text-[#D4AF37]">{{ matchCount }}/{{ roundList.length }}</span>
                        rounds
                    </p>
                </div>
                <span
                    :class="agreementBadgeClass"
                    class="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded border"
                >
                    {{ agreementLabel }}
                </span>
            </div>

            <!-- Rounds -->
            <div class="bg-[#1C1C1C] border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
                <div v-for="r in roundList" :key="r.round_num" class="p-3">
                    <div class="flex items-center justify-between mb-1.5">
                        <div class="flex items-center gap-2">
                            <span class="text-[11px] font-bold text-gray-400">R{{ r.round_num }}</span>
                            <span class="text-xs text-gray-300">
                                Consenso:
                                <span class="font-semibold text-white">10—9 {{ r.consensusName }}</span>
                            </span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span v-if="r.controversial" class="text-[9px] font-bold text-[#C41E3A] uppercase tracking-wider bg-[#C41E3A]/10 border border-[#C41E3A]/40 px-1.5 py-0.5 rounded">
                                Polémico
                            </span>
                            <span v-if="myScorecard" :class="r.userMatched ? 'text-emerald-400' : 'text-gray-500'" class="text-xs font-bold">
                                {{ r.userMatched ? '✓' : '✗' }}
                            </span>
                        </div>
                    </div>

                    <!-- Barra de votación -->
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold text-[#D4AF37] w-9 text-right">{{ r.aPct }}%</span>
                        <div class="flex-1 h-2.5 rounded-full overflow-hidden bg-zinc-800 flex">
                            <div class="h-full bg-[#D4AF37] transition-all" :style="{ width: r.aPct + '%' }"></div>
                            <div class="h-full bg-[#C41E3A] transition-all" :style="{ width: r.bPct + '%' }"></div>
                        </div>
                        <span class="text-[10px] font-bold text-[#C41E3A] w-9">{{ r.bPct }}%</span>
                    </div>
                    <div class="flex items-center justify-between mt-1">
                        <span class="text-[10px] text-gray-500 truncate max-w-[45%]">{{ fighterAName }}</span>
                        <span class="text-[10px] text-gray-500 truncate max-w-[45%] text-right">{{ fighterBName }}</span>
                    </div>
                </div>
            </div>

            <!-- Totales comunitarios -->
            <div class="bg-gradient-to-r from-[#7A0A1C]/30 to-transparent border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                <div class="text-center flex-1">
                    <p class="text-lg font-bold" :class="communityTotals.verdict === 'fighter_a' ? 'text-[#D4AF37]' : 'text-white'">
                        {{ communityTotals.total_a }}
                    </p>
                    <p class="text-[10px] text-gray-400 truncate">{{ fighterAName }}</p>
                </div>
                <div class="text-[10px] text-gray-500 font-bold px-2">CONSENSO</div>
                <div class="text-center flex-1">
                    <p class="text-lg font-bold" :class="communityTotals.verdict === 'fighter_b' ? 'text-[#D4AF37]' : 'text-white'">
                        {{ communityTotals.total_b }}
                    </p>
                    <p class="text-[10px] text-gray-400 truncate">{{ fighterBName }}</p>
                </div>
            </div>
            <p class="text-[10px] text-gray-500 text-center">
                Basado en {{ totalVoters }} scorecard{{ totalVoters === 1 ? '' : 's' }} de la comunidad
            </p>
        </template>
    </div>
</template>

<script>
import { getCommunityScorecard, getUserScorecard } from '../services/scorecards.js';

export default {
    name: 'CommunityScorecard',
    props: {
        fightId: { type: String, required: true },
        fighterAName: { type: String, default: 'Peleador A' },
        fighterBName: { type: String, default: 'Peleador B' },
        fighterAId: { type: String, required: true }
    },
    data() {
        return {
            rows: [],
            myScorecard: null,
            loading: true
        };
    },
    computed: {
        /** Reconstruye por round: pct A/B, consenso, polémico, match con el usuario. */
        roundList() {
            const byRound = new Map();
            for (const row of this.rows) {
                if (!byRound.has(row.round_num)) byRound.set(row.round_num, {});
                byRound.get(row.round_num)[String(row.winner_id)] = {
                    votes: Number(row.votes),
                    pct: Number(row.vote_pct)
                };
            }

            const myRoundsById = {};
            if (this.myScorecard?.rounds) {
                for (const r of this.myScorecard.rounds) {
                    myRoundsById[r.round] = String(r.winner_id);
                }
            }

            const list = [];
            for (const [roundNum, winners] of [...byRound.entries()].sort((a, b) => a[0] - b[0])) {
                const aData = winners[this.fighterAId];
                const aPct = aData ? aData.pct : 0;
                const bPct = Math.max(0, Math.round((100 - aPct) * 10) / 10);

                const consensusIsA = aPct >= bPct;
                const consensusName = consensusIsA ? this.fighterAName : this.fighterBName;
                const winnerPct = Math.max(aPct, bPct);
                const controversial = winnerPct <= 53; // 47-53 o más parejo

                let userMatched = false;
                const myPick = myRoundsById[roundNum];
                if (myPick) {
                    const consensusId = consensusIsA ? this.fighterAId : this._otherId();
                    userMatched = String(myPick) === String(consensusId);
                }

                list.push({
                    round_num: roundNum,
                    aPct,
                    bPct,
                    consensusName,
                    consensusIsA,
                    controversial,
                    userMatched
                });
            }
            return list;
        },
        /** Totales aplicando must system al consenso de cada round (10-9). */
        communityTotals() {
            let total_a = 0;
            let total_b = 0;
            for (const r of this.roundList) {
                if (r.consensusIsA) { total_a += 10; total_b += 9; }
                else { total_b += 10; total_a += 9; }
            }
            let verdict = 'draw';
            if (total_a > total_b) verdict = 'fighter_a';
            else if (total_b > total_a) verdict = 'fighter_b';
            return { total_a, total_b, verdict };
        },
        matchCount() {
            return this.roundList.filter(r => r.userMatched).length;
        },
        agreementLabel() {
            if (!this.roundList.length) return '';
            const ratio = this.matchCount / this.roundList.length;
            if (ratio === 1) return 'En sintonía';
            if (ratio >= 0.5) return 'Parcial';
            return 'Contra la corriente';
        },
        agreementBadgeClass() {
            const ratio = this.roundList.length ? this.matchCount / this.roundList.length : 0;
            if (ratio === 1) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40';
            if (ratio >= 0.5) return 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/40';
            return 'bg-[#C41E3A]/10 text-[#C41E3A] border-[#C41E3A]/40';
        },
        totalVoters() {
            // El máximo de votos en cualquier round ≈ cantidad de scorecards
            let max = 0;
            for (const row of this.rows) max = Math.max(max, Number(row.votes));
            return max;
        }
    },
    async mounted() {
        await this.load();
    },
    methods: {
        _otherId() {
            // El id del fighter B: lo derivamos de las filas (cualquier winner_id != A)
            for (const row of this.rows) {
                if (String(row.winner_id) !== this.fighterAId) return String(row.winner_id);
            }
            return null;
        },
        async load() {
            this.loading = true;
            const [{ rows }, { scorecard }] = await Promise.all([
                getCommunityScorecard(this.fightId),
                getUserScorecard(this.fightId)
            ]);
            this.rows = rows;
            this.myScorecard = scorecard;
            this.loading = false;
        }
    }
};
</script>
