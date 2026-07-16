<!--
    Un comentario individual dentro del hilo de una publicación:
    avatar + autor + contenido, con like, y edición/borrado inline
    si el comentario es propio (menú de tres puntos).
-->
<template>
    <div class="flex space-x-3 py-3">
        <RouterLink :to="`/perfil/${createSlugFromDisplayName(comment.display_name)}`">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold flex-shrink-0">
                <img
                    v-if="comment.avatar_url"
                    :src="comment.avatar_url"
                    :alt="comment.display_name"
                    class="w-full h-full rounded-full object-cover"
                    @error="handleImageError"
                />
                <span v-else class="text-xs">{{ authorInitials }}</span>
            </div>
        </RouterLink>

        <div class="flex-1 min-w-0">
            <div class="bg-zinc-800 rounded-lg px-3 py-2">
                <div class="flex items-center justify-between mb-1">
                    <RouterLink
                        :to="`/perfil/${createSlugFromDisplayName(comment.display_name)}`"
                        class="font-semibold text-sm text-white hover:text-amber-400 transition-colors"
                    >
                        {{ comment.display_name || 'Usuario' }}
                    </RouterLink>

                    <div v-if="isOwnComment && !isEditing" class="relative" ref="optionsContainer">
                        <button
                            @click="showOptions = !showOptions"
                            aria-label="Opciones del comentario"
                            class="p-1 hover:bg-zinc-700 rounded-full transition-colors"
                        >
                            <svg aria-hidden="true" class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                            </svg>
                        </button>

                        <div v-if="showOptions" class="absolute right-0 mt-2 w-32 bg-zinc-900 rounded-md shadow-lg z-10 border border-zinc-700">
                            <button
                                @click="startEditing"
                                class="block w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-zinc-800"
                            >
                                Editar
                            </button>
                            <button
                                @click="handleDelete"
                                class="block w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-900/20"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>

                <div v-if="isEditing">
                    <textarea
                        v-model="editContent"
                        @keydown.escape="cancelEditing"
                        @keydown.ctrl.enter="saveEdit"
                        @keydown.meta.enter="saveEdit"
                        aria-label="Editar comentario"
                        rows="2"
                        class="w-full px-2 py-1 bg-zinc-700 text-white border border-gray-500 rounded text-sm focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent resize-none"
                        ref="editTextarea"
                    ></textarea>
                    <div class="flex justify-end mt-2 space-x-2">
                        <button
                            @click="cancelEditing"
                            class="px-2 py-1 text-xs font-medium text-gray-300 bg-zinc-700 rounded hover:bg-gray-500 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            @click="saveEdit"
                            :disabled="!editContent.trim() || isSaving"
                            class="px-2 py-1 text-xs font-bold text-[#0D0D0D] bg-[#D4AF37] rounded hover:bg-amber-400 disabled:opacity-50 transition-colors"
                        >
                            {{ isSaving ? 'Guardando...' : 'Guardar' }}
                        </button>
                    </div>
                </div>

                <p v-else class="text-sm text-gray-300 whitespace-pre-wrap break-words">
                    {{ comment.content }}
                </p>
            </div>

            <div class="mt-1 px-3 flex items-center gap-3">
                <span class="text-xs text-gray-400">{{ formattedDate }}</span>
                <button
                    @click="handleLike"
                    :disabled="likeBusy || !currentUserId"
                    :title="!currentUserId ? 'Iniciá sesión para dar like' : ''"
                    :class="[
                        'flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50',
                        likedByMe ? 'text-[#C41E3A]' : 'text-gray-400 hover:text-pink-400'
                    ]"
                >
                    <svg aria-hidden="true" class="w-3.5 h-3.5" :fill="likedByMe ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                    <span v-if="likeCount > 0">{{ likeCount }}</span>
                    <span v-else>Me gusta</span>
                </button>
                <span v-if="likeCount >= 4" class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider" title="Comentario con engagement">
                    🔥 Engagement
                </span>
            </div>
        </div>
    </div>
</template>

