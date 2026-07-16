<template>
    <div
        class="relative rounded-xl overflow-hidden shadow-lg border transition-colors"
        :class="[cardBgClass, cardBorderClass]"
    >
        <!-- Flash de confirmación: trama de marca (oro sobre carbón) -->
        <div v-if="confirmFlash" class="confirm-flash" aria-hidden="true"></div>

        <!-- Header de la pelea (clickable en mobile para colapsar) -->
        <button
            type="button"
            @click="toggleCollapsed"
            class="w-full text-left px-4 py-3 border-b border-zinc-800 transition-colors sm:cursor-default"
            :class="collapsed ? 'hover:bg-white/5' : ''"
        >
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    <span v-if="fight.is_main_event" class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider whitespace-nowrap">
                        Main Event
                    </span>
                    <span v-if="fight.weight_class" class="text-[11px] text-gray-300 truncate">
                        {{ fight.weight_class }}
                    </span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <!-- Indicador de predicción confirmada (sin resolver) -->
                    <span
                        v-if="existingPrediction && !existingPrediction.resolved_at"
                        class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40"
                    >
                        <svg aria-hidden="true" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                        Tu pick
                    </span>
                    <span :class="statusBadgeClass" class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded">
                        {{ statusLabel }}
                    </span>
                    <!-- Chevron solo mobile -->
                    <svg aria-hidden="true"
                        class="sm:hidden w-4 h-4 text-gray-400 transition-transform duration-200"
                        :class="collapsed ? '' : 'rotate-180'"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </div>
            </div>

            <!-- Mini matchup colapsado (solo mobile cuando está collapsed) -->
            <div v-if="collapsed" class="sm:hidden mt-2 flex items-center gap-2 text-sm">
                <span :class="winnerNameClass(fight.fighter1_external_id)" class="font-semibold truncate">
                    {{ fight.fighter1_name || 'Peleador 1' }}
                </span>
                <span class="text-[10px] text-zinc-600 font-bold shrink-0">VS</span>
                <span :class="winnerNameClass(fight.fighter2_external_id)" class="font-semibold truncate text-right flex-1">
                    {{ fight.fighter2_name || 'Peleador 2' }}
                </span>
            </div>

            <!-- Pista de XP ganada / mi predicción cuando está collapsed -->
            <div v-if="collapsed && (existingPrediction || (fight.status === 'finished' && fight.winner_external_id))" class="sm:hidden mt-1.5 flex items-center gap-2 text-[10px]">
                <template v-if="existingPrediction?.resolved_at">
                    <span :class="resultTextClass" class="font-bold uppercase tracking-wide">
                        {{ existingPrediction.is_winner_correct ? '✓ Acertaste' : '✗ Fallaste' }}
                    </span>
                    <span class="text-[#D4AF37] font-bold">+{{ existingPrediction.xp_awarded }} XP</span>
                </template>
                <template v-else-if="existingPrediction">
                    <span class="text-[#D4AF37] font-bold uppercase tracking-wide">★ Tu Seleccion</span>
                    <span class="text-gray-400 truncate">{{ predictionFighterName }}<template v-if="predictionMethodLabel"> · {{ predictionMethodLabel }}</template></span>
                </template>
                <template v-else-if="!locked">
                    <span class="text-gray-500 italic">Tocá para predecir</span>
                </template>
            </div>
        </button>

        <!-- CONTENIDO EXPANDIBLE (oculto en mobile cuando collapsed) -->
        <div v-show="!collapsed" class="p-4 sm:p-5">
            <div class="grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
                <!-- Fighter 1 -->
                <button
                    type="button"
                    @click="selectWinner(fight.fighter1_external_id)"
                    :disabled="locked"
                    :class="[
                        'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                        isSelected(fight.fighter1_external_id)
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]/40'
                            : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50',
                        locked && !isSelected(fight.fighter1_external_id) ? 'opacity-50' : '',
                        locked ? 'cursor-default' : 'cursor-pointer',
                        isCorrectFighter(fight.fighter1_external_id) ? 'ring-2 ring-emerald-500' : '',
                        isWrongFighter(fight.fighter1_external_id) ? 'ring-2 ring-[#C41E3A]' : ''
                    ]"
                >
                    <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-800">
                        <img
                            v-if="fight.fighter1_photo"
                            :src="fight.fighter1_photo"
                            :alt="fight.fighter1_name"
                            class="w-full h-full object-cover"
                            @error="$event.target.style.display='none'"
                        />
                    </div>
                    <p class="text-xs sm:text-sm font-semibold text-white text-center line-clamp-2">
                        {{ fight.fighter1_name || 'Peleador 1' }}
                    </p>
                    <span v-if="communityPercent(fight.fighter1_external_id) !== null" class="text-[10px] text-gray-400">
                        {{ communityPercent(fight.fighter1_external_id) }}% comunidad
                    </span>
                </button>

                <div class="self-center text-xs font-bold text-zinc-600">VS</div>

                <!-- Fighter 2 -->
                <button
                    type="button"
                    @click="selectWinner(fight.fighter2_external_id)"
                    :disabled="locked"
                    :class="[
                        'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                        isSelected(fight.fighter2_external_id)
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]/40'
                            : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50',
                        locked && !isSelected(fight.fighter2_external_id) ? 'opacity-50' : '',
                        locked ? 'cursor-default' : 'cursor-pointer',
                        isCorrectFighter(fight.fighter2_external_id) ? 'ring-2 ring-emerald-500' : '',
                        isWrongFighter(fight.fighter2_external_id) ? 'ring-2 ring-[#C41E3A]' : ''
                    ]"
                >
                    <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-800">
                        <img
                            v-if="fight.fighter2_photo"
                            :src="fight.fighter2_photo"
                            :alt="fight.fighter2_name"
                            class="w-full h-full object-cover"
                            @error="$event.target.style.display='none'"
                        />
                    </div>
                    <p class="text-xs sm:text-sm font-semibold text-white text-center line-clamp-2">
                        {{ fight.fighter2_name || 'Peleador 2' }}
                    </p>
                    <span v-if="communityPercent(fight.fighter2_external_id) !== null" class="text-[10px] text-gray-400">
                        {{ communityPercent(fight.fighter2_external_id) }}% comunidad
                    </span>
                </button>
            </div>

            <!-- Método y round -->
            <div v-if="!locked && form.winnerExternalId" class="mt-4 grid grid-cols-2 gap-3">
                <div>
                    <label :for="`${uid}-method`" class="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Método
                    </label>
                    <select
                        :id="`${uid}-method`"
                        v-model="form.method"
                        class="w-full px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                    >
                        <option :value="null">— Sin opinión —</option>
                        <option v-for="m in methodOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                    </select>
                </div>
                <div v-if="form.method && form.method !== 'decision'">
                    <label :for="`${uid}-round`" class="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Round
                    </label>
                    <select
                        :id="`${uid}-round`"
                        v-model.number="form.round"
                        class="w-full px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                    >
                        <option :value="null">— Sin opinión —</option>
                        <option v-for="r in [1,2,3,4,5]" :key="r" :value="r">Round {{ r }}</option>
                    </select>
                </div>
            </div>

            <!-- Botones -->
            <div v-if="!locked" class="mt-4 flex items-center gap-2">
                <button
                    @click="submit"
                    :disabled="saving || !form.winnerExternalId"
                    class="flex-1 bg-[#D4AF37] hover:bg-amber-400 text-[#0D0D0D] font-bold text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {{ saving ? 'Guardando…' : (existingPrediction ? 'Actualizar predicción' : 'Confirmar predicción') }}
                </button>
                <button
                    v-if="existingPrediction"
                    @click="clear"
                    :disabled="saving"
                    class="px-3 py-2 text-xs text-gray-400 hover:text-white border border-zinc-700 rounded-lg hover:bg-zinc-800"
                    title="Borrar mi predicción"
                >
                    Borrar
                </button>
            </div>

            <!-- Predicción ya guardada (locked o no) -->
            <div v-if="existingPrediction && !showFormSummary" class="mt-3 text-xs text-gray-300 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                <p class="font-semibold text-white mb-1">Tu predicción:</p>
                <p>
                    Ganador:
                    <span class="text-[#D4AF37] font-medium">{{ predictionFighterName }}</span>
                </p>
                <p v-if="existingPrediction.predicted_method">
                    Método: <span class="text-white">{{ methodLabel(existingPrediction.predicted_method) }}</span>
                    <span v-if="existingPrediction.predicted_round"> · Round {{ existingPrediction.predicted_round }}</span>
                </p>
            </div>

            <!-- Resultado y XP ganada (cuando la pelea ya se resolvió) -->
            <div v-if="fight.status === 'finished' && fight.winner_external_id" class="mt-3 p-3 rounded-lg border" :class="resultBoxClass">
                <div class="flex items-start justify-between gap-2 mb-1">
                    <p class="text-xs font-bold uppercase tracking-wide" :class="resultTextClass">
                        Resultado: {{ resultFighterName }} por {{ methodLabel(fight.result_method) || '—' }}
                        <span v-if="fight.result_round"> · R{{ fight.result_round }}</span>
                    </p>
                    <!-- Badge de upset según el ratio del ganador -->
                    <span
                        v-if="upsetBadge"
                        :class="upsetBadge.class"
                        class="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap"
                    >
                        {{ upsetBadge.label }}
                    </span>
                </div>
                <p v-if="existingPrediction?.resolved_at" class="text-xs">
                    <span :class="resultTextClass">{{ existingPrediction.is_winner_correct ? '✓ Acertaste' : '✗ Fallaste' }}</span>
                    <span class="text-gray-400"> · </span>
                    <span class="text-[#D4AF37] font-bold">+{{ existingPrediction.xp_awarded }} XP</span>
                </p>
            </div>

            <!-- Mensaje de error / lock -->
            <p v-if="errorMsg" class="mt-2 text-xs text-[#C41E3A]">{{ errorMsg }}</p>

            <!-- Puntuar rounds (scorecard) -->
            <RouterLink
                v-if="canScore"
                :to="scorecardRoute"
                class="mt-3 flex items-center justify-center gap-1.5 w-full py-2 px-3 text-xs font-bold uppercase tracking-wide text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 rounded-lg transition-colors"
            >
                <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                </svg>
                Puntuar rounds
            </RouterLink>

            <!-- Panel admin: resolver pelea manualmente -->
            <div v-if="isAdmin && fight.status !== 'cancelled'" class="mt-4 pt-4 border-t border-dashed border-[#D4AF37]/30">
                <button
                    v-if="!showAdminPanel"
                    @click="showAdminPanel = true"
                    class="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider hover:text-amber-300 flex items-center gap-1.5"
                >
                    <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                    </svg>
                    {{ fight.status === 'finished' ? 'Cambiar resultado (admin)' : 'Marcar resultado (admin)' }}
                </button>

                <div v-else class="space-y-3">
                    <div class="flex items-center justify-between">
                        <p class="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider">Panel Admin</p>
                        <button @click="closeAdminPanel" class="text-xs text-gray-400 hover:text-white">Cancelar</button>
                    </div>

                    <div>
                        <label class="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Ganador</label>
                        <div class="grid grid-cols-2 gap-2">
                            <button
                                @click="adminForm.winnerExternalId = fight.fighter1_external_id"
                                :class="[
                                    'px-3 py-2 text-xs font-medium rounded-lg border transition-colors text-left truncate',
                                    adminForm.winnerExternalId === fight.fighter1_external_id
                                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                                        : 'border-zinc-700 bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                                ]"
                            >{{ fight.fighter1_name || 'Peleador 1' }}</button>
                            <button
                                @click="adminForm.winnerExternalId = fight.fighter2_external_id"
                                :class="[
                                    'px-3 py-2 text-xs font-medium rounded-lg border transition-colors text-left truncate',
                                    adminForm.winnerExternalId === fight.fighter2_external_id
                                        ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                                        : 'border-zinc-700 bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                                ]"
                            >{{ fight.fighter2_name || 'Peleador 2' }}</button>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label :for="`${uid}-admin-method`" class="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Método</label>
                            <select :id="`${uid}-admin-method`" v-model="adminForm.method" class="w-full px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37]">
                                <option :value="null">— Elegí —</option>
                                <option v-for="m in methodOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                            </select>
                        </div>
                        <div v-if="adminForm.method && adminForm.method !== 'decision'">
                            <label :for="`${uid}-admin-round`" class="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Round</label>
                            <select :id="`${uid}-admin-round`" v-model.number="adminForm.round" class="w-full px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37]">
                                <option :value="null">— Elegí —</option>
                                <option v-for="r in [1,2,3,4,5]" :key="r" :value="r">Round {{ r }}</option>
                            </select>
                        </div>
                    </div>

                    <button
                        @click="submitAdminResolution"
                        :disabled="adminBusy || !adminCanSubmit"
                        class="w-full bg-[#D4AF37] hover:bg-amber-400 text-[#0D0D0D] font-bold text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {{ adminBusy ? 'Resolviendo…' : 'Confirmar resultado' }}
                    </button>
                    <p v-if="adminError" class="text-xs text-[#C41E3A]">{{ adminError }}</p>
                </div>
            </div>
        </div>

        <!-- Confirmación de resolución de pelea (admin) -->
        <ConfirmDialog
            :open="showResolveConfirm"
            title="¿Resolver la pelea?"
            message="Esto va a cerrar la pelea, calcular la XP y sumarla a todos los que predijeron. No se puede deshacer."
            confirmLabel="Resolver"
            variant="warning"
            :busy="adminBusy"
            @confirm="confirmResolve"
            @cancel="showResolveConfirm = false"
        />
    </div>
