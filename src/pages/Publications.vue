<template>
    <div class="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-0">
        <!-- Header -->
        <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-white">Publicaciones</h1>
            <p class="text-gray-400 text-sm mt-1">Comparte artículos, tutoriales y más contenido</p>
        </div>

        <!-- Toggle principal: Publicaciones / Rankings + filtro -->
        <div class="flex items-center justify-between border-b border-zinc-800">
            <div class="flex gap-2">
                <button
                    @click="viewMode = 'posts'"
                    :class="[
                        'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                        viewMode === 'posts' ? 'border-red-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                    ]"
                >
                    Publicaciones
                </button>
                <button
                    @click="viewMode = 'rankings'"
                    :class="[
                        'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                        viewMode === 'rankings' ? 'border-[#D4AF37] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                    ]"
                >
                    Rankings
                </button>
            </div>

            <!-- Ícono de filtro (solo en Publicaciones) -->
            <button
                v-if="viewMode === 'posts'"
                @click="filterOpen = !filterOpen"
                :class="[
                    'mb-1 p-2 rounded-lg transition-colors relative',
                    filterOpen || selectedCategory !== 'all' ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                ]"
                title="Filtrar por categoría"
            >
                <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586L3.293 6.707A1 1 0 013 6V4z"></path>
                </svg>
                <span v-if="selectedCategory !== 'all'" class="absolute top-1 right-1 w-2 h-2 bg-[#D4AF37] rounded-full"></span>
            </button>
        </div>

        <!-- Panel de filtro expandible (chips) -->
        <div v-if="viewMode === 'posts' && filterOpen" class="flex flex-wrap gap-2 -mt-1">
            <button
                @click="selectCategory('all')"
                :class="chipClass('all')"
            >
                📂 Todas
            </button>
            <button
                v-for="category in categories"
                :key="category.id"
                @click="selectCategory(category.id)"
                :class="chipClass(category.id)"
            >
                {{ category.icon }} {{ category.name }}
            </button>
        </div>

        <!-- ===================== VISTA RANKINGS ===================== -->
        <template v-if="viewMode === 'rankings'">
            <!-- Crear ranking -->
            <RouterLink
                :to="{ name: 'RankingNew' }"
                class="flex items-center justify-center gap-2 w-full py-3 px-4 bg-[#D4AF37] hover:bg-amber-400 text-[#0D0D0D] font-bold rounded-lg transition-colors text-sm uppercase tracking-wide"
            >
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>
                </svg>
                Crear ranking
            </RouterLink>

            <!-- Filtro por división -->
            <div class="relative">
                <select
                    v-model="rankingDivision"
                    @change="loadPublicRankings"
                    aria-label="Filtrar rankings por división"
                    class="w-full pl-3 pr-10 py-2 text-sm border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37] bg-zinc-800 text-white cursor-pointer"
                >
                    <option :value="null">Todas las divisiones</option>
                    <option v-for="d in divisions" :key="d" :value="d">{{ d }}</option>
                </select>
            </div>

            <!-- Loading -->
            <div v-if="rankingsLoading" class="flex justify-center py-12">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]"></div>
            </div>

            <!-- Lista de rankings públicos -->
            <div v-else-if="publicRankings.length > 0" class="space-y-3">
                <RankingCard
                    v-for="r in publicRankings"
                    :key="r.id"
                    :ranking="r"
                />
            </div>

            <!-- Vacío -->
            <div v-else class="bg-[#1C1C1C] border border-zinc-800 rounded-xl p-8 text-center">
                <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center text-2xl">🏆</div>
                <p class="text-gray-300 font-medium mb-1">Todavía no hay rankings publicados</p>
                <p class="text-xs text-gray-500">Sé el primero en armar y publicar tu top de una división.</p>
            </div>
        </template>

        <!-- ===================== VISTA PUBLICACIONES ===================== -->
        <template v-else>

        <!-- Toggle de feed: Todas / Siguiendo -->
        <div v-if="isAuthenticated" class="flex gap-2">
            <button
                @click="setFeedMode('all')"
                :class="[
                    'flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                    feedMode === 'all'
                        ? 'bg-[#D4AF37] border-[#D4AF37] text-[#0D0D0D]'
                        : 'bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700'
                ]"
            >
                Todas
            </button>
            <button
                @click="setFeedMode('following')"
                :class="[
                    'flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2',
                    feedMode === 'following'
                        ? 'bg-[#D4AF37] border-[#D4AF37] text-[#0D0D0D]'
                        : 'bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700'
                ]"
            >
                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                Siguiendo
            </button>
        </div>

        <!-- Formulario para crear publicación -->
        <CreatePublication v-if="!editingPublication" @created="handlePublicationCreated" />

        <!-- Formulario para editar publicación -->
        <EditPublication
            v-if="editingPublication"
            :publication="editingPublication"
            @updated="handlePublicationUpdated"
            @cancel="handleCancelEdit"
        />

        <!-- Loading state inicial -->
        <div v-if="initialLoading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
        </div>

        <!-- Lista de publicaciones -->
        <div v-else-if="publications.length > 0" class="space-y-4 sm:space-y-6">
            <ul class="space-y-4 sm:space-y-6">
                <li v-for="publication in publications" :key="publication.id">
                    <PublicationCard
                        :publication="publication"
                        @edit="handleEditPublication"
                        @delete="handleDeletePublication"
                        @like="handleLikePublication"
                    />
                </li>
            </ul>

            <!-- Botón cargar más -->
            <div v-if="hasMore" class="flex justify-center">
                <button
                    @click="loadMore"
                    :disabled="loadingMore"
                    class="w-full sm:w-auto px-6 py-3 bg-zinc-900 border border-zinc-700 text-white rounded-lg hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm sm:text-base"
                >
                    <span v-if="!loadingMore">Cargar más publicaciones</span>
                    <span v-else class="flex items-center justify-center">
                        <svg aria-hidden="true" class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cargando...
                    </span>
                </button>
            </div>
        </div>

        <!-- Estado vacío -->
        <div v-else class="bg-zinc-900 rounded-lg shadow-md p-8 sm:p-12 text-center">
            <div class="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-zinc-800 rounded-full flex items-center justify-center">
                <svg aria-hidden="true" class="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
            </div>
            <h2 class="text-lg sm:text-xl font-semibold text-white mb-2">
                {{ emptyStateTitle }}
            </h2>
            <p class="text-sm sm:text-base text-gray-300 mb-6">
                {{ emptyStateMessage }}
            </p>
        </div>

        <!-- Error state -->
        <div v-if="error" class="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <div class="flex">
                <div class="flex-shrink-0">
                    <svg aria-hidden="true" class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium text-red-300">Error al cargar publicaciones</p>
                    <div class="mt-2 text-sm text-red-400">{{ error }}</div>
                    <button
                        @click="loadPublications"
                        class="mt-3 text-sm font-medium text-red-300 hover:text-red-200"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        </div>
        </template>
    </div>
