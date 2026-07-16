<template>
    <div class="max-w-4xl mx-auto px-4 sm:px-0 space-y-4 sm:space-y-6">
        <!-- Header -->
        <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-white">Predicciones</h1>
            <p class="text-gray-400 text-sm mt-1">Bancate tu tarjeta. Ganá XP por cada acierto.</p>
        </div>

        <!-- Stats compactas y unificadas: Nivel · Racha · XP · HoF + link Leaderboards -->
        <div v-if="isAuthenticated && progress" class="bg-[#1C1C1C] border border-zinc-800 rounded-xl p-3 sm:p-5">
            <div class="flex items-end justify-between gap-2 mb-2">
                <div class="min-w-0">
                    <p class="text-[10px] text-gray-400 uppercase tracking-widest">Nivel</p>
                    <p class="text-sm sm:text-lg font-bold text-white truncate leading-tight">
                        <span class="text-[#D4AF37]">{{ progress.currentLevel.level }}</span> · {{ progress.currentLevel.name }}
                    </p>
                </div>
                <div class="flex items-end gap-3 sm:gap-5 shrink-0">
                    <div v-if="userStreak > 0" class="text-right leading-tight" :title="`Mejor racha: ${userBestStreak}`">
                        <p class="text-[10px] text-gray-400 uppercase tracking-widest">Racha</p>
                        <p class="text-sm sm:text-lg font-bold text-orange-400">🔥{{ userStreak }}</p>
                    </div>
                    <div class="text-right leading-tight">
                        <p class="text-[10px] text-gray-400 uppercase tracking-widest">XP</p>
                        <p class="text-sm sm:text-lg font-bold text-white">{{ userXp.toLocaleString() }}</p>
                    </div>
                    <div v-if="competitiveRating" class="text-right leading-tight" :title="(hofDivision && hofDivision.label) || 'Hall of Fame'">
                        <p class="text-[10px] text-[#D4AF37] uppercase tracking-widest">🏆 HoF</p>
                        <p class="text-sm sm:text-lg font-bold text-[#D4AF37]">{{ competitiveRating.rating }}</p>
                    </div>
                </div>
            </div>
            <div class="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-[#7A0A1C] to-[#D4AF37] transition-all" :style="{ width: progress.percent + '%' }"></div>
            </div>
            <div class="flex items-center justify-between gap-2 mt-1.5">
                <p class="text-[10px] text-gray-500 truncate min-w-0">
                    <template v-if="progress.nextLevel">{{ progress.xpInCurrent }}/{{ progress.xpForNext }} XP → {{ progress.nextLevel.name }}</template>
                    <template v-else>Nivel máximo · Champion</template>
                </p>
                <RouterLink
                    to="/clasificaciones"
                    class="shrink-0 text-[10px] font-bold text-[#D4AF37] hover:text-amber-300 uppercase tracking-wide flex items-center gap-1"
                >
                    🏆 Leaderboards
                    <svg aria-hidden="true" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
                </RouterLink>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-[#C41E3A]/10 border border-[#C41E3A]/30 rounded-lg p-4">
            <p class="text-sm text-red-300 mb-2">{{ error }}</p>
            <button @click="loadEvent" class="text-sm font-medium text-[#D4AF37] hover:text-amber-300">
                Reintentar
            </button>
        </div>

        <!-- Sin evento -->
        <div v-else-if="!event" class="bg-[#1C1C1C] border border-zinc-800 rounded-xl p-8 text-center">
            <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
                <svg aria-hidden="true" class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
            </div>
            <p class="text-gray-300 font-medium mb-1">No hay un próximo evento cargado</p>
            <p class="text-xs text-gray-500">Volvé pronto cuando se confirme la próxima cartelera.</p>
        </div>

        <!-- Evento + peleas -->
        <template v-else>
            <div class="bg-[#1C1C1C] border border-zinc-800 border-l-2 border-l-[#7A0A1C] rounded-xl p-4 sm:p-5">
                <div class="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <p class="text-[11px] text-[#D4AF37] uppercase tracking-widest font-bold">Próximo evento</p>
                        <h2 class="text-xl sm:text-2xl font-bold text-white mt-0.5">{{ event.name }}</h2>
                        <p v-if="event.dateIso" class="text-sm text-gray-400 mt-1">{{ formattedEventDate }}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-400">{{ fights.length }} pelea{{ fights.length === 1 ? '' : 's' }}</p>
                        <p v-if="event.isPpv" class="text-[10px] font-bold text-[#D4AF37] uppercase">PPV</p>
                    </div>
                </div>
            </div>

            <!-- No autenticado -->
            <div v-if="!isAuthenticated" class="bg-[#1C1C1C] border border-zinc-800 rounded-lg p-4 text-sm text-gray-300">
                <p>
                    <RouterLink to="/ingresar" class="text-[#D4AF37] font-semibold hover:underline">Iniciá sesión</RouterLink>
                    para guardar tus predicciones y ganar XP.
                </p>
            </div>

            <!-- Lista de peleas -->
            <div class="space-y-3 sm:space-y-4">
                <PredictionCard
                    v-for="fight in fights"
                    :key="fight.id"
                    :fight="fight"
                    :userId="currentUserId"
                    :isAdmin="isAdmin"
                    :existingPrediction="predictionsByFight[fight.id] || null"
                    :communityCounts="communityByFight[fight.id]?.counts || {}"
                    :communityTotal="communityByFight[fight.id]?.total || 0"
                    @saved="handlePredictionSaved"
                    @deleted="handlePredictionDeleted"
                    @resolved="handleFightResolved"
                />
            </div>
        </template>
    </div>
</template>

<script>
import PredictionCard from '../components/PredictionCard.vue';
import { useAuth } from '../composables/useAuth.js';
import { useProfile } from '../composables/useProfile.js';
import {
    loadAndSyncNextEvent,
    getUserPredictionsForFights,
    getCommunityBreakdown,
    subscribeToFightPredictions,
    subscribeToFights,
    unsubscribePredictionsChannel
} from '../services/predictions.js';
import { progressFromXp } from '../services/leveling.js';
import { getMyCompetitiveRating, divisionFromRating, progressInDivision } from '../services/hallOfFame.js';

export default {
    name: 'Predictions',
    components: { PredictionCard },
    setup() {
        const { isAuthenticated, userId } = useAuth();
        const { currentProfile, refreshCurrentProfile, isPro } = useProfile();
        return {
            isAuthenticated,
            currentUserId: userId,
            currentProfile,
            refreshCurrentProfile,
            isAdmin: isPro
        };
    },
    data() {
        return {
            event: null,
            fights: [],
            predictionsByFight: {},      // fightId → prediction row
            communityByFight: {},        // fightId → { counts, total }
            loading: true,
            error: null,
            communitySubs: [],
            fightsSub: null,
            competitiveRating: null
        };
    },
    computed: {
        userXp() {
            return Number(this.currentProfile?.xp) || 0;
        },
        userStreak() {
            return Number(this.currentProfile?.current_streak) || 0;
        },
        userBestStreak() {
            return Number(this.currentProfile?.longest_streak) || 0;
        },
        nextStreakBonus() {
            // Espejo de la lógica SQL en resolve_fight_predictions
            if (this.userStreak < 3)  return { target: 3,  xp: 10 };
            if (this.userStreak < 5)  return { target: 5,  xp: 25 };
            if (this.userStreak < 10) return { target: 10, xp: 75 };
            return null;
        },
        progress() {
            return progressFromXp(this.userXp);
        },
        hofDivision() {
            return this.competitiveRating ? divisionFromRating(this.competitiveRating.rating) : null;
        },
        hofProgress() {
            return this.competitiveRating ? progressInDivision(this.competitiveRating.rating) : null;
        },
        formattedEventDate() {
            if (!this.event?.dateIso) return '';
            return new Date(this.event.dateIso).toLocaleString('es-AR', {
                weekday: 'long', day: 'numeric', month: 'long',
                hour: '2-digit', minute: '2-digit'
            });
        }
    },
    methods: {
        async loadEvent() {
            this.loading = true;
            this.error = null;
            this.cleanupSubs();

            try {
                const { event, fights, error } = await loadAndSyncNextEvent();
                if (error) {
                    this.error = error.message || 'Error al cargar el evento';
                    return;
                }
                this.event = event;
                this.fights = fights || [];

                // Cargar mis predicciones
                if (this.currentUserId && this.fights.length > 0) {
                    const ids = this.fights.map(f => f.id);
                    const { predictions } = await getUserPredictionsForFights(this.currentUserId, ids);
                    this.predictionsByFight = {};
                    for (const p of predictions) this.predictionsByFight[p.fight_id] = p;
                }

                // Cargar consenso comunidad por pelea (en paralelo)
                await Promise.all(this.fights.map(async (f) => {
                    const { counts, total } = await getCommunityBreakdown(f.id);
                    this.communityByFight = { ...this.communityByFight, [f.id]: { counts, total } };
                }));

                // Suscribirse a actualizaciones realtime
                this.setupRealtime();
            } catch (e) {
                console.error(e);
                this.error = 'Error inesperado al cargar el evento';
            } finally {
                this.loading = false;
            }
        },
        setupRealtime() {
            // Predicciones de la comunidad (recalcular conteo cuando cambia algo)
            for (const f of this.fights) {
                const sub = subscribeToFightPredictions(f.id, async () => {
                    const { counts, total } = await getCommunityBreakdown(f.id);
                    this.communityByFight = { ...this.communityByFight, [f.id]: { counts, total } };
                });
                this.communitySubs.push(sub);
            }

            // Updates de la pelea (cambio de status / resultado cargado)
            const ids = this.fights.map(f => f.id);
            this.fightsSub = subscribeToFights(ids, async (updatedFight) => {
                const idx = this.fights.findIndex(f => f.id === updatedFight.id);
                if (idx >= 0) this.fights.splice(idx, 1, updatedFight);

                // Si se resolvió, recargar mi predicción para ver el XP
                if (updatedFight.status === 'finished' && this.currentUserId) {
                    const { predictions } = await getUserPredictionsForFights(this.currentUserId, [updatedFight.id]);
                    if (predictions[0]) this.predictionsByFight = { ...this.predictionsByFight, [updatedFight.id]: predictions[0] };
                    await this.refreshCurrentProfile();
                }
            });
        },
        handlePredictionSaved(prediction) {
            this.predictionsByFight = { ...this.predictionsByFight, [prediction.fight_id]: prediction };
        },
        handlePredictionDeleted(fightId) {
            const next = { ...this.predictionsByFight };
            delete next[fightId];
            this.predictionsByFight = next;
        },
        async handleFightResolved(updatedFight) {
            // Actualizar la pelea en el array local
            const idx = this.fights.findIndex(f => f.id === updatedFight.id);
            if (idx >= 0) this.fights.splice(idx, 1, updatedFight);

            // Releer mi predicción para esta pelea (para ver el XP awarded)
            if (this.currentUserId) {
                const { predictions } = await getUserPredictionsForFights(this.currentUserId, [updatedFight.id]);
                if (predictions[0]) {
                    this.predictionsByFight = { ...this.predictionsByFight, [updatedFight.id]: predictions[0] };
                }
            }

            // Refrescar XP del perfil
            await this.refreshCurrentProfile();
        },
        cleanupSubs() {
            for (const s of this.communitySubs) unsubscribePredictionsChannel(s);
            this.communitySubs = [];
            unsubscribePredictionsChannel(this.fightsSub);
            this.fightsSub = null;
        },
        async loadCompetitiveRating() {
            if (!this.currentUserId) return;
            const { rating } = await getMyCompetitiveRating(this.currentUserId);
            if (rating) {
                const inactive = rating.last_active_at
                    && (Date.now() - new Date(rating.last_active_at).getTime()) > 60 * 24 * 60 * 60 * 1000;
                this.competitiveRating = { ...rating, is_inactive: inactive };
            }
        }
    },
    async mounted() {
        await this.loadEvent();
        await this.loadCompetitiveRating();
    },
    beforeUnmount() {
        this.cleanupSubs();
    }
};
</script>
