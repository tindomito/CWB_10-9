<template>
    <article class="bg-zinc-900 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
        <div class="p-4 sm:p-6">
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center space-x-3">
                    <RouterLink :to="`/perfil/${createSlugFromDisplayName(publication.display_name)}`">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold">
                            <img
                                v-if="avatarUrl"
                                :src="avatarUrl"
                                :alt="publication.display_name"
                                class="w-full h-full rounded-full object-cover"
                                @error="handleAvatarError"
                            />
                            <span v-else>{{ authorInitials }}</span>
                        </div>
                    </RouterLink>
                    <div>
                        <RouterLink
                            :to="`/perfil/${createSlugFromDisplayName(publication.display_name)}`"
                            class="font-semibold text-white hover:text-amber-400 transition-colors"
                        >
                            {{ publication.display_name || 'Usuario' }}
                        </RouterLink>
                        <div class="flex items-center space-x-2 text-sm text-gray-400">
                            <span>{{ formattedDate }}</span>
                            <span>•</span>
                            <span class="flex items-center">
                                {{ getCategoryIcon(publication.category) }} {{ getCategoryName(publication.category) }}
                            </span>
                        </div>
                    </div>
                </div>

                <div v-if="isOwnPublication" class="relative" ref="menuContainer">
                    <button
                        @click="showOptions = !showOptions"
                        aria-label="Opciones de la publicación"
                        class="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                    >
                        <svg aria-hidden="true" class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                        </svg>
                    </button>

                    <div v-if="showOptions" class="absolute right-0 mt-2 w-48 bg-zinc-800 rounded-md shadow-lg z-10 border border-zinc-700">
                        <button
                            @click="handleEdit"
                            class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-zinc-700"
                        >
                            Editar
                        </button>
                        <button
                            @click="handleDelete"
                            class="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>

            <div class="mb-4">
                <h2 class="text-xl font-bold text-white mb-3">
                    {{ publication.title }}
                </h2>
                <p class="text-gray-300 whitespace-pre-wrap leading-relaxed break-words">
                    {{ contenidoVisible }}
                </p>
                <button
                    v-if="mostrarBotonLeerMas"
                    type="button"
                    @click="expandido = !expandido"
                    class="mt-1 text-sm font-semibold text-[#D4AF37] hover:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded"
                >
                    {{ expandido ? 'Leer menos' : 'Leer más' }}
                </button>

                <div v-if="publication.image_url" class="mt-4">
                    <button
                        type="button"
                        @click="openImageModal"
                        aria-label="Ampliar imagen"
                        class="block w-full rounded-lg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                    >
                        <img
                            :src="publication.image_url"
                            :alt="publication.title"
                            class="w-full object-cover max-h-[500px] cursor-pointer hover:opacity-95 transition-opacity"
                            @error="handleImageError"
                        />
                    </button>
                </div>
            </div>

            <div class="flex items-center flex-wrap gap-y-2 gap-x-3 sm:gap-x-6 pt-4 border-t border-zinc-800">
                <button
                    @click="handleLike"
                    :disabled="likeBusy || !currentUserId"
                    :title="!currentUserId ? 'Iniciá sesión para dar like' : ''"
                    :class="[
                        'flex items-center space-x-1.5 sm:space-x-2 transition-colors disabled:opacity-50',
                        likedByMe ? 'text-[#C41E3A]' : 'text-gray-400 hover:text-pink-400'
                    ]"
                >
                    <svg aria-hidden="true" class="w-5 h-5" :fill="likedByMe ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                    <span class="text-sm font-medium">{{ likeCount }}</span>
                </button>

                <button
                    @click="handleBookmark"
                    :disabled="bookmarkBusy || !currentUserId"
                    :class="[
                        'flex items-center space-x-1.5 sm:space-x-2 transition-colors disabled:opacity-50',
                        saved ? 'text-[#D4AF37]' : 'text-gray-400 hover:text-yellow-400'
                    ]"
                >
                    <svg aria-hidden="true" class="w-5 h-5" :fill="saved ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                    </svg>
                    <span class="text-sm font-medium hidden sm:inline">{{ saved ? 'Guardado' : 'Guardar' }}</span>
                </button>

                <button
                    @click="handleShare"
                    class="flex items-center space-x-1.5 sm:space-x-2 text-gray-400 hover:text-amber-400 transition-colors"
                >
                    <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                    </svg>
                    <span class="text-sm font-medium hidden sm:inline">Compartir</span>
                </button>

                <button
                    @click="toggleComments"
                    class="flex items-center space-x-1.5 sm:space-x-2 text-gray-400 hover:text-blue-400 transition-colors"
                    :class="{ 'text-blue-400': showComments }"
                >
                    <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    <span class="text-sm font-medium">{{ commentsCount }}</span>
                </button>
            </div>

            <transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
            >
                <CommentsList
                    v-if="showComments"
                    :postId="publication.id"
                    @comment-added="handleCommentAdded"
                    @comment-deleted="handleCommentDeleted"
                />
            </transition>
        </div>

        <Teleport to="body">
            <transition
                enter-active-class="transition ease-out duration-200"
                enter-from-class="opacity-0"
                enter-to-class="opacity-100"
                leave-active-class="transition ease-in duration-150"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
            >
                <div
                    v-if="showImageModal"
                    @click="closeImageModal"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
                >
                    <div class="relative max-w-7xl max-h-screen">
                        <button
                            @click="closeImageModal"
                            aria-label="Cerrar imagen"
                            class="absolute top-4 right-4 p-2 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 transition-colors z-10"
                        >
                            <svg aria-hidden="true" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                        <img
                            :src="publication.image_url"
                            :alt="publication.title"
                            class="max-w-full max-h-screen object-contain"
                            @click.stop
                        />
                    </div>
                </div>
            </transition>
        </Teleport>

        <!-- Confirmación de borrado -->
        <ConfirmDialog
            :open="showDeleteConfirmation"
            title="¿Eliminar publicación?"
            message="Esta acción no se puede deshacer."
            confirmLabel="Eliminar"
            variant="danger"
            @confirm="confirmDelete"
            @cancel="cancelDelete"
        >
            <template #body>
                <div class="bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                    <p class="text-sm font-medium text-white line-clamp-2">{{ publication.title }}</p>
                    <p class="text-xs text-gray-400 mt-1">
                        {{ getCategoryIcon(publication.category) }} {{ getCategoryName(publication.category) }}
                    </p>
                </div>
            </template>
        </ConfirmDialog>
    </article>
