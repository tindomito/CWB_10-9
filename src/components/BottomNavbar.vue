<template>
    <nav
        class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black"
        style="border-top: 0.5px solid rgba(212, 175, 55, 0.3); padding-bottom: env(safe-area-inset-bottom);"
    >
        <div class="grid grid-cols-5" style="height: 56px;">
            <RouterLink
                v-for="tab in tabs"
                :key="tab.to"
                :to="tab.to"
                :aria-label="tab.label"
                :class="[
                    'relative flex items-center justify-center transition-colors duration-150',
                    isActive(tab) ? 'text-[#D4AF37]' : 'text-[#888]'
                ]"
            >
                <!-- Barra activa arriba -->
                <span
                    v-if="isActive(tab)"
                    class="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 bg-[#D4AF37]"
                    style="border-radius: 0 0 2px 2px;"
                ></span>

                <!-- Ícono + badge -->
                <div class="relative">
                    <!-- HOME -->
                    <svg aria-hidden="true" v-if="tab.id === 'home'" class="w-6 h-6" :fill="isActive(tab) ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                    <!-- CHATS -->
                    <svg aria-hidden="true" v-else-if="tab.id === 'chats'" class="w-6 h-6" :fill="isActive(tab) ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <!-- PREDICC (target) -->
                    <svg aria-hidden="true" v-else-if="tab.id === 'predicc'" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <circle cx="12" cy="12" r="9"/>
                        <circle cx="12" cy="12" r="5"/>
                        <circle cx="12" cy="12" r="1.5" :fill="isActive(tab) ? 'currentColor' : 'none'"/>
                    </svg>
                    <!-- FEED -->
                    <svg aria-hidden="true" v-else-if="tab.id === 'feed'" class="w-6 h-6" :fill="isActive(tab) ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                    </svg>
                    <!-- INFO (perfil) -->
                    <svg aria-hidden="true" v-else-if="tab.id === 'info'" class="w-6 h-6" :fill="isActive(tab) ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>

                    <!-- Badge notificación -->
                    <span
                        v-if="tab.badge > 0"
                        class="absolute -top-0.5 -right-1.5 w-2 h-2 bg-[#C41E3A] rounded-full"
                        style="border: 1.5px solid #000;"
                    ></span>
                </div>
            </RouterLink>
        </div>
    </nav>
</template>

<script>
import { useAuth } from '../composables/useAuth.js';
import { useRoute } from 'vue-router';
import {
    getMyPendingInvitations,
    subscribeToMyInvitations,
    unsubscribeGroupChannel
} from '../services/group-chat.js';

export default {
    name: 'BottomNavbar',
    setup() {
        const { userId, isAuthenticated } = useAuth();
        const route = useRoute();
        return { currentUserId: userId, isAuthenticated, route };
    },
    data() {
        return {
            pendingInvitations: 0,
            invitesSub: null
        };
    },
    computed: {
        tabs() {
            // `match` = todas las rutas/prefijos que mantienen este tab activo.
            // Permite que sub-pestañas (ej: chats globales / leaderboards) sigan
            // marcando el tab padre en el navbar.
            return [
                {
                    id: 'home', label: 'Home', to: '/', badge: 0,
                    match: ['/']
                },
                {
                    id: 'chats', label: 'Chats', to: '/mensajes', badge: this.pendingInvitations,
                    match: ['/mensajes', '/chat', '/grupo']
                },
                {
                    id: 'predicc', label: 'Predicc.', to: '/predicciones', badge: 0,
                    match: ['/predicciones', '/clasificaciones']
                },
                {
                    id: 'feed', label: 'Feed', to: '/publicaciones', badge: 0,
                    match: ['/publicaciones', '/rankings']
                },
                {
                    id: 'info', label: 'Info', to: '/perfil', badge: 0,
                    match: ['/perfil', '/ajustes']
                }
            ];
        }
    },
    watch: {
        currentUserId: {
            handler(val) {
                this.cleanup();
                if (val) {
                    this.loadCounts();
                    this.invitesSub = subscribeToMyInvitations(val, () => this.loadCounts());
                }
            },
            immediate: true
        }
    },
    methods: {
        async loadCounts() {
            if (!this.currentUserId) {
                this.pendingInvitations = 0;
                return;
            }
            const { invitations } = await getMyPendingInvitations();
            this.pendingInvitations = (invitations || []).length;
        },
        isActive(tab) {
            const path = this.route.path;
            const matches = tab.match || [tab.to];
            return matches.some(m => {
                if (m === '/') return path === '/';
                // Match exacto o prefijo (con / final para evitar falsos positivos)
                return path === m || path.startsWith(m + '/');
            });
        },
        cleanup() {
            unsubscribeGroupChannel(this.invitesSub);
            this.invitesSub = null;
        }
    },
    beforeUnmount() {
        this.cleanup();
    }
};
</script>
