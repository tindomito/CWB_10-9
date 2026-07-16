<template>
    <div class="max-w-4xl mx-auto">
        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="bg-red-900/20 border border-red-800 rounded-md p-6">
            <div class="flex">
                <div class="ml-3">
                    <p class="text-sm font-medium text-red-300">
                        Error al cargar perfil
                    </p>
                    <div class="mt-2 text-sm text-red-400">
                        {{ error }}
                    </div>
                    <div class="mt-4">
                        <button
                            @click="loadProfile"
                            class="text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 px-4 py-2 rounded-md text-sm font-medium transition duration-200"
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Profile content -->
        <div v-else-if="profile" class="space-y-6">
        <!-- Header del perfil -->
        <ProfileHeader
        :profile="profile"
        :isOwnProfile="isOwnProfile"
        :stats="stats"
        :memberSinceFormatted="memberSinceFormatted"
        :followLoading="followLoading"
        :isFollowing="isFollowing"
        :competitiveRating="competitiveRating"
        @edit-profile="$router.push('/ajustes')"
        @follow-toggle="handleFollowToggle"
        @open-followers="openFollowsModal('followers')"
        @open-following="openFollowsModal('following')"
        />

            <!-- Pestañas de contenido -->
            <div class="bg-zinc-900 rounded-lg shadow-md overflow-hidden">
                <!-- Fila principal: contenido propio -->
                <div class="border-b border-zinc-800">
                    <nav class="flex">
                        <button
                            v-for="tab in primaryTabs"
                            :key="tab.id"
                            @click="activeTab = tab.id"
                            :class="[
                                'flex-1 sm:flex-none py-3 sm:py-4 px-2 sm:px-6 font-medium text-[13px] sm:text-sm border-b-2 transition duration-200 whitespace-nowrap',
                                activeTab === tab.id
                                    ? 'border-red-500 text-amber-400'
                                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-zinc-600'
                            ]"
                        >
                            {{ tab.name }}
                        </button>
                    </nav>
                </div>

                <!-- Fila secundaria: colecciones (rankings / guardados) -->
                <div class="flex flex-wrap gap-2 px-3 sm:px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/40">
                    <button
                        v-for="tab in secondaryTabs"
                        :key="tab.id"
                        @click="activeTab = tab.id"
                        :class="[
                            'px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5',
                            activeTab === tab.id
                                ? 'bg-[#D4AF37]/15 border-[#D4AF37]/50 text-[#D4AF37]'
                                : 'bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700'
                        ]"
                    >
                        <span>{{ tab.icon }}</span>
                        {{ tab.name }}
                    </button>
                </div>

                <!-- Contenido de las pestañas -->
                <div class="p-6">
                    <!-- Pestaña de Publicaciones -->
                    <div v-if="activeTab === 'publications'">
                        <!-- Loading de publicaciones -->
                        <div v-if="publicationsLoading" class="flex justify-center py-12">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
                        </div>

                        <!-- Error cargando publicaciones -->
                        <div v-else-if="publicationsError" class="text-center py-12">
                            <svg aria-hidden="true" class="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <p class="text-lg font-medium text-white mb-2">Error al cargar publicaciones</p>
                            <p class="text-gray-400 mb-4">{{ publicationsError }}</p>
                            <button
                                @click="loadUserPublications"
                                class="text-amber-400 hover:text-amber-300 font-medium"
                            >
                                Reintentar
                            </button>
                        </div>

                        <!-- Lista de publicaciones -->
                        <div v-else-if="publications.length > 0" class="space-y-4">
                            <PublicationCard
                                v-for="publication in publications"
                                :key="publication.id"
                                :publication="publication"
                                @edit="handleEditPublication"
                                @delete="handleDeletePublication"
                                @like="handleLikePublication"
                            />
                        </div>

                        <!-- Sin publicaciones -->
                        <div v-else class="text-center py-12 text-gray-400">
                            <svg aria-hidden="true" class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <h2 class="text-lg font-medium text-white mb-2">Sin publicaciones</h2>
                            <p class="text-gray-400">
                                {{ isOwnProfile ? 'Aún no has creado ninguna publicación.' : 'Este usuario no ha creado publicaciones.' }}
                            </p>
                            <RouterLink
                                v-if="isOwnProfile"
                                to="/publicaciones"
                                class="inline-block mt-4 text-amber-400 hover:text-amber-300 font-medium"
                            >
                                Crear mi primera publicación →
                            </RouterLink>
                        </div>
                    </div>

                    <!-- Pestaña de Predicciones (historial + stats) -->
                    <div v-else-if="activeTab === 'predictions'">
                        <PredictionsHistory
                            :key="profile.id"
                            :userId="profile.id"
                            :isOwn="isOwnProfile"
                            :currentStreak="profile.current_streak || 0"
                            :bestStreak="profile.longest_streak || 0"
                        />
                    </div>

                    <!-- Pestaña de Tarjetas (scorecards) -->
                    <div v-else-if="activeTab === 'scorecards'">
                        <div v-if="scorecardsLoading" class="flex justify-center py-12">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
                        </div>

                        <div v-else-if="scorecards.length > 0" class="space-y-3">
                            <ScorecardHistoryCard
                                v-for="sc in scorecards"
                                :key="sc.id"
                                :scorecard="sc"
                            />
                        </div>

                        <div v-else class="text-center py-12 text-gray-400">
                            <svg aria-hidden="true" class="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                            </svg>
                            <h2 class="text-lg font-medium text-white mb-2">Sin tarjetas todavía</h2>
                            <p class="text-gray-400">
                                {{ isOwnProfile ? 'Puntuá una pelea desde Predicciones para ver tus tarjetas acá.' : 'Este usuario no tiene tarjetas públicas.' }}
                            </p>
                            <RouterLink
                                v-if="isOwnProfile"
                                to="/predicciones"
                                class="inline-block mt-4 text-[#D4AF37] hover:text-amber-300 font-medium"
                            >
                                Ir a puntuar →
                            </RouterLink>
                        </div>
                    </div>

                    <!-- Pestaña de Rankings -->
                    <div v-else-if="activeTab === 'rankings'">
                        <div v-if="rankingsLoading" class="flex justify-center py-12">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
                        </div>

                        <div v-else-if="rankings.length > 0" class="space-y-3">
                            <RankingCard
                                v-for="r in rankings"
                                :key="r.id"
                                :ranking="r"
                                :showVisibility="isOwnProfile"
                            />
                        </div>

                        <div v-else class="text-center py-12 text-gray-400">
                            <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center text-2xl">🏆</div>
                            <h2 class="text-lg font-medium text-white mb-2">Sin rankings todavía</h2>
                            <p class="text-gray-400">
                                {{ isOwnProfile ? 'Armá tu primer ranking de una división desde Publicaciones.' : 'Este usuario no tiene rankings públicos.' }}
                            </p>
                            <RouterLink
                                v-if="isOwnProfile"
                                :to="{ name: 'RankingNew' }"
                                class="inline-block mt-4 text-[#D4AF37] hover:text-amber-300 font-medium"
                            >
                                Crear ranking →
                            </RouterLink>
                        </div>
                    </div>

                    <!-- Pestaña de Guardados (solo perfil propio) -->
                    <div v-else-if="activeTab === 'saved'">
                        <div v-if="savedLoading" class="flex justify-center py-12">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
                        </div>

                        <div v-else-if="savedItems.length > 0" class="space-y-3">
                            <template v-for="item in savedItems" :key="item.type + item.data.id">
                                <!-- Ranking guardado -->
                                <RankingCard v-if="item.type === 'ranking'" :ranking="item.data" />
                                <!-- Publicación guardada (card compacta) -->
                                <RouterLink
                                    v-else
                                    :to="`/publicaciones/${item.data.id}`"
                                    class="block bg-[#1C1C1C] border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
                                >
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="text-[10px] font-bold text-red-400 uppercase tracking-widest">Publicación</span>
                                        <span class="text-[10px] text-gray-500">· {{ item.data.display_name || 'Usuario' }}</span>
                                    </div>
                                    <h2 class="text-base font-bold text-white truncate">{{ item.data.title }}</h2>
                                    <p class="text-xs text-gray-400 line-clamp-2 mt-0.5">{{ item.data.content }}</p>
                                </RouterLink>
                            </template>
                        </div>

                        <div v-else class="text-center py-12 text-gray-400">
                            <svg aria-hidden="true" class="w-16 h-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                            </svg>
                            <h2 class="text-lg font-medium text-white mb-2">Sin guardados</h2>
                            <p class="text-gray-400">Tocá el ícono de guardar 🔖 en una publicación o ranking para verlo acá.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de seguidores / siguiendo -->
        <FollowsModal
            :open="followsModal.open"
            :userId="profile?.id"
            :mode="followsModal.mode"
            @close="followsModal.open = false"
        />
    </div>
