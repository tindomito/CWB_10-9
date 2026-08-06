<template>
    <div class="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-0">
        <!-- Header -->
        <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-white">Peleadores</h1>
            <p class="text-gray-400 text-sm mt-1">Buscá información de peleadores de MMA</p>
        </div>

        <!-- Buscador -->
        <div class="relative">
            <input
                v-model="searchQuery"
                @input="handleSearch"
                type="text"
                aria-label="Buscar peleador por nombre"
                placeholder="Buscar peleador por nombre..."
                class="w-full rounded-lg bg-zinc-900 px-4 py-3 pl-12 text-sm text-white placeholder-gray-500 border border-zinc-700 focus:outline-2 focus:outline-[#D4AF37] focus:bg-zinc-800 transition-colors"
            />
            <svg aria-hidden="true"
                class="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <div v-if="searchQuery.length > 0" class="absolute right-4 top-1/2 -translate-y-1/2">
                <button @click="clearSearch" aria-label="Limpiar búsqueda" class="text-gray-500 hover:text-white transition-colors">
                    <svg aria-hidden="true" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <div class="flex items-start">
                <svg aria-hidden="true" class="h-5 w-5 text-red-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <div class="ml-3">
                    <p class="text-sm text-red-300">{{ error }}</p>
                    <button @click="retrySearch" class="mt-2 text-sm font-medium text-[#D4AF37] hover:text-amber-300">
                        Reintentar
                    </button>
                </div>
            </div>
        </div>

        <!-- Fighter Detail -->
        <div v-else-if="selectedFighter" class="space-y-4">
            <button
                @click="goBackToResults"
                class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Volver a resultados
            </button>

            <div class="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                <!-- Fighter Header -->
                <div class="bg-gradient-to-r from-red-900/40 to-zinc-900 p-4 sm:p-6">
                    <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                        <div class="w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-2 border-red-600 bg-zinc-800 shrink-0">
                            <img
                                v-if="selectedFighter.photo"
                                :src="selectedFighter.photo"
                                :alt="selectedFighter.name"
                                class="w-full h-full object-cover"
                                @error="onFighterImageError"
                            />
                            <div v-else class="w-full h-full flex items-center justify-center">
                                <svg aria-hidden="true" class="w-14 h-14 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="text-center sm:text-left flex-1">
                            <h2 class="text-xl sm:text-2xl font-bold text-white">{{ selectedFighter.name }}</h2>
                            <p v-if="selectedFighter.nickname" class="text-amber-500 text-sm font-medium mt-1">
                                "{{ selectedFighter.nickname }}"
                            </p>
                            <div class="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                                <span v-if="selectedFighter.category" class="px-2.5 py-1 text-xs rounded-full bg-red-600/20 text-red-400 border border-red-600/30">
                                    {{ selectedFighter.category }}
                                </span>
                                <span v-if="selectedFighter.team?.name" class="px-2.5 py-1 text-xs rounded-full bg-amber-600/20 text-amber-400 border border-amber-600/30">
                                    {{ selectedFighter.team.name }}
                                </span>
                                <span v-if="selectedFighter.gender" class="px-2.5 py-1 text-xs rounded-full bg-zinc-700/50 text-gray-300 border border-zinc-600/30">
                                    {{ selectedFighter.gender === 'M' ? 'Masculino' : 'Femenino' }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="p-4 sm:p-6 space-y-5 sm:space-y-6">
                    <!-- Info Física y Personal -->
                    <div>
                        <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Información del Peleador</h3>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div v-if="selectedFighter.age" class="bg-zinc-800 rounded-lg p-3">
                                <p class="text-xs text-gray-500">Edad</p>
                                <p class="text-white font-medium">{{ selectedFighter.age }} años</p>
                            </div>
                            <div v-if="selectedFighter.birth_date" class="bg-zinc-800 rounded-lg p-3">
                                <p class="text-xs text-gray-500">Nacimiento</p>
                                <p class="text-white font-medium">{{ formatDate(selectedFighter.birth_date) }}</p>
                            </div>
                            <div v-if="selectedFighter.height" class="bg-zinc-800 rounded-lg p-3">
                                <p class="text-xs text-gray-500">Altura</p>
                                <p class="text-white font-medium">{{ selectedFighter.height }}</p>
                            </div>
                            <div v-if="selectedFighter.weight" class="bg-zinc-800 rounded-lg p-3">
                                <p class="text-xs text-gray-500">Peso</p>
                                <p class="text-white font-medium">{{ selectedFighter.weight }}</p>
                            </div>
                            <div v-if="selectedFighter.reach" class="bg-zinc-800 rounded-lg p-3">
                                <p class="text-xs text-gray-500">Alcance</p>
                                <p class="text-white font-medium">{{ selectedFighter.reach }}</p>
                            </div>
                            <div v-if="selectedFighter.stance" class="bg-zinc-800 rounded-lg p-3">
                                <p class="text-xs text-gray-500">Postura</p>
                                <p class="text-white font-medium">{{ selectedFighter.stance }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Equipo -->
                    <div v-if="selectedFighter.team?.name">
                        <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Equipo</h3>
                        <div class="bg-zinc-800 rounded-lg p-4 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center shrink-0">
                                <svg aria-hidden="true" class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                            </div>
                            <div>
                                <p class="text-white font-medium">{{ selectedFighter.team.name }}</p>
                                <p v-if="selectedFighter.team.id" class="text-xs text-gray-500">ID: {{ selectedFighter.team.id }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Última actualización -->
                    <div v-if="selectedFighter.last_update" class="text-xs text-gray-600 text-right">
                        Última actualización: {{ formatDateTime(selectedFighter.last_update) }}
                    </div>
                </div>
            </div>

            <!-- Historial de Peleas -->
            <div class="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
                <div class="p-4 sm:p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                            Historial de Peleas (2022-2026)
                        </h3>
                        <span v-if="fights.length > 0" class="text-xs text-gray-500">
                            {{ fights.length }} pelea{{ fights.length !== 1 ? 's' : '' }}
                        </span>
                    </div>

                    <!-- Loading fights -->
                    <div v-if="loadingFights" class="flex justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
                    </div>

                    <!-- Fights list (render incremental: de a 10) -->
                    <div v-else-if="fights.length > 0" class="space-y-3">
                        <ul class="space-y-3">
                        <li
                            v-for="fight in visibleFights"
                            :key="fight.id"
                            class="bg-zinc-800 rounded-lg p-3 sm:p-4 border border-zinc-700/50"
                        >
                            <!-- Event name & date -->
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-3">
                                <p class="text-sm font-semibold text-white truncate">{{ fight.slug }}</p>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-gray-500">{{ formatDate(fight.date) }}</span>
                                    <span
                                        :class="getStatusClass(fight.status?.short)"
                                        class="px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase"
                                    >
                                        {{ getStatusLabel(fight.status) }}
                                    </span>
                                </div>
                            </div>

                            <!-- Fighters matchup -->
                            <div class="flex items-center gap-2 sm:gap-4">
                                <!-- Fighter 1 · resaltado si es el del perfil, enlace si es el rival -->
                                <component
                                    :is="isOpponent(fight.fighters?.first) ? 'RouterLink' : 'div'"
                                    :to="opponentRoute(fight.fighters?.first)"
                                    :title="isOpponent(fight.fighters?.first) ? `Ver perfil de ${fight.fighters?.first?.name}` : null"
                                    class="flex-1 flex items-center gap-2 sm:gap-3 min-w-0 group rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                                    :class="{ 'opacity-60': isOpponent(fight.fighters?.first) }"
                                >
                                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 bg-zinc-700 shrink-0 transition-colors"
                                         :class="[
                                            isViewing(fight.fighters?.first) ? outcomeBorderClass(fight) : 'border-zinc-600',
                                            isOpponent(fight.fighters?.first) ? 'group-hover:border-[#D4AF37]' : ''
                                         ]">
                                        <img
                                            v-if="fight.fighters?.first?.logo"
                                            :src="fight.fighters.first.logo"
                                            :alt="fight.fighters?.first?.name"
                                            class="w-full h-full object-cover"
                                            @error="onFighterImageError"
                                        />
                                    </div>
                                    <div class="min-w-0">
                                        <p class="text-xs sm:text-sm truncate transition-colors"
                                           :class="[
                                                isViewing(fight.fighters?.first) ? `font-bold ${outcomeTextClass(fight)}` : 'font-medium text-gray-300',
                                                isOpponent(fight.fighters?.first) ? 'group-hover:text-[#D4AF37]' : ''
                                           ]">
                                            {{ fight.fighters?.first?.name }}
                                        </p>
                                        <p v-if="isViewing(fight.fighters?.first) && outcomeBadge(fight)"
                                           class="text-[10px] font-bold"
                                           :class="outcomeBadge(fight).cls">
                                            {{ outcomeBadge(fight).label }}
                                        </p>
                                    </div>
                                </component>

                                <!-- VS -->
                                <div class="shrink-0 text-xs font-bold text-gray-600 px-1">VS</div>

                                <!-- Fighter 2 · resaltado si es el del perfil, enlace si es el rival -->
                                <component
                                    :is="isOpponent(fight.fighters?.second) ? 'RouterLink' : 'div'"
                                    :to="opponentRoute(fight.fighters?.second)"
                                    :title="isOpponent(fight.fighters?.second) ? `Ver perfil de ${fight.fighters?.second?.name}` : null"
                                    class="flex-1 flex items-center gap-2 sm:gap-3 justify-end min-w-0 group rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                                    :class="{ 'opacity-60': isOpponent(fight.fighters?.second) }"
                                >
                                    <div class="min-w-0 text-right">
                                        <p class="text-xs sm:text-sm truncate transition-colors"
                                           :class="[
                                                isViewing(fight.fighters?.second) ? `font-bold ${outcomeTextClass(fight)}` : 'font-medium text-gray-300',
                                                isOpponent(fight.fighters?.second) ? 'group-hover:text-[#D4AF37]' : ''
                                           ]">
                                            {{ fight.fighters?.second?.name }}
                                        </p>
                                        <p v-if="isViewing(fight.fighters?.second) && outcomeBadge(fight)"
                                           class="text-[10px] font-bold"
                                           :class="outcomeBadge(fight).cls">
                                            {{ outcomeBadge(fight).label }}
                                        </p>
                                    </div>
                                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 bg-zinc-700 shrink-0 transition-colors"
                                         :class="[
                                            isViewing(fight.fighters?.second) ? outcomeBorderClass(fight) : 'border-zinc-600',
                                            isOpponent(fight.fighters?.second) ? 'group-hover:border-[#D4AF37]' : ''
                                         ]">
                                        <img
                                            v-if="fight.fighters?.second?.logo"
                                            :src="fight.fighters.second.logo"
                                            :alt="fight.fighters?.second?.name"
                                            class="w-full h-full object-cover"
                                            @error="onFighterImageError"
                                        />
                                    </div>
                                </component>
                            </div>

                            <!-- Fight details row -->
                            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-2 border-t border-zinc-700/50">
                                <span v-if="fight.category" class="text-[10px] text-gray-400 bg-zinc-700/50 px-2 py-0.5 rounded">
                                    {{ fight.category }}
                                </span>
                                <span v-if="fight.is_main" class="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-semibold">
                                    MAIN EVENT
                                </span>
                                <span v-if="fight.time" class="text-[10px] text-gray-500">
                                    {{ fight.time }} UTC
                                </span>
                            </div>

                            <!-- Botón puntuar -->
                            <RouterLink
                                v-if="fight.fighters?.first?.id && fight.fighters?.second?.id"
                                :to="scorecardRouteFor(fight)"
                                class="mt-3 flex items-center justify-center gap-1.5 w-full py-2 px-3 text-xs font-bold uppercase tracking-wide text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 rounded-lg transition-colors"
                            >
                                <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                                </svg>
                                Puntuar esta pelea
                            </RouterLink>
                        </li>
                        </ul>

                        <!-- Ver más peleas (render incremental) -->
                        <div v-if="visibleFights.length < fights.length" class="text-center pt-1">
                            <button
                                @click="showMoreFights"
                                class="px-5 py-2 text-xs font-bold uppercase tracking-wide text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 rounded-lg transition-colors"
                            >
                                Ver más peleas ({{ fights.length - visibleFights.length }} restantes)
                            </button>
                        </div>
                    </div>

                    <!-- No fights -->
                    <div v-else class="text-center py-8">
                        <svg aria-hidden="true" class="w-10 h-10 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                        <p class="text-sm text-gray-500">No se encontraron peleas registradas</p>
                        <p class="text-xs text-gray-600 mt-1">Solo están disponibles las temporadas 2022-2026</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Results List -->
        <div v-else-if="fighters.length > 0" class="space-y-3">
            <p class="text-sm text-gray-400">{{ fighters.length }} resultado{{ fighters.length !== 1 ? 's' : '' }}</p>
            <ul class="space-y-3">
            <li v-for="fighter in fighters" :key="fighter.id">
            <button
                type="button"
                @click="selectFighter(fighter)"
                class="w-full text-left bg-zinc-900 rounded-lg border border-zinc-800 p-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-800/80 hover:border-zinc-700 transition-all duration-200 active:scale-[0.99]"
            >
                <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0">
                    <img
                        v-if="fighter.photo"
                        :src="fighter.photo"
                        :alt="fighter.name"
                        class="w-full h-full object-cover"
                        @error="onFighterImageError"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center">
                        <svg aria-hidden="true" class="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                    </div>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-white font-semibold truncate">{{ fighter.name }}</p>
                    <p v-if="fighter.nickname" class="text-amber-500 text-xs truncate">"{{ fighter.nickname }}"</p>
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span v-if="fighter.category" class="text-xs text-gray-400">{{ fighter.category }}</span>
                        <span v-if="fighter.team?.name" class="text-xs text-gray-500">{{ fighter.team.name }}</span>
                    </div>
                </div>
                <svg aria-hidden="true" class="w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </button>
            </li>
            </ul>
        </div>

        <!-- Empty/Initial State -->
        <div v-else-if="!loading && searched" class="bg-zinc-900 rounded-lg p-8 sm:p-12 text-center">
            <div class="w-20 h-20 mx-auto mb-4 bg-zinc-800 rounded-full flex items-center justify-center">
                <svg aria-hidden="true" class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">No se encontraron peleadores</h3>
            <p class="text-sm text-gray-400">Intentá con otro nombre</p>
        </div>

        <!-- Initial state -->
        <div v-else-if="!loading && !searched" class="bg-zinc-900 rounded-lg p-8 sm:p-12 text-center">
            <div class="w-20 h-20 mx-auto mb-4 bg-zinc-800 rounded-full flex items-center justify-center">
                <svg aria-hidden="true" class="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Buscá un peleador</h3>
            <p class="text-sm text-gray-400">Escribí el nombre de un peleador de MMA para ver su información</p>
        </div>
    </div>
