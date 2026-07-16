<!--
    Chat de un grupo privado (/grupo/:id). Mensajería en tiempo real entre
    miembros, con burbujas estilo mensajería y acceso al modal de info del
    grupo (miembros, roles, invitar, abandonar) desde el header.
-->
<template>
    <div class="max-w-4xl mx-auto -mx-4 sm:mx-auto">
        <h1 class="sr-only">Chat de grupo</h1>
        <!-- Loading inicial -->
        <div v-if="loading" class="flex justify-center py-20">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="bg-[#C41E3A]/10 border border-[#C41E3A]/30 rounded-lg p-4 m-4">
            <p class="text-sm text-red-300 mb-2">{{ error }}</p>
            <RouterLink to="/mensajes" class="text-sm font-medium text-[#D4AF37] hover:text-amber-300">
                Volver a mensajes
            </RouterLink>
        </div>

        <!-- Chat -->
        <section v-else-if="group" class="bg-[#1C1C1C] sm:rounded-xl border border-zinc-800 overflow-hidden flex flex-col h-[calc(100dvh-132px-env(safe-area-inset-bottom))] sm:h-[calc(100dvh-156px-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-11rem)]">
            <!-- Header -->
            <div class="px-4 py-3 border-b border-zinc-800 bg-gradient-to-r from-[#7A0A1C]/30 to-transparent flex items-center gap-3">
                <RouterLink to="/mensajes" class="text-gray-400 hover:text-white" aria-label="Volver">
                    <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </RouterLink>
                <button @click="showInfo = true" class="flex items-center gap-3 flex-1 min-w-0 hover:opacity-90 transition-opacity text-left">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold overflow-hidden shrink-0">
                        <img v-if="group.avatar_url" :src="group.avatar_url" :alt="group.name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                        <span v-else>{{ groupInitials }}</span>
                    </div>
                    <div class="min-w-0">
                        <p class="text-white font-semibold truncate">{{ group.name }}</p>
                        <p class="text-[11px] text-gray-400 truncate">{{ memberCount }} miembro{{ memberCount === 1 ? '' : 's' }} · Toca para ver info</p>
                    </div>
                </button>
            </div>

            <!-- Lista mensajes -->
            <div ref="messageContainer" class="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0D0D0D]/40">
                <div v-if="loadingMessages" class="flex justify-center py-4">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF37]"></div>
                </div>

                <div v-else-if="messages.length === 0" class="text-center py-12 text-gray-400">
                    <p class="text-sm">Sin mensajes todavía</p>
                    <p class="text-xs text-gray-500 mt-1">Sé el primero en escribir.</p>
                </div>

                <div
                    v-for="(msg, idx) in messages"
                    :key="msg.id"
                    :class="[
                        'flex items-start gap-2 animate-fade-in',
                        msg.sender_id === currentUserId ? 'flex-row-reverse' : ''
                    ]"
                >
                    <!-- Avatar (solo si es distinto al mensaje anterior) -->
                    <RouterLink
                        v-if="shouldShowAvatar(idx)"
                        :to="`/perfil/${createSlugFromDisplayName(msg.sender_display_name) || msg.sender_id}`"
                        class="w-8 h-8 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0"
                    >
                        <img v-if="msg.sender_avatar_url" :src="msg.sender_avatar_url" :alt="msg.sender_display_name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                        <span v-else>{{ getInitials(msg.sender_display_name) }}</span>
                    </RouterLink>
                    <div v-else class="w-8 shrink-0"></div>

                    <div :class="['max-w-[75%]', msg.sender_id === currentUserId ? 'items-end' : 'items-start', 'flex flex-col']">
                        <p
                            v-if="shouldShowAvatar(idx) && msg.sender_id !== currentUserId"
                            class="text-[11px] text-gray-400 mb-0.5 px-1"
                        >
                            {{ msg.sender_display_name || 'Usuario' }}
                            <span v-if="msg.sender_is_admin" class="text-[#D4AF37] font-bold ml-1">ADMIN</span>
                        </p>
                        <div
                            :class="[
                                'inline-block px-3 py-2 rounded-2xl text-sm shadow-sm break-words whitespace-pre-wrap',
                                msg.sender_id === currentUserId
                                    ? 'bg-[#7A0A1C] text-white rounded-br-none'
                                    : 'bg-zinc-800 text-gray-100 rounded-bl-none'
                            ]"
                        >{{ msg.content }}</div>
                        <p class="text-[10px] text-gray-500 mt-0.5 px-1">{{ formatTime(msg.created_at) }}</p>
                    </div>
                </div>
            </div>

            <!-- Form -->
            <form @submit.prevent="send" class="p-3 border-t border-zinc-800 bg-[#1C1C1C] flex gap-2">
                <input
                    v-model="newMessage"
                    type="text"
                    maxlength="2000"
                    aria-label="Escribir un mensaje"
                    placeholder="Escribí un mensaje..."
                    :disabled="sending"
                    class="flex-1 px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent disabled:opacity-50"
                />
                <button
                    type="submit"
                    :disabled="sending || !newMessage.trim()"
                    class="px-4 py-2 text-sm font-bold text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 rounded-lg disabled:opacity-50"
                >
                    {{ sending ? '…' : 'Enviar' }}
                </button>
            </form>
        </section>

        <!-- Modales -->
        <GroupInfoModal
            :open="showInfo"
            :group="group"
            @close="showInfo = false"
            @open-invite="showInvite = true; showInfo = false"
            @left="onLeft"
            @updated="onGroupUpdated"
        />
        <InviteToGroupModal
            v-if="group"
            :open="showInvite"
            :groupId="group.id"
            @close="showInvite = false"
        />
    </div>
