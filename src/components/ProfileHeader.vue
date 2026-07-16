<template>
  <div class="bg-zinc-900 rounded-lg shadow-md overflow-hidden">
    <!-- Cover: imagen custom o gradient borgoña por defecto -->
    <div class="relative h-32 sm:h-40 overflow-hidden bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A]">
      <img
        v-if="profile.cover_url"
        :src="profile.cover_url"
        :alt="`Cover de ${profile.display_name || 'usuario'}`"
        class="absolute inset-0 w-full h-full object-cover"
        :style="{ objectPosition: `50% ${profile.cover_position ?? 50}%` }"
        @error="$event.target.style.display='none'"
      />
    </div>

    <!-- Profile info -->
    <div class="px-4 py-4 sm:px-6 sm:py-6">
      <div class="flex flex-col sm:flex-row sm:items-start sm:space-x-6">
        <!-- Avatar (encima del cover, con z-index para garantizar layer) -->
        <div class="relative z-10 flex-shrink-0 -mt-16 mb-4 sm:mb-0">
          <div class="w-24 h-24 rounded-full bg-zinc-900 p-1 shadow-lg ring-1 ring-[#D4AF37]/30">
            <div 
              class="w-full h-full rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold text-2xl"
            >
              <img 
                v-if="profile.avatar_url" 
                :src="profile.avatar_url" 
                :alt="`Avatar de ${profile.display_name}`"
                class="w-full h-full rounded-full object-cover"
                @error="handleImageError"
              />
              <span v-else>{{ avatarInitials }}</span>
            </div>
          </div>
        </div>

        <!-- Información principal -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 class="text-2xl font-bold text-white mb-2">
                {{ profile.display_name || 'Usuario sin nombre' }}
              </h1>
              <div class="mb-3">
                <RankBadge 
                  :rango="profile.rango" 
                  :isPro="profile.pro"
                  :showProgress="true"
                />
              </div>
            </div>
            
            <!-- Botones de acción -->
            <div class="flex flex-wrap gap-2">
              <!-- Botón Editar Perfil (si es tu perfil) -->
              <button
                v-if="isOwnProfile"
                @click="$emit('edit-profile')"
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37]"
              >
                <svg aria-hidden="true" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Editar Perfil
              </button>
              
              <!-- Botones para otros perfiles -->
              <template v-else>
                <!-- Botón Seguir/Siguiendo -->
                <button
                  @click="$emit('follow-toggle')"
                  :disabled="followLoading"
                  :class="[
                    'inline-flex items-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 transition-colors duration-200',
                    isFollowing
                      ? 'border border-red-500 text-amber-400 bg-red-900/30 hover:bg-red-900/30 hover:border-red-500 hover:text-red-400'
                      : 'border border-zinc-700 text-gray-300 bg-zinc-800 hover:bg-zinc-700'
                  ]"
                  @mouseenter="hoveringFollowBtn = true"
                  @mouseleave="hoveringFollowBtn = false"
                >
                  <svg aria-hidden="true" v-if="followLoading" class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <template v-else>
                    <svg aria-hidden="true" v-if="isFollowing && hoveringFollowBtn" class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <svg aria-hidden="true" v-else-if="isFollowing" class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <svg aria-hidden="true" v-else class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                  </template>
                  {{ followButtonText }}
                </button>

  <!-- Botón Enviar Mensaje -->
  <RouterLink
    :to="{ name: 'PrivateChat', params: { displayName: profileSlug } }"
    class="inline-flex items-center px-4 py-2 border border-zinc-700 text-sm font-medium rounded-md text-gray-300 bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37]"
  >
    <svg aria-hidden="true" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
    </svg>
    Mensaje
  </RouterLink>
