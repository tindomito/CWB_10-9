<!--
    Home de la app: hero con el próximo evento destacado (nombre clickeable
    hacia la cartelera completa + countdown en vivo), carrusel de próximas
    peleas (cada una linkea a su tale of the tape), top de predictores
    y últimos resultados. Todo el dato deportivo sale del service de sports.
-->
<template>
    <div class="min-h-screen pb-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-10 sm:space-y-14">

            <!-- Título de página para lectores de pantalla (el home es un
                 dashboard sin título visible; cada sección tiene su propio h2) -->
            <h1 class="sr-only">Inicio</h1>

            <!-- HERO: Próximo evento destacado -->
            <section>
                <div class="flex items-center gap-2 mb-3">
                    <span class="inline-block w-1 h-5 bg-red-600 rounded-full"></span>
                    <h2 class="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest">Próximo evento destacado</h2>
                </div>

                <!-- Loading -->
                <div v-if="loadingEvent" class="bg-ufc-card rounded-2xl border border-zinc-800 h-64 sm:h-80 flex items-center justify-center">
                    <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]"></div>
                </div>

                <!-- Event card -->
                <div
                    v-else-if="nextEvent"
                    class="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-red-900/40 via-ufc-card to-ufc-black"
                >
                    <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.15),transparent_60%)]"></div>
                    <div class="absolute -top-20 -right-20 w-64 h-64 bg-red-600/20 rounded-full blur-3xl"></div>

                    <div class="relative p-5 sm:p-8 lg:p-10">
                        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div class="flex-1 min-w-0">
                                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-600/40 mb-4">
                                    <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                    <span class="text-xs font-bold text-red-300 uppercase tracking-wider">Main Event</span>
                                </div>

                                <RouterLink
                                    :to="{ name: 'EventDetail', params: { slug: nextEvent.slug } }"
                                    class="group inline-block"
                                >
                                    <h3 class="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase tracking-tight leading-none mb-3 break-words group-hover:text-amber-100 transition-colors">
                                        {{ nextEvent.name }}
                                    </h3>
                                </RouterLink>

                                <p v-if="nextEvent.mainEvent?.fighters" class="text-base sm:text-lg text-amber-400 font-semibold mb-3 truncate">
                                    {{ nextEvent.mainEvent.fighters.first?.name }}
                                    <span class="text-gray-500 mx-1">VS</span>
                                    {{ nextEvent.mainEvent.fighters.second?.name }}
                                </p>

                                <RouterLink
                                    :to="{ name: 'EventDetail', params: { slug: nextEvent.slug } }"
                                    class="inline-flex items-center gap-1.5 mb-4 text-xs font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider"
                                >
                                    Ver cartelera completa
                                    <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                </RouterLink>

                                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                                    <div class="flex items-center gap-2 text-gray-300">
                                        <svg aria-hidden="true" class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        {{ formatEventDate(nextEvent.date) }}
                                    </div>
                                    <div v-if="nextEvent.category" class="flex items-center gap-2 text-gray-300">
                                        <svg aria-hidden="true" class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                                        </svg>
                                        {{ nextEvent.category }}
                                    </div>
                                </div>
                            </div>

                            <!-- Countdown -->
                            <div class="shrink-0">
                                <p class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 lg:text-right">Empieza en</p>
                                <div class="grid grid-cols-4 gap-2 sm:gap-3">
                                    <div v-for="unit in countdownUnits" :key="unit.label" class="bg-black/60 backdrop-blur border border-amber-500/20 rounded-lg px-2 py-3 sm:px-4 sm:py-4 text-center min-w-[60px] sm:min-w-[72px]">
                                        <div class="text-2xl sm:text-3xl font-black text-amber-400 tabular-nums leading-none">{{ unit.value }}</div>
                                        <div class="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase mt-1">{{ unit.label }}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- No upcoming event fallback -->
                <div v-else class="bg-ufc-card rounded-2xl border border-zinc-800 p-8 text-center">
                    <p class="text-gray-400">No hay eventos próximos cargados.</p>
                </div>
            </section>

            <!-- PRÓXIMAS PELEAS -->
            <section>
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <span class="inline-block w-1 h-5 bg-amber-500 rounded-full"></span>
                        <h2 class="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest">Próximas peleas</h2>
                    </div>
                    <RouterLink to="/peleadores" class="text-xs text-amber-500 hover:text-amber-400 font-semibold uppercase tracking-wider">
                        Ver todo →
                    </RouterLink>
                </div>

                <div v-if="loadingUpcoming" class="flex gap-4 overflow-hidden">
                    <div v-for="n in 3" :key="n" class="shrink-0 w-72 sm:w-80 h-44 bg-ufc-card rounded-xl border border-zinc-800 animate-pulse"></div>
                </div>

                <div v-else-if="upcomingFights.length > 0" class="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-thin">
                    <RouterLink
                        v-for="fight in upcomingFights"
                        :key="fight.id"
                        :to="{ name: 'FightDetail', params: { fightId: fight.id } }"
                        class="block shrink-0 w-72 sm:w-80 bg-ufc-card rounded-xl border border-zinc-800 hover:border-amber-500/40 transition-colors snap-start overflow-hidden active:scale-[0.99]"
                    >
                        <div class="bg-gradient-to-r from-red-900/30 to-transparent px-4 py-2 border-b border-zinc-800">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-bold text-amber-400 uppercase tracking-wider truncate">{{ fight.category || 'MMA' }}</span>
                                <span v-if="fight.is_main" class="text-[10px] font-bold text-red-400 uppercase">Main</span>
                            </div>
                        </div>

                        <div class="p-4">
                            <div class="flex items-center justify-between gap-2 mb-3">
                                <div class="flex-1 min-w-0 text-left">
                                    <p class="text-sm font-bold text-white truncate">{{ fight.fighters?.first?.name || 'TBD' }}</p>
                                </div>
                                <span class="text-xs font-black text-red-500 px-2">VS</span>
                                <div class="flex-1 min-w-0 text-right">
                                    <p class="text-sm font-bold text-white truncate">{{ fight.fighters?.second?.name || 'TBD' }}</p>
                                </div>
                            </div>

                            <div class="pt-3 border-t border-zinc-800 flex items-center justify-between">
                                <div class="flex items-center gap-1.5 text-xs text-gray-400">
                                    <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    {{ formatShortDate(fight.date) }}
                                </div>
                                <span class="text-[10px] font-bold text-gray-500 uppercase">{{ fight.time || '' }} UTC</span>
                            </div>
                        </div>
                    </RouterLink>
                </div>

                <div v-else class="bg-ufc-card rounded-xl border border-zinc-800 p-6 text-center text-sm text-gray-500">
                    No hay peleas próximas cargadas.
                </div>
            </section>

            <!-- TOP PREDICTORES (All-Time) -->
            <section>
                <div class="flex items-center justify-between gap-2 mb-4">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="inline-block w-1 h-5 bg-amber-500 rounded-full"></span>
                        <h2 class="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest truncate">Top predictores · All-Time</h2>
                    </div>
                    <RouterLink
                        to="/clasificaciones"
                        class="shrink-0 text-[10px] font-bold text-[#D4AF37] hover:text-amber-300 uppercase tracking-wide"
                    >
                        Ver todo →
                    </RouterLink>
                </div>

                <div class="bg-ufc-card rounded-2xl border border-zinc-800 overflow-hidden">
                    <!-- Loading -->
                    <div v-if="loadingPredictors" class="flex justify-center py-10">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
                    </div>

                    <!-- Vacío -->
                    <div v-else-if="topPredictors.length === 0" class="px-5 py-8 text-center text-sm text-gray-500">
                        Todavía no hay predictores con XP. ¡Sé el primero!
                    </div>

                    <ul v-else>
                        <li
                            v-for="(predictor, idx) in topPredictors"
                            :key="predictor.user_id"
                        >
                            <RouterLink
                                :to="`/perfil/${slugFor(predictor)}`"
                                class="flex items-center gap-4 px-5 py-4 border-b border-zinc-800 last:border-b-0 hover:bg-zinc-800/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-inset"
                            >
                                <div
                                    class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-black text-base"
                                    :class="rankBadgeClass(idx)"
                                >
                                    {{ idx + 1 }}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-white font-semibold truncate">{{ predictor.display_name || 'Usuario' }}</p>
                                    <p class="text-xs text-gray-500 truncate">
                                        {{ predictor.rango || 'Amateur' }}<span v-if="predictor.level"> · Nivel {{ predictor.level }}</span>
                                    </p>
                                </div>
                                <div class="text-right shrink-0">
                                    <p class="text-amber-400 font-black text-lg leading-none tabular-nums">{{ Number(predictor.xp).toLocaleString() }}</p>
                                    <p class="text-[10px] text-gray-500 uppercase tracking-wider mt-1">XP</p>
                                </div>
                            </RouterLink>
                        </li>
                    </ul>
                </div>
            </section>

            <!-- ÚLTIMOS RESULTADOS -->
            <section>
                <div class="flex items-center gap-2 mb-4">
                    <span class="inline-block w-1 h-5 bg-red-600 rounded-full"></span>
                    <h2 class="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest">Últimos resultados</h2>
                </div>

                <div v-if="loadingResults" class="space-y-3">
                    <div v-for="n in 3" :key="n" class="h-20 bg-ufc-card rounded-xl border border-zinc-800 animate-pulse"></div>
                </div>

                <div v-else-if="recentResults.length > 0" class="space-y-3">
                    <RouterLink
                        v-for="fight in recentResults"
                        :key="fight.id"
                        :to="{ name: 'FightDetail', params: { fightId: fight.id } }"
                        class="block bg-ufc-card rounded-xl border border-zinc-800 hover:border-[#D4AF37]/50 transition-colors p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                    >
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="text-[10px] text-gray-500 uppercase tracking-wider truncate">{{ fight.category || 'MMA' }}</span>
                            <span class="text-[10px] text-gray-500">{{ formatShortDate(fight.date) }}</span>
                        </div>

                        <div class="flex items-center gap-3">
                            <div class="flex-1 min-w-0" :class="{ 'opacity-50': !fight.fighters?.first?.winner }">
                                <p
                                    class="text-sm font-semibold truncate"
                                    :class="fight.fighters?.first?.winner ? 'text-green-400' : 'text-white'"
                                >
                                    {{ fight.fighters?.first?.name || 'TBD' }}
                                </p>
                                <p v-if="fight.fighters?.first?.winner" class="text-[10px] text-green-500 font-bold uppercase">Win</p>
                            </div>

                            <span class="text-xs font-black text-gray-600">VS</span>

                            <div class="flex-1 min-w-0 text-right" :class="{ 'opacity-50': !fight.fighters?.second?.winner }">
                                <p
                                    class="text-sm font-semibold truncate"
                                    :class="fight.fighters?.second?.winner ? 'text-green-400' : 'text-white'"
                                >
                                    {{ fight.fighters?.second?.name || 'TBD' }}
                                </p>
                                <p v-if="fight.fighters?.second?.winner" class="text-[10px] text-green-500 font-bold uppercase text-right">Win</p>
                            </div>
                        </div>
                    </RouterLink>
                </div>

                <div v-else class="bg-ufc-card rounded-xl border border-zinc-800 p-6 text-center text-sm text-gray-500">
                    Aún no hay resultados cargados.
                </div>
            </section>

        </div>

        <!-- Onboarding de preferencias (primera vez con sesión) -->
        <OnboardingPreferencesModal
            :open="showOnboarding"
            @close="showOnboarding = false"
            @saved="onOnboardingSaved"
        />
    </div>
