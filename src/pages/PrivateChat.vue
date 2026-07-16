<!--
    Chat privado 1 a 1 (/chat/:displayName). Resuelve el otro usuario por
    su slug, carga los últimos mensajes, marca como leídos los recibidos
    y se mantiene sincronizado por realtime.
-->
<template>
  <div class="max-w-3xl mx-auto -mx-3 -mt-3 sm:mt-0 sm:mx-auto">
    <section
      class="bg-zinc-900 sm:rounded-xl sm:border border-zinc-800 overflow-hidden flex flex-col h-[calc(100dvh-132px-env(safe-area-inset-bottom))] sm:h-[calc(100dvh-156px-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-11rem)]"
    >
      <!-- Header del chat (fijo arriba) -->
      <div class="px-3 sm:px-4 py-2.5 border-b border-zinc-800 bg-zinc-900 flex items-center gap-3 shrink-0">
        <RouterLink to="/mensajes" class="text-gray-400 hover:text-white sm:hidden shrink-0" aria-label="Volver">
          <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
          </svg>
        </RouterLink>

        <div v-if="loadingOtherUser" class="flex items-center gap-3">
          <div class="animate-pulse flex items-center gap-3">
            <div class="h-9 w-9 bg-zinc-800 rounded-full"></div>
            <div class="h-4 w-32 bg-zinc-800 rounded"></div>
          </div>
        </div>
        <RouterLink
          v-else-if="otherUser"
          :to="`/perfil/${otherUserSlug}`"
          class="flex items-center gap-3 min-w-0 hover:opacity-90"
        >
          <div class="h-9 w-9 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center overflow-hidden shrink-0">
            <img v-if="otherUser.avatar_url" :src="otherUser.avatar_url" :alt="otherUser.display_name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
            <span v-else class="text-sm font-medium text-white">{{ getUserInitials(otherUser.display_name) }}</span>
          </div>
          <div class="min-w-0">
            <h1 class="text-base font-semibold text-white truncate leading-tight">{{ otherUser.display_name || 'Usuario' }}</h1>
            <p class="text-[11px] text-gray-500 truncate">{{ otherUser.rango || 'Amateur' }}</p>
          </div>
        </RouterLink>
        <div v-else class="text-gray-400 text-sm">Usuario no encontrado</div>
      </div>

      <!-- Contenedor de mensajes (único que scrollea) -->
      <div ref="chatContainer" class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[#0D0D0D]/40">
        <div v-if="loadingMessages" class="flex justify-center items-center h-full">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
        </div>

        <template v-else-if="messages.length > 0">
          <div
            v-for="(message, idx) in messages"
            :key="message.id"
            :class="[
              'flex gap-2 group items-end',
              message.sender_id === currentUserId ? 'flex-row-reverse' : 'flex-row'
            ]"
          >
            <!-- Avatar (solo en el primer mensaje de una tanda del mismo emisor) -->
            <div class="shrink-0 w-7">
              <div
                v-if="showAvatar(idx)"
                class="h-7 w-7 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center overflow-hidden"
              >
                <img
                  v-if="message.sender_id !== currentUserId && otherUser?.avatar_url"
                  :src="otherUser.avatar_url" :alt="otherUser.display_name"
                  class="w-full h-full object-cover" @error="$event.target.style.display='none'"
                />
                <span v-else class="text-[10px] font-medium text-white">
                  {{ message.sender_id === currentUserId ? getUserInitials(userDisplayName) : getUserInitials(otherUser?.display_name) }}
                </span>
              </div>
            </div>

            <div :class="['flex flex-col max-w-[78%] sm:max-w-[70%]', message.sender_id === currentUserId ? 'items-end' : 'items-start']">
              <div class="flex items-end gap-1.5" :class="message.sender_id === currentUserId ? 'flex-row-reverse' : ''">
                <div
                  :class="[
                    'px-3.5 py-2 rounded-2xl break-words shadow-sm',
                    message.sender_id === currentUserId
                      ? 'bg-[#7A0A1C] text-white rounded-br-none'
                      : 'bg-zinc-800 text-gray-100 rounded-bl-none'
                  ]"
                >
                  <p class="text-sm whitespace-pre-wrap break-words">{{ message.content }}</p>
                </div>
                <!-- Botón eliminar (solo Admin) -->
                <button
                  v-if="isAdmin"
                  @click="askDelete(message.id)"
                  class="p-1 text-gray-600 hover:text-red-400 rounded transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  title="Eliminar mensaje (Admin)"
                >
                  <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
              <span class="text-[10px] text-gray-600 mt-0.5 px-1">{{ formatDate(message.created_at) }}</span>
            </div>
          </div>
        </template>

        <div v-else class="flex justify-center items-center h-full">
          <div class="text-center">
            <p class="text-gray-400 mb-1">No hay mensajes todavía</p>
            <p class="text-gray-600 text-sm">¡Iniciá la conversación!</p>
          </div>
        </div>
      </div>

      <!-- Input (fijo abajo) -->
      <form @submit.prevent="handleSendMessage" class="p-2.5 sm:p-3 border-t border-zinc-800 bg-zinc-900 flex gap-2 items-center shrink-0">
        <textarea
          v-model="newMessage"
          @keydown.enter.exact.prevent="handleSendMessage"
          aria-label="Escribir un mensaje"
          placeholder="Escribí un mensaje…"
          rows="1"
          class="flex-1 min-w-0 h-10 bg-zinc-800 text-white rounded-full px-4 py-2 leading-6 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] resize-none placeholder-gray-500 border border-zinc-700 text-sm"
        ></textarea>
        <button
          type="submit"
          :disabled="!newMessage.trim() || sending"
          class="h-10 w-10 shrink-0 bg-[#D4AF37] text-[#0D0D0D] rounded-full hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center"
          aria-label="Enviar"
        >
          <svg aria-hidden="true" v-if="!sending" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
          </svg>
          <div v-else class="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0D0D0D]"></div>
        </button>
      </form>
    </section>

    <!-- Confirmación de borrado -->
    <ConfirmDialog
      :open="showDeleteDialog"
      title="¿Eliminar mensaje?"
      message="Esta acción no se puede deshacer."
      confirmLabel="Eliminar"
      variant="danger"
      :busy="deleting"
      @cancel="showDeleteDialog = false"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script>
