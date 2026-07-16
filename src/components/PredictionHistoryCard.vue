<!--
    Fila del historial de predicciones (perfil): evento, matchup con el
    pick marcado, método/round elegidos y el resultado con la XP ganada
    una vez que la pelea se resolvió (Acertada / Fallada / Pendiente).
-->
<template>
    <div class="bg-[#1C1C1C] border border-zinc-800 rounded-xl p-3">
        <!-- Header: evento + estado -->
        <div class="flex items-center justify-between gap-2 mb-2">
            <p class="text-[11px] text-gray-400 truncate">{{ prediction.event_name || '—' }}</p>
            <span :class="statusBadge.class" class="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border">
                {{ statusBadge.label }}
            </span>
        </div>

        <!-- Matchup -->
        <div class="flex items-center gap-2 text-sm mb-2">
            <span :class="nameClass(prediction.fighter1_external_id)" class="font-semibold truncate flex-1">
                {{ prediction.fighter1_name }}
            </span>
            <span class="text-[10px] text-zinc-600 font-bold shrink-0">vs</span>
            <span :class="nameClass(prediction.fighter2_external_id)" class="font-semibold truncate flex-1 text-right">
                {{ prediction.fighter2_name }}
            </span>
        </div>

        <!-- Tu predicción -->
        <div class="flex items-center justify-between gap-2 text-[11px] pt-2 border-t border-zinc-800">
            <p class="text-gray-400 truncate">
                Tu pick:
                <span class="text-[#D4AF37] font-medium">{{ pickName }}</span>
                <template v-if="prediction.predicted_method">
                    · {{ methodLabel(prediction.predicted_method) }}<template v-if="prediction.predicted_round"> R{{ prediction.predicted_round }}</template>
                </template>
            </p>
            <!-- Resultado -->
            <div v-if="prediction.resolved_at" class="flex items-center gap-1.5 shrink-0">
                <span :class="prediction.is_winner_correct ? 'text-emerald-400' : 'text-[#C41E3A]'" class="font-bold">
                    {{ prediction.is_winner_correct ? '✓' : '✗' }}
                </span>
                <span v-if="prediction.xp_awarded > 0" class="text-[#D4AF37] font-bold">+{{ prediction.xp_awarded }} XP</span>
            </div>
        </div>

        <!-- Fecha -->
        <p class="text-[10px] text-gray-600 mt-1.5">{{ formattedDate }}</p>
    </div>
</template>

<script>
import { FIGHT_METHOD_LABELS } from '../services/sports/index.js';

export default {
    name: 'PredictionHistoryCard',
    props: {
        prediction: { type: Object, required: true }
    },
    computed: {
        pickName() {
            const p = this.prediction;
            if (p.predicted_winner_external_id === p.fighter1_external_id) return p.fighter1_name;
            if (p.predicted_winner_external_id === p.fighter2_external_id) return p.fighter2_name;
            return '?';
        },
        statusBadge() {
            const p = this.prediction;
            if (p.resolved_at) {
                return p.is_winner_correct
                    ? { label: 'Acertada', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' }
                    : { label: 'Fallada', class: 'bg-[#C41E3A]/10 text-[#C41E3A] border-[#C41E3A]/40' };
            }
            if (p.fight_status === 'cancelled') {
                return { label: 'Cancelada', class: 'bg-zinc-800 text-gray-400 border-zinc-700' };
            }
            return { label: 'Pendiente', class: 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/40' };
        },
        formattedDate() {
            const d = new Date(this.prediction.created_at);
            return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    },
    methods: {
        methodLabel(m) {
            return FIGHT_METHOD_LABELS[m] || m;
        },
        /** Resalta verde el ganador real (si resuelta) o dorado tu pick. */
        nameClass(externalId) {
            const p = this.prediction;
            if (p.resolved_at && p.actual_winner_external_id) {
                if (p.actual_winner_external_id === externalId) return 'text-emerald-400';
                return 'text-gray-500';
            }
            if (p.predicted_winner_external_id === externalId) return 'text-[#D4AF37]';
            return 'text-white';
        }
    }
};
</script>