</template>

<script>
import {
    getNextEventForOrg,
    getUpcomingFights,
    getRecentResults,
    getHomeEventOrg,
    isOnboardingDone
} from '../services/sports/index.js';
import { getAlltimeLeaderboard } from '../services/leaderboards.js';
import { createSlugFromDisplayName } from '../services/profiles.js';
import { formatFullDate, formatShortDate } from '../utils/format.js';
import { useAuth } from '../composables/useAuth.js';
import OnboardingPreferencesModal from '../components/OnboardingPreferencesModal.vue';

export default {
    name: 'Home',
    components: { OnboardingPreferencesModal },
    setup() {
        const { isAuthenticated } = useAuth();
        return { isAuthenticated };
    },
    data() {
        return {
            nextEvent: null,
            upcomingFights: [],
            recentResults: [],
            loadingEvent: true,
            loadingUpcoming: true,
            loadingResults: true,
            homeEventOrg: getHomeEventOrg(),
            now: 0,
            countdownInterval: null,
            topPredictors: [],
            loadingPredictors: true,
            showOnboarding: false
        };
    },
    computed: {
        countdownUnits() {
            if (!this.nextEvent?.timestamp) {
                return [
                    { label: 'Días', value: '00' },
                    { label: 'Horas', value: '00' },
                    { label: 'Min', value: '00' },
                    { label: 'Seg', value: '00' }
                ];
            }
            const diff = Math.max(0, this.nextEvent.timestamp * 1000 - this.now);
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            const pad = (n) => String(n).padStart(2, '0');
            return [
                { label: 'Días', value: pad(days) },
                { label: 'Horas', value: pad(hours) },
                { label: 'Min', value: pad(minutes) },
                { label: 'Seg', value: pad(seconds) }
            ];
        }
    },
    async mounted() {
        this.now = Date.now();
        this.countdownInterval = setInterval(() => {
            this.now = Date.now();
        }, 1000);

        await this.loadAll();

        // Onboarding: solo la primera vez, y solo con sesión iniciada.
        if (this.isAuthenticated && !isOnboardingDone()) {
            this.showOnboarding = true;
        }
    },
    beforeUnmount() {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
    },
    methods: {
        formatEventDate: formatFullDate,
        formatShortDate,
        async loadAll() {
            this.homeEventOrg = getHomeEventOrg();
            this.loadingEvent = true;
            this.loadingUpcoming = true;
            this.loadingResults = true;

            const [eventRes, upcomingRes, resultsRes, predictorsRes] = await Promise.all([
                getNextEventForOrg(this.homeEventOrg),
                getUpcomingFights(8),
                getRecentResults(8),
                getAlltimeLeaderboard(3)
            ]);

            this.topPredictors = predictorsRes.rows || [];
            this.loadingPredictors = false;

            this.nextEvent = eventRes.event;
            this.loadingEvent = false;
            this.now = Date.now();

            this.upcomingFights = upcomingRes.fights;
            this.loadingUpcoming = false;

            this.recentResults = resultsRes.fights;
            this.loadingResults = false;
        },
        onOnboardingSaved() {
            // Cambió qué org destacar y qué orgs mostrar: recargamos el Home.
            this.loadAll();
        },
        rankBadgeClass(idx) {
            if (idx === 0) return 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/30';
            if (idx === 1) return 'bg-gradient-to-br from-zinc-300 to-zinc-500 text-black';
            return 'bg-gradient-to-br from-amber-700 to-amber-900 text-white';
        },
        slugFor(predictor) {
            return createSlugFromDisplayName(predictor.display_name) || predictor.user_id;
        }
    }
};
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
    height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
    background: #2a2a2a;
    border-radius: 3px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #d4af37;
}
</style>
