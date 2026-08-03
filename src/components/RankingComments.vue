<!--
    Hilo de comentarios de un ranking (vista RankingDetail).
    Es más simple que el de publicaciones: sin edición ni respuestas,
    solo crear/borrar, con altas y bajas en tiempo real.
-->
<template>
    <div class="bg-[#1C1C1C] border border-zinc-800 rounded-xl overflow-hidden">
        <div class="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/40">
            <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Comentarios <span class="text-[#D4AF37]">{{ comments.length }}</span>
            </p>
        </div>

        <!-- Form -->
        <form v-if="isAuthenticated" @submit.prevent="submit" class="p-3 border-b border-zinc-800 flex gap-2">
            <input
                v-model="newComment"
                maxlength="1000"
                aria-label="Escribir un comentario"
                placeholder="Escribí un comentario…"
                :disabled="sending"
                class="flex-1 px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37] disabled:opacity-50"
            />
            <button
                type="submit"
                :disabled="sending || !newComment.trim()"
                class="px-4 py-2 text-sm font-bold text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 rounded-lg disabled:opacity-40"
            >
                Enviar
            </button>
        </form>
        <div v-else class="p-3 border-b border-zinc-800 text-center">
            <RouterLink to="/ingresar" class="text-xs text-[#D4AF37] hover:underline">Iniciá sesión para comentar</RouterLink>
        </div>

        <!-- Lista -->
        <div v-if="loading" class="flex justify-center py-6">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF37]"></div>
        </div>

        <div v-else-if="comments.length === 0" class="px-4 py-8 text-center text-sm text-gray-500">
            Sin comentarios todavía. Sé el primero.
        </div>

        <ul v-else class="divide-y divide-zinc-800">
            <li v-for="c in comments" :key="c.id" class="flex gap-3 p-3">
                <RouterLink
                    :to="`/perfil/${createSlugFromDisplayName(c.display_name) || c.user_id}`"
                    class="w-8 h-8 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0"
                >
                    <img v-if="c.avatar_url" :src="c.avatar_url" :alt="c.display_name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                    <span v-else>{{ initials(c.display_name) }}</span>
                </RouterLink>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <RouterLink
                            :to="`/perfil/${createSlugFromDisplayName(c.display_name) || c.user_id}`"
                            class="text-sm font-semibold text-white hover:text-[#D4AF37] truncate"
                        >
                            {{ c.display_name || 'Usuario' }}
                        </RouterLink>
                        <span v-if="c.is_admin" class="text-[9px] font-bold text-[#D4AF37] uppercase">Admin</span>
                        <span class="text-[10px] text-gray-500">{{ formatTime(c.created_at) }}</span>
                        <button
                            v-if="canDelete(c)"
                            @click="remove(c.id)"
                            class="ml-auto text-gray-600 hover:text-[#C41E3A] shrink-0"
                            title="Borrar comentario"
                        >
                            <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                    <p class="text-sm text-gray-200 whitespace-pre-wrap break-words mt-0.5">{{ c.content }}</p>
                </div>
            </li>

            <!-- Cargar más -->
            <li v-if="hasMore" class="p-3 text-center">
                <button
                    type="button"
                    @click="loadMore"
                    :disabled="loadingMore"
                    class="text-xs font-bold uppercase tracking-wide text-[#D4AF37] hover:text-amber-300 disabled:opacity-50"
                >
                    {{ loadingMore ? 'Cargando…' : 'Cargar más comentarios' }}
                </button>
            </li>
        </ul>
    </div>
</template>

<script>
import { getInitials } from '../utils/format.js';
import { useAuth } from '../composables/useAuth.js';
import { useProfile } from '../composables/useProfile.js';
import { createSlugFromDisplayName } from '../services/profiles.js';
import {
    getRankingComments,
    createRankingComment,
    deleteRankingComment,
    subscribeToRankingComments,
    unsubscribeRankingComments
} from '../services/ranking-comments.js';

export default {
    name: 'RankingComments',
    props: {
        rankingId: { type: String, required: true }
    },
    emits: ['count'],
    setup() {
        const { isAuthenticated, userId } = useAuth();
        const { isPro: isAdmin } = useProfile();
        return { isAuthenticated, currentUserId: userId, isAdmin, createSlugFromDisplayName };
    },
    data() {
        return {
            comments: [],
            newComment: '',
            loading: true,
            loadingMore: false,
            sending: false,
            channel: null,
            page: 0,
            pageSize: 50,
            hasMore: false
        };
    },
    async mounted() {
        await this.load();
        this.channel = subscribeToRankingComments(this.rankingId, {
            onInsert: (comment) => {
                if (!this.comments.some(c => c.id === comment.id)) {
                    this.comments.push(comment);
                    this.$emit('count', this.comments.length);
                }
            },
            onDelete: (id) => {
                this.comments = this.comments.filter(c => c.id !== id);
                this.$emit('count', this.comments.length);
            }
        });
    },
    beforeUnmount() {
        unsubscribeRankingComments(this.channel);
    },
    methods: {
        async load() {
            this.loading = true;
            this.page = 0;
            const { comments } = await getRankingComments(this.rankingId, 0, this.pageSize);
            this.comments = comments;
            this.hasMore = comments.length === this.pageSize;
            this.loading = false;
            this.$emit('count', this.comments.length);
        },
        async loadMore() {
            if (this.loadingMore || !this.hasMore) return;
            this.loadingMore = true;
            const nextPage = this.page + 1;
            const { comments } = await getRankingComments(this.rankingId, nextPage, this.pageSize);
            this.comments = [...this.comments, ...comments];
            this.page = nextPage;
            this.hasMore = comments.length === this.pageSize;
            this.loadingMore = false;
            this.$emit('count', this.comments.length);
        },
        async submit() {
            if (!this.newComment.trim() || this.sending) return;
            this.sending = true;
            const content = this.newComment.trim();
            const { comment, error } = await createRankingComment(this.rankingId, content);
            this.sending = false;
            if (error) return;
            this.newComment = '';
            // Optimista (el realtime puede deduplicar)
            if (comment && !this.comments.some(c => c.id === comment.id)) {
                this.comments.push({
                    ...comment,
                    display_name: this.myName,
                    avatar_url: null,
                    is_admin: this.isAdmin
                });
                this.$emit('count', this.comments.length);
            }
        },
        async remove(id) {
            const { error } = await deleteRankingComment(id);
            if (!error) {
                this.comments = this.comments.filter(c => c.id !== id);
                this.$emit('count', this.comments.length);
            }
        },
        canDelete(c) {
            return c.user_id === this.currentUserId || this.isAdmin;
        },
        initials: (name) => getInitials(name),
        formatTime(ts) {
            if (!ts) return '';
            const diff = Math.floor((Date.now() - new Date(ts)) / 60000);
            if (diff < 1) return 'Ahora';
            if (diff < 60) return `Hace ${diff}m`;
            const h = Math.floor(diff / 60);
            if (h < 24) return `Hace ${h}h`;
            return new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
        }
    },
    computed: {
        myName() {
            const { userDisplayName } = useAuth();
            return userDisplayName.value || 'Vos';
        }
    }
};
</script>
