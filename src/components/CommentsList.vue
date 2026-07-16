<template>
    <div class="border-t border-zinc-800 pt-4 mt-2">
        <!-- Formulario para nuevo comentario -->
        <div class="mb-4">
            <div class="flex space-x-3">
                <!-- Avatar del usuario actual -->
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold flex-shrink-0">
                    <span class="text-xs">{{ currentUserInitials }}</span>
                </div>

                <!-- Input de comentario -->
                <div class="flex-1">
                    <textarea
                        v-model="newCommentContent"
                        @keydown.ctrl.enter="submitComment"
                        @keydown.meta.enter="submitComment"
                        aria-label="Escribir un comentario"
                        placeholder="Escribe un comentario..."
                        rows="2"
                        class="w-full px-3 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent resize-none text-sm placeholder-gray-400"
                    ></textarea>

                    <!-- Botones de acción -->
                    <div class="flex justify-end mt-2 space-x-2">
                        <button
                            v-if="newCommentContent.trim()"
                            @click="newCommentContent = ''"
                            class="px-3 py-1.5 text-xs font-medium text-gray-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            @click="submitComment"
                            :disabled="!newCommentContent.trim() || isSubmitting"
                            class="px-3 py-1.5 text-xs font-bold text-[#0D0D0D] bg-[#D4AF37] rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <span v-if="!isSubmitting">Comentar</span>
                            <span v-else>Enviando...</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-4">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF37]"></div>
        </div>

        <!-- Lista de comentarios -->
        <div v-else-if="comments.length > 0" class="space-y-1">
            <CommentCard
                v-for="comment in comments"
                :key="comment.id"
                :ref="el => { if (el) commentRefs[comment.id] = el }"
                :comment="comment"
                @edit="handleEditComment"
                @delete="handleDeleteComment"
                @save="handleSaveComment"
            />

            <!-- Botón cargar más comentarios -->
            <div v-if="hasMore" class="pt-2">
                <button
                    @click="loadMoreComments"
                    :disabled="loadingMore"
                    class="text-xs font-medium text-amber-400 hover:text-amber-300 disabled:opacity-50"
                >
                    <span v-if="!loadingMore">Cargar más comentarios</span>
                    <span v-else>Cargando...</span>
                </button>
            </div>
        </div>

        <!-- Estado vacío -->
        <div v-else class="text-center py-4">
            <p class="text-sm text-gray-400">No hay comentarios aún. ¡Sé el primero en comentar!</p>
        </div>

        <!-- Error state -->
        <div v-if="error" class="bg-red-900/20 border border-red-700 rounded-lg p-3 mt-3">
            <p class="text-xs text-red-400">{{ error }}</p>
        </div>
    </div>
</template>

<script>
import CommentCard from './CommentCard.vue';
import {
    createComment,
    getCommentsByPost,
    deleteComment,
    updateComment,
    subscribeToCommentsChanges
} from '../services/comments.js';
import { useAuth } from '../composables/useAuth.js';
import { useToast } from '../composables/useToast.js';

