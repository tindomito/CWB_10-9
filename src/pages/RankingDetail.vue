<!--
    Vista de un ranking de peleadores (/rankings/:id): la lista completa
    con posiciones, likes, comentarios y compartir. Si el ranking es propio,
    suma los botones Editar y Borrar.
-->
<template>
    <div class="max-w-2xl mx-auto px-4 sm:px-0 space-y-4">
        <button @click="$router.back()" class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
            </svg>
            Volver
        </button>

        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]"></div>
        </div>

        <div v-else-if="error" class="bg-[#C41E3A]/10 border border-[#C41E3A]/30 rounded-lg p-4 text-center">
            <p class="text-sm text-red-300">{{ error }}</p>
        </div>

        <template v-else-if="ranking">
            <!-- Header -->
            <div class="bg-gradient-to-br from-[#7A0A1C]/40 via-[#1C1C1C] to-[#1C1C1C] border border-zinc-800 rounded-xl p-4">
                <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                        <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Ranking · División</p>
                        <h1 class="text-2xl font-bold text-white">{{ ranking.division }}</h1>
                        <div v-if="ranking.author_display_name" class="flex items-center gap-1.5 mt-2">
                            <RouterLink
                                :to="`/perfil/${authorSlug}`"
                                class="flex items-center gap-1.5 group"
                            >
                                <div class="w-6 h-6 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white text-[9px] font-bold overflow-hidden">
                                    <img v-if="ranking.author_avatar_url" :src="ranking.author_avatar_url" :alt="ranking.author_display_name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                                    <span v-else>{{ initials(ranking.author_display_name) }}</span>
                                </div>
                                <span class="text-xs text-gray-300 group-hover:text-[#D4AF37]">{{ ranking.author_display_name }}</span>
                            </RouterLink>
                        </div>
                    </div>
                    <span
                        :class="ranking.is_public ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' : 'bg-zinc-800 text-gray-400 border-zinc-700'"
                        class="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
                    >
                        {{ ranking.is_public ? 'Público' : 'Privado' }}
                    </span>
                </div>
            </div>

            <!-- Lista -->
            <div class="bg-[#1C1C1C] border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800">
                <div
                    v-for="(entry, idx) in ranking.entries"
                    :key="idx"
                    class="flex items-center gap-3 px-3 py-2.5"
                    :class="idx === 0 ? 'bg-[#D4AF37]/5' : ''"
                >
                    <span class="w-9 text-center font-bold shrink-0" :class="idx === 0 ? 'text-[#D4AF37]' : 'text-gray-500'">
                        {{ idx === 0 ? '👑' : '#' + idx }}
                    </span>
                    <div class="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center"
                         :class="idx === 0 ? 'border-[#D4AF37]/50' : ''">
                        <img v-if="entry.photo" :src="entry.photo" :alt="entry.name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                        <span v-else class="text-[10px] text-gray-500 font-bold">{{ initials(entry.name) }}</span>
                    </div>
                    <span class="text-sm font-medium text-white truncate">{{ entry.name }}</span>
                    <span v-if="idx === 0" class="ml-auto text-[10px] font-bold text-[#D4AF37] uppercase shrink-0">Campeón</span>
                </div>
            </div>

            <!-- Barra de acciones (like / comentar / guardar / compartir) -->
            <div class="flex items-center flex-wrap gap-x-4 gap-y-2 bg-[#1C1C1C] border border-zinc-800 rounded-xl px-4 py-3">
                <button
                    @click="handleLike"
                    :disabled="likeBusy || !currentUserId"
                    :title="!currentUserId ? 'Iniciá sesión para dar like' : ''"
                    :class="[
                        'flex items-center gap-1.5 transition-colors disabled:opacity-50',
                        likedByMe ? 'text-[#C41E3A]' : 'text-gray-400 hover:text-pink-400'
                    ]"
                >
                    <svg aria-hidden="true" class="w-5 h-5" :fill="likedByMe ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                    <span class="text-sm font-medium">{{ likeCount }}</span>
                </button>

                <button
                    @click="showComments = !showComments"
                    :class="['flex items-center gap-1.5 transition-colors', showComments ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400']"
                >
                    <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    <span class="text-sm font-medium">{{ commentsCount }}</span>
                </button>

                <button
                    @click="handleSave"
                    :disabled="bookmarkBusy || !currentUserId"
                    :class="[
                        'flex items-center gap-1.5 transition-colors disabled:opacity-50',
                        saved ? 'text-[#D4AF37]' : 'text-gray-400 hover:text-yellow-400'
                    ]"
                >
                    <svg aria-hidden="true" class="w-5 h-5" :fill="saved ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                    </svg>
                    <span class="text-sm font-medium hidden sm:inline">{{ saved ? 'Guardado' : 'Guardar' }}</span>
                </button>

                <button
                    @click="handleShare"
                    class="flex items-center gap-1.5 text-gray-400 hover:text-[#D4AF37] transition-colors"
                >
                    <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                    </svg>
                    <span class="text-sm font-medium hidden sm:inline">Compartir</span>
                </button>
            </div>

            <!-- Comentarios -->
            <RankingComments
                v-if="showComments"
                :rankingId="ranking.id"
                @count="commentsCount = $event"
            />

            <!-- Acciones del dueño -->
            <div v-if="isOwner" class="flex gap-2">
                <RouterLink
                    :to="{ name: 'RankingEdit', params: { id: ranking.id } }"
                    class="flex-1 py-2.5 px-4 text-center border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 font-bold rounded-lg text-sm uppercase tracking-wide"
                >
                    Editar
                </RouterLink>
                <button
                    @click="confirmDelete"
                    :disabled="deleting"
                    class="flex-1 py-2.5 px-4 border border-[#C41E3A]/40 text-[#C41E3A] hover:bg-[#C41E3A]/10 font-bold rounded-lg text-sm uppercase tracking-wide disabled:opacity-50"
                >
                    {{ deleting ? 'Borrando…' : 'Borrar' }}
                </button>
            </div>

            <p class="text-[11px] text-gray-600 text-center">Actualizado el {{ formattedDate }}</p>
        </template>

        <!-- Confirmación borrar -->
        <ConfirmDialog
            :open="showDeleteDialog"
            title="¿Borrar ranking?"
            message="Esta acción no se puede deshacer."
            confirmLabel="Borrar"
            variant="danger"
            :busy="deleting"
            @cancel="showDeleteDialog = false"
            @confirm="doDelete"
        />
    </div>
