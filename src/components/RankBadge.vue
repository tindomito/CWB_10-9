<template>
    <div class="inline-flex items-center space-x-2">
        <!-- Badge del rango -->
        <span 
            :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                rankColorClass
            ]"
        >
            <span :class="iconClass" class="mr-1">{{ rankIcon }}</span>
            {{ rangoActual }}
        </span>
        
        <!-- Badge Admin (opcional) -->
        <span
            v-if="isPro"
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-red-700 text-white"
        >
            👑 Admin
        </span>
        
        <!-- Indicador de progreso (opcional) -->
        <div 
            v-if="showProgress" 
            class="flex items-center space-x-1 text-xs text-gray-500"
        >
            <span>{{ rankIndex + 1 }}/{{ totalRanks }}</span>
            <div class="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                    class="h-full bg-gradient-to-r from-red-500 to-amber-500 transition-all duration-300"
                    :style="{ width: `${progress}%` }"
                ></div>
            </div>
        </div>
    </div>
</template>

<script>
import { getRangoIndex, RANGOS } from '../services/profiles.js';

/**
 * Nombres del sistema de rangos viejo → escalera actual.
 * La migración SQL ya actualizó los perfiles, pero normalizamos acá
 * por si queda alguna fila vieja sin migrar.
 */
const LEGACY_RANGOS = {
    'Novato': 'Amateur',
    'Aprendiz': 'Prospecto',
    'Luchador': 'Local Card',
    'Guerrero': 'Co-Main',
    'Veterano': 'Main Event',
    'Experto': 'Ranked',
    'Maestro': 'Top 10',
    'Leyenda': 'Top 5',
    'Campeón': 'Contender',
    'Hall of Fame': 'Champion'
};

export default {
    name: 'RankBadge',
    props: {
        // Rango del usuario (acepta también nombres legacy, se normalizan)
        rango: {
            type: String,
            required: true,
            validator: (value) => RANGOS.includes(value) || value in LEGACY_RANGOS
        },
        // Si el usuario es Admin (campo pro en base de datos)
        isPro: {
            type: Boolean,
            default: false
        },
        // Mostrar barra de progreso del rango
        showProgress: {
            type: Boolean,
            default: false
        },
        // Tamaño del badge
        size: {
            type: String,
            default: 'normal',
            validator: (value) => ['small', 'normal', 'large'].includes(value)
        }
    },
    computed: {
        // Rango normalizado: si viene un nombre del sistema viejo, lo traduce
        rangoActual() {
            return LEGACY_RANGOS[this.rango] || this.rango;
        },

        // Índice numérico del rango (0-9)
        rankIndex() {
            return getRangoIndex(this.rangoActual);
        },

        // Número total de rangos
        totalRanks() {
            return RANGOS.length;
        },

        // Porcentaje de progreso del rango
        progress() {
            return ((this.rankIndex + 1) / this.totalRanks) * 100;
        },

        // Icono asociado al rango
        rankIcon() {
            const icons = {
                'Amateur': '🥋',
                'Prospecto': '🎯',
                'Local Card': '🎟️',
                'Co-Main': '🥊',
                'Main Event': '⭐',
                'Ranked': '📈',
                'Top 10': '🏅',
                'Top 5': '🏆',
                'Contender': '⚔️',
                'Champion': '👑'
            };
            return icons[this.rangoActual] || '🥋';
        },

        // Colores del badge: la escalera va subiendo hacia el dorado de marca
        rankColorClass() {
            const colorClasses = {
                'Amateur': 'bg-zinc-800 text-gray-300',
                'Prospecto': 'bg-green-900/50 text-green-300',
                'Local Card': 'bg-blue-900/50 text-blue-300',
                'Co-Main': 'bg-purple-900/50 text-purple-300',
                'Main Event': 'bg-indigo-900/50 text-indigo-300',
                'Ranked': 'bg-yellow-900/50 text-yellow-300',
                'Top 10': 'bg-orange-900/50 text-orange-300',
                'Top 5': 'bg-[#7A0A1C]/40 text-red-200',
                'Contender': 'bg-[#7A0A1C]/60 text-amber-200',
                'Champion': 'bg-gradient-to-r from-[#D4AF37] to-amber-600 text-[#0D0D0D] font-bold'
            };
            return colorClasses[this.rangoActual] || 'bg-zinc-800 text-gray-300';
        },

        // Clases para el icono
        iconClass() {
            return this.rangoActual === 'Champion' ? 'drop-shadow' : '';
        }
    }
};
</script>