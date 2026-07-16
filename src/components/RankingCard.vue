<!--
    Card resumida de un ranking de peleadores hecho por un usuario:
    división, podio (top 3 con corona al #1) y autor. Linkea al detalle.
    `showVisibility` agrega el badge Público/Privado (se usa en el perfil propio).
-->
<template>
    <RouterLink
        :to="{ name: 'RankingDetail', params: { id: ranking.id } }"
        class="block bg-[#1C1C1C] border border-zinc-800 rounded-xl p-4 hover:border-[#D4AF37]/40 transition-colors"
    >
        <!-- Header -->
        <div class="flex items-center justify-between gap-2 mb-3">
            <div class="min-w-0">
                <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Ranking</p>
                <h3 class="text-base font-bold text-white truncate">{{ ranking.division }}</h3>
            </div>
            <span
                v-if="showVisibility"
                :class="ranking.is_public ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' : 'bg-zinc-800 text-gray-400 border-zinc-700'"
                class="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
            >
                {{ ranking.is_public ? 'Público' : 'Privado' }}
            </span>
        </div>

        <!-- Top 3 preview -->
        <div class="space-y-1.5">
            <div
                v-for="(entry, idx) in topThree"
                :key="idx"
                class="flex items-center gap-2.5"
            >
                <span class="w-6 text-center text-xs font-bold shrink-0" :class="idx === 0 ? 'text-[#D4AF37]' : 'text-gray-500'">
                    {{ idx === 0 ? '👑' : '#' + idx }}
                </span>
                <div class="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                    <img v-if="entry.photo" :src="entry.photo" :alt="entry.name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                    <span v-else class="text-[9px] text-gray-500 font-bold">{{ initials(entry.name) }}</span>
                </div>
                <span class="text-sm text-white truncate">{{ entry.name }}</span>
            </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
            <div v-if="ranking.author_display_name" class="flex items-center gap-1.5 min-w-0">
                <div class="w-5 h-5 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white text-[8px] font-bold overflow-hidden shrink-0">
                    <img v-if="ranking.author_avatar_url" :src="ranking.author_avatar_url" :alt="ranking.author_display_name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                    <span v-else>{{ initials(ranking.author_display_name) }}</span>
                </div>
                <span class="text-[11px] text-gray-400 truncate">{{ ranking.author_display_name }}</span>
            </div>
            <span class="text-[11px] text-gray-500 shrink-0">{{ entryCount }} peleadores</span>
        </div>
    </RouterLink>
</template>

<script>
import { getInitials } from '../utils/format.js';
export default {
    name: 'RankingCard',
    props: {
        ranking: { type: Object, required: true },
        showVisibility: { type: Boolean, default: false }
    },
    computed: {
        topThree() {
            return (this.ranking.entries || []).slice(0, 3);
        },
        entryCount() {
            return (this.ranking.entries || []).length;
        }
    },
    methods: {
        initials: (name) => getInitials(name, '?'),
    }
};
</script>
