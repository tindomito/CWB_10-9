<!--
    Panel de moderación (solo admins): lista las suspensiones de chat
    activas con quién, dónde, cuánto falta y el motivo, y permite
    levantarlas. Se abre desde el menú de engranaje del chat global.
-->
<template>
    <Teleport to="body">
        <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="close">
            <div class="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm"></div>

            <div class="relative w-full max-w-lg bg-[#1C1C1C] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col" style="max-height: 85vh;">
                <!-- Header -->
                <div class="px-5 py-4 border-b border-zinc-800 bg-gradient-to-r from-[#7A0A1C]/40 to-transparent flex items-center justify-between">
                    <div>
                        <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Moderación</p>
                        <h3 class="text-lg font-semibold text-white">
                            Suspensiones activas
                            <span v-if="!loading" class="text-[#D4AF37] ml-1">{{ suspensions.length }}</span>
                        </h3>
                    </div>
                    <button @click="close" class="text-gray-400 hover:text-white" aria-label="Cerrar">
                        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Body -->
                <div class="flex-1 overflow-y-auto">
                    <div v-if="loading" class="flex justify-center py-12">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
                    </div>

                    <div v-else-if="suspensions.length === 0" class="px-5 py-12 text-center">
                        <p class="text-gray-300 font-medium mb-1">Sin suspensiones activas</p>
                        <p class="text-xs text-gray-500">Cuando suspendas a alguien va a aparecer acá.</p>
                    </div>

                    <ul v-else class="divide-y divide-zinc-800">
                        <li v-for="s in suspensions" :key="s.id" class="p-4 space-y-2">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                                    <img v-if="s.user_avatar_url" :src="s.user_avatar_url" :alt="s.user_display_name" class="w-full h-full object-cover" />
                                    <span v-else>{{ getInitials(s.user_display_name) }}</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-semibold text-white truncate">{{ s.user_display_name || 'Usuario' }}</p>
                                    <p class="text-[11px] text-gray-400">
                                        <span v-if="s.channel_name">{{ s.channel_name }}</span>
                                        <span v-else class="text-[#D4AF37]">Todos los canales</span>
                                        <span class="mx-1">·</span>
                                        <span>{{ formatExpiry(s.expires_at) }}</span>
                                    </p>
                                </div>
                                <button
                                    @click="lift(s.id)"
                                    :disabled="busyIds.has(s.id)"
                                    class="px-3 py-1.5 text-xs font-bold text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 rounded-lg disabled:opacity-50"
                                >
                                    {{ busyIds.has(s.id) ? '…' : 'Levantar' }}
                                </button>
                            </div>
                            <p v-if="s.reason" class="text-[11px] text-gray-400 italic pl-13" style="padding-left: 3.25rem;">
                                "{{ s.reason }}"
                            </p>
                            <p class="text-[10px] text-gray-500 text-right">
                                por <span class="text-gray-300">{{ s.suspended_by_display_name || 'Admin' }}</span>
                                · {{ formatRelativeTime(s.created_at) }}
                            </p>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script>
import { getInitials, formatRelativeTime, formatExpiry } from '../utils/format.js';
import { getActiveSuspensions, liftSuspension, subscribeToAllSuspensions, unsubscribeSuspensions } from '../services/chat-moderation.js';

export default {
    name: 'AdminSuspensionsPanel',
    props: {
        open: { type: Boolean, default: false }
    },
    emits: ['close'],
    data() {
        return {
            suspensions: [],
            loading: false,
            busyIds: new Set(),
            subscription: null
        };
    },
    watch: {
        // La lista vive solo mientras el panel está abierto: al abrir se
        // carga y se suscribe a cambios (otro admin puede suspender en
        // paralelo); al cerrar se libera el canal realtime.
        open(val) {
            if (val) {
                this.loadList();
                this.subscription = subscribeToAllSuspensions(() => this.loadList());
            } else {
                unsubscribeSuspensions(this.subscription);
                this.subscription = null;
            }
        }
    },
    methods: {
        close() {
            this.$emit('close');
        },
        async loadList() {
            this.loading = true;
            const { suspensions } = await getActiveSuspensions();
            this.suspensions = suspensions;
            this.loading = false;
        },
        async lift(id) {
            if (this.busyIds.has(id)) return;
            this.busyIds = new Set([...this.busyIds, id]);
            const { error } = await liftSuspension(id);
            const next = new Set(this.busyIds);
            next.delete(id);
            this.busyIds = next;
            if (!error) {
                this.suspensions = this.suspensions.filter(s => s.id !== id);
            }
        },
        getInitials,
        formatExpiry,
        formatRelativeTime
    },
    beforeUnmount() {
        unsubscribeSuspensions(this.subscription);
    }
};
</script>
