<template>
    <div class="relative" ref="container">
        <!-- Icono corazón con badge -->
        <button
            @click="togglePanel"
            class="relative p-2 text-gray-300 hover:text-[#D4AF37] transition-colors rounded-full hover:bg-white/5"
            :aria-label="`Notificaciones (${unreadCount} sin leer)`"
        >
            <svg aria-hidden="true"
                class="w-6 h-6"
                :fill="unreadCount > 0 ? 'currentColor' : 'none'"
                :class="unreadCount > 0 ? 'text-[#C41E3A]' : ''"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
            <span
                v-if="unreadCount > 0"
                class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#D4AF37] text-[#0D0D0D] text-[10px] font-bold rounded-full flex items-center justify-center"
            >
                {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
        </button>

        <!-- Dropdown panel: mobile = fixed full-width; desktop = absolute 360px -->
        <div
            v-if="open"
            class="fixed left-3 right-3 top-[56px] w-auto
                   lg:absolute lg:left-auto lg:right-0 lg:top-auto lg:mt-2 lg:w-[360px] lg:max-w-[calc(100vw-2rem)]
                   bg-[#1C1C1C] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50"
        >
            <div class="px-4 py-3 border-b border-zinc-800 bg-gradient-to-r from-[#7A0A1C]/30 to-transparent flex items-center justify-between">
                <h3 class="text-sm font-bold text-white">Notificaciones</h3>
                <RouterLink
                    to="/notificaciones"
                    @click="close"
                    class="text-[11px] font-medium text-[#D4AF37] hover:text-amber-300"
                >
                    Ver todas
                </RouterLink>
            </div>

            <div class="max-h-[450px] overflow-y-auto">
                <div v-if="loading" class="flex justify-center py-8">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF37]"></div>
                </div>

                <div v-else-if="notifications.length === 0" class="px-4 py-12 text-center">
                    <svg aria-hidden="true" class="w-12 h-12 mx-auto mb-3 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                    <p class="text-sm text-gray-300 font-medium">Sin notificaciones</p>
                    <p class="text-xs text-gray-500 mt-1">Cuando algo pase, aparece acá.</p>
                </div>

                <ul v-else class="divide-y divide-zinc-800">
                    <NotificationItem
                        v-for="notif in notifications"
                        :key="notif.id"
                        :notification="notif"
                        @navigate="onNavigate"
                    />
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
import NotificationItem from './NotificationItem.vue';
import { useAuth } from '../composables/useAuth.js';
import {
    getNotifications,
    getUnreadCount,
    markAllAsRead,
    subscribeToNotifications,
    unsubscribeNotifications
} from '../services/notifications.js';

export default {
    name: 'NotificationsBell',
    components: { NotificationItem },
    setup() {
        const { userId, isAuthenticated } = useAuth();
        return { currentUserId: userId, isAuthenticated };
    },
    data() {
        return {
            open: false,
            unreadCount: 0,
            notifications: [],
            loading: false,
            subscription: null,
            outsideClickHandler: null
        };
    },
    watch: {
        // El userId puede llegar tarde (auth async) o cambiar en logout/login:
        // rearmamos badge y suscripción realtime cada vez que cambia.
        currentUserId: {
            handler(val) {
                this.cleanupSubscription();
                if (val) {
                    this.loadUnreadCount();
                    this.subscription = subscribeToNotifications(val, () => {
                        this.loadUnreadCount();
                        if (this.open) this.loadList();
                    });
                }
            },
            immediate: true
        }
    },
    mounted() {
        this.outsideClickHandler = (e) => {
            if (this.open && this.$refs.container && !this.$refs.container.contains(e.target)) {
                this.close();
            }
        };
        document.addEventListener('click', this.outsideClickHandler);
    },
    beforeUnmount() {
        this.cleanupSubscription();
        if (this.outsideClickHandler) document.removeEventListener('click', this.outsideClickHandler);
    },
    methods: {
        cleanupSubscription() {
            unsubscribeNotifications(this.subscription);
            this.subscription = null;
        },
        async loadUnreadCount() {
            if (!this.currentUserId) return;
            const { count } = await getUnreadCount();
            this.unreadCount = count;
        },
        async loadList() {
            if (!this.currentUserId) return;
            this.loading = true;
            const { notifications } = await getNotifications({ limit: 15 });
            this.notifications = notifications;
            this.loading = false;
        },
        async togglePanel() {
            this.open = !this.open;
            if (this.open) {
                await this.loadList();
                // Estilo Instagram: al abrir, marcar todas como leídas
                if (this.unreadCount > 0) {
                    await markAllAsRead();
                    this.unreadCount = 0;
                }
            }
        },
        close() {
            this.open = false;
        },
        onNavigate() {
            this.close();
        }
    }
};
</script>