</template>

<script>
import { getInitials } from '../utils/format.js';
import { useAuth } from '../composables/useAuth.js';
import { useToast } from '../composables/useToast.js';
import { getRanking, deleteRanking } from '../services/rankings.js';
import { createSlugFromDisplayName } from '../services/profiles.js';
import { getLikeState, toggleLike, getLikesCount, subscribeToLikes, unsubscribeLikes } from '../services/likes.js';
import { getRankingCommentsCount } from '../services/ranking-comments.js';
import { isSaved, toggleSave } from '../services/saved-items.js';
import { shareLink, absoluteUrl } from '../services/share.js';
import ConfirmDialog from '../components/ConfirmDialog.vue';
import RankingComments from '../components/RankingComments.vue';

export default {
    name: 'RankingDetail',
    components: { ConfirmDialog, RankingComments },
    setup() {
        const { userId } = useAuth();
        const { info } = useToast();
        return { currentUserId: userId, toastInfo: info };
    },
    data() {
        return {
            ranking: null,
            loading: true,
            error: null,
            showDeleteDialog: false,
            deleting: false,
            // Social
            likeCount: 0,
            likedByMe: false,
            likeBusy: false,
            likesChannel: null,
            showComments: false,
            commentsCount: 0,
            // Guardar
            saved: false,
            bookmarkBusy: false
        };
    },
    computed: {
        isOwner() {
            return this.ranking && this.ranking.user_id === this.currentUserId;
        },
        authorSlug() {
            return createSlugFromDisplayName(this.ranking?.author_display_name) || this.ranking?.user_id || '';
        },
        formattedDate() {
            if (!this.ranking?.updated_at) return '';
            return new Date(this.ranking.updated_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    },
    watch: {
        '$route.params.id'(id) {
            if (id) this.load(id);
        }
    },
    methods: {
        initials: (name) => getInitials(name, '?'),
        async load(id) {
            this.loading = true;
            this.error = null;
            this.cleanupLikes();
            const { ranking, error } = await getRanking(id);
            if (error || !ranking) {
                this.error = 'No se encontró el ranking (o es privado).';
            } else {
                this.ranking = ranking;
                await this.loadSocial();
                this.likesChannel = subscribeToLikes('ranking', ranking.id, () => this.refreshLikeCount());
            }
            this.loading = false;
        },
        async loadSocial() {
            const [{ count, likedByMe }, { count: cCount }, savedRes] = await Promise.all([
                getLikeState('ranking', this.ranking.id, this.currentUserId),
                getRankingCommentsCount(this.ranking.id),
                isSaved('ranking', this.ranking.id, this.currentUserId)
            ]);
            this.likeCount = count;
            this.likedByMe = likedByMe;
            this.commentsCount = cCount;
            this.saved = savedRes.saved;
        },
        async refreshLikeCount() {
            const { count } = await getLikesCount('ranking', this.ranking.id);
            this.likeCount = count;
        },
        async handleLike() {
            if (!this.currentUserId || this.likeBusy) return;
            this.likeBusy = true;
            const wasLiked = this.likedByMe;
            this.likedByMe = !wasLiked;
            this.likeCount += wasLiked ? -1 : 1;
            const { likedByMe, error } = await toggleLike('ranking', this.ranking.id, this.currentUserId, wasLiked);
            this.likeBusy = false;
            if (error) {
                this.likedByMe = wasLiked;
                this.likeCount += wasLiked ? 1 : -1;
                return;
            }
            this.likedByMe = likedByMe;
        },
        async handleSave() {
            if (!this.currentUserId || this.bookmarkBusy) return;
            this.bookmarkBusy = true;
            const wasSaved = this.saved;
            this.saved = !wasSaved;
            const { saved, error } = await toggleSave('ranking', this.ranking.id, this.currentUserId, wasSaved);
            this.bookmarkBusy = false;
            if (error) { this.saved = wasSaved; return; }
            this.saved = saved;
            this.toastInfo(saved ? 'Ranking guardado en tu perfil' : 'Quitado de guardados');
        },
        async handleShare() {
            const url = absoluteUrl(`/rankings/${this.ranking.id}`);
            const { method } = await shareLink({
                title: `Ranking ${this.ranking.division} · 10-9`,
                text: 'Mirá este ranking en 10-9',
                url
            });
            if (method === 'clipboard') this.toastInfo('Link copiado al portapapeles');
            else if (method === 'failed') this.toastInfo('No se pudo compartir');
        },
        cleanupLikes() {
            unsubscribeLikes(this.likesChannel);
            this.likesChannel = null;
        },
        confirmDelete() {
            this.showDeleteDialog = true;
        },
        async doDelete() {
            this.deleting = true;
            const { error } = await deleteRanking(this.ranking.id);
            this.deleting = false;
            this.showDeleteDialog = false;
            if (!error) {
                this.$router.push('/publicaciones');
            }
        }
    },
    async mounted() {
        await this.load(this.$route.params.id);
    },
    beforeUnmount() {
        this.cleanupLikes();
    }
};
</script>
