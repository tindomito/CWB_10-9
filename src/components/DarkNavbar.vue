<template>
  <nav
    class="sticky top-0 z-40 bg-gradient-to-b from-[#141414] to-black"
    style="border-bottom: 1px solid rgba(212, 175, 55, 0.25); box-shadow: 0 1px 12px rgba(0,0,0,0.5);"
  >
    <div class="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
      <div class="relative flex h-14 lg:h-16 items-center justify-between">

        <!-- Logo y enlaces -->
        <div class="flex flex-1 items-center justify-start">
          <div class="flex shrink-0 items-center">
            <RouterLink to="/" class="flex items-center gap-2 group" aria-label="10-9 · Home">
              <img
                src="/brand/logo-10-9.svg"
                alt=""
                width="40"
                height="40"
                class="h-9 w-9 sm:h-10 sm:w-10 shrink-0 select-none drop-shadow-[0_0_6px_rgba(212,175,55,0.25)] group-hover:drop-shadow-[0_0_10px_rgba(212,175,55,0.45)] transition"
                draggable="false"
              />
              <!-- Wordmark (legible incluso cuando el medallón es chico) -->
              <span class="font-extrabold text-lg sm:text-xl tracking-tight leading-none select-none">
                <span class="text-white">10</span><span class="text-[#D4AF37]">-9</span>
              </span>
            </RouterLink>
          </div>
          <div class="hidden lg:ml-6 lg:flex space-x-4">
            <RouterLink
              to="/"
              class="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white"
              active-class="!bg-[#D4AF37]/10 !text-white !border-b-2 !border-[#D4AF37]"
            >
              Home
            </RouterLink>
            <RouterLink
              to="/peleadores"
              class="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white"
              active-class="!bg-[#D4AF37]/10 !text-white !border-b-2 !border-[#D4AF37]"
            >
              Peleadores
            </RouterLink>
            <RouterLink
              to="/predicciones"
              class="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white"
              active-class="!bg-[#D4AF37]/20 !text-white !border-b-2 !border-[#D4AF37]"
            >
              Predicciones
            </RouterLink>
            <!-- Enlaces adicionales cuando esté autenticado -->
            <template v-if="isAuthenticated">
              <RouterLink
                to="/publicaciones"
                class="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white"
                active-class="!bg-[#D4AF37]/10 !text-white !border-b-2 !border-[#D4AF37]"
              >
                Publicaciones
              </RouterLink>
              <RouterLink
                to="/mensajes"
                class="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white"
                active-class="!bg-[#D4AF37]/10 !text-white !border-b-2 !border-[#D4AF37]"
              >
                <svg aria-hidden="true" class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                Mensajes
            </RouterLink>
            </template>
          </div>
        </div>

        <!-- Sección derecha del navbar -->
        <div class="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0 gap-1 sm:gap-3">
          <!-- Buscador unificado (usuarios + peleadores) -->
          <UnifiedSearch v-if="isAuthenticated" />

          <!-- Si NO está autenticado -->
          <template v-if="!isAuthenticated && !loading">
            <!-- Desktop: botones completos -->
            <div class="hidden lg:flex lg:space-x-2">
              <RouterLink
                to="/ingresar"
                class="rounded-md px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white border border-zinc-700 hover:border-zinc-500 transition duration-200"
              >
                Iniciar Sesión
              </RouterLink>
              <RouterLink
                to="/registro"
                class="rounded-md px-3 py-2 text-sm font-bold text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 transition duration-200"
              >
                Registrarse
              </RouterLink>
            </div>
            <!-- Mobile / tablet: botón compacto -->
            <RouterLink
              to="/ingresar"
              class="lg:hidden rounded-md px-3 py-1.5 text-xs font-bold text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400"
            >
              Ingresar
            </RouterLink>
          </template>

          <!-- Si está autenticado -->
          <template v-if="isAuthenticated">

            <!-- Bell de notificaciones -->
            <NotificationsBell />

            <!-- Dropdown perfil -->
            <div class="relative" data-dropdown>
              <button
                @click.stop="profileMenuOpen = !profileMenuOpen"
                class="relative flex items-center space-x-2 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37] text-gray-300 hover:text-white p-1 sm:p-2"
              >
                <span class="sr-only">Open user menu</span>
                <div class="flex items-center space-x-2">
                  <div class="h-[26px] w-[26px] sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center overflow-hidden">
                    <img
                      v-if="avatarUrl"
                      :src="avatarUrl"
                      :alt="userDisplayName || 'Avatar'"
                      class="w-full h-full object-cover"
                      @error="$event.target.style.display='none'"
                    />
                    <span v-else class="text-xs sm:text-sm font-medium text-white">
                      {{ userInitials }}
                    </span>
                  </div>
                  <span class="hidden lg:block text-sm font-medium">
                    {{ userDisplayName || userEmail }}
                  </span>
                  <svg aria-hidden="true"
                    class="hidden lg:block h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </button>

              <div v-show="profileMenuOpen" class="absolute right-0 mt-2 w-48 rounded-md bg-zinc-900 py-1 shadow-lg ring-1 ring-amber-500/20 z-[100]">
                <div class="px-4 py-2 text-xs text-gray-400 border-b border-zinc-700">
                  Conectado como<br />
                  <span class="font-medium text-gray-200">{{ userEmail }}</span>
                </div>
                <RouterLink
                  :to="`/perfil/${userProfileSlug}`"
                  @click="profileMenuOpen = false"
                  class="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition duration-200"
                >
                  <svg aria-hidden="true" class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  Mi Perfil
                </RouterLink>
                <RouterLink
                  to="/ajustes"
                  @click="profileMenuOpen = false"
                  class="block px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition duration-200"
                >
                  <svg aria-hidden="true" class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Configuración
                </RouterLink>
                <button
                  @click="handleLogout"
                  class="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition duration-200"
                >
                  <svg aria-hidden="true" class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </template>

          <!-- Loading state -->
          <template v-if="loading">
            <div class="flex items-center space-x-2">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF37]"></div>
            </div>
          </template>
        </div>
      </div>
    </div>

  </nav>