import { useAuth } from '../composables/useAuth.js';
import { useProfile } from '../composables/useProfile.js';
import { useToast } from '../composables/useToast.js';
import { getProfileByIdentifier, createSlugFromDisplayName } from '../services/profiles.js';
import { getPrivateMessages, sendPrivateMessage, subscribeToPrivateMessages, deletePrivateMessage } from '../services/private-chat.js';
import { getInitials as getUserInitials, formatMessageTime } from '../utils/format.js';
import ConfirmDialog from '../components/ConfirmDialog.vue';

export default {
  name: 'PrivateChat',
  components: { ConfirmDialog },
  setup() {
    const { userId, userDisplayName } = useAuth();
    const { isPro } = useProfile();
    const { error: toastError } = useToast();
    return { currentUserId: userId, userDisplayName, isAdmin: isPro, toastError };
  },
  data() {
    return {
      otherUser: null,
      loadingOtherUser: true,
      messages: [],
      loadingMessages: true,
      newMessage: '',
      sending: false,
      // Borrado (admin)
      showDeleteDialog: false,
      deleting: false,
      deleteTargetId: null,
      // Suscripción realtime
      unsubscribe: null
    };
  },
  computed: {
    otherUserSlug() {
      return createSlugFromDisplayName(this.otherUser?.display_name) || this.otherUser?.id || '';
    }
  },
  mounted() {
    this.initializeChat();
  },
  unmounted() {
    if (this.unsubscribe) this.unsubscribe();
  },
  methods: {
    getUserInitials,
    formatDate: formatMessageTime,
    /** Mostrar avatar solo si cambia el emisor respecto al mensaje anterior. */
    showAvatar(idx) {
      if (idx === 0) return true;
      return this.messages[idx - 1].sender_id !== this.messages[idx].sender_id;
    },
    async scrollToBottom() {
      await this.$nextTick();
      const el = this.$refs.chatContainer;
      if (el) el.scrollTop = el.scrollHeight;
    },
    async loadOtherUserProfile() {
      const identifier = this.$route.params.displayName;
      this.loadingOtherUser = true;
      try {
        const { profile, error } = await getProfileByIdentifier(identifier);
        if (error || !profile) {
          console.error('Error loading user profile:', error);
          this.otherUser = null;
          return;
        }
        this.otherUser = profile;
      } catch (error) {
        console.error('Unexpected error loading profile:', error);
        this.otherUser = null;
      } finally {
        this.loadingOtherUser = false;
      }
    },
    async loadMessages() {
      if (!this.otherUser) return;
      this.loadingMessages = true;
      try {
        const { messages: chatMessages, error } = await getPrivateMessages(
          this.currentUserId,
          this.otherUser.id
        );
        if (error) {
          console.error('Error loading messages:', error);
          this.messages = [];
          return;
        }
        this.messages = chatMessages || [];
        await this.scrollToBottom();
      } catch (error) {
        console.error('Unexpected error loading messages:', error);
        this.messages = [];
      } finally {
        this.loadingMessages = false;
      }
    },
    subscribeToMessages() {
      if (!this.otherUser) return;
      try {
        this.unsubscribe = subscribeToPrivateMessages(
          this.currentUserId,
          this.otherUser.id,
          (incoming) => {
            const exists = this.messages.some(msg => msg.id === incoming.id);
            if (!exists) {
              this.messages.push(incoming);
              this.scrollToBottom();
            }
          }
        );
      } catch (error) {
        console.error('Error subscribing to messages:', error);
      }
    },
    async handleSendMessage() {
      if (!this.newMessage.trim() || this.sending || !this.otherUser) return;
      this.sending = true;
      const messageContent = this.newMessage.trim();
      this.newMessage = '';
      try {
        const { message, error } = await sendPrivateMessage(
          this.currentUserId,
          this.otherUser.id,
          messageContent
        );
        if (error) {
          console.error('Error sending message:', error);
          this.toastError('Error al enviar el mensaje');
          this.newMessage = messageContent;
          return;
        }
        if (message) {
          this.messages.push({
            id: message.id,
            sender_id: this.currentUserId,
            receiver_id: this.otherUser.id,
            content: messageContent,
            created_at: new Date().toISOString(),
            read: false
          });
          await this.scrollToBottom();
        }
      } catch (error) {
        console.error('Unexpected error sending message:', error);
        this.toastError('Error inesperado al enviar el mensaje');
        this.newMessage = messageContent;
      } finally {
        this.sending = false;
      }
    },
    async initializeChat() {
      await this.loadOtherUserProfile();
      if (this.otherUser) {
        await this.loadMessages();
        this.subscribeToMessages();
      }
    },
    askDelete(messageId) {
      if (!this.isAdmin) return;
      this.deleteTargetId = messageId;
      this.showDeleteDialog = true;
    },
    async confirmDelete() {
      if (!this.deleteTargetId) return;
      this.deleting = true;
      try {
        const { error } = await deletePrivateMessage(this.deleteTargetId);
        if (error) {
          console.error('Error deleting message:', error);
          this.toastError('Error al eliminar el mensaje');
          return;
        }
        this.messages = this.messages.filter(msg => msg.id !== this.deleteTargetId);
      } catch (error) {
        console.error('Unexpected error deleting message:', error);
        this.toastError('Error inesperado al eliminar el mensaje');
      } finally {
        this.deleting = false;
        this.showDeleteDialog = false;
        this.deleteTargetId = null;
      }
    }
  }
};
</script>