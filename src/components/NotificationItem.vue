<template>
    <li
        role="button"
        tabindex="0"
        :class="[
            'flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-inset',
            notification.read_at ? 'hover:bg-zinc-800/40' : 'bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10'
        ]"
        @click="handleClick"
        @keydown.enter="handleClick"
        @keydown.space.prevent="handleClick"
    >
        <!-- Avatar del actor o icono del sistema -->
        <div class="flex-shrink-0 relative">
            <RouterLink
                v-if="notification.actor_id"
                :to="`/perfil/${createSlugFromDisplayName(notification.actor_display_name) || notification.actor_id}`"
                @click.stop="$emit('navigate')"
                class="block w-10 h-10 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold text-sm overflow-hidden"
            >
                <img
                    v-if="notification.actor_avatar_url"
                    :src="notification.actor_avatar_url"
                    :alt="notification.actor_display_name"
                    class="w-full h-full object-cover"
                    @error="$event.target.style.display='none'"
                />
                <span v-else>{{ getInitials(notification.actor_display_name) }}</span>
            </RouterLink>
            <div
                v-else
                class="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-base"
            >
                {{ icon }}
            </div>

            <!-- Mini icono superpuesto si hay actor -->
            <span
                v-if="notification.actor_id"
                class="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#1C1C1C] border border-zinc-700 flex items-center justify-center text-[10px]"
            >
                {{ icon }}
            </span>
        </div>

        <!-- Texto + tiempo -->
        <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-200 leading-snug">{{ description }}</p>
            <p class="text-[11px] text-gray-500 mt-0.5">{{ relativeTime }}</p>
        </div>

        <!-- Indicador no-leída -->
        <div v-if="!notification.read_at" class="flex-shrink-0 mt-2 w-2 h-2 rounded-full bg-[#D4AF37]"></div>
    </li>
</template>

<script>
import { getInitials } from '../utils/format.js';
import { createSlugFromDisplayName } from '../services/profiles.js';
import {
    iconForType,
    describeNotification,
    targetRouteFor
} from '../services/notifications.js';

export default {
    name: 'NotificationItem',
    props: {
        notification: { type: Object, required: true }
    },
    emits: ['navigate'],
    computed: {
        icon() {
            return iconForType(this.notification.type);
        },
        description() {
            return describeNotification(this.notification);
        },
        relativeTime() {
            const diff = Math.floor((Date.now() - new Date(this.notification.created_at).getTime()) / 60000);
            if (diff < 1) return 'Ahora';
            if (diff < 60) return `Hace ${diff} min`;
            const h = Math.floor(diff / 60);
            if (h < 24) return `Hace ${h}h`;
            const d = Math.floor(h / 24);
            if (d < 7) return `Hace ${d}d`;
            return new Date(this.notification.created_at).toLocaleDateString('es-AR', {
                day: 'numeric', month: 'short'
            });
        }
    },
    methods: {
        createSlugFromDisplayName,
        getInitials,
        // Al tocar la notificación navegamos a donde apunte (post, perfil, etc.).
        // La ruta destino la resuelve el service según el tipo de notificación.
        handleClick() {
            const target = targetRouteFor(this.notification);
            if (!target) {
                this.$emit('navigate');
                return;
            }
            if (typeof target === 'string') {
                this.$router.push(target);
            } else if (target.name === 'follower-profile' && target.actor) {
                this.$router.push(`/perfil/${createSlugFromDisplayName(target.actor) || ''}`);
            }
            this.$emit('navigate');
        }
    }
};
</script>