</template>

<script>
import { upsertPrediction, deletePrediction, adminResolveFight } from '../services/predictions.js';
import { FIGHT_METHODS, FIGHT_METHOD_LABELS } from '../services/sports/index.js';
import ConfirmDialog from './ConfirmDialog.vue';

export default {
    name: 'PredictionCard',
    components: { ConfirmDialog },
    props: {
        fight: { type: Object, required: true },
        userId: { type: String, default: null },
        isAdmin: { type: Boolean, default: false },
        existingPrediction: { type: Object, default: null },
        communityCounts: { type: Object, default: () => ({}) },
        communityTotal: { type: Number, default: 0 }
    },
    emits: ['saved', 'deleted', 'resolved'],
    data() {
        return {
            form: {
                winnerExternalId: this.existingPrediction?.predicted_winner_external_id || null,
                method: this.existingPrediction?.predicted_method || null,
                round: this.existingPrediction?.predicted_round || null
            },
            saving: false,
            errorMsg: '',
            // Flash de trama al confirmar una predicción
            confirmFlash: false,
            confirmFlashTimer: null,
            // Colapsado (solo aplica en mobile)
            collapsed: false,
            // Panel admin
            showAdminPanel: false,
            showResolveConfirm: false,
            adminBusy: false,
            adminError: '',
            adminForm: {
                winnerExternalId: this.fight.winner_external_id || null,
                method: this.fight.result_method || null,
                round: this.fight.result_round || null
            },
            methodOptions: [
                { value: FIGHT_METHODS.KO_TKO, label: FIGHT_METHOD_LABELS.ko_tko },
                { value: FIGHT_METHODS.SUBMISSION, label: FIGHT_METHOD_LABELS.submission },
                { value: FIGHT_METHODS.DECISION, label: FIGHT_METHOD_LABELS.decision }
            ]
        };
    },
    mounted() {
        // En mobile arranca colapsada. En desktop siempre expandida.
        if (typeof window !== 'undefined' && window.matchMedia) {
            this.collapsed = window.matchMedia('(max-width: 639px)').matches;
        }
    },
    beforeUnmount() {
        clearTimeout(this.confirmFlashTimer);
    },
    computed: {
        // Prefijo único por card para asociar labels con sus controles
        // (puede haber varias PredictionCard en la misma página).
        uid() {
            return `pc-${this.fight.id}`;
        },
        locked() {
            // Lock si la pelea no está scheduled o si ya empezó
            if (this.fight.status !== 'scheduled') return true;
            if (this.fight.fight_date && new Date(this.fight.fight_date) < new Date()) return true;
            return false;
        },
        statusLabel() {
            if (this.fight.status === 'finished') return 'Finalizada';
            if (this.fight.status === 'cancelled') return 'Cancelada';
            if (this.locked) return 'Cerrada';
            return 'Abierta';
        },
        /**
         * Fondo del card. Plano y dentro de la paleta (carbón #1C1C1C).
         * Cuando ya hiciste tu pick (sin resolver), el carbón se entibia
         * apenas hacia el dorado de la marca para marcar que la tarjeta está cargada.
         */
        cardBgClass() {
            if (this.existingPrediction && !this.existingPrediction.resolved_at) {
                return 'bg-[#211E15]';
            }
            return 'bg-[#1C1C1C]';
        },
        /** Borde del card según estado de la predicción (feedback visual). */
        cardBorderClass() {
            if (this.existingPrediction?.resolved_at) {
                return this.existingPrediction.is_winner_correct
                    ? 'border-emerald-500/50'
                    : 'border-[#C41E3A]/50';
            }
            if (this.existingPrediction) {
                // Predicción confirmada, sin resolver → acento dorado
                return 'border-[#D4AF37]/50';
            }
            return 'border-zinc-800';
        },
        statusBadgeClass() {
            if (this.fight.status === 'finished') return 'bg-zinc-800 text-gray-400 border border-zinc-700';
            if (this.fight.status === 'cancelled') return 'bg-[#C41E3A]/20 text-[#C41E3A] border border-[#C41E3A]/40';
            if (this.locked) return 'bg-zinc-800 text-gray-400 border border-zinc-700';
            return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
        },
        showFormSummary() {
            return !this.locked;
        },
        predictionFighterName() {
            if (!this.existingPrediction) return '';
            if (this.existingPrediction.predicted_winner_external_id === this.fight.fighter1_external_id) return this.fight.fighter1_name;
            if (this.existingPrediction.predicted_winner_external_id === this.fight.fighter2_external_id) return this.fight.fighter2_name;
            return '?';
        },
        /** Etiqueta compacta del método elegido para la vista colapsada: "KO/TKO R1", "Decisión", etc. */
        predictionMethodLabel() {
            const m = this.existingPrediction?.predicted_method;
            if (!m) return '';
            const label = this.methodLabel(m);
            if (!label) return '';
            if (m !== 'decision' && this.existingPrediction.predicted_round) {
                return `${label} R${this.existingPrediction.predicted_round}`;
            }
            return label;
        },
        resultFighterName() {
            if (!this.fight.winner_external_id) return '';
            if (this.fight.winner_external_id === this.fight.fighter1_external_id) return this.fight.fighter1_name;
            if (this.fight.winner_external_id === this.fight.fighter2_external_id) return this.fight.fighter2_name;
            return '?';
        },
        resultBoxClass() {
            if (!this.existingPrediction?.resolved_at) {
                return 'bg-zinc-900/60 border-zinc-800';
            }
            return this.existingPrediction.is_winner_correct
                ? 'bg-emerald-500/10 border-emerald-500/40'
                : 'bg-[#C41E3A]/10 border-[#C41E3A]/40';
        },
        resultTextClass() {
            if (!this.existingPrediction?.resolved_at) return 'text-gray-300';
            return this.existingPrediction.is_winner_correct ? 'text-emerald-300' : 'text-[#C41E3A]';
        },
        adminCanSubmit() {
            if (!this.adminForm.winnerExternalId) return false;
            if (!this.adminForm.method) return false;
            // Si el método tiene round, exigimos que se elija
            if (this.adminForm.method !== 'decision' && !this.adminForm.round) return false;
            return true;
        },
        /** Se puede puntuar si la pelea no está cancelada y hay datos de ambos peleadores. */
        canScore() {
            return this.fight.status !== 'cancelled'
                && !!this.fight.fighter1_external_id
                && !!this.fight.fighter2_external_id;
        },
        /** Ruta al scorecard con toda la metadata por query. */
        scorecardRoute() {
            return {
                name: 'Scorecard',
                params: { fight_id: this.fight.id },
                query: {
                    event_id: this.fight.event_slug || '',
                    fighter_a_id: this.fight.fighter1_external_id,
                    fighter_a_name: this.fight.fighter1_name,
                    fighter_b_id: this.fight.fighter2_external_id,
                    fighter_b_name: this.fight.fighter2_name,
                    total_rounds: this.fight.is_main_event ? 5 : 3,
                    is_live: this.fight.status !== 'finished' ? 'true' : 'false'
                }
            };
        },
        /**
         * Calcula el badge de upset basándose en el snapshot guardado.
         * Espejo de la lógica SQL en resolve_fight_predictions.
         */
        upsetBadge() {
            const snap = this.fight.community_snapshot;
            if (!snap || !this.fight.winner_external_id) return null;
            const total = Number(snap.total_votes) || 0;
            if (total === 0) return null;
            const winnerVotes = Number(snap.votes_by_fighter?.[this.fight.winner_external_id]) || 0;
            const ratio = winnerVotes / total;
            if (ratio < 0.15) {
                return {
                    label: 'Mega upset · x3',
                    class: 'bg-[#7A0A1C]/40 text-[#D4AF37] border-[#D4AF37]/60'
                };
            }
            if (ratio < 0.30) {
                return {
                    label: 'Upset · x2',
                    class: 'bg-[#7A0A1C]/30 text-[#D4AF37] border-[#D4AF37]/40'
                };
            }
            return null;
        }
    },
    watch: {
        existingPrediction: {
            handler(val) {
                if (val) {
                    this.form.winnerExternalId = val.predicted_winner_external_id;
                    this.form.method = val.predicted_method;
                    this.form.round = val.predicted_round;
                }
            },
            immediate: false
        }
    },
    methods: {
        toggleCollapsed() {
            // Solo togglea en mobile. En desktop el sm:cursor-default + el v-show
            // sobre el contenido ya garantizan que esté siempre expandido visualmente.
            if (typeof window !== 'undefined' && window.matchMedia
                && window.matchMedia('(min-width: 640px)').matches) {
                return;
            }
            this.collapsed = !this.collapsed;
        },
        /**
         * Color del nombre en el mini-matchup colapsado:
         * - verde si ganó (resolved + correcto)
         * - rojo si era predicho pero perdió
         * - dorado si es la predicción actual
         * - blanco neutro si no hay info
         */
        winnerNameClass(externalId) {
            if (this.fight.status === 'finished' && this.fight.winner_external_id) {
                if (this.fight.winner_external_id === externalId) return 'text-emerald-400';
                return 'text-gray-500';
            }
            if (this.existingPrediction?.predicted_winner_external_id === externalId) {
                return 'text-[#D4AF37]';
            }
            return 'text-white';
        },
        isSelected(externalId) {
            return this.form.winnerExternalId === externalId;
        },
        isCorrectFighter(externalId) {
            return this.fight.status === 'finished'
                && this.fight.winner_external_id === externalId;
        },
        isWrongFighter(externalId) {
            return this.fight.status === 'finished'
                && this.existingPrediction?.predicted_winner_external_id === externalId
                && this.fight.winner_external_id
                && this.fight.winner_external_id !== externalId;
        },
        selectWinner(externalId) {
            if (this.locked || !externalId) return;
            this.form.winnerExternalId = externalId;
            this.errorMsg = '';
        },
        communityPercent(externalId) {
            if (!this.communityTotal) return null;
            const c = this.communityCounts[externalId] || 0;
            return Math.round((c / this.communityTotal) * 100);
        },
        methodLabel(method) {
            return FIGHT_METHOD_LABELS[method] || null;
        },
        async submit() {
            if (!this.userId) {
                this.errorMsg = 'Iniciá sesión para predecir';
                return;
            }
            if (!this.form.winnerExternalId) {
                this.errorMsg = 'Seleccioná un ganador';
                return;
            }
            this.saving = true;
            this.errorMsg = '';
            const { prediction, error } = await upsertPrediction({
                userId: this.userId,
                fightId: this.fight.id,
                winnerExternalId: this.form.winnerExternalId,
                method: this.form.method,
                round: this.form.round
            });
            this.saving = false;
            if (error) {
                this.errorMsg = error.message || 'Error al guardar la predicción';
                return;
            }
            this.$emit('saved', prediction);
            // Animación de confirmación con la trama de marca
            this.triggerConfirmFlash();
            // En mobile, replegar la card una vez confirmada para volver a la vista compacta
            if (typeof window !== 'undefined' && window.matchMedia
                && window.matchMedia('(max-width: 639px)').matches) {
                this.collapsed = true;
            }
        },

        /**
         * Muestra el overlay con la trama octagonal (oro sobre carbón) durante
         * ~1.2s como feedback visual de que el pick quedó confirmado.
         */
        triggerConfirmFlash() {
            clearTimeout(this.confirmFlashTimer);
            this.confirmFlash = false;
            // nextTick para reiniciar la animación si se re-confirma seguido
            this.$nextTick(() => {
                this.confirmFlash = true;
                this.confirmFlashTimer = setTimeout(() => {
                    this.confirmFlash = false;
                }, 1250);
            });
        },
        async clear() {
            if (!this.userId) return;
            this.saving = true;
            const { error } = await deletePrediction(this.userId, this.fight.id);
            this.saving = false;
            if (error) {
                this.errorMsg = error.message || 'Error al borrar';
                return;
            }
            this.form.winnerExternalId = null;
            this.form.method = null;
            this.form.round = null;
            this.$emit('deleted', this.fight.id);
        },

        closeAdminPanel() {
            this.showAdminPanel = false;
            this.adminError = '';
        },

        // Abre la confirmación; el trabajo real lo hace confirmResolve()
        submitAdminResolution() {
            if (!this.adminCanSubmit || this.adminBusy) return;
            this.showResolveConfirm = true;
        },

        async confirmResolve() {
            this.showResolveConfirm = false;
            this.adminBusy = true;
            this.adminError = '';
            const { fight, error } = await adminResolveFight({
                fightId: this.fight.id,
                winnerExternalId: this.adminForm.winnerExternalId,
                method: this.adminForm.method,
                round: this.adminForm.round
            });
            this.adminBusy = false;

            if (error) {
                this.adminError = error.message || 'Error al resolver';
                return;
            }
            this.showAdminPanel = false;
            this.$emit('resolved', fight);
        }
    }
};
</script>

