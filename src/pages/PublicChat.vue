<template>
    <div class="max-w-3xl mx-auto -mx-3 -mt-3 sm:mt-0 sm:mx-auto">
        <h1 class="sr-only">Chats globales</h1>
        <!-- Chat a pantalla completa. El selector de canal vive en el header
             del chat como dropdown unificado (Chat Global + Peleas en Vivo). -->
        <section
            class="bg-zinc-900 sm:rounded-xl sm:border border-zinc-800 overflow-hidden flex flex-col h-[calc(100dvh-132px-env(safe-area-inset-bottom))] sm:h-[calc(100dvh-156px-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-11rem)]"
        >
            <!-- Header del canal (fijo): el título es el selector de canales -->
            <div class="px-3 sm:px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 flex items-center gap-3 shrink-0 relative" :ref="el => setDropdownRef('selector', el)">
                <div class="h-9 w-9 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#4a0511] flex items-center justify-center shrink-0">
                    <svg aria-hidden="true" class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"></path>
                        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"></path>
                    </svg>
                </div>
                <button
                    type="button"
                    @click="toggleGroupDropdown('selector')"
                    class="min-w-0 flex-1 text-left group"
                    aria-haspopup="listbox"
                    :aria-expanded="openDropdownId === 'selector'"
                >
                    <div class="flex items-center gap-2">
                        <h2 class="text-base font-semibold text-white truncate leading-tight">{{ activeChannel?.name || 'Chat' }}</h2>
                        <span
                            class="w-2 h-2 rounded-full shrink-0"
                            :class="activeChannelOpen ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'"
                            :title="activeChannelOpen ? 'En vivo' : 'Cerrado'"
                        ></span>
                        <svg aria-hidden="true"
                            class="w-3.5 h-3.5 text-gray-400 group-hover:text-[#D4AF37] transition-transform shrink-0"
                            :class="{ 'rotate-180': openDropdownId === 'selector' }"
                            fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"
                        >
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                    <p class="text-[11px] text-gray-500 truncate">
                        {{ activeChannelOpen ? 'En vivo' : 'Cerrado' }} · {{ messages.length }} mensaje{{ messages.length === 1 ? '' : 's' }}
                    </p>
                </button>

                <!-- Dropdown unificado: Chat Global + sub-canales de cada grupo -->
                <div
                    v-if="openDropdownId === 'selector'"
                    class="absolute left-3 sm:left-4 top-full mt-1 w-64 bg-[#1C1C1C] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-30"
                >
                    <ul class="py-1">
                        <template v-for="ch in topLevelChannels" :key="ch.id">
                            <!-- Canal suelto (Chat Global) -->
                            <li v-if="!ch.is_group">
                                <button
                                    @click="selectChannel(ch.id)"
                                    :class="[
                                        'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-800 transition-colors',
                                        activeChannelId === ch.id ? 'bg-[#D4AF37]/10 text-white' : 'text-gray-200'
                                    ]"
                                >
                                    <span v-if="isOpen(ch)" class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                                    <span v-else class="w-2 h-2 rounded-full bg-zinc-500 shrink-0"></span>
                                    <span class="font-medium">{{ ch.name }}</span>
                                    <svg aria-hidden="true" v-if="activeChannelId === ch.id" class="w-3.5 h-3.5 ml-auto text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                </button>
                            </li>

                            <!-- Grupo: etiqueta de sección + sus canales -->
                            <template v-else>
                                <li class="px-3 pt-2.5 pb-1 mt-1 border-t border-zinc-800">
                                    <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">{{ ch.name }}</p>
                                    <p v-if="ch.description" class="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{{ ch.description }}</p>
                                </li>
                                <li v-for="child in childrenOf(ch.id)" :key="child.id">
                                    <button
                                        @click="selectChannel(child.id)"
                                        :class="[
                                            'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-800 transition-colors',
                                            activeChannelId === child.id ? 'bg-[#D4AF37]/10 text-white' : 'text-gray-200'
                                        ]"
                                    >
                                        <span v-if="isOpen(child)" class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                                        <span v-else class="w-2 h-2 rounded-full bg-zinc-500 shrink-0"></span>
                                        <span class="font-medium">{{ child.name }}</span>
                                        <svg aria-hidden="true" v-if="activeChannelId === child.id" class="w-3.5 h-3.5 ml-auto text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                    </button>
                                </li>
                            </template>
                        </template>
                    </ul>
                </div>

                <!-- Menú admin (gear) -->
                <div v-if="isAdmin" class="relative shrink-0" :ref="el => setAdminMenuRef(el)">
                    <button
                        @click="adminMenuOpen = !adminMenuOpen"
                        class="p-2 text-gray-400 hover:text-[#D4AF37] rounded-full hover:bg-white/5"
                        title="Control admin"
                    >
                        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                    </button>
                    <div v-if="adminMenuOpen" class="absolute right-0 mt-2 w-60 bg-[#0D0D0D] border border-zinc-700 rounded-lg shadow-xl py-1 z-30">
                        <div class="px-3 py-1.5 border-b border-zinc-800">
                            <p class="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Control Admin</p>
                            <p class="text-[10px] text-gray-500">{{ activeChannel?.admin_override !== 'auto' ? 'Estado manual' : 'Estado automático' }}</p>
                        </div>
                        <button
                            @click="toggleChannel(); adminMenuOpen = false"
                            :disabled="adminBusy"
                            class="w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50"
                            :class="activeChannelOpen ? 'text-[#C41E3A]' : 'text-emerald-400'"
                        >
                            {{ activeChannelOpen ? 'Cerrar canal' : 'Abrir canal' }}
                        </button>
                        <button
                            v-if="activeChannel?.admin_override !== 'auto'"
                            @click="resetOverride(); adminMenuOpen = false"
                            :disabled="adminBusy"
                            class="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-zinc-800 disabled:opacity-50"
                        >
                            Volver a horario automático
                        </button>
                        <button
                            @click="showSuspensionsPanel = true; adminMenuOpen = false"
                            class="w-full text-left px-3 py-2 text-sm text-[#D4AF37] hover:bg-zinc-800 flex items-center gap-1.5"
                        >
                            🛡️ Suspensiones activas
                        </button>
                    </div>
                </div>
            </div>

            <!-- Mensajes (único que scrollea) -->
            <div v-if="loading" class="flex-1 flex items-center justify-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
            </div>
            <div v-else ref="messageContainer" class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 chat-trama">
                <div
                    v-for="(message, idx) in messages"
                    :key="message.id"
                    :class="[
                        'flex gap-2 group items-end animate-fade-in',
                        message.user_id === currentUserId ? 'flex-row-reverse' : 'flex-row'
                    ]"
                >
                    <!-- Avatar (solo al cambiar de emisor) -->
                    <div class="shrink-0 w-7">
                        <RouterLink
                            v-if="showAvatar(idx)"
                            :to="`/perfil/${createSlugFromDisplayName(message.display_name)}`"
                            class="block h-7 w-7 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center overflow-hidden"
                        >
                            <img
                                v-if="message.avatar_url"
                                :src="message.avatar_url" :alt="message.display_name"
                                class="w-full h-full object-cover" @error="handleImageError"
                            />
                            <span v-else class="text-[10px] font-bold text-white">{{ getInitials(message.display_name) }}</span>
                        </RouterLink>
                    </div>

                    <div :class="['flex flex-col max-w-[78%] sm:max-w-[65%]', message.user_id === currentUserId ? 'items-end' : 'items-start']">
                        <!-- Nombre (solo en mensajes ajenos y al cambiar de emisor) -->
                        <div v-if="showAvatar(idx) && message.user_id !== currentUserId" class="flex items-center gap-1.5 mb-0.5 px-1">
                            <RouterLink
                                :to="`/perfil/${createSlugFromDisplayName(message.display_name)}`"
                                class="text-[11px] font-semibold text-gray-400 hover:text-amber-400 truncate"
                            >
                                {{ message.display_name || 'Usuario' }}
                            </RouterLink>
                            <span v-if="message.is_admin" class="text-[9px] font-bold text-amber-400 uppercase">Admin</span>
                        </div>

                        <div class="flex items-end gap-1.5" :class="message.user_id === currentUserId ? 'flex-row-reverse' : ''">
                            <div
                                :class="[
                                    'px-3.5 py-2 rounded-2xl shadow-sm break-words',
                                    message.user_id === currentUserId
                                        ? 'bg-[#7A0A1C] text-white rounded-br-none'
                                        : 'bg-zinc-800 text-gray-100 rounded-bl-none'
                                ]"
                            >
                                <p class="text-sm whitespace-pre-wrap break-words">{{ message.content }}</p>
                            </div>
                            <!-- Suspender (admin) -->
                            <button
                                v-if="isAdmin && message.user_id !== currentUserId && !message.is_admin"
                                @click="openSuspendModal(message)"
                                class="p-1 text-gray-600 hover:text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                title="Suspender a este usuario"
                            >🛡️</button>
                        </div>
                        <span class="text-[10px] text-gray-600 mt-0.5 px-1">{{ formatTime(message.created_at) }}</span>
                    </div>
                </div>

                <div v-if="messages.length === 0" class="text-center py-12 text-gray-400">
                    <svg aria-hidden="true" class="w-14 h-14 mx-auto mb-3 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    <p class="text-gray-300 font-medium">No hay mensajes aún</p>
                    <p class="text-sm text-gray-500 mt-1">
                        {{ activeChannelOpen ? 'Sé el primero en romper el silencio' : 'El canal está cerrado por ahora' }}
                    </p>
                </div>
            </div>

            <!-- Footer: suspensión / cerrado / no-auth / input (fijo abajo) -->
            <div class="shrink-0 border-t border-zinc-800 bg-zinc-900">
                <!-- Suspendido -->
                <div v-if="isAuthenticated && mySuspension" class="p-3 bg-[#7A0A1C]/20">
                    <p class="text-xs font-bold text-[#D4AF37] uppercase tracking-widest mb-0.5">🛡️ Estás suspendido</p>
                    <p class="text-[12px] text-gray-300">
                        <template v-if="mySuspension.channel_id === null">En todos los chats globales</template>
                        <template v-else>En este canal</template>
                        <template v-if="mySuspension.expires_at"> · hasta {{ formatExpiry(mySuspension.expires_at) }}</template>
                        <template v-else> · hasta que un admin la levante</template>
                    </p>
                    <p v-if="mySuspension.reason" class="text-[11px] text-gray-400 italic mt-1">Razón: "{{ mySuspension.reason }}"</p>
                </div>

                <!-- Canal cerrado -->
                <div v-else-if="isAuthenticated && !activeChannelOpen" class="p-3 text-center text-sm text-gray-400">
                    <span class="font-medium text-gray-300">Canal cerrado.</span>
                    <template v-if="activeChannel?.weekend_only"> Abre los sábados y domingos.</template>
                </div>

                <!-- No autenticado -->
                <div v-else-if="!isAuthenticated" class="p-3 text-center text-sm text-gray-400">
                    <RouterLink to="/ingresar" class="text-[#D4AF37] font-semibold hover:underline">Iniciá sesión</RouterLink>
                    para enviar mensajes.
                </div>

                <!-- Input -->
                <form v-else @submit.prevent="handleSubmit" class="p-2.5 sm:p-3 flex gap-2 items-center">
                    <textarea
                        v-model="newMessage.content"
                        @keydown.enter.exact.prevent="handleSubmit"
                        :disabled="sending || cooldownRemaining > 0"
                        rows="1"
                        maxlength="500"
                        aria-label="Escribir un mensaje"
                        :placeholder="cooldownRemaining > 0 ? `Esperá ${cooldownRemaining}s…` : 'Escribí un mensaje…'"
                        class="flex-1 min-w-0 h-10 bg-zinc-800 text-white rounded-full px-4 py-2 leading-6 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] resize-none placeholder-gray-500 border border-zinc-700 text-sm disabled:opacity-60"
                    ></textarea>
                    <button
                        type="submit"
                        :disabled="sending || !newMessage.content.trim() || cooldownRemaining > 0"
                        class="h-10 w-10 shrink-0 bg-[#D4AF37] text-[#0D0D0D] rounded-full hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center relative"
                        aria-label="Enviar"
                    >
                        <span v-if="cooldownRemaining > 0" class="text-[11px] font-bold">{{ cooldownRemaining }}</span>
                        <div v-else-if="sending" class="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0D0D0D]"></div>
                        <svg aria-hidden="true" v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                    </button>
                </form>
                <p v-if="errorMsg" class="px-3 pb-2 text-xs text-[#C41E3A]">{{ errorMsg }}</p>
            </div>
        </section>

        <!-- Modales de moderación -->
        <SuspendUserModal
            v-if="suspendTarget"
            :open="!!suspendTarget"
            :target="suspendTarget"
            :channelId="activeChannelId"
            :channelName="activeChannel?.name || ''"
            @close="suspendTarget = null"
            @suspended="onUserSuspended"
        />
        <AdminSuspensionsPanel
            :open="showSuspensionsPanel"
            @close="showSuspensionsPanel = false"
        />
    </div>
