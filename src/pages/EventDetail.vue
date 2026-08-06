<template>
    <div class="min-h-screen pb-12">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 space-y-6">

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

            <!-- Error / vacío -->
            <div v-else-if="!event" class="bg-ufc-card rounded-2xl border border-zinc-800 p-8 text-center">
                <p class="text-gray-300 font-medium mb-1">No encontramos ese evento</p>
                <p class="text-xs text-gray-500">Puede que ya no esté disponible en el dataset actual.</p>
            </div>

            <template v-else>
                <!-- Header del evento -->
                <section class="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-red-900/40 via-ufc-card to-ufc-black">
                    <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(212,175,55,0.15),transparent_60%)]"></div>
                    <div class="relative p-5 sm:p-8">
                        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-600/40 mb-3">
                            <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            <span class="text-xs font-bold text-red-300 uppercase tracking-wider">
                                {{ event.isPpv ? 'PPV' : 'Cartelera' }}
                            </span>
                        </div>
                        <h1 class="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight leading-none mb-3 break-words">
                            {{ event.name }}
                        </h1>
                        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                            <div v-if="event.dateIso" class="flex items-center gap-2 text-gray-300">
                                <svg aria-hidden="true" class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                {{ formatEventDate(event.dateIso) }}
                            </div>
                            <div class="flex items-center gap-2 text-gray-300">
                                <svg aria-hidden="true" class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                </svg>
                                {{ fights.length }} pelea{{ fights.length !== 1 ? 's' : '' }}
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Cartelera -->
                <section class="space-y-3">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="inline-block w-1 h-5 bg-amber-500 rounded-full"></span>
                        <h2 class="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest">Cartelera · tocá una pelea para el tale of the tape</h2>
                    </div>

                    <ul class="space-y-3">
                    <li v-for="(fight, idx) in fights" :key="fight.id">
                    <RouterLink
                        :to="{ name: 'FightDetail', params: { fightId: fight.providerFightId } }"
                        class="block bg-ufc-card rounded-xl border border-zinc-800 hover:border-amber-500/40 transition-colors overflow-hidden active:scale-[0.99]"
                    >
                        <div class="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-gradient-to-r from-red-900/20 to-transparent">
                            <span class="text-[10px] font-bold text-amber-400 uppercase tracking-wider truncate">
                                {{ fight.weightClass || 'MMA' }}
                            </span>
                            <span v-if="idx === 0" class="text-[10px] font-bold text-red-400 uppercase">Main Event</span>
                            <span v-else-if="fight.isMainEvent" class="text-[10px] font-bold text-amber-400/80 uppercase">Main Card</span>
                        </div>

                        <div class="p-4 flex items-center gap-3">
                            <!-- Peleador 1 -->
                            <div class="flex-1 flex items-center gap-3 min-w-0">
                                <div class="w-12 h-12 rounded-full overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0">
                                    <img v-if="fight.fighter1.photo" :src="fight.fighter1.photo" :alt="fight.fighter1.name" class="w-full h-full object-cover" @error="onFighterImageError" />
                                </div>
                                <p class="text-sm font-bold text-white truncate">{{ fight.fighter1.name || 'TBD' }}</p>
                            </div>

                            <span class="shrink-0 text-xs font-black text-red-500 px-1">VS</span>

                            <!-- Peleador 2 -->
                            <div class="flex-1 flex items-center gap-3 justify-end min-w-0 text-right">
                                <p class="text-sm font-bold text-white truncate">{{ fight.fighter2.name || 'TBD' }}</p>
                                <div class="w-12 h-12 rounded-full overflow-hidden border border-zinc-700 bg-zinc-800 shrink-0">
                                    <img v-if="fight.fighter2.photo" :src="fight.fighter2.photo" :alt="fight.fighter2.name" class="w-full h-full object-cover" @error="onFighterImageError" />
                                </div>
                            </div>

                            <svg aria-hidden="true" class="w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </div>
                    </RouterLink>
                    </li>
                    </ul>
                </section>
            </template>
        </div>
    </div>
</template>

<script>
import { getEventBySlug } from '../services/sports/index.js';
import { formatFullDate } from '../utils/format.js';
import { onFighterImageError } from '../utils/images.js';

export default {
    name: 'EventDetail',
    data() {
        return {
            event: null,
            fights: [],
            loading: true
        };
    },
    methods: {
        onFighterImageError,
        async load() {
            this.loading = true;
            const slug = this.$route.params.slug;
            const { event, fights } = await getEventBySlug(slug);
            this.event = event;
            this.fights = fights || [];
            this.loading = false;
        },
        goBack() {
            if (window.history.length > 1) this.$router.back();
            else this.$router.push({ name: 'Home' });
        },
        formatEventDate: formatFullDate
    },
    watch: {
        '$route.params.slug'() {
            this.load();
        }
    },
    mounted() {
        this.load();
    }
};
</script>