<style scoped>
/*
 * Flash de confirmación de pick: la trama octagonal de marca
 * (03_oro_linea_sobre_carbon del pack tramas-10-9/) aparece sobre
 * la card, se desliza suavemente hacia arriba y se desvanece.
 */
.confirm-flash {
    position: absolute;
    inset: 0;
    z-index: 20;
    pointer-events: none;
    background-color: rgba(212, 175, 55, 0.05);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='168' height='168' viewBox='0 0 168 168'%3E%3Cg fill='none' stroke='%23D4AF37' stroke-width='3'%3E%3Cpolygon points='68,8 132,8 168,44 168,108 132,144 68,144 32,108 32,44'/%3E%3Cpolygon points='-16,8 48,8 84,44 84,108 48,144 -16,144 -52,108 -52,44'/%3E%3Cpolygon points='152,8 216,8 252,44 252,108 216,144 152,144 116,108 116,44'/%3E%3C/g%3E%3C/svg%3E");
    background-size: 112px 112px;
    animation: trama-confirm 1.25s ease-out forwards;
}

@keyframes trama-confirm {
    0% {
        opacity: 0;
        background-position: 0 34px;
    }
    22% {
        opacity: 0.32;
    }
    55% {
        opacity: 0.18;
    }
    100% {
        opacity: 0;
        background-position: 0 -34px;
    }
}

/* Respetar usuarios con movimiento reducido */
@media (prefers-reduced-motion: reduce) {
    .confirm-flash {
        animation: none;
        opacity: 0;
    }
}
</style>
