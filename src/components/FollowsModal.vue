<template>
    <Teleport to="body">
        <div
            v-if="open"
            class="fixed inset-0 z-50 flex items-center justify-center p-4"
            @click.self="$emit('close')"
        >
            <!-- Backdrop -->
            <div class="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm"></div>

            <!-- Modal -->
            <div class="relative w-full max-w-md bg-[#1C1C1C] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col" style="max-height: 80vh;">
                <!-- Header -->
                <div class="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-gradient-to-r from-[#7A0A1C]/40 to-transparent">
                    <h3 class="text-lg font-semibold text-white tracking-wide">
                        {{ mode === 'followers' ? 'Seguidores' : 'Siguiendo' }}
                        <span v-if="!loading" class="text-[#D4AF37] ml-1">{{ users.length }}</span>
                    </h3>
                    <button
                        @click="$emit('close')"
                        class="text-gray-400 hover:text-white transition-colors"
                        aria-label="Cerrar"
                    >
                        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Body -->
                <div class="flex-1 overflow-y-auto">
                    <!-- Loading -->
                    <div v-if="loading" class="flex justify-center py-12">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
                    </div>

                    <!-- Error -->
                    <div v-else-if="error" class="px-5 py-8 text-center">
                        <p class="text-sm text-red-400 mb-3">{{ error }}</p>
                        <button
                            @click="loadUsers"
                            class="text-sm font-medium text-[#D4AF37] hover:text-amber-300"
                        >
                            Reintentar
                        </button>
                    </div>

                    <!-- Vacío -->
                    <div v-else-if="users.length === 0" class="px-5 py-12 text-center">
                        <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
                            <svg aria-hidden="true" class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                            </svg>
                        </div>
                        <p class="text-gray-300 font-medium mb-1">{{ emptyTitle }}</p>
                        <p class="text-xs text-gray-500">{{ emptyMessage }}</p>
                    </div>

                    <!-- Lista -->
                    <ul v-else class="divide-y divide-zinc-800">
                        <li
                            v-for="user in users"
                            :key="user.id"
                            class="px-5 py-3 hover:bg-zinc-800/50 transition-colors"
                        >
                            <RouterLink
                                :to="`/perfil/${createSlugFromDisplayName(user.display_name) || user.id}`"
                                @click="$emit('close')"
                                class="flex items-center gap-3 group"
                            >
                                <!-- Avatar -->
                                <div class="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                                    <img
                                        v-if="user.avatar_url"
                                        :src="user.avatar_url"
                                        :alt="user.display_name"
                                        class="w-full h-full rounded-full object-cover"
                                        @error="handleImageError"
                                    />
                                    <span v-else>{{ getInitials(user.display_name) }}</span>
                                </div>

                                <!-- Info -->
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2">
                                        <p class="text-sm font-semibold text-white truncate group-hover:text-[#D4AF37] transition-colors">
                                            {{ user.display_name || 'Usuario' }}
                                        </p>
                                        <span v-if="user.pro" class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">
                                            Admin
                                        </span>
                                    </div>
                                    <p class="text-xs text-gray-400 truncate">
                                        {{ user.rango || 'Amateur' }}
                                    </p>
                                </div>

                                <!-- Chevron -->
                                <svg aria-hidden="true" class="w-4 h-4 text-gray-600 group-hover:text-[#D4AF37] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </RouterLink>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script>
import { getInitials } from '../utils/format.js';
import { getFollowers, getFollowing } from '../services/follows.js';
import { createSlugFromDisplayName } from '../services/profiles.js';

export default {
    name: 'FollowsModal',
    props: {
        open: { type: Boolean, default: false },
        userId: { type: String, default: null },
        mode: { type: String, default: 'followers' } // 'followers' | 'following'
    },
    emits: ['close'],
    data() {
        return {
            users: [],
            loading: false,
            error: null
        };
    },
    computed: {
        emptyTitle() {
            return this.mode === 'followers'
                ? 'Sin seguidores aún'
                : 'No sigue a nadie aún';
        },
        emptyMessage() {
            return this.mode === 'followers'
                ? 'Cuando alguien lo siga va a aparecer acá.'
                : 'Cuando empiece a seguir a alguien va a aparecer acá.';
        }
    },
    watch: {
        open(val) {
            if (val) this.loadUsers();
        },
        userId() {
            if (this.open) this.loadUsers();
        },
        mode() {
            if (this.open) this.loadUsers();
        }
    },
    methods: {
        createSlugFromDisplayName,
        async loadUsers() {
            if (!this.userId) return;
            this.loading = true;
            this.error = null;
            this.users = [];
            try {
                const fetcher = this.mode === 'followers' ? getFollowers : getFollowing;
                const { followers, following, error } = await fetcher(this.userId, 100, 0);
                if (error) {
                    this.error = error.message || 'Error al cargar la lista';
                    return;
                }
                this.users = followers || following || [];
            } catch (e) {
                this.error = 'Error inesperado al cargar la lista';
            } finally {
                this.loading = false;
            }
        },
        getInitials,
        handleImageError(event) {
            event.target.style.display = 'none';
        }
    }
};
</script>
