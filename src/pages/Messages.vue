<!--
    Bandeja de mensajes: acceso a los chats globales arriba y después la
    lista mezclada de grupos y conversaciones 1 a 1, ordenada por último
    mensaje, con filtros Todos/Grupos/Directos. Desde acá también se
    crean grupos y se aceptan invitaciones.
-->
<template>
  <div class="pt-4 sm:pt-8 pb-8">
    <div class="max-w-4xl mx-auto px-0 sm:px-4">
      <!-- Header -->
      <div class="mb-4 px-4 sm:px-0 flex items-end justify-between gap-2">
        <div>
          <h1 class="text-3xl font-bold text-white">Mensajes</h1>
          <p class="text-gray-400 text-sm mt-1">Tus chats privados y grupos</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="pendingInvitationsCount > 0"
            @click="showInvitationsPanel = true"
            class="relative px-3 py-2 text-xs font-bold text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37]/10 rounded-lg"
          >
            Invitaciones
            <span class="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-[#D4AF37] text-[#0D0D0D] text-[10px] rounded-full">
              {{ pendingInvitationsCount }}
            </span>
          </button>
          <button
            @click="showCreateGroup = true"
            class="px-3 py-2 text-xs font-bold bg-[#D4AF37] hover:bg-amber-400 text-[#0D0D0D] rounded-lg flex items-center gap-1"
          >
            <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path>
            </svg>
            Crear grupo
          </button>
        </div>
      </div>

      <!-- Acceso a Chats Globales (siempre visible arriba) -->
      <RouterLink
        to="/chat"
        class="block mx-4 sm:mx-0 mb-4 group"
      >
        <div class="relative overflow-hidden rounded-xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#7A0A1C]/40 via-[#1C1C1C] to-[#1C1C1C] hover:border-[#D4AF37]/60 transition-all">
          <!-- Glow effect arriba -->
          <div class="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent"></div>

          <div class="p-4 flex items-center gap-4">
            <!-- Icono globo -->
            <div class="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#7A0A1C] flex items-center justify-center text-2xl shadow-lg">
              🌍
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Comunidad</p>
                <span v-if="anyGlobalChannelOpen" class="flex items-center gap-1 text-[10px] text-emerald-400">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  En vivo
                </span>
              </div>
              <h2 class="text-white font-bold text-base sm:text-lg leading-tight">Chats Globales</h2>
              <p class="text-xs text-gray-400 mt-0.5 truncate">
                <template v-if="globalChannelsLoading">Cargando canales…</template>
                <template v-else-if="globalChannelLabels.length === 0">Sin canales disponibles</template>
                <template v-else>{{ globalChannelLabels.join(' · ') }}</template>
              </p>
            </div>

            <!-- Flecha -->
            <svg aria-hidden="true" class="w-5 h-5 text-gray-500 group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </RouterLink>

      <!-- Loading -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center mx-4 sm:mx-0">
        <p class="text-red-400 text-lg mb-4">{{ error }}</p>
        <button @click="loadAll" class="px-4 py-2 text-[#D4AF37] border border-[#D4AF37]/40 rounded-lg hover:bg-[#D4AF37]/10 font-medium">
          Reintentar
        </button>
      </div>

      <!-- Tabs Grupos / 1-1 -->
      <div v-else class="flex gap-2 px-4 sm:px-0 mb-3">
        <button
          @click="activeTab = 'all'"
          :class="tabClass('all')"
        >
          Todos
          <span class="text-[10px] opacity-60 ml-1">({{ groups.length + conversations.length }})</span>
        </button>
        <button
          @click="activeTab = 'groups'"
          :class="tabClass('groups')"
        >
          Grupos
          <span class="text-[10px] opacity-60 ml-1">({{ groups.length }})</span>
        </button>
        <button
          @click="activeTab = 'direct'"
          :class="tabClass('direct')"
        >
          Directos
          <span class="text-[10px] opacity-60 ml-1">({{ conversations.length }})</span>
        </button>
      </div>

      <!-- Lista mezclada -->
      <div v-if="!loading && !error">
        <ul v-if="visibleItems.length > 0" class="bg-zinc-900 sm:rounded-lg shadow-lg overflow-hidden divide-y divide-zinc-800">
          <li v-for="item in visibleItems" :key="item._key">
            <!-- GRUPO -->
            <RouterLink
              v-if="item._type === 'group'"
              :to="{ name: 'GroupChat', params: { id: item.id } }"
              class="flex items-center gap-4 p-4 hover:bg-zinc-800 transition duration-200"
            >
              <div class="flex-shrink-0 relative">
                <div class="h-14 w-14 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center overflow-hidden">
                  <img v-if="item.avatar_url" :src="item.avatar_url" :alt="item.name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                  <span v-else class="text-lg font-medium text-white">{{ getInitials(item.name) }}</span>
                </div>
                <span class="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#D4AF37] text-[#0D0D0D] text-[10px] font-bold flex items-center justify-center border-2 border-zinc-900">
                  G
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <h3 class="text-white font-semibold truncate">{{ item.name }}</h3>
                  <span class="text-xs text-gray-500 flex-shrink-0 ml-2">{{ formatDate(item.last_message_at) }}</span>
                </div>
                <p class="text-sm text-gray-400 truncate">
                  <span v-if="item.last_message_sender_id === currentUserId" class="text-gray-600">Tú: </span>
                  <span v-else-if="item.last_message_sender_name" class="text-gray-500">{{ item.last_message_sender_name }}: </span>
                  <template v-if="item.last_message">{{ item.last_message }}</template>
                  <span v-else class="italic text-gray-600">Sin mensajes todavía</span>
                </p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs px-2 py-0.5 bg-zinc-800 text-gray-400 rounded-full">
                    {{ item.member_count }} miembro{{ item.member_count === 1 ? '' : 's' }}
                  </span>
                </div>
              </div>
              <svg aria-hidden="true" class="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </RouterLink>

            <!-- CHAT DIRECTO -->
            <RouterLink
              v-else
              :to="chatRoute(item)"
              class="flex items-center gap-4 p-4 hover:bg-zinc-800 transition duration-200"
            >
              <div class="flex-shrink-0">
                <div class="h-14 w-14 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center">
                  <span class="text-lg font-medium text-white">{{ getInitials(item.otherUserDisplayName) }}</span>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <h3 class="text-white font-semibold truncate">{{ item.otherUserDisplayName || 'Usuario' }}</h3>
                  <span class="text-xs text-gray-500 flex-shrink-0 ml-2">{{ formatDate(item.lastMessageDate) }}</span>
                </div>
                <p class="text-sm text-gray-400 truncate">
                  <span v-if="item.isLastMessageFromMe" class="text-gray-600">Tú: </span>
                  {{ item.lastMessage }}
                </p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="text-xs px-2 py-0.5 bg-zinc-800 text-gray-400 rounded-full">
                    {{ item.otherUserRango || 'Amateur' }}
                  </span>
                </div>
              </div>
              <svg aria-hidden="true" class="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </RouterLink>
          </li>
        </ul>

        <!-- Vacío -->
        <div v-else class="bg-zinc-900 sm:rounded-lg shadow-lg p-12 text-center mx-4 sm:mx-0">
          <svg aria-hidden="true" class="w-20 h-20 mx-auto mb-4 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <h3 class="text-xl font-semibold text-white mb-2">{{ emptyTitle }}</h3>
          <p class="text-gray-400 mb-6">{{ emptyMessage }}</p>
          <button
            @click="showCreateGroup = true"
            class="inline-block px-6 py-3 bg-[#D4AF37] text-[#0D0D0D] font-bold rounded-lg hover:bg-amber-400"
          >
            Crear mi primer grupo
          </button>
        </div>
      </div>
    </div>

    <!-- Modales -->
    <CreateGroupModal :open="showCreateGroup" @close="showCreateGroup = false" @created="onGroupCreated" />
    <GroupInvitationsPanel :open="showInvitationsPanel" @close="showInvitationsPanel = false" @accepted="onInvitationAccepted" />
  </div>
