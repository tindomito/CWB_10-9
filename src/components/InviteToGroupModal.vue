<template>
    <Teleport to="body">
        <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="close">
            <div class="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm"></div>

            <div class="relative w-full max-w-md bg-[#1C1C1C] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col" style="max-height: 85vh;">
                <!-- Header -->
                <div class="px-5 py-4 border-b border-zinc-800 bg-gradient-to-r from-[#7A0A1C]/40 to-transparent flex items-center justify-between">
                    <div>
                        <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Grupo</p>
                        <h3 class="text-lg font-semibold text-white">Invitar miembros</h3>
                    </div>
                    <button @click="close" aria-label="Cerrar" class="text-gray-400 hover:text-white">
                        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Tabs -->
                <div class="flex border-b border-zinc-800">
                    <button
                        @click="switchTab('following')"
                        :class="tabClass('following')"
                    >
                        ❤️ Sugeridos
                        <span class="text-[10px] text-gray-500 ml-1">({{ followingFiltered.length }})</span>
                    </button>
                    <button
                        @click="switchTab('search')"
                        :class="tabClass('search')"
                    >
                        🔎 Buscar
                    </button>
                </div>

                <!-- Search input (solo en tab Search) -->
                <div v-if="activeTab === 'search'" class="p-3 border-b border-zinc-800">
                    <div class="relative">
                        <input
                            v-model="query"
                            @input="onSearch"
                            type="text"
                            aria-label="Buscar usuarios por nombre"
                            placeholder="Buscar usuarios por nombre..."
                            class="w-full pl-10 pr-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37]"
                            ref="searchInput"
                        />
                        <svg aria-hidden="true" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                </div>

                <!-- Lista -->
                <div class="flex-1 overflow-y-auto min-h-[260px]">
                    <div v-if="loading" class="flex justify-center py-8">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF37]"></div>
                    </div>

                    <!-- Sugeridos vacío -->
                    <div v-else-if="activeTab === 'following' && followingFiltered.length === 0" class="px-5 py-12 text-center">
                        <p class="text-sm text-gray-400 mb-1">No seguís a nadie disponible</p>
                        <p class="text-[11px] text-gray-500">Probá buscar en la pestaña "Buscar".</p>
                    </div>

                    <!-- Search inicial -->
                    <div v-else-if="activeTab === 'search' && query.length < 2" class="px-5 py-12 text-center">
                        <p class="text-sm text-gray-400 mb-1">Buscá usuarios</p>
                        <p class="text-[11px] text-gray-500">Escribí al menos 2 caracteres.</p>
                    </div>

                    <!-- Search sin resultados -->
                    <div v-else-if="activeTab === 'search' && searchResults.length === 0 && query.length >= 2" class="px-5 py-12 text-center">
                        <p class="text-sm text-gray-400">Sin resultados</p>
                    </div>

                    <!-- Lista de usuarios -->
                    <ul v-else class="divide-y divide-zinc-800">
                        <li
                            v-for="u in visibleUsers"
                            :key="u.id"
                            role="checkbox"
                            :aria-checked="selected.has(u.id)"
                            :aria-disabled="memberSet.has(u.id)"
                            :aria-label="u.display_name || 'Usuario'"
                            :tabindex="memberSet.has(u.id) ? -1 : 0"
                            @click="toggleSelect(u)"
                            @keydown.enter="toggleSelect(u)"
                            @keydown.space.prevent="toggleSelect(u)"
                            :class="[
                                'px-4 py-2.5 flex items-center gap-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-inset',
                                memberSet.has(u.id) ? 'opacity-50' : 'cursor-pointer hover:bg-zinc-800/40',
                                selected.has(u.id) ? 'bg-[#D4AF37]/5' : ''
                            ]"
                        >
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0">
                                <img v-if="u.avatar_url" :src="u.avatar_url" :alt="u.display_name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                                <span v-else>{{ getInitials(u.display_name) }}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-semibold text-white truncate">{{ u.display_name || 'Usuario' }}</p>
                                <p v-if="memberSet.has(u.id)" class="text-[10px] text-gray-500">Ya es miembro</p>
                                <p v-else-if="invitedSet.has(u.id)" class="text-[10px] text-emerald-400">✓ Invitación enviada</p>
                                <p v-else class="text-[10px] text-gray-500">{{ u.rango || 'Amateur' }}</p>
                            </div>

                            <!-- Checkbox visual -->
                            <div v-if="!memberSet.has(u.id)" class="shrink-0">
                                <div
                                    :class="[
                                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                                        selected.has(u.id)
                                            ? 'bg-[#D4AF37] border-[#D4AF37]'
                                            : 'border-zinc-600 hover:border-[#D4AF37]'
                                    ]"
                                >
                                    <svg aria-hidden="true" v-if="selected.has(u.id)" class="w-3 h-3 text-[#0D0D0D]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </div>
                            </div>
                            <div v-else class="shrink-0 text-[10px] text-gray-500 italic">en el grupo</div>
                        </li>
                    </ul>
                </div>

                <!-- Footer con CTA -->
                <div class="px-5 py-3 border-t border-zinc-800 flex items-center gap-2">
                    <button
                        @click="close"
                        class="px-4 py-2 text-sm font-medium text-gray-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                    >
                        Cerrar
                    </button>
                    <button
                        @click="sendInvites"
                        :disabled="selected.size === 0 || sending"
                        class="flex-1 px-4 py-2 text-sm font-bold text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <template v-if="sending">
                            <svg aria-hidden="true" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Enviando…
                        </template>
                        <template v-else-if="selected.size === 0">
                            Seleccioná al menos uno
                        </template>
                        <template v-else>
                            Invitar a {{ selected.size }} {{ selected.size === 1 ? 'persona' : 'personas' }}
                        </template>
                    </button>
                </div>

                <!-- Toast resumen -->
                <div v-if="lastResult" class="px-5 py-2 bg-zinc-900/60 border-t border-zinc-800 text-[11px] text-center">
                    <span class="text-emerald-400 font-semibold">{{ lastResult.ok }} invitaciones enviadas</span>
                    <template v-if="lastResult.fail > 0">
                        <span class="text-gray-500"> · </span>
                        <span class="text-[#C41E3A]">{{ lastResult.fail }} fallidas</span>
                    </template>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script>
