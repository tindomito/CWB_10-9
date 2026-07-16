<template>
    <div class="min-h-screen pb-12">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-6">
            <h1 class="sr-only">Tale of the tape</h1>

            <!-- Volver -->
            <button
                @click="goBack"
                class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Volver
            </button>

            <!-- Loading -->
            <div v-if="loading" class="flex justify-center py-16">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
            </div>

            <!-- No encontrada -->
            <div v-else-if="!fight" class="bg-ufc-card rounded-2xl border border-zinc-800 p-8 text-center">
                <p class="text-gray-300 font-medium mb-1">No encontramos esa pelea</p>
                <p class="text-xs text-gray-500">Puede que ya no esté disponible en el dataset actual.</p>
            </div>

            <template v-else>
                <!-- Contexto del evento -->
                <div class="text-center">
                    <RouterLink
                        v-if="fight.eventSlug"
                        :to="{ name: 'EventDetail', params: { slug: fight.eventSlug } }"
                        class="text-xs font-bold text-amber-400 hover:text-amber-300 uppercase tracking-widest"
                    >
                        {{ fight.eventName }}
                    </RouterLink>
                    <p class="text-[11px] text-gray-500 mt-1">
                        <span v-if="fight.weightClass">{{ fight.weightClass }}</span>
                        <span v-if="fight.dateIso"> · {{ formatDate(fight.dateIso) }}</span>
                    </p>
                </div>

                <!-- Matchup -->
                <section class="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-ufc-card to-ufc-black">
                    <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(196,30,58,0.18),transparent_55%)]"></div>
                    <div class="relative p-5 sm:p-8">
                        <div class="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-4">
                            <!-- Peleador 1 -->
                            <div class="flex flex-col items-center text-center">
                                <div class="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-amber-500/60 bg-zinc-800">
                                    <img v-if="fight.fighter1.photo" :src="fight.fighter1.photo" :alt="fight.fighter1.name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                                </div>
                                <h2 class="mt-3 text-base sm:text-xl font-black text-white uppercase leading-tight">{{ fight.fighter1.name || 'TBD' }}</h2>
                                <p v-if="detailA?.nickname" class="text-amber-500 text-xs font-medium">"{{ detailA.nickname }}"</p>
                                <p v-if="recordA" class="mt-1 text-sm font-mono font-bold text-gray-200">{{ recordLabel(recordA) }}</p>
                                <div v-if="recentA.length" class="flex gap-1 mt-2">
                                    <span v-for="(r, i) in recentA" :key="i" :class="formChipClass(r)" class="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center" :title="r.label">{{ r.short }}</span>
                                </div>
                            </div>

                            <!-- VS -->
                            <div class="flex flex-col items-center pt-8 sm:pt-10">
                                <span class="text-xl sm:text-3xl font-black text-red-500">VS</span>
                            </div>

                            <!-- Peleador 2 -->
                            <div class="flex flex-col items-center text-center">
                                <div class="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-red-500/60 bg-zinc-800">
                                    <img v-if="fight.fighter2.photo" :src="fight.fighter2.photo" :alt="fight.fighter2.name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                                </div>
                                <h2 class="mt-3 text-base sm:text-xl font-black text-white uppercase leading-tight">{{ fight.fighter2.name || 'TBD' }}</h2>
                                <p v-if="detailB?.nickname" class="text-amber-500 text-xs font-medium">"{{ detailB.nickname }}"</p>
                                <p v-if="recordB" class="mt-1 text-sm font-mono font-bold text-gray-200">{{ recordLabel(recordB) }}</p>
                                <div v-if="recentB.length" class="flex gap-1 mt-2">
                                    <span v-for="(r, i) in recentB" :key="i" :class="formChipClass(r)" class="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center" :title="r.label">{{ r.short }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Resultado (si la pelea ya terminó) -->
                        <div v-if="fight.status === 'finished' && fight.result" class="mt-5 pt-4 border-t border-zinc-800 text-center">
                            <p class="text-xs uppercase tracking-widest text-gray-500 mb-1">Resultado</p>
                            <p class="text-sm font-bold text-green-400">
                                {{ winnerName }} por {{ methodLabel(fight.result.method) }}
                                <span v-if="fight.result.round"> · R{{ fight.result.round }}</span>
                            </p>
                        </div>
                    </div>
                </section>

                <!-- TALE OF THE TAPE -->
                <section class="bg-ufc-card rounded-2xl border border-zinc-800 overflow-hidden">
                    <div class="px-5 py-3 border-b border-zinc-800 bg-gradient-to-r from-amber-500/10 to-transparent">
                        <h3 class="text-sm font-bold text-white uppercase tracking-widest text-center">Tale of the Tape</h3>
                    </div>

                    <div v-if="loadingDetails" class="flex justify-center py-10">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
                    </div>

                    <div v-else-if="taleRows.length" class="divide-y divide-zinc-800">
                        <div
                            v-for="row in taleRows"
                            :key="row.label"
                            class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-6 py-3"
                        >
                            <span class="text-right text-sm font-semibold" :class="row.winner === 'a' ? 'text-amber-400' : 'text-white'">{{ row.a || '—' }}</span>
                            <span class="text-[10px] uppercase tracking-wider text-gray-500 text-center min-w-[72px]">{{ row.label }}</span>
                            <span class="text-left text-sm font-semibold" :class="row.winner === 'b' ? 'text-amber-400' : 'text-white'">{{ row.b || '—' }}</span>
                        </div>
                    </div>

                    <div v-else class="px-6 py-8 text-center text-sm text-gray-500">
                        La API no devolvió datos comparables para esta pelea.
                    </div>

                    <p class="px-5 py-3 text-[10px] text-gray-600 text-center border-t border-zinc-800">
                        Datos de API-Sports. El récord refleja las temporadas recientes disponibles, no la carrera completa del peleador.
                    </p>
                </section>

                <!-- CTA: puntuar / predecir -->
                <div class="flex flex-col sm:flex-row gap-3">
                    <RouterLink
                        v-if="canScore"
                        :to="scorecardRoute"
                        class="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold uppercase tracking-wide text-[#0D0D0D] bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors"
                    >
                        <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                        </svg>
                        Puntuar esta pelea
                    </RouterLink>
                    <RouterLink
                        to="/predicciones"
                        class="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold uppercase tracking-wide text-amber-400 border border-amber-500/40 hover:bg-amber-500/10 rounded-lg transition-colors"
                    >
                        Ir a predicciones
                    </RouterLink>
                </div>
            </template>
        </div>
    </div>
</template>

<script>
import { getFightById, getFighterById, getFighterRecord, FIGHT_METHOD_LABELS } from '../services/sports/index.js';
import { formatLongDate, formatMediumDate } from '../utils/format.js';

export default {
    name: 'FightDetail',
    data() {
        return {
            fight: null,
            detailA: null,
            detailB: null,
            recordA: null,
            recordB: null,
            recentA: [],
            recentB: [],
            loading: true,
            loadingDetails: true
        };
    },
    computed: {
        winnerName() {
            if (!this.fight?.result?.winnerExternalId) return '';
            if (this.fight.result.winnerExternalId === this.fight.fighter1.externalId) return this.fight.fighter1.name;
            if (this.fight.result.winnerExternalId === this.fight.fighter2.externalId) return this.fight.fighter2.name;
            return '';
        },
        canScore() {
            return !!this.fight?.fighter1?.externalId && !!this.fight?.fighter2?.externalId && this.fight.status !== 'cancelled';
        },
        scorecardRoute() {
            if (!this.fight) return {};
            return {
                name: 'Scorecard',
                params: { fight_id: this.fight.id },
                query: {
                    event_id: this.fight.eventSlug || '',
                    fighter_a_id: this.fight.fighter1.externalId,
                    fighter_a_name: this.fight.fighter1.name,
                    fighter_b_id: this.fight.fighter2.externalId,
                    fighter_b_name: this.fight.fighter2.name,
                    total_rounds: this.fight.isMainEvent ? 5 : 3,
                    is_live: this.fight.status !== 'finished' ? 'true' : 'false'
                }
            };
        },
        /** Filas comparables del tale of the tape, solo con datos presentes. */
        taleRows() {
            const a = this.detailA || {};
            const b = this.detailB || {};
            const rows = [];

            const pushRow = (label, av, bv, dir = null) => {
                const aStr = av != null && av !== '' ? String(av) : '';
                const bStr = bv != null && bv !== '' ? String(bv) : '';
                if (!aStr && !bStr) return;
                let winner = null;
                if (dir) {
                    const an = this.toNum(aStr), bn = this.toNum(bStr);
                    if (an != null && bn != null && an !== bn) {
                        if (dir === 'higher') winner = an > bn ? 'a' : 'b';
                        if (dir === 'lower') winner = an < bn ? 'a' : 'b';
                    }
                }
                rows.push({ label, a: aStr, b: bStr, winner });
            };

            pushRow('Récord', this.recordA ? this.recordLabel(this.recordA) : '', this.recordB ? this.recordLabel(this.recordB) : '');
            pushRow('Edad', a.age ? `${a.age} años` : '', b.age ? `${b.age} años` : '', 'lower');
            pushRow('Altura', a.height, b.height, 'higher');
            pushRow('Peso', a.weight, b.weight);
            pushRow('Alcance', a.reach, b.reach, 'higher');
            pushRow('Postura', a.stance, b.stance);
            pushRow('División', a.category, b.category);
            pushRow('Equipo', a.team?.name, b.team?.name);
            pushRow('Nacimiento', this.formatBirth(a.birth_date), this.formatBirth(b.birth_date));

            return rows;
        }
    },
    methods: {
        async load() {
            this.loading = true;
            this.loadingDetails = true;
            const { fight } = await getFightById(this.$route.params.fightId);
            this.fight = fight;
            this.loading = false;

            if (!fight) {
                this.loadingDetails = false;
                return;
            }

            // Tale of the tape: detalle + récord de ambos peleadores en paralelo
            const f1 = fight.fighter1;
            const f2 = fight.fighter2;
            const [da, db, ra, rb] = await Promise.all([
                f1.externalId ? getFighterById(f1.externalId, f1.name) : Promise.resolve({ fighter: null }),
                f2.externalId ? getFighterById(f2.externalId, f2.name) : Promise.resolve({ fighter: null }),
                f1.externalId ? getFighterRecord(f1.externalId) : Promise.resolve({ record: null, recent: [] }),
                f2.externalId ? getFighterRecord(f2.externalId) : Promise.resolve({ record: null, recent: [] })
            ]);

            this.detailA = da.fighter;
            this.detailB = db.fighter;
            this.recordA = ra.record;
            this.recordB = rb.record;
            this.recentA = this.buildForm(ra.recent, f1.externalId);
            this.recentB = this.buildForm(rb.recent, f2.externalId);
            this.loadingDetails = false;
        },
        /** Convierte las últimas peleas en chips de forma (V/D/E). */
        buildForm(recent, fighterId) {
            if (!recent) return [];
            return recent
                .filter((f) => (f.status?.short || '').toUpperCase() === 'FT')
                .slice(0, 5)
                .map((f) => {
                    const isF1 = f.fighters?.first && String(f.fighters.first.id) === String(fighterId);
                    const me = isF1 ? f.fighters.first : f.fighters.second;
                    const opp = isF1 ? f.fighters.second : f.fighters.first;
                    if (me?.winner === true) return { short: 'V', label: 'Victoria', kind: 'w' };
                    if (opp?.winner === true) return { short: 'D', label: 'Derrota', kind: 'l' };
                    return { short: 'E', label: 'Empate', kind: 'd' };
                });
        },
        formChipClass(r) {
            if (r.kind === 'w') return 'bg-green-600/30 text-green-300 border border-green-600/40';
            if (r.kind === 'l') return 'bg-red-600/30 text-red-300 border border-red-600/40';
            return 'bg-zinc-700/50 text-gray-300 border border-zinc-600/40';
        },
        recordLabel(rec) {
            if (!rec) return '';
            return `${rec.wins}-${rec.losses}${rec.draws ? '-' + rec.draws : ''}`;
        },
        methodLabel(method) {
            return FIGHT_METHOD_LABELS[method] || 'decisión';
        },
        toNum(str) {
            if (!str) return null;
            const m = String(str).match(/-?\d+(?:[.,]\d+)?/);
            return m ? parseFloat(m[0].replace(',', '.')) : null;
        },
        formatDate: formatLongDate,
        formatBirth: formatMediumDate,
        goBack() {
            if (window.history.length > 1) this.$router.back();
            else this.$router.push({ name: 'Home' });
        }
    },
    watch: {
        '$route.params.fightId'() {
            this.load();
        }
    },
    mounted() {
        this.load();
    }
};
</script>
