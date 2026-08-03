<template>
    <div>
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
        </div>

        <!-- Vacío: el usuario no tiene NINGUNA predicción (no es un filtro sin
             resultados; ese caso se maneja abajo, junto a la barra de filtros) -->
        <div v-else-if="stats.total === 0" class="text-center py-12 text-gray-400">
            <svg aria-hidden="true" class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 class="text-lg font-medium text-white mb-2">Sin predicciones todavía</h3>
            <p class="text-gray-400">
                {{ isOwn ? 'Hacé tu primera predicción desde la sección Predicciones.' : 'Este usuario no hizo predicciones.' }}
            </p>
            <RouterLink
                v-if="isOwn"
                to="/predicciones"
                class="inline-block mt-4 text-[#D4AF37] hover:text-amber-300 font-medium"
            >
                Ir a predecir →
            </RouterLink>
        </div>

        <template v-else>
            <!-- Hero: % de acierto -->
            <div class="bg-gradient-to-br from-[#7A0A1C]/30 via-[#1C1C1C] to-[#1C1C1C] border border-zinc-800 rounded-xl p-5 mb-4 text-center">
                <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-1">% de acierto</p>
                <p class="text-4xl font-bold text-white">{{ stats.accuracy }}<span class="text-2xl text-gray-500">%</span></p>
                <p class="text-xs text-gray-400 mt-1">
                    {{ stats.correct }} de {{ stats.resolved }} peleas resueltas
                </p>
                <!-- Barra -->
                <div class="h-2 bg-zinc-800 rounded-full overflow-hidden mt-3 max-w-xs mx-auto">
                    <div class="h-full bg-gradient-to-r from-[#7A0A1C] to-[#D4AF37] transition-all" :style="{ width: stats.accuracy + '%' }"></div>
                </div>
            </div>

            <!-- Tiles de stats -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
                <div class="bg-[#1C1C1C] border border-zinc-800 rounded-lg p-3 text-center">
                    <p class="text-xl font-bold text-white">{{ stats.total }}</p>
                    <p class="text-[10px] text-gray-400 uppercase tracking-wider">Predicciones</p>
                </div>
                <div class="bg-[#1C1C1C] border border-zinc-800 rounded-lg p-3 text-center">
                    <p class="text-xl font-bold text-[#D4AF37]">{{ stats.perfect }}</p>
                    <p class="text-[10px] text-gray-400 uppercase tracking-wider">Perfectas</p>
                </div>
                <div class="bg-[#1C1C1C] border border-zinc-800 rounded-lg p-3 text-center">
                    <p class="text-xl font-bold text-white">{{ stats.totalXp.toLocaleString() }}</p>
                    <p class="text-[10px] text-gray-400 uppercase tracking-wider">XP predicc.</p>
                </div>
                <div class="bg-[#1C1C1C] border border-zinc-800 rounded-lg p-3 text-center">
                    <p class="text-xl font-bold text-white">{{ stats.pending }}</p>
                    <p class="text-[10px] text-gray-400 uppercase tracking-wider">Pendientes</p>
                </div>
            </div>

            <!-- Detalle método + racha -->
            <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-gray-400 mb-4">
                <span>Método acertado: <span class="text-white font-semibold">{{ stats.methodHits }}</span></span>
                <span class="text-zinc-700">·</span>
                <span>Round acertado: <span class="text-white font-semibold">{{ stats.roundHits }}</span></span>
                <span class="text-zinc-700">·</span>
                <span>Racha actual: <span class="text-orange-400 font-semibold">🔥 {{ currentStreak }}</span></span>
                <span class="text-zinc-700">·</span>
                <span>Mejor racha: <span class="text-white font-semibold">{{ bestStreak }}</span></span>
            </div>

            <!-- Filtros -->
            <div class="bg-[#1C1C1C] border border-zinc-800 rounded-xl p-3 mb-4 space-y-3">
                <!-- Por resultado -->
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="opt in resultOptions"
                        :key="opt.value"
                        type="button"
                        @click="setResultFilter(opt.value)"
                        :aria-pressed="filterResult === opt.value"
                        :class="[
                            'px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg border transition-colors',
                            filterResult === opt.value
                                ? 'bg-[#D4AF37] text-[#0D0D0D] border-[#D4AF37]'
                                : 'bg-zinc-900 text-gray-300 border-zinc-700 hover:border-zinc-600'
                        ]"
                    >
                        {{ opt.label }}
                    </button>
                </div>

                <!-- Búsqueda -->
                <div class="relative">
                    <label for="pred-history-search" class="sr-only">Buscar por evento o peleador</label>
                    <svg aria-hidden="true" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                    </svg>
                    <input
                        id="pred-history-search"
                        v-model="searchQuery"
                        @input="onSearchInput"
                        type="search"
                        placeholder="Buscar por evento o peleador…"
                        class="w-full bg-zinc-900 border border-zinc-700 text-white text-sm rounded-lg pl-9 pr-9 py-2 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                    />
                    <button
                        v-if="searchQuery"
                        @click="searchQuery = ''; onSearchInput()"
                        type="button"
                        aria-label="Limpiar búsqueda"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                        <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Lista (paginada) -->
            <div v-if="loadingList" class="flex justify-center py-10">
                <div class="animate-spin rounded-full h-7 w-7 border-b-2 border-[#D4AF37]"></div>
            </div>

            <!-- Sin resultados para el filtro -->
            <div v-else-if="predictions.length === 0" class="text-center py-10">
                <p class="text-gray-300 font-medium mb-1">Ninguna predicción coincide</p>
                <p class="text-xs text-gray-500 mb-4">Probá con otro filtro o cambiá la búsqueda.</p>
                <button
                    @click="clearFilters"
                    type="button"
                    class="text-sm font-semibold text-[#D4AF37] hover:text-amber-300"
                >
                    Limpiar filtros
                </button>
            </div>

            <div v-else class="space-y-2">
                <PredictionHistoryCard
                    v-for="p in predictions"
                    :key="p.id"
                    :prediction="p"
                />
            </div>

            <!-- Cargar más -->
            <div v-if="hasMore && !loadingList" class="mt-4 text-center">
                <button
                    @click="loadMore"
                    :disabled="loadingMore"
                    class="px-5 py-2 text-xs font-bold uppercase tracking-wide text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 rounded-lg transition-colors disabled:opacity-50"
                >
                    {{ loadingMore ? 'Cargando…' : 'Cargar más' }}
                </button>
            </div>
        </template>
    </div>
