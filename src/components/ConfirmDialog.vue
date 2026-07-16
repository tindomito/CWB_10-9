<!--
    Diálogo de confirmación genérico y reutilizable (reemplaza al confirm()
    nativo). Tres variantes que cambian ícono y color del botón principal:
    'danger' para acciones destructivas, 'warning' y 'primary' (dorado).
    El slot "body" permite meter contenido extra, como el avatar del afectado.
-->
<template>
    <Teleport to="body">
        <div v-if="open" class="fixed inset-0 z-[60] flex items-center justify-center p-4" @click.self="cancel">
            <div class="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm"></div>

            <div class="relative w-full max-w-sm bg-[#1C1C1C] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
                <!-- Header con icono -->
                <div class="px-5 pt-5 pb-3 text-center">
                    <div :class="iconBgClass" class="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3">
                        <span class="text-xl">{{ iconForVariant }}</span>
                    </div>
                    <h3 class="text-base font-bold text-white">{{ title }}</h3>
                    <p v-if="message" class="text-sm text-gray-400 mt-1 leading-snug whitespace-pre-line">{{ message }}</p>
                </div>

                <!-- Slot extra (avatar del usuario afectado, info contextual) -->
                <div v-if="$slots.body" class="px-5 pb-3">
                    <slot name="body" />
                </div>

                <!-- Footer -->
                <div class="px-5 py-4 border-t border-zinc-800 flex gap-2">
                    <button
                        @click="cancel"
                        class="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                    >
                        {{ cancelLabel }}
                    </button>
                    <button
                        @click="confirm"
                        :disabled="busy"
                        :class="confirmBtnClass"
                        class="flex-1 px-4 py-2 text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {{ busy ? '…' : confirmLabel }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script>
export default {
    name: 'ConfirmDialog',
    props: {
        open: { type: Boolean, default: false },
        title: { type: String, required: true },
        message: { type: String, default: '' },
        confirmLabel: { type: String, default: 'Confirmar' },
        cancelLabel: { type: String, default: 'Cancelar' },
        /** 'danger' | 'warning' | 'primary' */
        variant: { type: String, default: 'primary' },
        busy: { type: Boolean, default: false }
    },
    emits: ['confirm', 'cancel'],
    computed: {
        iconForVariant() {
            if (this.variant === 'danger') return '⚠️';
            if (this.variant === 'warning') return '⚠';
            return '👑';
        },
        iconBgClass() {
            if (this.variant === 'danger') return 'bg-[#C41E3A]/20 border border-[#C41E3A]/40';
            if (this.variant === 'warning') return 'bg-amber-500/20 border border-amber-500/40';
            return 'bg-[#D4AF37]/20 border border-[#D4AF37]/40';
        },
        confirmBtnClass() {
            if (this.variant === 'danger') return 'bg-[#C41E3A] hover:bg-[#a01730] text-white';
            if (this.variant === 'warning') return 'bg-amber-500 hover:bg-amber-400 text-[#0D0D0D]';
            return 'bg-[#D4AF37] hover:bg-amber-400 text-[#0D0D0D]';
        }
    },
    methods: {
        confirm() { this.$emit('confirm'); },
        cancel() { if (!this.busy) this.$emit('cancel'); }
    }
};
</script>