</template>

<script>
import { searchFighters, getFighterFights, getFighterById, buildFightId } from '../services/sports/index.js';
import { formatMediumDate, formatDateTime } from '../utils/format.js';
import { onFighterImageError } from '../utils/images.js';

// Cuántas peleas del historial se muestran por "página" de render.
// La API externa no soporta offset, así que la traída va completa (cacheada)
// pero el DOM se puebla de a poco para no renderizar todo de una.
const FIGHTS_RENDER_STEP = 10;

export default {
    name: 'Fighters',
    data() {
        return {
            searchQuery: '',
            fighters: [],
            selectedFighter: null,
            fights: [],
            fightsShown: FIGHTS_RENDER_STEP,
            loading: false,
            loadingFights: false,
            error: null,
            searched: false,
            searchTimeout: null
        };
    },
    computed: {
        /** Porción del historial visible en pantalla (render incremental). */
        visibleFights() {
            return this.fights.slice(0, this.fightsShown);
        }
    },
    methods: {
        onFighterImageError,
        /**
         * ¿Este peleador de la fila del historial es el rival (y no el que se
         * está viendo)? Solo el rival se muestra como enlace.
         */
        isOpponent(f) {
            if (!f?.id) return false;
            return String(f.id) !== String(this.selectedFighter?.id);
        },
        /** ¿Es el peleador cuyo historial se está mirando? */
        isViewing(f) {
            if (!f?.id || !this.selectedFighter?.id) return false;
            return String(f.id) === String(this.selectedFighter.id);
        },
        /**
         * Resultado de la pelea DESDE EL PUNTO DE VISTA del peleador que se
         * está mirando: 'win' | 'loss' | 'draw' | null (aún sin resultado).
         *
         * El historial se lee en primera persona: importa si ganó o perdió el
         * peleador del perfil, no cuál de los dos slots venció.
         */
        outcomeFor(fight) {
            if (fight?.status?.short !== 'FT') return null;
            const first = fight.fighters?.first;
            const second = fight.fighters?.second;
            const meIsFirst = this.isViewing(first);
            const meIsSecond = this.isViewing(second);
            if (!meIsFirst && !meIsSecond) return null;

            const me = meIsFirst ? first : second;
            const opp = meIsFirst ? second : first;
            if (me?.winner === true) return 'win';
            if (opp?.winner === true) return 'loss';
            if (me?.winner === false && opp?.winner === false) return 'draw';
            return null; // resultado no cargado en el dataset
        },
        /** Etiqueta y color del badge de resultado. */
        outcomeBadge(fight) {
            switch (this.outcomeFor(fight)) {
                case 'win':  return { label: 'WIN',    cls: 'text-green-500' };
                case 'loss': return { label: 'LOSS',   cls: 'text-[#C41E3A]' };
                case 'draw': return { label: 'EMPATE', cls: 'text-gray-400' };
                default:     return null;
            }
        },
        /** Color del nombre del peleador que se está mirando, según resultado. */
        outcomeTextClass(fight) {
            switch (this.outcomeFor(fight)) {
                case 'win':  return 'text-green-400';
                case 'loss': return 'text-[#C41E3A]';
                default:     return 'text-white';
            }
        },
        /** Color del borde de la foto del peleador que se está mirando. */
        outcomeBorderClass(fight) {
            switch (this.outcomeFor(fight)) {
                case 'win':  return 'border-green-500';
                case 'loss': return 'border-[#C41E3A]';
                default:     return 'border-[#D4AF37]';
            }
        },
        /** Ruta al perfil del rival (o undefined si no corresponde enlazar). */
        opponentRoute(f) {
            if (!this.isOpponent(f)) return undefined;
            return { path: '/peleadores', query: { id: f.id, nombre: f.name || '' } };
        },
        showMoreFights() {
            this.fightsShown += FIGHTS_RENDER_STEP;
        },
        handleSearch() {
            clearTimeout(this.searchTimeout);

            if (this.searchQuery.length < 2) {
                this.fighters = [];
                this.searched = false;
                this.error = null;
                return;
            }

            this.searchTimeout = setTimeout(() => {
                this.doSearch();
            }, 500);
        },

        async doSearch() {
            this.loading = true;
            this.error = null;
            this.selectedFighter = null;
            this.fights = [];

            const { fighters, error } = await searchFighters(this.searchQuery);

            this.loading = false;
            this.searched = true;

            if (error) {
                this.error = error;
                return;
            }

            this.fighters = fighters;
        },

        async selectFighter(fighter) {
            this.selectedFighter = fighter;
            this.fights = [];
            this.fightsShown = FIGHTS_RENDER_STEP;
            this.loadingFights = true;
            window.scrollTo({ top: 0, behavior: 'smooth' });

            const { fights } = await getFighterFights(fighter.id);
            this.fights = fights;
            this.loadingFights = false;
        },

        /**
         * Carga un peleador directamente por su ID (usado cuando se navega
         * a /peleadores?id=XXX desde el buscador global del header).
         */
        async loadFighterById(id, name = null) {
            if (!id) return;
            this.loading = true;
            this.error = null;
            this.fightsShown = FIGHTS_RENDER_STEP;
            try {
                // 1) Ficha completa (peleadores semilla y, si responde, del proveedor).
                const { fighter } = await getFighterById(id, name);
                if (fighter) {
                    this.selectedFighter = fighter;
                    const { fights } = await getFighterFights(id);
                    this.fights = fights || [];
                    return;
                }

                // 2) Fallback: API-Sports no expone /fighters/:id en el plan free,
                // así que derivamos nombre/foto desde las peleas del peleador.
                const { fights } = await getFighterFights(id);
                if (fights && fights.length > 0) {
                    const sample = fights[0];
                    const f1 = sample.fighters?.first;
                    const f2 = sample.fighters?.second;
                    const me = String(f1?.id) === String(id) ? f1 : (String(f2?.id) === String(id) ? f2 : null);
                    if (me) {
                        this.selectedFighter = {
                            id: Number(id),
                            name: me.name,
                            photo: me.logo,
                            category: sample.category
                        };
                        this.fights = fights;
                    }
                }
            } catch (e) {
                this.error = 'No se pudo cargar el peleador';
            } finally {
                this.loading = false;
            }
        },

        goBackToResults() {
            this.selectedFighter = null;
            this.fights = [];
        },

        clearSearch() {
            this.searchQuery = '';
            this.fighters = [];
            this.selectedFighter = null;
            this.fights = [];
            this.searched = false;
            this.error = null;
        },

        retrySearch() {
            if (this.searchQuery.length >= 2) {
                this.doSearch();
            }
        },

        formatDate: formatMediumDate,
        formatDateTime,

        getStatusClass(shortStatus) {
            switch (shortStatus) {
                case 'FT': return 'bg-green-600/20 text-green-400 border border-green-600/30';
                case 'CANC': return 'bg-red-600/20 text-red-400 border border-red-600/30';
                case 'NS': return 'bg-blue-600/20 text-blue-400 border border-blue-600/30';
                default: return 'bg-zinc-600/20 text-gray-400 border border-zinc-600/30';
            }
        },

        getStatusLabel(status) {
            if (!status) return '';
            switch (status.short) {
                case 'FT': return 'Finalizada';
                case 'CANC': return 'Cancelada';
                case 'NS': return 'Próxima';
                default: return status.long || status.short;
            }
        },

        /**
         * Construye la ruta al scorecard para una pelea del historial.
         * Usa el MISMO formato de fight_id que el flujo de predicciones
         * (provider:fightId) para que los scorecards de ambos caminos se
         * agreguen juntos en el scorecard comunitario.
         */
        scorecardRouteFor(fight) {
            const isUpcoming = fight.status?.short === 'NS';
            return {
                name: 'Scorecard',
                params: { fight_id: buildFightId('api-sports', fight.id) },
                query: {
                    event_id: fight.slug || '',
                    fighter_a_id: String(fight.fighters.first.id),
                    fighter_a_name: fight.fighters.first.name,
                    fighter_b_id: String(fight.fighters.second.id),
                    fighter_b_name: fight.fighters.second.name,
                    total_rounds: fight.is_main ? 5 : 3,
                    is_live: isUpcoming ? 'true' : 'false'
                }
            };
        }
    },
    watch: {
        // Navegar de un peleador a su rival reusa esta misma vista, así que el
        // cambio se detecta por la query en lugar de por el ciclo de montaje.
        '$route.query.id'(newId) {
            if (!newId) return;
            this.loadFighterById(newId, this.$route.query.nombre || null);
            // La ficha nueva arranca desde arriba, no desde donde estaba el historial.
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },
    mounted() {
        const { id, nombre } = this.$route.query;
        if (id) this.loadFighterById(id, nombre || null);
    },
    beforeUnmount() {
        clearTimeout(this.searchTimeout);
    }
};
</script>