</template>

<script>
import CreatePublication from '../components/CreatePublication.vue';
import EditPublication from '../components/EditPublication.vue';
import PublicationCard from '../components/PublicationCard.vue';
import RankingCard from '../components/RankingCard.vue';
import {
    getPublications,
    getPublication,
    deletePublication,
    subscribeToPublicationsChanges,
    PUBLICATION_CATEGORIES
} from '../services/publications.js';
import { getFollowingIds } from '../services/follows.js';
import { getSignedUrlForImage } from '../services/storage.js';
import { getPublicRankings, DIVISIONS } from '../services/rankings.js';
import { useToast } from '../composables/useToast.js';
import { useAuth } from '../composables/useAuth.js';

export default {
    name: 'Publications',
    components: {
        CreatePublication,
        EditPublication,
        PublicationCard,
        RankingCard
    },
    setup() {
        const { success, error: showError } = useToast();
        const { isAuthenticated, userId } = useAuth();
        return {
            toastSuccess: success,
            toastError: showError,
            isAuthenticated,
            currentUserId: userId
        };
    },
    data() {
        return {
            publications: [],
            selectedCategory: 'all',
            feedMode: 'all', // 'all' | 'following'
            followingIds: [],
            currentPage: 0,
            pageSize: 20,
            hasMore: true,
            initialLoading: true,
            loadingMore: false,
            error: null,
            categories: PUBLICATION_CATEGORIES,
            realtimeChannel: null,
            editingPublication: null,
            // Filtro de categorías (expandible)
            filterOpen: false,
            // Rankings
            viewMode: 'posts', // 'posts' | 'rankings'
            divisions: DIVISIONS,
            rankingDivision: null,
            publicRankings: [],
            rankingsLoading: false,
            rankingsLoaded: false
        };
    },
    computed: {
        emptyStateTitle() {
            if (this.feedMode === 'following') {
                return this.followingIds.length === 0
                    ? 'Todavía no seguís a nadie'
                    : 'Sin publicaciones de a quienes seguís';
            }
            return 'No hay publicaciones aún';
        },
        emptyStateMessage() {
            if (this.feedMode === 'following') {
                if (this.followingIds.length === 0) {
                    return 'Buscá usuarios y empezá a seguirlos para ver sus publicaciones acá.';
                }
                return this.selectedCategory === 'all'
                    ? 'A quienes seguís todavía no publicaron nada.'
                    : 'No hay publicaciones en esta categoría de a quienes seguís.';
            }
            return this.selectedCategory === 'all'
                ? 'Sé el primero en compartir un artículo o tutorial'
                : 'No hay publicaciones en esta categoría';
        }
    },
    watch: {
        viewMode(mode) {
            if (mode === 'rankings' && !this.rankingsLoaded) {
                this.loadPublicRankings();
            }
        }
    },
    methods: {
        chipClass(catId) {
            const active = this.selectedCategory === catId;
            return [
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                active
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-[#0D0D0D]'
                    : 'bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700'
            ];
        },
        selectCategory(catId) {
            this.selectedCategory = catId;
            this.handleCategoryChange();
        },

        async loadPublicRankings() {
            this.rankingsLoading = true;
            const { rankings } = await getPublicRankings({ division: this.rankingDivision, limit: 50 });
            this.publicRankings = rankings;
            this.rankingsLoading = false;
            this.rankingsLoaded = true;
        },

        async convertImageUrlsToSigned(publications) {
            const publicationsWithSignedUrls = await Promise.all(
                publications.map(async (publication) => {
                    if (publication.image_url && !publication.image_url.includes('token=')) {
                        const { url, error } = await getSignedUrlForImage(publication.image_url);
                        if (!error && url) {
                            return { ...publication, image_url: url };
                        }
                    }
                    return publication;
                })
            );
            return publicationsWithSignedUrls;
        },

        async loadPublications(reset = false) {
            if (reset) {
                this.currentPage = 0;
                this.publications = [];
                this.hasMore = true;
                this.initialLoading = true;
            } else {
                this.loadingMore = true;
            }

            this.error = null;

            try {
                const category = this.selectedCategory === 'all' ? null : this.selectedCategory;
                const userIds = this.feedMode === 'following' ? this.followingIds : null;
                const { publications, error } = await getPublications(
                    this.currentPage,
                    this.pageSize,
                    category,
                    userIds
                );

                if (error) {
                    this.error = error.message || 'Error al cargar publicaciones';
                    return;
                }

                const publicationsWithSignedUrls = await this.convertImageUrlsToSigned(publications);

                if (reset) {
                    this.publications = publicationsWithSignedUrls;
                } else {
                    this.publications = [...this.publications, ...publicationsWithSignedUrls];
                }

                this.hasMore = publications.length === this.pageSize;
            } catch (error) {
                console.error('Error loading publications:', error);
                this.error = 'Error inesperado al cargar publicaciones';
            } finally {
                this.initialLoading = false;
                this.loadingMore = false;
            }
        },

        async loadMore() {
            this.currentPage++;
            await this.loadPublications();
        },

        async handleCategoryChange() {
            await this.loadPublications(true);
        },

        async setFeedMode(mode) {
            if (mode === this.feedMode) return;
            this.feedMode = mode;

            // Refrescar la lista de IDs cada vez que se entra al modo "siguiendo"
            if (mode === 'following' && this.currentUserId) {
                const { ids } = await getFollowingIds(this.currentUserId);
                this.followingIds = ids;
            }

            await this.loadPublications(true);
        },

        passesFollowingFilter(pub) {
            // En modo "todas" siempre pasa
            if (this.feedMode !== 'following') return true;
            // Permitir mis propias publicaciones también, además de las de gente que sigo
            return (
                pub.user_id === this.currentUserId ||
                this.followingIds.includes(pub.user_id)
            );
        },

        async handlePublicationCreated(createdPublication) {

            const { publication, error } = await getPublication(createdPublication.id);

            if (error || !publication) {
                console.error('Error al obtener publicación completa:', error);
                return;
            }

            let publicationWithSignedUrl = publication;
            if (publication.image_url && !publication.image_url.includes('token=')) {
                const { url, error: urlError } = await getSignedUrlForImage(publication.image_url);
                if (!urlError && url) {
                    publicationWithSignedUrl = { ...publication, image_url: url };
                }
            }

            const matchesCategory = this.selectedCategory === 'all' || publicationWithSignedUrl.category === this.selectedCategory;
            const matchesFollowing = this.passesFollowingFilter(publicationWithSignedUrl);
            if (matchesCategory && matchesFollowing) {
                const existingIndex = this.publications.findIndex(p => p.id === publicationWithSignedUrl.id);
                if (existingIndex === -1) {
                    this.publications.unshift(publicationWithSignedUrl);
                }
            }
        },

        handleEditPublication(publication) {
            this.editingPublication = publication;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        handlePublicationUpdated(updatedPublication) {
            const index = this.publications.findIndex(p => p.id === this.editingPublication.id);
            if (index !== -1) {
                this.publications[index] = { ...this.publications[index], ...updatedPublication };
            }
            this.editingPublication = null;
        },

        handleCancelEdit() {
            this.editingPublication = null;
        },

        async handleDeletePublication(publicationId) {
            try {
                const { success, error } = await deletePublication(publicationId);

                if (error) {
                    this.toastError(error.message || 'Error al eliminar la publicación');
                    return;
                }

                if (success) {
                    this.publications = this.publications.filter(p => p.id !== publicationId);
                    this.toastSuccess('Publicación eliminada');
                }
            } catch (error) {
                console.error('Error deleting publication:', error);
                this.toastError('Error inesperado al eliminar la publicación');
            }
        },

        handleLikePublication(publicationId) {
        },

        handleBookmarkPublication(publicationId) {
        },

        handleSharePublication(publication) {
        },

        setupRealtime() {
            this.realtimeChannel = subscribeToPublicationsChanges(
                async (newPublication) => {
                    let publicationWithSignedUrl = newPublication;
                    if (newPublication.image_url && !newPublication.image_url.includes('token=')) {
                        const { url, error: urlError } = await getSignedUrlForImage(newPublication.image_url);
                        if (!urlError && url) {
                            publicationWithSignedUrl = { ...newPublication, image_url: url };
                        }
                    }

                    const matchesCategory = this.selectedCategory === 'all' || publicationWithSignedUrl.category === this.selectedCategory;
                    const matchesFollowing = this.passesFollowingFilter(publicationWithSignedUrl);
                    if (matchesCategory && matchesFollowing) {
                        const existingIndex = this.publications.findIndex(p => p.id === publicationWithSignedUrl.id);
                        if (existingIndex === -1) {
                            this.publications.unshift(publicationWithSignedUrl);
                        }
                    }
                },
                async (updatedPublication) => {
                    let publicationWithSignedUrl = updatedPublication;
                    if (updatedPublication.image_url && !updatedPublication.image_url.includes('token=')) {
                        const { url, error: urlError } = await getSignedUrlForImage(updatedPublication.image_url);
                        if (!urlError && url) {
                            publicationWithSignedUrl = { ...updatedPublication, image_url: url };
                        }
                    }

                    const index = this.publications.findIndex(p => p.id === publicationWithSignedUrl.id);
                    if (index !== -1) {
                        this.publications[index] = publicationWithSignedUrl;
                    }
                },
                (deletedPublicationId) => {
                    this.publications = this.publications.filter(p => p.id !== deletedPublicationId);
                }
            );
        }
    },
    async mounted() {
        await this.loadPublications(true);
        this.setupRealtime();
    },
    beforeUnmount() {
        if (this.realtimeChannel) {
            this.realtimeChannel.unsubscribe();
        }
    }
};
</script>