</template>
            </div>
          </div>
          
          <!-- Bio -->
          <div v-if="profile.bio" class="mt-4">
            <p class="text-gray-300 leading-relaxed">
              {{ profile.bio }}
            </p>
          </div>

          <!-- Estadísticas -->
          <div class="mt-4 sm:mt-6 grid grid-cols-3 gap-2 sm:gap-4">
            <div class="bg-zinc-800 rounded-lg p-3 sm:p-4 text-center">
              <div class="text-xl sm:text-2xl font-bold text-white">{{ stats.publicationsCount || 0 }}</div>
              <div class="text-xs sm:text-sm text-gray-400">Publicaciones</div>
            </div>
            <button
              type="button"
              @click="$emit('open-followers')"
              class="bg-zinc-800 rounded-lg p-3 sm:p-4 text-center hover:bg-zinc-700 hover:ring-1 hover:ring-[#D4AF37]/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60"
            >
              <div class="text-xl sm:text-2xl font-bold text-white group-hover:text-[#D4AF37]">{{ stats.followersCount || 0 }}</div>
              <div class="text-xs sm:text-sm text-gray-400">Seguidores</div>
            </button>
            <button
              type="button"
              @click="$emit('open-following')"
              class="bg-zinc-800 rounded-lg p-3 sm:p-4 text-center hover:bg-zinc-700 hover:ring-1 hover:ring-[#D4AF37]/40 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/60"
            >
              <div class="text-xl sm:text-2xl font-bold text-white">{{ stats.followingCount || 0 }}</div>
              <div class="text-xs sm:text-sm text-gray-400">Siguiendo</div>
            </button>
          </div>

          <!-- Barra de XP / Nivel -->
          <div class="mt-4 sm:mt-5 bg-zinc-800/60 border border-zinc-800 rounded-lg p-3 sm:p-4">
            <div class="flex items-end justify-between mb-2">
              <div>
                <p class="text-[10px] text-gray-400 uppercase tracking-widest">Nivel</p>
                <p class="text-sm sm:text-base font-bold text-white">
                  <span class="text-[#D4AF37]">{{ xpProgress.currentLevel.level }}</span>
                  · {{ xpProgress.currentLevel.name }}
                </p>
              </div>
              <p class="text-xs text-gray-300 font-medium">
                <span class="text-white font-bold">{{ Number(profile.xp || 0).toLocaleString() }}</span> XP
              </p>
            </div>
            <div class="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-[#7A0A1C] to-[#D4AF37] transition-all"
                :style="{ width: xpProgress.percent + '%' }"
              ></div>
            </div>
            <p class="text-[10px] text-gray-500 mt-1.5">
              <template v-if="xpProgress.nextLevel">
                {{ xpProgress.xpInCurrent }} / {{ xpProgress.xpForNext }} XP hacia
                <span class="text-[#D4AF37]">{{ xpProgress.nextLevel.name }}</span>
              </template>
              <template v-else>
                Nivel máximo alcanzado
              </template>
            </p>
            <!-- Racha -->
            <div v-if="(profile.current_streak || 0) > 0 || (profile.longest_streak || 0) > 0"
                 class="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px]">
              <span class="text-gray-400">
                Racha actual:
                <span class="text-orange-400 font-bold">🔥 {{ profile.current_streak || 0 }}</span>
              </span>
              <span class="text-gray-500">
                Mejor: <span class="text-gray-300 font-medium">{{ profile.longest_streak || 0 }}</span>
              </span>
            </div>
          </div>

          <!-- Hall of Fame badge (sec 4) -->
          <div v-if="competitiveRating" class="mt-3 rounded-lg p-3 sm:p-4 border" :class="hofDivision?.bgClass || 'border-zinc-800'">
            <div class="flex items-center justify-between mb-2">
              <div>
                <p class="text-[10px] uppercase tracking-widest opacity-80">{{ hofDivision?.label || 'Hall of Fame' }}</p>
                <p class="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>🏆</span>
                  <span>{{ competitiveRating.rating }}</span>
                  <span class="text-[10px] opacity-70">peak {{ competitiveRating.peak_rating }}</span>
                </p>
              </div>
              <div class="text-right text-[10px]">
                <p class="opacity-80">{{ competitiveRating.correct_count }}/{{ competitiveRating.fights_resolved }} aciertos</p>
                <p v-if="competitiveRating.is_inactive" class="opacity-70 mt-0.5">⏸️ Inactivo</p>
              </div>
            </div>
            <div v-if="hofProgress?.next" class="h-1 bg-black/40 rounded-full overflow-hidden">
              <div class="h-full bg-current opacity-80 transition-all" :style="{ width: hofProgress.percent + '%' }"></div>
            </div>
            <p v-if="hofProgress?.next" class="text-[10px] opacity-70 mt-1">
              {{ hofProgress.next.ratingMin - competitiveRating.rating }} para {{ hofProgress.next.id }}
            </p>
          </div>

          <!-- Miembro desde (debajo de las stats) -->
          <p class="mt-3 text-xs text-gray-500 text-center sm:text-left">
            Miembro desde <span class="text-gray-300">{{ memberSinceFormatted }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import RankBadge from './RankBadge.vue';
import { createSlugFromDisplayName } from '../services/profiles.js';
import { progressFromXp } from '../services/leveling.js';
import { divisionFromRating, progressInDivision } from '../services/hallOfFame.js';
import { getInitials } from '../utils/format.js';

export default {
  name: 'ProfileHeader',
  components: { RankBadge },
  props: {
    profile: { type: Object, required: true },
    isOwnProfile: { type: Boolean, required: true },
    stats: { type: Object, required: true },
    memberSinceFormatted: { type: String, required: true },
    followLoading: { type: Boolean, default: false },
    isFollowing: { type: Boolean, default: false },
    competitiveRating: { type: Object, default: null }
  },
  emits: ['edit-profile', 'follow-toggle', 'open-followers', 'open-following'],
  data() {
    return {
      // Estado para el hover del botón de seguir
      hoveringFollowBtn: false
    };
  },
  computed: {
    followButtonText() {
      if (this.followLoading) return '';
      if (this.isFollowing && this.hoveringFollowBtn) return 'Dejar de seguir';
      if (this.isFollowing) return 'Siguiendo';
      return 'Seguir';
    },
    // Progreso de XP hacia el próximo nivel (lee profile.xp, default 0)
    xpProgress() {
      return progressFromXp(this.profile?.xp || 0);
    },
    // Datos del modo competitivo (Hall of Fame): solo si hay rating cargado
    hofDivision() {
      return this.competitiveRating ? divisionFromRating(this.competitiveRating.rating) : null;
    },
    hofProgress() {
      return this.competitiveRating ? progressInDivision(this.competitiveRating.rating) : null;
    },
    avatarInitials() {
      return getInitials(this.profile.display_name);
    },
    // Slug del perfil (para el link al chat privado)
    profileSlug() {
      if (!this.profile) return '';
      return this.profile.display_name
        ? createSlugFromDisplayName(this.profile.display_name)
        : this.profile.id;
    }
  },
  methods: {
    handleImageError(event) {
      event.target.style.display = 'none';
    }
  }
};
</script>