import { getInitials } from '../utils/format.js';
import { searchProfiles } from '../services/profiles.js';
import { getFollowing } from '../services/follows.js';
import { inviteToGroup, getGroupMembers, getMyPendingInvitations } from '../services/group-chat.js';
import { useAuth } from '../composables/useAuth.js';

export default {
    name: 'InviteToGroupModal',
    props: {
        open: { type: Boolean, default: false },
        groupId: { type: String, required: true }
    },
    emits: ['close', 'invited'],
    setup() {
        const { userId } = useAuth();
        return { currentUserId: userId };
    },
    data() {
        return {
            activeTab: 'following',  // 'following' | 'search'
            query: '',
            searchResults: [],
            following: [],
            memberSet: new Set(),
            invitedSet: new Set(),  // ya invitados en este modal o con invitación pendiente previa
            selected: new Set(),
            loading: false,
            sending: false,
            searchTimeout: null,
            lastResult: null
        };
    },
    computed: {
        visibleUsers() {
            return this.activeTab === 'following' ? this.followingFiltered : this.searchResults;
        },
        followingFiltered() {
            // Filtramos los que ya son miembros para no contarlos
            return this.following.filter(u => !this.memberSet.has(u.id));
        }
    },
    watch: {
        open(val) {
            if (val) {
                this.reset();
                this.loadInitial();
            }
        }
    },
    methods: {
        reset() {
            this.activeTab = 'following';
            this.query = '';
            this.searchResults = [];
            this.selected = new Set();
            this.lastResult = null;
        },
        async loadInitial() {
            this.loading = true;
            // Cargar en paralelo: members del grupo, mi following, invitaciones previas
            const [membersRes, followingRes] = await Promise.all([
                getGroupMembers(this.groupId),
                this.currentUserId ? getFollowing(this.currentUserId, 100, 0) : { following: [] }
            ]);
            this.memberSet = new Set(membersRes.members?.map(m => m.user_id) || []);
            this.following = (followingRes.following || []);
            this.loading = false;
        },
        async loadPendingInvitations() {
            // Si hay invitaciones pendientes para este grupo, marcarlas como ya invitadas
            // (pero solo veo MIS invitaciones, no las que YO envié — eso lo guardamos local)
        },
        switchTab(tab) {
            this.activeTab = tab;
            if (tab === 'search') {
                this.$nextTick(() => this.$refs.searchInput?.focus());
            }
        },
        tabClass(id) {
            return [
                'flex-1 px-3 py-2.5 text-xs font-medium text-center transition-colors border-b-2',
                this.activeTab === id
                    ? 'border-[#D4AF37] text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
            ];
        },
        onSearch() {
            clearTimeout(this.searchTimeout);
            if (this.query.trim().length < 2) {
                this.searchResults = [];
                return;
            }
            this.searchTimeout = setTimeout(() => this.doSearch(), 300);
        },
        async doSearch() {
            this.loading = true;
            const { profiles } = await searchProfiles(this.query.trim(), 25);
            // Excluyo a mí mismo
            this.searchResults = (profiles || []).filter(p => p.id !== this.currentUserId);
            this.loading = false;
        },
        toggleSelect(u) {
            if (this.memberSet.has(u.id)) return;
            const next = new Set(this.selected);
            if (next.has(u.id)) next.delete(u.id);
            else next.add(u.id);
            this.selected = next;
        },
        async sendInvites() {
            if (this.selected.size === 0 || this.sending) return;
            this.sending = true;
            this.lastResult = null;

            const ids = [...this.selected];
            const results = await Promise.all(
                ids.map(uid => inviteToGroup(this.groupId, uid))
            );

            const ok = results.filter(r => !r.error).length;
            const fail = results.length - ok;

            // Marcar como ya invitados
            const next = new Set(this.invitedSet);
            ids.forEach(uid => next.add(uid));
            this.invitedSet = next;

            this.selected = new Set();
            this.sending = false;
            this.lastResult = { ok, fail };
            this.$emit('invited', { ok, fail });

            // Si fueron 100% exitosas, cerrar después de 1.2s
            if (fail === 0) {
                setTimeout(() => {
                    if (this.lastResult?.fail === 0) this.close();
                }, 1200);
            }
        },
        getInitials,
        close() { this.$emit('close'); }
    },
    beforeUnmount() {
        clearTimeout(this.searchTimeout);
    }
};
</script>