</template>

<script>
import { useAuth } from '../composables/useAuth.js';
import { useProfile } from '../composables/useProfile.js';
import { logout } from '../services/auth.js';
import { createSlugFromDisplayName } from '../services/profiles.js';
import { getInitials } from '../utils/format.js';
import NotificationsBell from './NotificationsBell.vue';
import UnifiedSearch from './UnifiedSearch.vue';

export default {
  name: 'DarkNavbar',
  components: { NotificationsBell, UnifiedSearch },
  setup() {
    const { isAuthenticated, loading, userEmail, userDisplayName, userId, clearUser, initialize } = useAuth();
    const { avatarUrl, clearCurrentProfile } = useProfile();
    return { isAuthenticated, loading, userEmail, userDisplayName, userId, avatarUrl, clearUser, clearCurrentProfile, initialize };
  },
  data() {
    return {
      profileMenuOpen: false
    };
  },
  computed: {
    // Slug del perfil del usuario actual (para el link a su propio perfil)
    userProfileSlug() {
      return this.userDisplayName ? createSlugFromDisplayName(this.userDisplayName) : this.userId;
    },
    userInitials() {
      if (this.userDisplayName) return getInitials(this.userDisplayName);
      if (this.userEmail) return this.userEmail.charAt(0).toUpperCase();
      return 'U';
    }
  },
  mounted() {
    this.initialize();
    document.addEventListener('click', this.handleClickOutside);
  },
  unmounted() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  methods: {
    async handleLogout() {
      try {
        this.profileMenuOpen = false;
        const { error } = await logout();
        if (error) console.error('Error during logout:', error);
        this.clearUser();
        this.clearCurrentProfile();
        this.$router.push('/');
      } catch (error) {
        console.error('Unexpected error during logout:', error);
      }
    },
    // Cierra el dropdown del perfil al clickear fuera
    handleClickOutside(event) {
      if (!event.target.closest('[data-dropdown]')) {
        this.profileMenuOpen = false;
      }
    }
  }
};
</script>