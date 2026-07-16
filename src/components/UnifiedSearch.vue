<!--
    Buscador global del navbar. Busca usuarios (Supabase) y peleadores
    (API deportiva) en paralelo con debounce. Dos presentaciones:
    input inline con dropdown en desktop, y modal a pantalla completa
    en mobile (se abre con el ícono de lupa).
-->
<template>
    <!-- Desktop: input inline con dropdown -->
    <div class="hidden lg:block relative" ref="desktopContainer" data-search-dropdown>
        <div class="relative">
            <input
                v-model="query"
                @input="onSearchInput"
                @focus="desktopFocused = true"
                type="text"
                aria-label="Buscar usuarios o peleadores"
                placeholder="Buscar usuarios o peleadores..."
                class="w-64 lg:w-72 rounded-md bg-zinc-900 px-3 py-1.5 pl-10 text-sm text-white placeholder-gray-500 border border-zinc-700 focus:outline-2 focus:outline-[#D4AF37] focus:bg-zinc-800"
            />
            <svg aria-hidden="true" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
        </div>

        <div
            v-show="desktopFocused && query.length > 0"
            class="absolute right-0 mt-2 w-80 max-h-[480px] overflow-y-auto rounded-lg bg-[#1C1C1C] border border-zinc-800 shadow-xl z-[100]"
        >
            <SearchResults
                :query="query"
                :userResults="userResults"
                :fighterResults="fighterResults"
                :loadingUsers="loadingUsers"
                :loadingFighters="loadingFighters"
                @navigate="onDesktopNavigate"
            />
        </div>
    </div>

    <!-- Mobile: ícono lupa que abre overlay -->
    <button
        @click="openMobileOverlay"
        class="lg:hidden p-2 text-gray-300 hover:text-[#D4AF37] transition-colors rounded-full hover:bg-white/5"
        aria-label="Buscar"
    >
        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
    </button>

    <!-- Mobile: overlay fullscreen -->
    <Teleport to="body">
        <div v-if="mobileOpen" class="lg:hidden fixed inset-0 z-[60] bg-black flex flex-col">
            <!-- Header del overlay -->
            <div class="flex items-center gap-2 px-3 py-2 border-b border-zinc-800" style="padding-top: calc(0.5rem + env(safe-area-inset-top));">
                <button @click="closeMobileOverlay" class="p-2 text-gray-300 hover:text-white" aria-label="Cerrar">
                    <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <div class="relative flex-1">
                    <input
                        ref="mobileInput"
                        v-model="query"
                        @input="onSearchInput"
                        type="text"
                        aria-label="Buscar usuarios o peleadores"
                        placeholder="Buscar usuarios o peleadores..."
                        class="w-full bg-zinc-900 px-3 py-2 pl-10 text-sm text-white placeholder-gray-500 border border-zinc-700 rounded-lg focus:outline-2 focus:outline-[#D4AF37]"
                    />
                    <svg aria-hidden="true" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <button
                        v-if="query"
                        @click="clearQuery"
                        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        aria-label="Limpiar"
                    >
                        <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Resultados -->
            <div class="flex-1 overflow-y-auto">
                <SearchResults
                    v-if="query.length > 0"
                    :query="query"
                    :userResults="userResults"
                    :fighterResults="fighterResults"
                    :loadingUsers="loadingUsers"
                    :loadingFighters="loadingFighters"
                    @navigate="onMobileNavigate"
                />
                <div v-else class="px-5 py-12 text-center">
                    <svg aria-hidden="true" class="w-12 h-12 mx-auto mb-3 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <p class="text-sm text-gray-400">Buscá usuarios o peleadores</p>
                    <p class="text-[11px] text-gray-500 mt-1">Escribí al menos 2 caracteres</p>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script>
import { useRouter } from 'vue-router';
import SearchResults from './SearchResults.vue';
import { searchProfiles, createSlugFromDisplayName } from '../services/profiles.js';
import { searchFighters } from '../services/sports/index.js';

export default {
    name: 'UnifiedSearch',
    components: { SearchResults },
    setup() {
        const router = useRouter();
        return { router };
    },
    data() {
        return {
            query: '',
            userResults: [],
            fighterResults: [],
            loadingUsers: false,
            loadingFighters: false,
            desktopFocused: false,
            mobileOpen: false,
            searchTimeout: null,
            outsideHandler: null
        };
    },
    mounted() {
        this.outsideHandler = (e) => {
            if (this.desktopFocused && this.$refs.desktopContainer && !this.$refs.desktopContainer.contains(e.target)) {
                this.desktopFocused = false;
            }
        };
        document.addEventListener('click', this.outsideHandler);
    },
    beforeUnmount() {
        document.removeEventListener('click', this.outsideHandler);
        clearTimeout(this.searchTimeout);
    },
    methods: {
        onSearchInput() {
            clearTimeout(this.searchTimeout);
            if (this.query.trim().length < 2) {
                this.userResults = [];
                this.fighterResults = [];
                return;
            }
            this.searchTimeout = setTimeout(() => this.runSearches(), 300);
        },
        async runSearches() {
            const q = this.query.trim();
            this.loadingUsers = true;
            this.loadingFighters = true;
            const [usersRes, fightersRes] = await Promise.all([
                searchProfiles(q, 10).then(r => { this.loadingUsers = false; return r; }),
                searchFighters(q).then(r => { this.loadingFighters = false; return r; })
            ]);
            this.userResults = usersRes.profiles || [];
            this.fighterResults = (fightersRes.fighters || []).slice(0, 8);
        },
        clearQuery() {
            this.query = '';
            this.userResults = [];
            this.fighterResults = [];
            this.$nextTick(() => this.$refs.mobileInput?.focus());
        },
        openMobileOverlay() {
            this.mobileOpen = true;
            this.$nextTick(() => this.$refs.mobileInput?.focus());
        },
        closeMobileOverlay() {
            this.mobileOpen = false;
            this.query = '';
            this.userResults = [];
            this.fighterResults = [];
        },
        onDesktopNavigate(payload) {
            this.desktopFocused = false;
            this.query = '';
            this.handleNavigate(payload);
        },
        onMobileNavigate(payload) {
            this.closeMobileOverlay();
            this.handleNavigate(payload);
        },
        handleNavigate(payload) {
            if (payload.type === 'user') {
                const slug = createSlugFromDisplayName(payload.item.display_name) || payload.item.id;
                this.router.push(`/perfil/${slug}`);
            } else if (payload.type === 'fighter') {
                // La página de Peleadores recibe el ID por query string y selecciona ese peleador
                this.router.push({ path: '/peleadores', query: { id: payload.item.id } });
            }
        }
    }
};
</script>
