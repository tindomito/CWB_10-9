<template>
    <Teleport to="body">
        <div
            v-if="open"
            class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
            @click.self="close"
        >
            <div class="bg-[#1C1C1C] w-full sm:max-w-3xl sm:rounded-2xl border border-zinc-800 shadow-2xl flex flex-col max-h-[92vh]">
                <!-- Header -->
                <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
                    <div>
                        <h2 class="text-lg font-bold text-white">Peleas sin cerrar</h2>
                        <p class="text-xs text-gray-400 mt-0.5">
                            Ya pasó su fecha y no tienen resultado cargado.
                        </p>
                    </div>
                    <button
                        @click="close"
                        aria-label="Cerrar"
                        class="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg aria-hidden="true" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Body -->
                <div class="overflow-y-auto px-5 py-4 flex-1">
                    <!-- Loading -->
                    <div v-if="loading" class="flex justify-center py-10">
                        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]"></div>
                    </div>

                    <!-- Error -->
                    <div v-else-if="error" class="bg-[#C41E3A]/10 border border-[#C41E3A]/30 rounded-lg p-4">
                        <p class="text-sm text-red-300 mb-2">{{ error }}</p>
                        <button @click="loadList" class="text-sm font-medium text-[#D4AF37] hover:text-amber-300">
                            Reintentar
                        </button>
                    </div>

                    <!-- Vacío -->
                    <div v-else-if="fights.length === 0" class="text-center py-10">
                        <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
                            <svg aria-hidden="true" class="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p class="text-gray-300 font-medium">No hay peleas colgadas</p>
                        <p class="text-xs text-gray-500 mt-1">Todas las peleas pasadas tienen su resultado cargado.</p>
                    </div>

                    <!-- Lista -->
                    <ul v-else class="space-y-4">
                        <li
                            v-for="fight in fights"
                            :key="fight.id"
                            class="border border-zinc-800 rounded-xl p-4 bg-zinc-900/50"
                        >
                            <!-- Cabecera de la pelea -->
                            <div class="flex items-start justify-between gap-3 mb-3">
                                <div class="min-w-0">
                                    <p class="text-[11px] text-[#D4AF37] uppercase tracking-wider font-bold truncate">
                                        {{ fight.event_name }}
                                    </p>
                                    <p class="text-sm font-bold text-white mt-0.5">
                                        {{ fight.fighter1_name }} <span class="text-gray-500">vs</span> {{ fight.fighter2_name }}
                                    </p>
                                </div>
                                <div class="text-right shrink-0">
                                    <p class="text-[11px] text-gray-400">{{ formatDate(fight.fight_date) }}</p>
                                    <p v-if="fight.weight_class" class="text-[10px] text-gray-500">{{ fight.weight_class }}</p>
                                </div>
                            </div>

                            <!-- Ganador -->
                            <fieldset class="mb-3">
                                <legend class="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">
                                    Ganador
                                    <span v-if="form(fight).suggested" class="ml-1 text-[#D4AF37] normal-case tracking-normal">· sugerido por la API</span>
                                </legend>
                                <div class="grid grid-cols-2 gap-2">
                                    <button
                                        v-for="slot in [1, 2]"
                                        :key="slot"
                                        type="button"
                                        @click="setWinner(fight, slot)"
                                        :aria-pressed="form(fight).winner === externalId(fight, slot)"
                                        :class="[
                                            'px-3 py-2 text-sm font-semibold rounded-lg border transition-colors truncate',
                                            form(fight).winner === externalId(fight, slot)
                                                ? 'bg-[#D4AF37] text-[#0D0D0D] border-[#D4AF37]'
                                                : 'bg-zinc-800 text-gray-300 border-zinc-700 hover:border-zinc-600'
                                        ]"
                                    >
                                        {{ slot === 1 ? fight.fighter1_name : fight.fighter2_name }}
                                    </button>
                                </div>
                            </fieldset>

                            <!-- Método y round -->
                            <div class="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label :for="`${fight.id}-method`" class="block text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">
                                        Método
                                    </label>
                                    <select
                                        :id="`${fight.id}-method`"
                                        :value="form(fight).method"
                                        @change="setMethod(fight, $event.target.value)"
                                        class="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                                    >
                                        <option value="">Elegir…</option>
                                        <option value="ko_tko">KO / TKO</option>
                                        <option value="submission">Sumisión</option>
                                        <option value="decision">Decisión</option>
                                    </select>
                                </div>
                                <div>
                                    <label :for="`${fight.id}-round`" class="block text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">
                                        Round
                                    </label>
                                    <select
                                        :id="`${fight.id}-round`"
                                        :value="form(fight).round"
                                        @change="setRound(fight, $event.target.value)"
                                        :disabled="form(fight).method === 'decision' || !form(fight).method"
                                        class="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <option value="">—</option>
                                        <option v-for="r in maxRounds(fight)" :key="r" :value="r">{{ r }}</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Acción -->
                            <div class="flex items-center justify-between gap-3">
                                <p v-if="rowError[fight.id]" class="text-xs text-red-400 min-w-0 truncate">
                                    {{ rowError[fight.id] }}
                                </p>
                                <span v-else class="text-[11px] text-gray-500 truncate min-w-0">
                                    Al cerrarla se reparte el XP de las predicciones.
                                </span>
                                <button
                                    type="button"
                                    @click="resolve(fight)"
                                    :disabled="!canResolve(fight) || busyIds.has(fight.id)"
                                    class="shrink-0 px-4 py-2 text-sm font-bold rounded-lg bg-[#D4AF37] text-[#0D0D0D] hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {{ busyIds.has(fight.id) ? 'Cerrando…' : 'Cerrar pelea' }}
                                </button>
                            </div>
                        </li>
                    </ul>

                    <!-- Cargar más -->
                    <div v-if="hasMore && !loading" class="mt-4 text-center">
                        <button
                            type="button"
                            @click="loadMore"
                            :disabled="loadingMore"
                            class="px-5 py-2 text-xs font-bold uppercase tracking-wide text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {{ loadingMore ? 'Cargando…' : 'Cargar más' }}
                        </button>
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-5 py-3 border-t border-zinc-800 flex items-center justify-between shrink-0">
                    <p class="text-xs text-gray-500">
                        {{ fights.length }}{{ hasMore ? '+' : '' }} pelea{{ fights.length === 1 && !hasMore ? '' : 's' }} sin cerrar
                    </p>
                    <button
                        @click="close"
                        class="px-4 py-2 text-sm font-medium text-gray-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script>