</template>

<script>
import { getInitials, formatMessageTime, formatDateTime } from '../utils/format.js';
import SuspendUserModal from '../components/SuspendUserModal.vue';
import AdminSuspensionsPanel from '../components/AdminSuspensionsPanel.vue';
import { useAuth } from '../composables/useAuth.js';
import { useProfile } from '../composables/useProfile.js';
import { createSlugFromDisplayName } from '../services/profiles.js';
import {
    getChannels,
    getChannelMessages,
    sendChannelMessage,
    subscribeToChannel,
    subscribeToChannels,
    unsubscribeChannel,
    setChannelOverride,
    computeChannelOpen,
    isWeekendInArgentina
} from '../services/public-chat.js';
import {
    getMyActiveSuspensionForChannel,
    subscribeToMySuspensions,
    unsubscribeSuspensions
} from '../services/chat-moderation.js';

export default {
    name: 'PublicChat',
    components: { SuspendUserModal, AdminSuspensionsPanel },
    setup() {
        const { isAuthenticated, userId, userEmail, userDisplayName } = useAuth();
        const { isPro: isAdmin } = useProfile();
        return {
            isAuthenticated,
            currentUserId: userId,
            userEmail,
            userDisplayName,
            isAdmin,
            createSlugFromDisplayName
        };
    },
    data() {
        return {
            channels: [],
            activeChannelId: 'global',
            messages: [],
            newMessage: { content: '' },
            loading: true,
            sending: false,
            adminBusy: false,
            errorMsg: '',
            chatSubscription: null,
            channelsSubscription: null,
            lastSentAt: 0,
            now: Date.now(),
            tickInterval: null,
            // Moderación
            suspendTarget: null,             // mensaje cuyo autor vamos a suspender
            showSuspensionsPanel: false,
            mySuspension: null,
            suspensionsSubscription: null,
            // Sub-canales / dropdowns
            openDropdownId: null,
            dropdownRefs: {},
            // Menú admin (gear en el header)
            adminMenuOpen: false,
            adminMenuRef: null
        };
    },
    computed: {
        activeChannel() {
            return this.channels.find(c => c.id === this.activeChannelId) || null;
        },
        activeChannelOpen() {
            return computeChannelOpen(this.activeChannel);
        },
        topLevelChannels() {
            // Canales sin parent_id, ordenados
            return this.channels
                .filter(c => !c.parent_id)
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        },
        cooldownRemaining() {
            if (this.isAdmin || !this.activeChannel) return 0;
            const limit = (this.activeChannel.rate_limit_seconds || 15) * 1000;
            const elapsed = this.now - this.lastSentAt;
            const remainingMs = limit - elapsed;
            return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
        }
    },
    methods: {
        isOpen(channel) {
            return computeChannelOpen(channel);
        },

        // ----- Grupos / dropdowns -----
        childrenOf(parentId) {
            return this.channels
                .filter(c => c.parent_id === parentId)
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        },
        toggleGroupDropdown(groupId) {
            this.openDropdownId = this.openDropdownId === groupId ? null : groupId;
        },
        setDropdownRef(id, el) {
            if (el) this.dropdownRefs[id] = el;
        },
        setAdminMenuRef(el) {
            this.adminMenuRef = el;
        },
        handleClickOutsideDropdown(event) {
            // Cerrar dropdown de grupo
            if (this.openDropdownId) {
                const el = this.dropdownRefs[this.openDropdownId];
                if (el && !el.contains(event.target)) this.openDropdownId = null;
            }
            // Cerrar menú admin
            if (this.adminMenuOpen && this.adminMenuRef && !this.adminMenuRef.contains(event.target)) {
                this.adminMenuOpen = false;
            }
        },
        // Mostrar avatar solo cuando cambia el emisor respecto al mensaje anterior
        showAvatar(idx) {
            if (idx === 0) return true;
            return this.messages[idx - 1].user_id !== this.messages[idx].user_id;
        },

        async selectChannel(channelId) {
            // Cerrar el dropdown siempre, incluso si se re-selecciona el canal activo
            this.openDropdownId = null;
            // Si por error se intentó seleccionar un grupo, ir al primer hijo
            const ch = this.channels.find(c => c.id === channelId);
            if (ch?.is_group) {
                const first = this.childrenOf(ch.id)[0];
                if (!first) return;
                channelId = first.id;
            }
            if (channelId === this.activeChannelId) return;
            this.activeChannelId = channelId;
            this.errorMsg = '';
            this.lastSentAt = 0;
            await this.loadMessages();
            this.resubscribe();
            await this.loadMySuspension();
        },

        async loadChannels() {
            const { channels, error } = await getChannels();
            if (error) {
                console.error('Error loading channels:', error);
                return;
            }
            this.channels = channels;

            // Si el canal activo no existe o es un grupo, fallback al primer canal válido
            const current = this.channels.find(c => c.id === this.activeChannelId);
            if (!current || current.is_group) {
                const firstUsable = this.channels.find(c => !c.is_group);
                if (firstUsable) this.activeChannelId = firstUsable.id;
            }
        },

        async loadMessages() {
            this.loading = true;
            try {
                const { messages, error } = await getChannelMessages(this.activeChannelId);
                if (error) {
                    console.error('Error loading messages:', error);
                    this.messages = [];
                    return;
                }
                this.messages = messages;
                this.$nextTick(() => this.scrollToBottom());
            } finally {
                this.loading = false;
            }
        },

        async handleSubmit() {
            if (!this.newMessage.content.trim()) return;
            if (this.cooldownRemaining > 0) return;

            this.sending = true;
            this.errorMsg = '';

            try {
                const { message, error } = await sendChannelMessage(
                    this.currentUserId,
                    this.activeChannelId,
                    this.newMessage.content
                );

                if (error) {
                    this.errorMsg = this.formatSendError(error);
                    return;
                }

                if (message) {
                    const exists = this.messages.some(m => m.id === message.id);
                    if (!exists) {
                        this.messages.push({
                            id: message.id,
                            user_id: this.currentUserId,
                            channel_id: this.activeChannelId,
                            content: message.content,
                            created_at: message.created_at,
                            display_name: this.userDisplayName || 'Usuario',
                            avatar_url: null,
                            is_admin: this.isAdmin
                        });
                    }
                    this.lastSentAt = Date.now();
                    this.newMessage.content = '';
                    this.$nextTick(() => this.scrollToBottom());
                }
            } catch (error) {
                console.error('Unexpected error:', error);
                this.errorMsg = 'Error inesperado al enviar mensaje';
            } finally {
                this.sending = false;
            }
        },

        formatSendError(error) {
            const raw = error.message || '';
            if (raw.includes('Esperá') || raw.includes('rate')) {
                return raw;
            }
            if (raw.includes('cerrado')) {
                return 'El canal está cerrado en este momento.';
            }
            return raw || 'Error al enviar mensaje';
        },

        resubscribe() {
            if (this.chatSubscription) {
                unsubscribeChannel(this.chatSubscription);
                this.chatSubscription = null;
            }
            this.chatSubscription = subscribeToChannel(this.activeChannelId, (message) => {
                if (this.messages.some(m => m.id === message.id)) return;
                this.messages.push(message);
                this.$nextTick(() => {
                    const container = this.$refs.messageContainer;
                    if (container) {
                        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
                        if (isNearBottom) this.scrollToBottom();
                    }
                });
            });
        },

        async toggleChannel() {
            if (!this.activeChannel || this.adminBusy) return;
            this.adminBusy = true;

            const ch = this.activeChannel;
            const naturalOpen = ch.weekend_only ? isWeekendInArgentina() : true;
            const wantOpen = !this.activeChannelOpen;

            // Si lo que el admin quiere coincide con el estado natural, volvemos a 'auto'.
            // Si difiere, forzamos 'open' o 'closed'.
            const newOverride = (wantOpen === naturalOpen) ? 'auto' : (wantOpen ? 'open' : 'closed');

            try {
                const { channel, error } = await setChannelOverride(ch.id, newOverride);
                if (error) {
                    this.errorMsg = error.message || 'Error al cambiar estado del canal';
                    return;
                }
                if (channel) this.applyChannelUpdate(channel);
            } finally {
                this.adminBusy = false;
            }
        },

        async resetOverride() {
            if (!this.activeChannel || this.adminBusy) return;
            this.adminBusy = true;
            try {
                const { channel, error } = await setChannelOverride(this.activeChannel.id, 'auto');
                if (error) {
                    this.errorMsg = error.message || 'Error al resetear';
                    return;
                }
                if (channel) this.applyChannelUpdate(channel);
            } finally {
                this.adminBusy = false;
            }
        },

        applyChannelUpdate(updated) {
            const idx = this.channels.findIndex(c => c.id === updated.id);
            if (idx >= 0) this.channels.splice(idx, 1, { ...this.channels[idx], ...updated });
        },

        // ----- Moderación -----
        openSuspendModal(message) {
            this.suspendTarget = {
                id: message.user_id,
                display_name: message.display_name,
                avatar_url: message.avatar_url
            };
        },
        onUserSuspended() {
            // No hace falta hacer nada extra: el panel admin se autorefresca por realtime
        },
        async loadMySuspension() {
            if (!this.currentUserId) {
                this.mySuspension = null;
                return;
            }
            const { suspension } = await getMyActiveSuspensionForChannel(this.currentUserId, this.activeChannelId);
            this.mySuspension = suspension;
        },
        // Momento en que vence la suspensión (fecha + hora)
        formatExpiry: formatDateTime,

        scrollToBottom() {
            const container = this.$refs.messageContainer;
            if (container) container.scrollTop = container.scrollHeight;
        },

        getInitials,
        // Hora de la burbuja de mensaje ("Ahora", "Hace 5m", "5 mar")
        formatTime: formatMessageTime,

        handleImageError(event) {
            event.target.style.display = 'none';
        }
    },

    async mounted() {
        await this.loadChannels();
        await this.loadMessages();
        this.resubscribe();
        await this.loadMySuspension();

        // Realtime: cuando el admin cambia el toggle, todos los clientes se enteran
        this.channelsSubscription = subscribeToChannels((updated) => {
            this.applyChannelUpdate(updated);
        });

        // Realtime: cuando cambia mi suspensión, actualizar banner
        if (this.currentUserId) {
            this.suspensionsSubscription = subscribeToMySuspensions(this.currentUserId, () => {
                this.loadMySuspension();
            });
        }

        // Tick para countdown del cooldown
        this.tickInterval = setInterval(() => {
            this.now = Date.now();
        }, 1000);

        // Cerrar dropdown de grupo al clickear fuera
        document.addEventListener('click', this.handleClickOutsideDropdown);
    },

    beforeUnmount() {
        unsubscribeChannel(this.chatSubscription);
        unsubscribeChannel(this.channelsSubscription);
        unsubscribeSuspensions(this.suspensionsSubscription);
        if (this.tickInterval) clearInterval(this.tickInterval);
        document.removeEventListener('click', this.handleClickOutsideDropdown);
    }
};
</script>

<style scoped>
/*
 * Fondo del área de mensajes: trama de marca borgoña sobre negro
 * (06_borgona_linea_sobre_negro del pack tramas-10-9/), en bajo
 * contraste para no competir con las burbujas de texto.
 */
.chat-trama {
    background-color: rgba(13, 13, 13, 0.4);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='168' height='168' viewBox='0 0 168 168'%3E%3Cg fill='none' stroke='%237A0A1C' stroke-opacity='0.22' stroke-width='3'%3E%3Cpolygon points='68,8 132,8 168,44 168,108 132,144 68,144 32,108 32,44'/%3E%3Cpolygon points='-16,8 48,8 84,44 84,108 48,144 -16,144 -52,108 -52,44'/%3E%3Cpolygon points='152,8 216,8 252,44 252,108 216,144 152,144 116,108 116,44'/%3E%3C/g%3E%3C/svg%3E");
    background-size: 126px 126px;
    background-repeat: repeat;
}

@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in {
    animation: fade-in 0.3s ease-out;
}
</style>