</template>

<script>
import { useAuth } from '../composables/useAuth.js';
import { useProfile } from '../composables/useProfile.js';
import { getPublicationCategoryName, getPublicationCategoryIcon } from '../services/publications.js';
import { createSlugFromDisplayName } from '../services/profiles.js';
import { getSignedUrlForImage } from '../services/storage.js';
import { getCommentsCount } from '../services/comments.js';
import { getLikeState, toggleLike, subscribeToLikes, unsubscribeLikes } from '../services/likes.js';
import { isSaved, toggleSave } from '../services/saved-items.js';
import { shareLink, absoluteUrl } from '../services/share.js';
import { useToast } from '../composables/useToast.js';
import CommentsList from './CommentsList.vue';
import ConfirmDialog from './ConfirmDialog.vue';

/** A partir de acá el texto se recorta y aparece el botón "Leer más". */
const MAX_CARACTERES = 400;

export default {
    name: 'PublicationCard',
    components: {
        CommentsList,
        ConfirmDialog
    },
    props: {
        publication: {
            type: Object,
            required: true
        },
        /**
         * Muestra el contenido completo, sin recortar. Se usa en la vista de
         * detalle: ahí el usuario ya entró a leer la publicación, cortarla no
         * tendría sentido.
         */
        full: {
            type: Boolean,
            default: false
        }
    },
    emits: ['edit', 'delete', 'like'],
    setup() {
        const { userId } = useAuth();
        const { isPro } = useProfile();
        const { success: toastSuccess, info: toastInfo } = useToast();
        return {
            currentUserId: userId,
            isAdmin: isPro,
            getCategoryName: getPublicationCategoryName,
            getCategoryIcon: getPublicationCategoryIcon,
            createSlugFromDisplayName,
            toastSuccess,
            toastInfo
        };
    },
    data() {
        return {
            showOptions: false,
            showImageModal: false,
            showDeleteConfirmation: false,
            showComments: false,
            commentsCount: 0,
            avatarUrl: this.publication.avatar_url,
            // Likes
            likeCount: 0,
            likedByMe: false,
            likeBusy: false,
            likesChannel: null,
            // Guardar
            saved: false,
            bookmarkBusy: false,
            // Texto largo recortado con "Leer más"
            expandido: false
        };
    },
    async mounted() {
        // Lógica de Avatar
        if (this.publication.avatar_url && !this.publication.avatar_url.includes('token=')) {
            const { url, error } = await getSignedUrlForImage(this.publication.avatar_url);
            if (!error && url) {
                this.avatarUrl = url;
            }
        }
        // Cargar conteo de comentarios
        await this.loadCommentsCount();

        // Cargar estado de likes
        await this.loadLikes();
        this.likesChannel = subscribeToLikes('publication', this.publication.id, () => {
            this.refreshLikeCountOnly();
        });

        // Cargar estado de guardado
        if (this.currentUserId) {
            const { saved } = await isSaved('publication', this.publication.id, this.currentUserId);
            this.saved = saved;
        }

        // AÑADIDO: Event Listener para cerrar el menú al hacer clic fuera
        document.addEventListener('click', this.handleClickOutside);
    },
    // AÑADIDO: Limpiar el listener cuando el componente se destruye
    beforeUnmount() {
        document.removeEventListener('click', this.handleClickOutside);
        unsubscribeLikes(this.likesChannel);
    },
    computed: {
        /**
         * Recorte del texto largo. Sin esto una sola publicación puede ocupar
         * varias pantallas en el feed y tapar al resto.
         *
         * El corte busca el último espacio antes del límite para no partir una
         * palabra al medio.
         */
        contenidoVisible() {
            const texto = this.publication.content || '';
            if (!this.debeRecortar) return texto;

            const corte = texto.slice(0, MAX_CARACTERES);
            const ultimoEspacio = corte.lastIndexOf(' ');
            const limpio = ultimoEspacio > MAX_CARACTERES * 0.8
                ? corte.slice(0, ultimoEspacio)
                : corte;
            return limpio.trimEnd() + '…';
        },
        debeRecortar() {
            if (this.full || this.expandido) return false;
            return (this.publication.content || '').length > MAX_CARACTERES;
        },
        /** El botón aparece si hay algo que recortar, o para volver a plegar. */
        mostrarBotonLeerMas() {
            if (this.full) return false;
            return (this.publication.content || '').length > MAX_CARACTERES;
        },
        isOwnPublication() {
            return this.publication.user_id === this.currentUserId || this.isAdmin;
        },
        authorInitials() {
            if (this.publication.display_name) {
                return this.publication.display_name
                    .split(' ')
                    .map(name => name.charAt(0))
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
            }
            return 'U';
        },
        formattedDate() {
            if (!this.publication.created_at) return '';
            const date = new Date(this.publication.created_at);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffMinutes < 1) return 'Ahora';
            if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
            if (diffHours < 24) return `Hace ${diffHours}h`;
            if (diffDays === 1) return 'Ayer';
            if (diffDays < 7) return `Hace ${diffDays} días`;

            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    },
    methods: {
        // AÑADIDO: Lógica para detectar el clic exterior
        handleClickOutside(event) {
            if (this.showOptions && this.$refs.menuContainer && !this.$refs.menuContainer.contains(event.target)) {
                this.showOptions = false;
            }
        },
        handleEdit() {
            this.showOptions = false;
            this.$emit('edit', this.publication);
        },
        handleDelete() {
            this.showOptions = false;
            this.showDeleteConfirmation = true;
        },
        confirmDelete() {
            this.showDeleteConfirmation = false;
            this.$emit('delete', this.publication.id);
        },
        cancelDelete() {
            this.showDeleteConfirmation = false;
        },
        async loadLikes() {
            const { count, likedByMe } = await getLikeState('publication', this.publication.id, this.currentUserId);
            this.likeCount = count;
            this.likedByMe = likedByMe;
        },
        async refreshLikeCountOnly() {
            // Cuando otros usuarios likean, solo refrescar el conteo
            const { getLikesCount } = await import('../services/likes.js');
            const { count } = await getLikesCount('publication', this.publication.id);
            this.likeCount = count;
        },
        async handleLike() {
            if (!this.currentUserId || this.likeBusy) return;
            this.likeBusy = true;

            // Optimistic update
            const wasLiked = this.likedByMe;
            this.likedByMe = !wasLiked;
            this.likeCount += wasLiked ? -1 : 1;

            const { likedByMe, error } = await toggleLike('publication', this.publication.id, this.currentUserId, wasLiked);
            this.likeBusy = false;

            if (error) {
                // Revertir
                this.likedByMe = wasLiked;
                this.likeCount += wasLiked ? 1 : -1;
                console.error('Error al togglear like:', error);
                return;
            }
            this.likedByMe = likedByMe;
            this.$emit('like', this.publication.id);
        },
        async handleBookmark() {
            if (!this.currentUserId || this.bookmarkBusy) return;
            this.bookmarkBusy = true;
            const wasSaved = this.saved;
            this.saved = !wasSaved; // optimista
            const { saved, error } = await toggleSave('publication', this.publication.id, this.currentUserId, wasSaved);
            this.bookmarkBusy = false;
            if (error) {
                this.saved = wasSaved;
                return;
            }
            this.saved = saved;
            this.toastSuccess(saved ? 'Guardado en tu perfil' : 'Quitado de guardados');
        },
        async handleShare() {
            const url = absoluteUrl(`/publicaciones/${this.publication.id}`);
            const { method } = await shareLink({
                title: this.publication.title || '10-9',
                text: `Mirá esta publicación en 10-9`,
                url
            });
            if (method === 'clipboard') this.toastSuccess('Link copiado al portapapeles');
            else if (method === 'failed') this.toastInfo('No se pudo compartir');
        },
        handleAvatarError(event) {
            event.target.style.display = 'none';
        },
        handleImageError(event) {
            console.error('Error loading image:', this.publication.image_url);
            setTimeout(() => {
                event.target.src = this.publication.image_url + '?retry=' + Date.now();
            }, 1000);
        },
        openImageModal() {
            this.showImageModal = true;
        },
        closeImageModal() {
            this.showImageModal = false;
        },
        toggleComments() {
            this.showComments = !this.showComments;
        },
        async loadCommentsCount() {
            const { count } = await getCommentsCount(this.publication.id);
            this.commentsCount = count;
        },
        handleCommentAdded() {
            this.commentsCount++;
        },
        handleCommentDeleted() {
            this.commentsCount = Math.max(0, this.commentsCount - 1);
        }
    }
};
</script>