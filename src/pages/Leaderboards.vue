<!--
    Tablas de posiciones de la comunidad: XP histórica, del mes, por evento
    (elegís la cartelera), entre amigos (gente que seguís) y Hall of Fame
    (rating competitivo con divisiones).
-->
<template>
    <div class="max-w-4xl mx-auto px-4 sm:px-0 space-y-4 sm:space-y-6">
        <!-- Header -->
        <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-white">Leaderboards</h1>
            <p class="text-gray-400 text-sm mt-1">Quién manda en la tarjeta. Subí, escalá, dominá.</p>
        </div>

        <!-- Tabs -->
        <div class="flex flex-wrap gap-2 border-b border-zinc-800">
            <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="selectTab(tab.id)"
                :class="[
                    'px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                    activeTab === tab.id
                        ? 'border-[#D4AF37] text-white'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                ]"
            >
                {{ tab.label }}
            </button>
        </div>

        <!-- Selector de evento (solo en modo "Por evento") -->
        <div v-if="activeTab === 'event'" class="bg-[#1C1C1C] border border-zinc-800 rounded-xl p-4">
            <label for="lb-event" class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Elegí un evento</label>
            <select
                id="lb-event"
                v-model="selectedEvent"
                @change="loadActive"
                class="w-full px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37]"
            >
                <option :value="null">— Seleccioná un evento —</option>
                <option v-for="ev in events" :key="ev.event_slug" :value="ev.event_slug">
                    {{ ev.event_name }}
                    <template v-if="ev.is_ppv"> · PPV</template>
                    ({{ ev.predictors_count }} predictors)
                </option>
            </select>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-[#C41E3A]/10 border border-[#C41E3A]/30 rounded-lg p-4">
            <p class="text-sm text-red-300 mb-2">{{ error }}</p>
            <button @click="loadActive" class="text-sm font-medium text-[#D4AF37] hover:text-amber-300">Reintentar</button>
        </div>

        <!-- Vacío -->
        <div v-else-if="rows.length === 0" class="bg-[#1C1C1C] border border-zinc-800 rounded-xl p-8 text-center">
            <p class="text-gray-300 font-medium mb-1">{{ emptyTitle }}</p>
            <p class="text-xs text-gray-500">{{ emptyMessage }}</p>
        </div>

        <!-- Lista -->
        <div v-else class="bg-[#1C1C1C] border border-zinc-800 rounded-xl overflow-hidden">
            <ul class="divide-y divide-zinc-800">
                <li
                    v-for="row in rows"
                    :key="row.user_id"
                    :class="[
                        'flex items-center gap-3 px-4 py-3 transition-colors',
                        isMe(row.user_id) ? 'bg-[#D4AF37]/5' : 'hover:bg-zinc-800/50'
                    ]"
                >
                    <!-- Rank -->
                    <div class="w-8 sm:w-10 text-center shrink-0">
                        <span :class="rankBadgeClass(row.rank)" class="text-sm sm:text-base font-bold">
                            {{ rankPrefix(row.rank) }}{{ row.rank }}
                        </span>
                    </div>

                    <!-- Avatar -->
                    <RouterLink
                        :to="`/perfil/${createSlugFromDisplayName(row.display_name) || row.user_id}`"
                        class="flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold text-sm overflow-hidden"
                    >
                        <img
                            v-if="row.avatar_url"
                            :src="row.avatar_url"
                            :alt="row.display_name"
                            class="w-full h-full object-cover"
                            @error="$event.target.style.display='none'"
                        />
                        <span v-else>{{ getInitials(row.display_name) }}</span>
                    </RouterLink>

                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                        <RouterLink
                            :to="`/perfil/${createSlugFromDisplayName(row.display_name) || row.user_id}`"
                            class="text-sm font-semibold text-white hover:text-[#D4AF37] truncate block"
                        >
                            {{ row.display_name || 'Usuario' }}
                            <span v-if="isMe(row.user_id)" class="ml-1 text-[10px] text-[#D4AF37] font-bold">(VOS)</span>
                        </RouterLink>
                        <p class="text-[11px] text-gray-400 truncate">
                            <span class="text-[#D4AF37]">L{{ row.level || 1 }}</span>
                            · {{ row.rango || 'Amateur' }}
                            <template v-if="row.current_streak > 0"> · 🔥{{ row.current_streak }}</template>
                        </p>
                    </div>

                    <!-- Métricas según el modo -->
                    <div class="text-right shrink-0">
                        <template v-if="activeTab === 'monthly'">
                            <p class="text-base sm:text-lg font-bold text-white">{{ Number(row.xp_this_month).toLocaleString() }}</p>
                            <p class="text-[10px] text-gray-400 uppercase tracking-wider">XP este mes</p>
                        </template>
                        <template v-else-if="activeTab === 'event'">
                            <p class="text-base sm:text-lg font-bold text-white">{{ row.xp_earned }} XP</p>
                            <p class="text-[10px] text-gray-400">{{ row.correct_count }}/{{ row.total_count }} aciertos</p>
                        </template>
                        <template v-else-if="activeTab === 'hof'">
                            <p class="text-base sm:text-lg font-bold text-white">{{ row.rating }}</p>
                            <p class="text-[10px] uppercase tracking-wider flex items-center justify-end gap-1">
                                <span
                                    :class="hofBadgeClass(row.division)"
                                    class="px-1.5 py-0.5 rounded border text-[9px] font-bold"
                                >
                                    {{ row.division }}
                                </span>
                                <span v-if="row.is_inactive" class="text-gray-500" title="Sin actividad hace más de 60 días">⏸️</span>
                            </p>
                        </template>
                        <template v-else>
                            <p class="text-base sm:text-lg font-bold text-white">{{ Number(row.xp).toLocaleString() }}</p>
                            <p class="text-[10px] text-gray-400 uppercase tracking-wider">XP total</p>
                        </template>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import { getInitials } from '../utils/format.js';