import { getPendingFights, adminResolveFight, getSuggestedWinners } from '../services/predictions.js';
import { formatDateTime } from '../utils/format.js';

const PAGE_SIZE = 6;

export default {
    name: 'AdminPendingFightsPanel',
    props: {
        open: { type: Boolean, default: false }
    },
    emits: ['close', 'resolved'],
    data() {
        return {
            fights: [],
            forms: {},        // fightId → { winner, method, round }
            rowError: {},     // fightId → mensaje
            busyIds: new Set(),
            loading: false,
            loadingMore: false,
            error: null,
            page: 0,
            hasMore: false
        };
    },
    watch: {
        // La lista se carga al abrir el panel (no antes): son datos de admin
        // que no hacen falta mientras el panel está cerrado.
        open(val) {
            if (val) this.loadList();
        }
    },
    methods: {
        close() {
            this.$emit('close');
        },
        formatDate: formatDateTime,

        /** Estado del formulario de una pelea (se crea al vuelo). */
        form(fight) {
            return this.forms[fight.id] || { winner: null, method: '', round: '' };
        },
        externalId(fight, slot) {
            return slot === 1 ? fight.fighter1_external_id : fight.fighter2_external_id;
        },
        /** Main event a 5 rounds, el resto a 3. */
        maxRounds(fight) {
            return fight.is_main_event ? 5 : 3;
        },
        setWinner(fight, slot) {
            // Elegido a mano: deja de ser la sugerencia del proveedor.
            this.updateForm(fight, { winner: this.externalId(fight, slot), suggested: false });
        },
        setMethod(fight, method) {
            // Decisión no lleva round: se limpia para no mandar basura.
            const patch = { method };
            if (method === 'decision' || !method) patch.round = '';
            this.updateForm(fight, patch);
        },
        setRound(fight, round) {
            this.updateForm(fight, { round });
        },
        updateForm(fight, patch) {
            this.forms = {
                ...this.forms,
                [fight.id]: { ...this.form(fight), ...patch }
            };
            if (this.rowError[fight.id]) {
                this.rowError = { ...this.rowError, [fight.id]: null };
            }
        },
        /** KO/sumisión exigen round; decisión no. */
        canResolve(fight) {
            const f = this.form(fight);
            if (!f.winner || !f.method) return false;
            if (f.method === 'decision') return true;
            return !!f.round;
        },

        async loadList() {
            this.loading = true;
            this.error = null;
            this.page = 0;
            const { fights, error } = await getPendingFights({ page: 0, pageSize: PAGE_SIZE });
            if (error) {
                this.error = error.message || 'No se pudieron cargar las peleas';
                this.fights = [];
                this.hasMore = false;
            } else {
                this.fights = fights;
                this.hasMore = fights.length === PAGE_SIZE;
                await this.prefillWinners(fights);
            }
            this.loading = false;
        },

        /**
         * Pre-selecciona el ganador según el proveedor. La API publica quién
         * ganó pero no el método ni el round, así que el admin solo tiene que
         * completar esos dos y cerrar.
         */
        async prefillWinners(fights) {
            const sugeridos = await getSuggestedWinners(fights);
            for (const [fightId, winner] of Object.entries(sugeridos)) {
                const actual = this.forms[fightId];
                if (actual?.winner) continue; // no pisar lo que el admin ya eligió
                this.forms = {
                    ...this.forms,
                    [fightId]: { winner, method: '', round: '', suggested: true }
                };
            }
        },

        async loadMore() {
            if (this.loadingMore || !this.hasMore) return;
            this.loadingMore = true;
            const nextPage = this.page + 1;
            const { fights, error } = await getPendingFights({ page: nextPage, pageSize: PAGE_SIZE });
            if (!error) {
                this.fights = [...this.fights, ...fights];
                this.page = nextPage;
                this.hasMore = fights.length === PAGE_SIZE;
            }
            this.loadingMore = false;
        },

        async resolve(fight) {
            if (!this.canResolve(fight) || this.busyIds.has(fight.id)) return;
            const f = this.form(fight);

            this.busyIds = new Set(this.busyIds).add(fight.id);
            this.rowError = { ...this.rowError, [fight.id]: null };

            const { fight: updated, error } = await adminResolveFight({
                fightId: fight.id,
                winnerExternalId: f.winner,
                method: f.method,
                round: f.method === 'decision' ? null : Number(f.round)
            });

            const next = new Set(this.busyIds);
            next.delete(fight.id);
            this.busyIds = next;

            if (error) {
                this.rowError = {
                    ...this.rowError,
                    [fight.id]: error.message || 'No se pudo cerrar la pelea'
                };
                return;
            }

            // Sale de la lista de pendientes y se avisa al padre para refrescar.
            this.fights = this.fights.filter(x => x.id !== fight.id);
            this.$emit('resolved', updated);
        }
    }
};
</script>
