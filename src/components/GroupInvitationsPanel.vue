<!--
    Modal con las invitaciones a grupos pendientes del usuario.
    Se abre desde la bandeja de Mensajes; cada invitación se puede aceptar o rechazar
    en el momento y la lista se refresca sola por realtime.
-->
<template>
    <Teleport to="body">
        <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="close">
            <div class="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm"></div>

            <div class="relative w-full max-w-md bg-[#1C1C1C] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col" style="max-height: 85vh;">
                <div class="px-5 py-4 border-b border-zinc-800 bg-gradient-to-r from-[#7A0A1C]/40 to-transparent flex items-center justify-between">
                    <div>
                        <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Grupos</p>
                        <h3 class="text-lg font-semibold text-white">Invitaciones pendientes <span v-if="!loading" class="text-[#D4AF37]">{{ invitations.length }}</span></h3>
                    </div>
                    <button @click="close" aria-label="Cerrar" class="text-gray-400 hover:text-white">
                        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <div class="flex-1 overflow-y-auto">
                    <div v-if="loading" class="flex justify-center py-8">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF37]"></div>
                    </div>

                    <div v-else-if="invitations.length === 0" class="px-5 py-12 text-center">
                        <p class="text-gray-300 font-medium mb-1">Sin invitaciones</p>
                        <p class="text-xs text-gray-500">Cuando alguien te invite a un grupo, aparece acá.</p>
                    </div>

                    <ul v-else class="divide-y divide-zinc-800">
                        <li v-for="inv in invitations" :key="inv.id" class="p-4 space-y-2">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                                    <img v-if="inv.group_avatar_url" :src="inv.group_avatar_url" :alt="inv.group_name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                                    <span v-else>{{ groupInitials(inv.group_name) }}</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-bold text-white truncate">{{ inv.group_name }}</p>
                                    <p class="text-[11px] text-gray-400">
                                        Te invitó <span class="text-gray-200">{{ inv.inviter_display_name || 'alguien' }}</span>
                                        · {{ inv.group_member_count }} miembro{{ inv.group_member_count === 1 ? '' : 's' }}
                                    </p>
                                </div>
                            </div>
                            <p v-if="inv.group_description" class="text-xs text-gray-400 italic">{{ inv.group_description }}</p>
                            <div class="flex gap-2 pt-1">
                                <button
                                    @click="reject(inv)"
                                    :disabled="busyIds.has(inv.id)"
                                    class="flex-1 px-3 py-1.5 text-xs font-medium text-gray-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg disabled:opacity-50"
                                >
                                    Rechazar
                                </button>
                                <button
                                    @click="accept(inv)"
                                    :disabled="busyIds.has(inv.id)"
                                    class="flex-1 px-3 py-1.5 text-xs font-bold text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 rounded-lg disabled:opacity-50"
                                >
                                    {{ busyIds.has(inv.id) ? '…' : 'Aceptar' }}
                                </button>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script>
import { getInitials } from '../utils/format.js';
import {
    getMyPendingInvitations,
    acceptInvitation,
    rejectInvitation,
    subscribeToMyInvitations,
    unsubscribeGroupChannel
} from '../services/group-chat.js';
import { useAuth } from '../composables/useAuth.js';

export default {
    name: 'GroupInvitationsPanel',
    props: { open: { type: Boolean, default: false } },
    emits: ['close', 'accepted'],
    setup() {
        const { userId } = useAuth();
        return { currentUserId: userId };
    },
    data() {
        return {
            invitations: [],
            loading: false,
            busyIds: new Set(),   // invitaciones con una acción en curso (evita doble click)
            subscription: null
        };
    },
    watch: {
        // Cargar y suscribirse solo mientras el modal está abierto;
        // al cerrarlo se corta la suscripción para no dejar canales colgados.
        open(val) {
            if (val) {
                this.load();
                this.subscription = subscribeToMyInvitations(this.currentUserId, () => this.load());
            } else {
                unsubscribeGroupChannel(this.subscription);
                this.subscription = null;
            }
        }
    },
    methods: {
        async load() {
            this.loading = true;
            const { invitations } = await getMyPendingInvitations();
            this.invitations = invitations;
            this.loading = false;
        },
        async accept(inv) {
            if (this.busyIds.has(inv.id)) return;
            // Se recrea el Set en cada cambio porque Vue no trackea mutaciones internas de Set
            this.busyIds = new Set([...this.busyIds, inv.id]);
            const { error } = await acceptInvitation(inv.id);
            const next = new Set(this.busyIds);
            next.delete(inv.id);
            this.busyIds = next;
            if (!error) {
                this.invitations = this.invitations.filter(i => i.id !== inv.id);
                // El padre navega al grupo recién aceptado
                this.$emit('accepted', inv.group_id);
            }
        },
        async reject(inv) {
            if (this.busyIds.has(inv.id)) return;
            this.busyIds = new Set([...this.busyIds, inv.id]);
            await rejectInvitation(inv.id);
            const next = new Set(this.busyIds);
            next.delete(inv.id);
            this.busyIds = next;
            this.invitations = this.invitations.filter(i => i.id !== inv.id);
        },
        groupInitials: (name) => getInitials(name, 'G'),
        close() { this.$emit('close'); }
    },
    beforeUnmount() {
        unsubscribeGroupChannel(this.subscription);
    }
};
</script>