</template>

<script>
import PredictionHistoryCard from './PredictionHistoryCard.vue';
import { getUserPredictionsHistory, getUserPredictionsStats } from '../services/predictions.js';

const PAGE_SIZE = 20;

export default {
    name: 'PredictionsHistory',
    components: { PredictionHistoryCard },
    props: {
        userId: { type: String, required: true },
        isOwn: { type: Boolean, default: false },
        // Para racha: viene del profile (current_streak / longest_streak)
        currentStreak: { type: Number, default: 0 },
        bestStreak: { type: Number, default: 0 }
    },
    data() {
        return {
            predictions: [],
            // Stats calculadas server-side sobre TODAS las predicciones
            // (la lista de abajo se pagina; los números no dependen de ella)
            stats: {
                total: 0, resolved: 0, correct: 0, perfect: 0,
                methodHits: 0, roundHits: 0, totalXp: 0, pending: 0, accuracy: 0
            },
            page: 0,
            hasMore: false,
            loading: true,
            loadingMore: false,
            loadingList: false,
            // Filtros del historial (aplicados server-side)
            filterResult: 'all',   // all | correct | incorrect | pending
            searchQuery: '',
            searchTimeout: null,
            resultOptions: [
                { value: 'all', label: 'Todas' },
                { value: 'correct', label: 'Correctas' },
                { value: 'incorrect', label: 'Incorrectas' },
                { value: 'pending', label: 'Pendientes' }
            ]
        };
    },
    computed: {
        /** Filtros de la consulta actual. */
        activeFilters() {
            return { result: this.filterResult, search: this.searchQuery };
        },
        hasActiveFilters() {
            return this.filterResult !== 'all' || this.searchQuery.trim() !== '';
        }
    },
    async mounted() {
        await this.load();
    },
    beforeUnmount() {
        clearTimeout(this.searchTimeout);
    },
    methods: {
        async load() {
            this.loading = true;
            const [histRes, statsRes] = await Promise.all([
                getUserPredictionsHistory(this.userId, 0, PAGE_SIZE, this.activeFilters),
                getUserPredictionsStats(this.userId)
            ]);
            this.predictions = histRes.predictions;
            this.stats = statsRes.stats;
            this.page = 0;
            this.hasMore = histRes.predictions.length === PAGE_SIZE;
            this.loading = false;
        },

        /**
         * Recarga solo la lista al cambiar un filtro. Las stats de arriba son
         * globales (sobre todas las predicciones) y no dependen del filtro,
         * así que no se vuelven a pedir.
         */
        async reloadList() {
            this.loadingList = true;
            const { predictions } = await getUserPredictionsHistory(
                this.userId, 0, PAGE_SIZE, this.activeFilters
            );
            this.predictions = predictions;
            this.page = 0;
            this.hasMore = predictions.length === PAGE_SIZE;
            this.loadingList = false;
        },

        setResultFilter(value) {
            if (this.filterResult === value) return;
            this.filterResult = value;
            this.reloadList();
        },

        /** La búsqueda se debouncea para no pegarle a la base en cada tecla. */
        onSearchInput() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.reloadList(), 350);
        },

        clearFilters() {
            this.filterResult = 'all';
            this.searchQuery = '';
            clearTimeout(this.searchTimeout);
            this.reloadList();
        },

        async loadMore() {
            if (this.loadingMore || !this.hasMore) return;
            this.loadingMore = true;
            const nextPage = this.page + 1;
            const { predictions } = await getUserPredictionsHistory(
                this.userId, nextPage, PAGE_SIZE, this.activeFilters
            );
            this.predictions = [...this.predictions, ...predictions];
            this.page = nextPage;
            this.hasMore = predictions.length === PAGE_SIZE;
            this.loadingMore = false;
        }
    }
};
</script>