export default {
    name: 'CommentsList',
    components: {
        CommentCard
    },
    props: {
        postId: {
            type: String,
            required: true
        }
    },
    emits: ['comment-added', 'comment-deleted'],
    setup() {
        const { userId } = useAuth();
        const { success, error: showError } = useToast();
        return { currentUserId: userId, toastSuccess: success, toastError: showError };
    },
    data() {
        return {
            comments: [],
            newCommentContent: '',
            loading: true,
            loadingMore: false,
            isSubmitting: false,
            error: null,
            currentPage: 0,
            pageSize: 50,
            hasMore: false,
            realtimeChannel: null,
            commentRefs: {}
        };
    },
    computed: {
        currentUserInitials() {
            return 'TU';
        }
    },
    methods: {
        /**
         * Carga los comentarios de la publicación
         */
        async loadComments(reset = false) {
            if (reset) {
                this.currentPage = 0;
                this.comments = [];
                this.hasMore = false;
                this.loading = true;
            } else {
                this.loadingMore = true;
            }

            this.error = null;

            try {
                const { comments, error } = await getCommentsByPost(
                    this.postId,
                    this.currentPage,
                    this.pageSize
                );

                if (error) {
                    this.error = error.message || 'Error al cargar comentarios';
                    return;
                }

                if (reset) {
                    this.comments = comments;
                } else {
                    this.comments = [...this.comments, ...comments];
                }

                this.hasMore = comments.length === this.pageSize;
            } catch (error) {
                console.error('Error loading comments:', error);
                this.error = 'Error inesperado al cargar comentarios';
            } finally {
                this.loading = false;
                this.loadingMore = false;
            }
        },

        /**
         * Carga más comentarios (paginación)
         */
        async loadMoreComments() {
            this.currentPage++;
            await this.loadComments();
        },

        /**
         * Envía un nuevo comentario
         */
        async submitComment() {
            if (!this.newCommentContent.trim() || this.isSubmitting) return;

            this.isSubmitting = true;
            this.error = null;

            try {
                const { comment, error } = await createComment({
                    post_id: this.postId,
                    content: this.newCommentContent.trim()
                });

                if (error) {
                    this.error = error.message || 'Error al crear comentario';
                    this.toastError(error.message || 'Error al crear comentario');
                    return;
                }

                if (comment) {
                    this.newCommentContent = '';
                    this.$emit('comment-added', comment);
                    // Notificación de éxito
                    this.toastSuccess('¡Comentario publicado exitosamente!');
                    // El comentario se agregará automáticamente por Realtime
                }
            } catch (error) {
                console.error('Error creating comment:', error);
                this.error = 'Error inesperado al crear comentario';
                this.toastError('Error inesperado al crear comentario');
            } finally {
                this.isSubmitting = false;
            }
        },

        /**
         * Maneja la edición de un comentario (legacy, no usado)
         */
        handleEditComment(comment) {
            // La edición ahora se maneja inline en CommentCard
        },

        /**
         * Guarda los cambios de un comentario editado
         */
        async handleSaveComment({ commentId, content }) {
            try {
                const { comment, error } = await updateComment(commentId, { content });

                if (error) {
                    this.toastError('Error al actualizar comentario');
                    // Resetear estado del CommentCard con error
                    if (this.commentRefs[commentId]) {
                        this.commentRefs[commentId].resetEditState(false);
                    }
                    return;
                }

                // Actualizar el comentario en la lista local
                const index = this.comments.findIndex(c => c.id === commentId);
                if (index !== -1) {
                    this.comments[index] = { ...this.comments[index], content };
                }

                // Resetear estado del CommentCard con éxito
                if (this.commentRefs[commentId]) {
                    this.commentRefs[commentId].resetEditState(true);
                }

                this.toastSuccess('Comentario actualizado');
            } catch (error) {
                console.error('Error saving comment:', error);
                this.toastError('Error inesperado al actualizar comentario');
                if (this.commentRefs[commentId]) {
                    this.commentRefs[commentId].resetEditState(false);
                }
            }
        },

        /**
         * Maneja la eliminación de un comentario
         */
        async handleDeleteComment(commentId) {
            try {
                const { success, error } = await deleteComment(commentId);

                if (error) {
                    this.error = 'Error al eliminar comentario';
                    this.toastError('Error al eliminar comentario');
                    return;
                }

                if (success) {
                    this.comments = this.comments.filter(c => c.id !== commentId);
                    this.$emit('comment-deleted', commentId);
                    this.toastSuccess('Comentario eliminado exitosamente');
                }
            } catch (error) {
                console.error('Error deleting comment:', error);
                this.error = 'Error inesperado al eliminar comentario';
                this.toastError('Error inesperado al eliminar comentario');
            }
        },

        /**
         * Configura la suscripción en tiempo real
         */
        setupRealtime() {
            this.realtimeChannel = subscribeToCommentsChanges(
                this.postId,
                // onInsert
                (newComment) => {
                    // Agregar al final del array
                    this.comments.push(newComment);
                },
                // onUpdate
                (updatedComment) => {
                    const index = this.comments.findIndex(c => c.id === updatedComment.id);
                    if (index !== -1) {
                        this.comments[index] = updatedComment;
                    }
                },
                // onDelete
                (deletedCommentId) => {
                    this.comments = this.comments.filter(c => c.id !== deletedCommentId);
                }
            );
        }
    },
    async mounted() {
        await this.loadComments(true);
        this.setupRealtime();
    },
    beforeUnmount() {
        // Limpiar suscripción de Realtime
        if (this.realtimeChannel) {
            this.realtimeChannel.unsubscribe();
        }
    }
};
</script>