</template>

<script>
import { getInitials } from '../utils/format.js';
import { useAuth } from '../composables/useAuth.js';
import { createSlugFromDisplayName } from '../services/profiles.js';
import {
    getGroup,
    getGroupMessages,
    sendGroupMessage,
    getGroupMembers,
    subscribeToGroupMessages,
    unsubscribeGroupChannel
} from '../services/group-chat.js';
import GroupInfoModal from '../components/GroupInfoModal.vue';
import InviteToGroupModal from '../components/InviteToGroupModal.vue';

export default {
    name: 'GroupChat',
    components: { GroupInfoModal, InviteToGroupModal },
    setup() {
        const { userId } = useAuth();
        return { currentUserId: userId, createSlugFromDisplayName };
    },
    data() {
        return {
            group: null,
            messages: [],
            memberCount: 0,
            newMessage: '',
            loading: true,
            loadingMessages: false,
            sending: false,
            error: null,
            showInfo: false,
            showInvite: false,
            subscription: null
        };
    },
    computed: {
        groupId() { return this.$route.params.id; },
        groupInitials() {
            return getInitials(this.group?.name, 'G');
        }
    },
    watch: {
        '$route.params.id'(val) {
            if (val) this.loadAll();
        }
    },
    methods: {
        async loadAll() {
            this.loading = true;
            this.error = null;
            this.cleanup();

            const { group, error } = await getGroup(this.groupId);
            if (error || !group) {
                this.error = 'No se encontró el grupo o no sos miembro';
                this.loading = false;
                return;
            }
            this.group = group;
            this.loading = false;

            await this.loadMembers();
            await this.loadMessages();

            this.subscription = subscribeToGroupMessages(this.groupId, (msg) => {
                if (msg._deleted) {
                    this.messages = this.messages.filter(m => m.id !== msg.id);
                    return;
                }
                if (!this.messages.some(m => m.id === msg.id)) {
                    this.messages.push(msg);
                    this.$nextTick(() => this.scrollToBottom());
                }
            });
        },
        async loadMembers() {
            const { members } = await getGroupMembers(this.groupId);
            this.memberCount = members.length;
        },
        async loadMessages() {
            this.loadingMessages = true;
            const { messages } = await getGroupMessages(this.groupId);
            this.messages = messages;
            this.loadingMessages = false;
            this.$nextTick(() => this.scrollToBottom());
        },
        async send() {
            if (!this.newMessage.trim() || this.sending) return;
            this.sending = true;
            const content = this.newMessage.trim();
            this.newMessage = '';
            const { error } = await sendGroupMessage(this.groupId, this.currentUserId, content);
            this.sending = false;
            if (error) {
                console.error(error);
                this.newMessage = content;
            }
        },
        scrollToBottom() {
            const c = this.$refs.messageContainer;
            if (c) c.scrollTop = c.scrollHeight;
        },
        shouldShowAvatar(idx) {
            if (idx === 0) return true;
            const prev = this.messages[idx - 1];
            const curr = this.messages[idx];
            if (prev.sender_id !== curr.sender_id) return true;
            // Si pasaron más de 5 min, volver a mostrar
            const dt = new Date(curr.created_at) - new Date(prev.created_at);
            return dt > 5 * 60 * 1000;
        },
        getInitials,
        formatTime(ts) {
            if (!ts) return '';
            return new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        },
        onLeft() {
            this.$router.push('/mensajes');
        },
        onGroupUpdated(updated) {
            this.group = { ...this.group, ...updated };
        },
        cleanup() {
            unsubscribeGroupChannel(this.subscription);
            this.subscription = null;
        }
    },
    async mounted() {
        await this.loadAll();
    },
    beforeUnmount() {
        this.cleanup();
    }
};
</script>

<style scoped>
@keyframes fade-in {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fade-in 0.15s ease-out; }
</style>
