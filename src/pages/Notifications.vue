<!--
    Bandeja de notificaciones del usuario: likes, comentarios, follows,
    invitaciones, etc. Paginada de a 30 con "Cargar más" y actualizada
    en vivo por realtime (la campanita del navbar comparte el mismo service).
-->
<template>
    <div class="max-w-2xl mx-auto px-4 sm:px-0 space-y-4">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold text-white">Notificaciones</h1>
                <p class="text-gray-400 text-sm mt-1">Toda tu actividad reciente.</p>
            </div>
            <button
                v-if="hasUnread"
                @click="markAll"
                :disabled="busy"
                class="text-xs font-medium text-[#D4AF37] hover:text-amber-300 disabled:opacity-50"
            >
                Marcar todas como leídas
            </button>
        </div>

        <div v-if="loading && notifications.length === 0" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
        </div>

        <div v-else-if="!isAuthenticated" class="bg-[#1C1C1C] border border-zinc-800 rounded-xl p-8 text-center">
            <p class="text-gray-300 font-medium mb-2">Iniciá sesión</p>
            <p class="text-xs text-gray-500 mb-4">Necesitás estar logueado para ver tus notificaciones.</p>
            <RouterLink to="/ingresar" class="inline-block bg-[#D4AF37] text-[#0D0D0D] font-bold py-2 px-4 rounded-lg">
                Iniciar sesión
            </RouterLink>
        </div>

        <div v-else-if="notifications.length === 0" class="bg-[#1C1C1C] border border-zinc-800 rounded-xl p-12 text-center">
            <svg aria-hidden="true" class="w-16 h-16 mx-auto mb-3 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
            <p class="text-gray-300 font-medium">Sin notificaciones</p>
            <p class="text-xs text-gray-500 mt-1">Cuando alguien interactúe con tu actividad, aparece acá.</p>
        </div>

        <div v-else class="bg-[#1C1C1C] border border-zinc-800 rounded-xl overflow-hidden">
            <ul class="divide-y divide-zinc-800">
                <NotificationItem
                    v-for="notif in notifications"
                    :key="notif.id"
                    :notification="notif"
                />
            </ul>
            <div v-if="hasMore" class="p-3 border-t border-zinc-800 text-center">
                <button
                    @click="loadMore"
                    :disabled="loadingMore"
                    class="text-sm text-[#D4AF37] hover:text-amber-300 disabled:opacity-50"
                >
                    {{ loadingMore ? 'Cargando…' : 'Cargar más' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script>
import NotificationItem from '../components/NotificationItem.vue';
import { useAuth } from '../composables/useAuth.js';
import {
    getNotifications,
    markAllAsRead,
    subscribeToNotifications,
    unsubscribeNotifications
} from '../services/notifications.js';

const PAGE_SIZE = 30;

export default {
    name: 'Notifications',
    components: { NotificationItem },
    setup() {
        const { isAuthenticated, userId } = useAuth();
        return { isAuthenticated, currentUserId: userId };
    },
    data() {
        return {
            notifications: [],
            loading: true,
            loadingMore: false,
            busy: false,
            page: 0,
            hasMore: true,
            subscription: null
        };
    },
    computed: {
        hasUnread() {
            return this.notifications.some(n => !n.read_at);
        }
    },
    async mounted() {
        if (!this.isAuthenticated) {
            this.loading = false;
            return;
        }
        await this.loadFirstPage();
        this.subscription = subscribeToNotifications(this.currentUserId, () => {
            // Recargar la primera página al recibir cambios
            this.loadFirstPage();
        });
    },
    beforeUnmount() {
        unsubscribeNotifications(this.subscription);
    },
    methods: {
        async loadFirstPage() {
            this.loading = true;
            this.page = 0;
            const { notifications } = await getNotifications({ limit: PAGE_SIZE, offset: 0 });
            this.notifications = notifications;
            this.hasMore = notifications.length === PAGE_SIZE;
            this.loading = false;
        },
        async loadMore() {
            if (this.loadingMore || !this.hasMore) return;
            this.loadingMore = true;
            const nextPage = this.page + 1;
            const { notifications } = await getNotifications({
                limit: PAGE_SIZE,
                offset: nextPage * PAGE_SIZE
            });
            this.notifications = [...this.notifications, ...notifications];
            this.page = nextPage;
            this.hasMore = notifications.length === PAGE_SIZE;
            this.loadingMore = false;
        },
        async markAll() {
            this.busy = true;
            await markAllAsRead();
            // Marcar en memoria también, así el badge se apaga sin re-fetch
            for (const n of this.notifications) {
                if (!n.read_at) n.read_at = new Date().toISOString();
            }
            this.busy = false;
        }
    }
};
</script>