<script>
import { useAuth } from '../composables/useAuth.js';
import { useProfile } from '../composables/useProfile.js';
import { createSlugFromDisplayName } from '../services/profiles.js';
import { getLikeState, toggleLike, subscribeToLikes, unsubscribeLikes, getLikesCount } from '../services/likes.js';

export default {
    name: 'CommentCard',
    props: {
        comment: {
            type: Object,
            required: true
        }
    },
    emits: ['edit', 'delete', 'save'],
    setup() {
        const { userId } = useAuth();
        const { isPro } = useProfile();
        return { currentUserId: userId, isAdmin: isPro, createSlugFromDisplayName };
    },
    data() {
        return {
            showOptions: false,
            isEditing: false,
            editContent: '',
            isSaving: false,
            // Likes
            likeCount: 0,
            likedByMe: false,
            likeBusy: false,
            likesChannel: null
        };
    },
    // AÑADIDO: Escuchar clics globales + cargar likes
    async mounted() {
        document.addEventListener('click', this.handleClickOutside);
        await this.loadLikes();
        this.likesChannel = subscribeToLikes('comment', this.comment.id, async () => {
            const { count } = await getLikesCount('comment', this.comment.id);
            this.likeCount = count;
        });
    },
    // AÑADIDO: Limpiar evento
    beforeUnmount() {
        document.removeEventListener('click', this.handleClickOutside);
        unsubscribeLikes(this.likesChannel);
    },
    computed: {
        isOwnComment() {
            return this.comment.user_id === this.currentUserId || this.isAdmin;
        },
        authorInitials() {
            if (this.comment.display_name) {
                return this.comment.display_name
                    .split(' ')
                    .map(name => name.charAt(0))
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
            }
            return 'U';
        },
        formattedDate() {
            if (!this.comment.created_at) return '';
            const date = new Date(this.comment.created_at);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffMinutes < 1) return 'Ahora';
            if (diffMinutes < 60) return `Hace ${diffMinutes}m`;
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
        // AÑADIDO: Método para cerrar si el clic es fuera del contenedor
        handleClickOutside(event) {
            if (this.showOptions && this.$refs.optionsContainer && !this.$refs.optionsContainer.contains(event.target)) {
                this.showOptions = false;
            }
        },
        startEditing() {
            this.showOptions = false;
            this.editContent = this.comment.content;
            this.isEditing = true;
            this.$nextTick(() => {
                if (this.$refs.editTextarea) {
                    this.$refs.editTextarea.focus();
                }
            });
        },
        cancelEditing() {
            this.isEditing = false;
            this.editContent = '';
        },
        async saveEdit() {
            if (!this.editContent.trim() || this.isSaving) return;
            this.isSaving = true;
            this.$emit('save', {
                commentId: this.comment.id,
                content: this.editContent.trim()
            });
        },
        resetEditState(success = true) {
            this.isSaving = false;
            if (success) {
                this.isEditing = false;
                this.editContent = '';
            }
        },
        handleDelete() {
            this.showOptions = false;
            if (confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
                this.$emit('delete', this.comment.id);
            }
        },
        handleImageError(event) {
            event.target.style.display = 'none';
        },
        async loadLikes() {
            const { count, likedByMe } = await getLikeState('comment', this.comment.id, this.currentUserId);
            this.likeCount = count;
            this.likedByMe = likedByMe;
        },
        async handleLike() {
            if (!this.currentUserId || this.likeBusy) return;
            this.likeBusy = true;
            const wasLiked = this.likedByMe;
            this.likedByMe = !wasLiked;
            this.likeCount += wasLiked ? -1 : 1;

            const { likedByMe, error } = await toggleLike('comment', this.comment.id, this.currentUserId, wasLiked);
            this.likeBusy = false;
            if (error) {
                this.likedByMe = wasLiked;
                this.likeCount += wasLiked ? 1 : -1;
                console.error('Error al togglear like:', error);
                return;
            }
            this.likedByMe = likedByMe;
        }
    }
};
</script>