import { useAuth } from '../composables/useAuth.js';
import { createSlugFromDisplayName } from '../services/profiles.js';
import {
    getAlltimeLeaderboard,
    getMonthlyLeaderboard,
    getEventsWithPredictions,
    getEventLeaderboard,
    getFriendsLeaderboard
} from '../services/leaderboards.js';
import { getHallOfFameLeaderboard, divisionFromRating } from '../services/hallOfFame.js';

export default {
    name: 'Leaderboards',
    setup() {
        const { isAuthenticated, userId } = useAuth();
        return { isAuthenticated, currentUserId: userId, createSlugFromDisplayName };
    },
    data() {
        return {
            activeTab: 'alltime',
            tabs: [
                { id: 'alltime', label: 'All-time' },
                { id: 'monthly', label: 'Este mes' },
                { id: 'event',   label: 'Por evento' },
                { id: 'friends', label: 'Amigos' },
                { id: 'hof',     label: 'Hall of Fame' }
            ],
            rows: [],
            loading: false,
            error: null,
            // Solo para tab "event"
            events: [],
            selectedEvent: null
        };
    },
    computed: {
        emptyTitle() {
            if (this.activeTab === 'monthly') return 'Sin actividad este mes';
            if (this.activeTab === 'event') return this.selectedEvent ? 'Nadie predijo este evento' : 'Elegí un evento';
            if (this.activeTab === 'friends') return this.isAuthenticated ? 'Aún no seguís a nadie' : 'Iniciá sesión';
            if (this.activeTab === 'hof') return 'Hall of Fame vacío';
            return 'Sin datos todavía';
        },
        emptyMessage() {
            if (this.activeTab === 'monthly') return 'Las predicciones de este mes empezarán a aparecer apenas se resuelva el primer evento.';
            if (this.activeTab === 'event') return this.selectedEvent ? 'Cuando alguien prediga las peleas va a aparecer acá.' : 'Seleccioná uno del dropdown de arriba.';
            if (this.activeTab === 'friends') return 'Seguí usuarios para ver el ranking entre tu círculo.';
            if (this.activeTab === 'hof') return 'Aún nadie llegó al nivel 10 (Champion). Subí XP para desbloquear el modo competitivo.';
            return 'Hacé tu primera predicción y empezá a sumar XP.';
        }
    },
    methods: {
        isMe(uid) {
            return uid === this.currentUserId;
        },
        getInitials,
        rankPrefix(rank) {
            if (rank === 1) return '🥇 #';
            if (rank === 2) return '🥈 #';
            if (rank === 3) return '🥉 #';
            return '#';
        },
        rankBadgeClass(rank) {
            if (rank === 1) return 'text-[#D4AF37]';
            if (rank === 2) return 'text-gray-300';
            if (rank === 3) return 'text-orange-400';
            return 'text-gray-500';
        },
        hofBadgeClass(divisionId) {
            const d = divisionFromRating(
                divisionId === 'Bronze'  ? 1500 :
                divisionId === 'Silver'  ? 1650 :
                divisionId === 'Gold'    ? 1800 :
                divisionId === 'Diamond' ? 1950 : 2100
            );
            return d.bgClass;
        },
        async selectTab(id) {
            if (id === this.activeTab) return;
            this.activeTab = id;
            this.rows = [];
            this.error = null;
            await this.loadActive();
        },
        async loadActive() {
            this.loading = true;
            this.error = null;
            try {
                let result;
                switch (this.activeTab) {
                    case 'alltime':
                        result = await getAlltimeLeaderboard();
                        break;
                    case 'monthly':
                        result = await getMonthlyLeaderboard();
                        break;
                    case 'event':
                        // Cargar lista de eventos si no la tengo
                        if (this.events.length === 0) {
                            const { events, error: evErr } = await getEventsWithPredictions();
                            if (!evErr) this.events = events;
                            // Auto-seleccionar el más reciente
                            if (!this.selectedEvent && events.length > 0) {
                                this.selectedEvent = events[0].event_slug;
                            }
                        }
                        if (this.selectedEvent) {
                            result = await getEventLeaderboard(this.selectedEvent);
                        } else {
                            result = { rows: [], error: null };
                        }
                        break;
                    case 'friends':
                        if (!this.isAuthenticated) {
                            result = { rows: [], error: { message: 'Iniciá sesión para ver el leaderboard de amigos' } };
                            break;
                        }
                        result = await getFriendsLeaderboard(this.currentUserId);
                        break;
                    case 'hof':
                        result = await getHallOfFameLeaderboard();
                        break;
                }
                if (result.error) this.error = result.error.message || 'Error al cargar leaderboard';
                this.rows = result.rows || [];
            } catch (e) {
                this.error = 'Error inesperado';
            } finally {
                this.loading = false;
            }
        }
    },
    async mounted() {
        await this.loadActive();
    }
};
</script>