</template>

<script>
import { useAuth } from '../composables/useAuth.js';
import { getConversations } from '../services/private-chat.js';
import {
  getMyGroups,
  getMyPendingInvitations,
  subscribeToMyGroups,
  subscribeToMyInvitations,
  unsubscribeGroupChannel
} from '../services/group-chat.js';
import { getChannels, computeChannelOpen } from '../services/public-chat.js';
import { createSlugFromDisplayName } from '../services/profiles.js';
import { getInitials, formatConversationDate } from '../utils/format.js';
import CreateGroupModal from '../components/CreateGroupModal.vue';
import GroupInvitationsPanel from '../components/GroupInvitationsPanel.vue';

export default {
  name: 'Messages',
  components: { CreateGroupModal, GroupInvitationsPanel },
  setup() {
    const { userId } = useAuth();
    return { currentUserId: userId };
  },
  data() {
    return {
      conversations: [],
      groups: [],
      pendingInvitationsCount: 0,
      loading: true,
      error: null,
      activeTab: 'all',          // 'all' | 'groups' | 'direct'
      showCreateGroup: false,
      showInvitationsPanel: false,
      // Canales globales (para la card de arriba)
      globalChannels: [],
      globalChannelsLoading: true,
      // Suscripciones realtime
      groupsSub: null,
      invitesSub: null
    };
  },
  computed: {
    globalChannelLabels() {
      return this.globalChannels
        .filter(c => !c.parent_id)  // solo top-level (Chat Global + grupo "Peleas en Vivo")
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(c => c.name);
    },
    anyGlobalChannelOpen() {
      return this.globalChannels.some(c => !c.is_group && computeChannelOpen(c));
    },
    // Merge ordenado de grupos + chats directos
    visibleItems() {
      const items = [];
      if (this.activeTab === 'all' || this.activeTab === 'groups') {
        for (const g of this.groups) {
          items.push({
            ...g,
            _type: 'group',
            _key: `g:${g.id}`,
            _sortDate: g.last_message_at || g.joined_at || g.created_at
          });
        }
      }
      if (this.activeTab === 'all' || this.activeTab === 'direct') {
        for (const c of this.conversations) {
          items.push({
            ...c,
            _type: 'direct',
            _key: `d:${c.otherUserId}`,
            _sortDate: c.lastMessageDate
          });
        }
      }
      return items.sort((a, b) => new Date(b._sortDate || 0) - new Date(a._sortDate || 0));
    },
    emptyTitle() {
      if (this.activeTab === 'groups') return 'No estás en ningún grupo';
      if (this.activeTab === 'direct') return 'No tenés conversaciones';
      return 'Sin conversaciones ni grupos';
    },
    emptyMessage() {
      if (this.activeTab === 'groups') return 'Creá uno o aceptá una invitación.';
      if (this.activeTab === 'direct') return 'Empezá a chatear con otros usuarios desde sus perfiles.';
      return 'Creá tu primer grupo o chateá con alguien desde su perfil.';
    }
  },
  mounted() {
    this.loadAll();
    this.loadGlobalChannels();
    if (this.currentUserId) {
      this.groupsSub = subscribeToMyGroups(() => this.reloadGroups());
      this.invitesSub = subscribeToMyInvitations(this.currentUserId, () => this.reloadInvitations());
    }
  },
  beforeUnmount() {
    unsubscribeGroupChannel(this.groupsSub);
    unsubscribeGroupChannel(this.invitesSub);
  },
  methods: {
    getInitials,
    formatDate: formatConversationDate,
    tabClass(id) {
      return [
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
        this.activeTab === id
          ? 'bg-[#D4AF37] border-[#D4AF37] text-[#0D0D0D]'
          : 'bg-zinc-800 border-zinc-700 text-gray-300 hover:bg-zinc-700'
      ];
    },
    async loadAll() {
      this.loading = true;
      this.error = null;
      try {
        const [convRes, groupRes, invRes] = await Promise.all([
          getConversations(this.currentUserId),
          getMyGroups(),
          getMyPendingInvitations()
        ]);
        if (convRes.error) {
          this.error = 'Error al cargar las conversaciones';
          return;
        }
        this.conversations = convRes.conversations || [];
        this.groups = groupRes.groups || [];
        this.pendingInvitationsCount = (invRes.invitations || []).length;
      } catch (err) {
        this.error = 'Error inesperado';
      } finally {
        this.loading = false;
      }
    },
    async loadGlobalChannels() {
      this.globalChannelsLoading = true;
      const { channels } = await getChannels();
      this.globalChannels = channels || [];
      this.globalChannelsLoading = false;
    },
    async reloadGroups() {
      const { groups: g } = await getMyGroups();
      this.groups = g;
    },
    async reloadInvitations() {
      const { invitations } = await getMyPendingInvitations();
      this.pendingInvitationsCount = invitations.length;
    },
    // Ruta al chat privado con este usuario (slug legible; cae al id si no
    // tiene nombre). La usa el <RouterLink> de cada item de la lista.
    chatRoute(conversation) {
      const slug = conversation.otherUserDisplayName
        ? createSlugFromDisplayName(conversation.otherUserDisplayName)
        : conversation.otherUserId;
      return { name: 'PrivateChat', params: { displayName: slug } };
    },
    // Navegación imperativa a un grupo, para cuando se recién crea o se acepta
    // una invitación (los items de la lista usan <RouterLink> directo).
    openGroup(group) {
      this.$router.push({ name: 'GroupChat', params: { id: group.id } });
    },
    onGroupCreated(group) {
      this.reloadGroups().then(() => this.openGroup(group));
    },
    onInvitationAccepted(groupId) {
      this.reloadGroups();
      this.reloadInvitations();
      if (groupId) this.$router.push({ name: 'GroupChat', params: { id: groupId } });
    }
  }
};
</script>