</template>

<script>
import { useRoute } from 'vue-router';
import { useAuth } from '../composables/useAuth.js';
import { useExternalProfile } from '../composables/useProfile.js';
import { getProfileByIdentifier, createSlugFromDisplayName } from '../services/profiles.js';
import { getPublicationsByUser, deletePublication } from '../services/publications.js';
import { getSignedUrlForImage } from '../services/storage.js';
import { followUser, unfollowUser, checkIsFollowing, getFollowersCount, getFollowingCount } from '../services/follows.js';
import { getMyCompetitiveRating } from '../services/hallOfFame.js';
import { getScorecardHistoryByUser } from '../services/scorecards.js';
import { getRankingsByUser } from '../services/rankings.js';
import { getMySavedItems } from '../services/saved-items.js';
import RankBadge from '../components/RankBadge.vue';
import PublicationCard from '../components/PublicationCard.vue';
import ProfileHeader from '../components/ProfileHeader.vue';
import FollowsModal from '../components/FollowsModal.vue';
import ScorecardHistoryCard from '../components/ScorecardHistoryCard.vue';
import PredictionsHistory from '../components/PredictionsHistory.vue';
import RankingCard from '../components/RankingCard.vue';
import { ref, computed, onMounted, watch } from 'vue';

export default {
    name: 'Profile',
    components: {
        RankBadge,
        PublicationCard,
        ProfileHeader,
        FollowsModal,
        ScorecardHistoryCard,
        PredictionsHistory,
        RankingCard
    },
    setup() {
        const route = useRoute();
        const { userId, initialize: initializeAuth } = useAuth();
        const { getCachedProfile } = useExternalProfile();
        
        return {
            route,
            currentUserId: userId,
            getCachedProfile,
            initializeAuth
        };
    },
    data() {
        return {
            profile: null,
            loading: true,
            error: null,
            activeTab: 'publications',
            followLoading: false,
            isFollowing: false,
            publications: [],
            publicationsLoading: false,
            publicationsError: null,
            scorecards: [],
            scorecardsLoading: false,
            scorecardsLoaded: false,
            rankings: [],
            rankingsLoading: false,
            rankingsLoaded: false,
            savedItems: [],
            savedLoading: false,
            savedLoaded: false,
            stats: {
                publicationsCount: 0,
                followersCount: 0,
                followingCount: 0
            },
            tabs: [
                { id: 'publications', name: 'Publicaciones' },
                { id: 'predictions', name: 'Predicciones' },
                { id: 'scorecards', name: 'Tarjetas' },
                { id: 'rankings', name: 'Rankings' }
            ],
            followsModal: {
                open: false,
                mode: 'followers' // 'followers' | 'following'
            },
            competitiveRating: null
        };
    },
    computed: {
        //ID del usuario del perfil a mostrar
        profileIdentifier() {
            // Si hay ID en la ruta, usarlo; si no, usar el del usuario actual
            return this.route.params.id || this.currentUserId;
        },

        // Fila principal: contenido publicado por el usuario
        primaryTabs() {
            return this.tabs.filter(t => ['publications', 'predictions', 'scorecards'].includes(t.id));
        },
        // Fila secundaria: colecciones (rankings + guardados solo en perfil propio)
        secondaryTabs() {
            const result = [{ id: 'rankings', name: 'Rankings', icon: '🏆' }];
            if (this.isOwnProfile) {
                result.push({ id: 'saved', name: 'Guardados', icon: '🔖' });
            }
            return result;
        },
        
        //Si es el perfil del usuario actual
        isOwnProfile() {
            // Comparar tanto por ID como por slug del display_name actual
            if (this.profile && this.currentUserId) {
                const currentUserSlug = createSlugFromDisplayName(this.currentUserDisplayName);
                return this.profile.id === this.currentUserId || 
                       this.profileIdentifier === currentUserSlug;
            }
            return this.profileIdentifier === this.currentUserId;
        },
        
        //Display name del usuario actual
        currentUserDisplayName() {
            const { userDisplayName } = useAuth();
            return userDisplayName.value;
        },
        
        //Iniciales para el avatar
        avatarInitials() {
            if (this.profile?.display_name) {
                return this.profile.display_name
                    .split(' ')
                    .map(name => name.charAt(0))
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
            }
            return 'U';
        },
        
        //Fecha formateada de cuando se unió (formato corto)
        memberSinceFormatted() {
            if (!this.profile?.created_at) return 'N/A';
            
            const date = new Date(this.profile.created_at);
            return date.toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'short' 
            });
        },
        
        //Fecha detallada de cuando se unió
        memberSinceDetailed() {
            if (!this.profile?.created_at) return 'Fecha desconocida';
            
            const date = new Date(this.profile.created_at);
            return date.toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long',
                day: 'numeric'
            });
        },
        
        //Última actividad formateada
        lastActivityFormatted() {
            if (!this.profile?.updated_at) return 'Nunca';
            
            const date = new Date(this.profile.updated_at);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) return 'Hace 1 día';
            if (diffDays < 7) return `Hace ${diffDays} días`;
            if (diffDays < 30) return `Hace ${Math.ceil(diffDays / 7)} semanas`;
            return `Hace ${Math.ceil(diffDays / 30)} meses`;
        }
    },
    watch: {
        //Watch para detectar cambios en el parámetro de la ruta
        'route.params.id'(newId, oldId) {
            if (newId && newId !== oldId) {
                // Resetear estados
                this.publications = [];
                this.publicationsError = null;
                this.error = null;
                this.isFollowing = false;
                this.scorecards = [];
                this.scorecardsLoaded = false;
                this.rankings = [];
                this.rankingsLoaded = false;
                this.savedItems = [];
                this.savedLoaded = false;

                // Recargar perfil
                this.loadProfile();
            }
        },
        // Cargar contenido de cada pestaña al entrar (lazy)
        activeTab(tab) {
            if (tab === 'scorecards' && !this.scorecardsLoaded) {
                this.loadScorecards();
            }
            if (tab === 'rankings' && !this.rankingsLoaded) {
                this.loadRankings();
            }
            if (tab === 'saved' && !this.savedLoaded) {
                this.loadSaved();
            }
        }
    },
    methods: {
        //Carga el perfil del usuario
        async loadProfile() {
            
            // Verificar que tengamos un identificador
            if (!this.profileIdentifier) {
                this.error = 'Usuario no identificado';
                this.loading = false;
                return;
            }

            this.loading = true;
            this.error = null;
            
            try {
                
                // Usar la nueva función que maneja tanto ID como slug
                const { profile, error } = await getProfileByIdentifier(this.profileIdentifier);
                
                
                if (error) {
                    this.error = error.message || 'Error al cargar el perfil';
                    return;
                }
                
                if (!profile) {
                    this.error = 'Perfil no encontrado';
                    return;
                }
                

                // Convertir URL de avatar si existe
                if (profile.avatar_url && !profile.avatar_url.includes('token=')) {
                    const { url, error: urlError } = await getSignedUrlForImage(profile.avatar_url);
                    if (!urlError && url) {
                        profile.avatar_url = url;
                    }
                }

                this.profile = profile;

                // Actualizar URL si se accedió por slug pero queremos mostrar el slug correcto
                if (this.route.params.id !== profile.id) {
                    const correctSlug = createSlugFromDisplayName(profile.display_name);
                    if (this.route.params.id !== correctSlug) {
                        // Actualizar la URL sin recargar la página
                        const newPath = `/perfil/${correctSlug}`;
                        this.$router.replace(newPath);
                    }
                }
                
                await this.loadStats();
            } catch (error) {
                console.error('=== CATCH ERROR ===', error);
                this.error = 'Error inesperado al cargar el perfil';
            } finally {
                this.loading = false;
            }
        },
        
        //Carga las estadísticas del perfil
        async loadStats() {
            if (!this.profile?.id) return;

            // Cargar publicaciones del usuario para contar
            await this.loadUserPublications();

            // Cargar contadores de seguidores y seguidos en paralelo
            const [followersResult, followingResult] = await Promise.all([
                getFollowersCount(this.profile.id),
                getFollowingCount(this.profile.id)
            ]);

            this.stats = {
                publicationsCount: this.publications.length,
                followersCount: followersResult.count || 0,
                followingCount: followingResult.count || 0
            };

            // Cargar rating competitivo (Hall of Fame) si el perfil es level >= 10
            if (this.profile.level >= 10) {
                const { rating } = await getMyCompetitiveRating(this.profile.id);
                if (rating) {
                    const inactive = rating.last_active_at
                        && (Date.now() - new Date(rating.last_active_at).getTime()) > 60 * 24 * 60 * 60 * 1000;
                    this.competitiveRating = { ...rating, is_inactive: inactive };
                }
            } else {
                this.competitiveRating = null;
            }

            // Cargar estado de seguimiento si no es el propio perfil
            if (!this.isOwnProfile && this.currentUserId) {
                await this.loadFollowingStatus();
            }
        },

        //Carga el estado de seguimiento del usuario actual
        async loadFollowingStatus() {
            if (!this.profile?.id || !this.currentUserId) return;

            const { isFollowing } = await checkIsFollowing(this.profile.id);
            this.isFollowing = isFollowing;
        },

        //Carga las publicaciones del usuario
        async loadUserPublications() {
            if (!this.profile?.id) return;

            this.publicationsLoading = true;
            this.publicationsError = null;

            try {
                const { publications, error } = await getPublicationsByUser(this.profile.id);

                if (error) {
                    this.publicationsError = error.message || 'Error al cargar publicaciones';
                    return;
                }

                // Convertir URLs de imágenes a signed URLs
                const publicationsWithSignedUrls = await Promise.all(
                    (publications || []).map(async (publication) => {
                        if (publication.image_url && !publication.image_url.includes('token=')) {
                            const { url, error: urlError } = await getSignedUrlForImage(publication.image_url);
                            if (!urlError && url) {
                                return { ...publication, image_url: url };
                            }
                        }
                        return publication;
                    })
                );

                this.publications = publicationsWithSignedUrls;
            } catch (error) {
                console.error('Error loading user publications:', error);
                this.publicationsError = 'Error inesperado al cargar publicaciones';
            } finally {
                this.publicationsLoading = false;
            }
        },

        // Carga las tarjetas (scorecards) del usuario del perfil
        async loadScorecards() {
            if (!this.profile?.id) return;
            this.scorecardsLoading = true;
            try {
                const { scorecards } = await getScorecardHistoryByUser(this.profile.id, 30);
                this.scorecards = scorecards;
                this.scorecardsLoaded = true;
            } finally {
                this.scorecardsLoading = false;
            }
        },

        // Carga los rankings del usuario del perfil (RLS filtra privados ajenos)
        async loadRankings() {
            if (!this.profile?.id) return;
            this.rankingsLoading = true;
            try {
                const { rankings } = await getRankingsByUser(this.profile.id, 50);
                this.rankings = rankings;
                this.rankingsLoaded = true;
            } finally {
                this.rankingsLoading = false;
            }
        },

        // Carga los guardados (solo perfil propio; RLS solo devuelve los del usuario)
        async loadSaved() {
            this.savedLoading = true;
            try {
                const { items } = await getMySavedItems();
                this.savedItems = items;
                this.savedLoaded = true;
            } finally {
                this.savedLoading = false;
            }
        },

        //Maneja la eliminación de una publicación
        async handleDeletePublication(publicationId) {
            try {
                const { success, error } = await deletePublication(publicationId);

                if (error) {
                    alert('Error al eliminar la publicación');
                    return;
                }

                if (success) {
                    // Remover del array local
                    this.publications = this.publications.filter(p => p.id !== publicationId);
                    // Actualizar stats
                    this.stats.publicationsCount = this.publications.length;
                }
            } catch (error) {
                console.error('Error deleting publication:', error);
                alert('Error inesperado al eliminar la publicación');
            }
        },

        //Placeholders para acciones de publicaciones
        handleEditPublication(publication) {
        },

        handleLikePublication(publicationId) {
        },

        handleBookmarkPublication(publicationId) {
        },

        handleSharePublication(publication) {
        },
        
        //Maneja el toggle de seguir/no seguir
        async handleFollowToggle() {
            if (!this.profile?.id || !this.currentUserId) {
                console.warn('No se puede seguir: falta ID de perfil o usuario no autenticado');
                return;
            }

            this.followLoading = true;

            try {
                if (this.isFollowing) {
                    // Dejar de seguir
                    const { success, error } = await unfollowUser(this.profile.id);

                    if (error) {
                        console.error('Error al dejar de seguir:', error);
                        return;
                    }

                    if (success) {
                        this.isFollowing = false;
                        this.stats.followersCount = Math.max(0, this.stats.followersCount - 1);
                    }
                } else {
                    // Seguir
                    const { success, error } = await followUser(this.profile.id);

                    if (error) {
                        console.error('Error al seguir:', error);
                        return;
                    }

                    if (success) {
                        this.isFollowing = true;
                        this.stats.followersCount += 1;
                    }
                }
            } catch (error) {
                console.error('Error inesperado en follow toggle:', error);
            } finally {
                this.followLoading = false;
            }
        },
        
        // Maneja errores de carga de imagen
        handleImageError(event) {
            event.target.style.display = 'none';
        },

        // Abre el modal de seguidores / siguiendo
        openFollowsModal(mode) {
            if (!this.profile?.id) return;
            this.followsModal.mode = mode;
            this.followsModal.open = true;
        }
    },
    
    async mounted() {
        try {
            
            // Asegurar que la auth esté inicializada
            await this.initializeAuth();
            
            
            await this.loadProfile();
        } catch (error) {
            console.error('Error in mounted:', error);
            this.error = 'Error al cargar la página';
            this.loading = false;
        }
    }
};
</script>