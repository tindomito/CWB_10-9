<!--
    Cuerpo de resultados del buscador global: dos secciones independientes
    (usuarios de la app y peleadores de la API), cada una con su propio
    estado de carga. Lo renderiza UnifiedSearch tanto en desktop como en mobile.
-->
<template>
    <div>
        <!-- Loading inicial cuando ambos están cargando y no hay datos previos -->
        <div v-if="loadingUsers && loadingFighters && !userResults.length && !fighterResults.length" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#D4AF37]"></div>
        </div>

        <!-- Sin resultados (cuando ambas búsquedas terminaron) -->
        <div v-else-if="!loadingUsers && !loadingFighters && userResults.length === 0 && fighterResults.length === 0" class="px-5 py-10 text-center">
            <p class="text-sm text-gray-400">Sin resultados para "{{ query }}"</p>
        </div>

        <!-- Sección usuarios -->
        <div v-if="userResults.length > 0 || loadingUsers">
            <div class="px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-800 flex items-center justify-between">
                <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Usuarios</p>
                <span v-if="loadingUsers" class="text-[10px] text-gray-500">cargando…</span>
                <span v-else class="text-[10px] text-gray-500">{{ userResults.length }}</span>
            </div>
            <ul v-if="userResults.length > 0" class="divide-y divide-zinc-800">
                <li v-for="u in userResults" :key="u.id">
                    <button
                        type="button"
                        @click="$emit('navigate', { type: 'user', item: u })"
                        class="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/60 transition-colors"
                    >
                        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
                            <span>{{ getInitials(u.display_name) }}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-white truncate">{{ u.display_name || 'Usuario' }}</p>
                            <p class="text-[11px] text-gray-400 truncate">{{ u.rango || 'Amateur' }}</p>
                        </div>
                    </button>
                </li>
            </ul>
        </div>

        <!-- Sección peleadores -->
        <div v-if="fighterResults.length > 0 || loadingFighters">
            <div class="px-3 py-1.5 bg-zinc-900/50 border-y border-zinc-800 flex items-center justify-between">
                <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Peleadores</p>
                <span v-if="loadingFighters" class="text-[10px] text-gray-500">cargando…</span>
                <span v-else class="text-[10px] text-gray-500">{{ fighterResults.length }}</span>
            </div>
            <ul v-if="fighterResults.length > 0" class="divide-y divide-zinc-800">
                <li v-for="f in fighterResults" :key="f.id">
                    <button
                        type="button"
                        @click="$emit('navigate', { type: 'fighter', item: f })"
                        class="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/60 transition-colors"
                    >
                        <div class="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                            <img v-if="f.photo" :src="f.photo" :alt="f.name" class="w-full h-full object-cover" @error="onFighterImageError" />
                            <svg aria-hidden="true" v-else class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-white truncate">{{ f.name }}</p>
                            <p class="text-[11px] text-gray-400 truncate">
                                <span v-if="f.nickname" class="text-amber-500">"{{ f.nickname }}"</span>
                                <span v-if="f.nickname && f.category"> · </span>
                                <span v-if="f.category">{{ f.category }}</span>
                            </p>
                        </div>
                    </button>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import { getInitials } from '../utils/format.js';
import { onFighterImageError } from '../utils/images.js';
export default {
    name: 'SearchResults',
    props: {
        query: { type: String, default: '' },
        userResults: { type: Array, default: () => [] },
        fighterResults: { type: Array, default: () => [] },
        loadingUsers: { type: Boolean, default: false },
        loadingFighters: { type: Boolean, default: false }
    },
    emits: ['navigate'],
    methods: {
        onFighterImageError,
        getInitials,
    }
};
</script>
