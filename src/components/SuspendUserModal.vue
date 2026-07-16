<!--
    Modal de moderación para suspender a un usuario del chat (solo admins).
    Se abre desde el escudito de un mensaje. Permite elegir alcance
    (este canal o todos), duración predefinida o permanente, y un motivo
    opcional que el suspendido ve en su banner.
-->
<template>
    <Teleport to="body">
        <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="close">
            <div class="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm"></div>

            <div class="relative w-full max-w-md bg-[#1C1C1C] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col" style="max-height: 90vh;">
                <!-- Header -->
                <div class="px-5 py-4 border-b border-zinc-800 bg-gradient-to-r from-[#7A0A1C]/40 to-transparent flex items-center justify-between">
                    <div>
                        <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Moderación</p>
                        <h3 class="text-lg font-semibold text-white">Suspender usuario</h3>
                    </div>
                    <button @click="close" class="text-gray-400 hover:text-white" aria-label="Cerrar">
                        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Body -->
                <div class="flex-1 overflow-y-auto p-5 space-y-4">
                    <!-- Usuario objetivo -->
                    <div class="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                            <img v-if="target.avatar_url" :src="target.avatar_url" :alt="target.display_name" class="w-full h-full object-cover" />
                            <span v-else>{{ getInitials(target.display_name) }}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-white truncate">{{ target.display_name || 'Usuario' }}</p>
                            <p class="text-[11px] text-gray-400">No va a poder enviar mensajes durante la suspensión.</p>
                        </div>
                    </div>

                    <!-- Scope -->
                    <div>
                        <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Alcance</label>
                        <div class="grid grid-cols-2 gap-2">
                            <button
                                @click="form.scope = 'channel'"
                                :class="scopeBtnClass(form.scope === 'channel')"
                            >
                                Solo en este canal
                                <span class="block text-[10px] opacity-70">{{ channelName }}</span>
                            </button>
                            <button
                                @click="form.scope = 'all'"
                                :class="scopeBtnClass(form.scope === 'all')"
                            >
                                Todos los canales
                                <span class="block text-[10px] opacity-70">chat global</span>
                            </button>
                        </div>
                    </div>

                    <!-- Duración -->
                    <div>
                        <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Duración</label>
                        <div class="grid grid-cols-3 gap-2">
                            <button
                                v-for="d in durations"
                                :key="d.id"
                                @click="selectPreset(d.id)"
                                :class="durBtnClass(form.durationId === d.id)"
                            >
                                {{ d.label }}
                            </button>
                            <button
                                @click="selectPreset('custom')"
                                :class="durBtnClass(form.durationId === 'custom')"
                            >
                                Personalizado
                            </button>
                        </div>
                        <div v-if="form.durationId === 'custom'" class="mt-3 flex items-center gap-2">
                            <input
                                v-model.number="form.customMinutes"
                                type="number"
                                min="1"
                                aria-label="Duración de la suspensión en minutos"
                                placeholder="Minutos"
                                class="flex-1 px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37]"
                            />
                            <span class="text-xs text-gray-400">minutos</span>
                        </div>
                    </div>

                    <!-- Razón -->
                    <div>
                        <label class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Razón (opcional, visible para el usuario)
                        </label>
                        <textarea
                            v-model="form.reason"
                            maxlength="200"
                            rows="2"
                            aria-label="Razón de la suspensión (opcional)"
                            placeholder="Ej: spam reiterado, ofensas, etc."
                            class="w-full px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37] resize-none"
                        ></textarea>
                        <p class="text-[10px] text-gray-500 text-right mt-0.5">{{ (form.reason || '').length }}/200</p>
                    </div>

                    <p v-if="errorMsg" class="text-xs text-[#C41E3A]">{{ errorMsg }}</p>
                </div>

                <!-- Footer -->
                <div class="px-5 py-4 border-t border-zinc-800 flex gap-2">
                    <button
                        @click="close"
                        class="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                    >
                        Cancelar
                    </button>
                    <button
                        @click="confirm"
                        :disabled="!canConfirm || busy"
                        class="flex-1 px-4 py-2 text-sm font-bold text-white bg-[#7A0A1C] hover:bg-[#9b1226] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {{ busy ? 'Suspendiendo…' : 'Suspender' }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script>
import { getInitials } from '../utils/format.js';
import { suspendUser, SUSPENSION_DURATIONS } from '../services/chat-moderation.js';

export default {
    name: 'SuspendUserModal',
    props: {
        open: { type: Boolean, default: false },
        target: { type: Object, required: true },   // { id, display_name, avatar_url }
        channelId: { type: String, required: true },
        channelName: { type: String, default: '' }
    },
    emits: ['close', 'suspended'],
    data() {
        return {
            form: {
                scope: 'channel',     // 'channel' | 'all'
                durationId: '24h',
                customMinutes: null,
                reason: ''
            },
            busy: false,
            errorMsg: '',
            durations: SUSPENSION_DURATIONS
        };
    },
    computed: {
        selectedDurationMinutes() {
            if (this.form.durationId === 'custom') {
                return this.form.customMinutes && this.form.customMinutes > 0
                    ? Math.floor(this.form.customMinutes)
                    : null;
            }
            const preset = this.durations.find(d => d.id === this.form.durationId);
            return preset ? preset.minutes : null;
        },
        canConfirm() {
            if (this.form.durationId === 'custom') {
                return this.form.customMinutes && this.form.customMinutes > 0;
            }
            return !!this.form.durationId;
        }
    },
    watch: {
        open(val) {
            if (val) this.resetForm();
        }
    },
    methods: {
        resetForm() {
            this.form = { scope: 'channel', durationId: '24h', customMinutes: null, reason: '' };
            this.errorMsg = '';
        },
        close() {
            this.$emit('close');
        },
        selectPreset(id) {
            this.form.durationId = id;
            if (id !== 'custom') this.form.customMinutes = null;
        },
        scopeBtnClass(active) {
            return [
                'p-3 rounded-lg text-sm font-medium border transition-colors text-left',
                active
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                    : 'border-zinc-700 bg-zinc-800 text-gray-300 hover:bg-zinc-700'
            ];
        },
        durBtnClass(active) {
            return [
                'px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
                active
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-white'
                    : 'border-zinc-700 bg-zinc-800 text-gray-300 hover:bg-zinc-700'
            ];
        },
        getInitials,
        async confirm() {
            if (!this.canConfirm || this.busy) return;
            this.busy = true;
            this.errorMsg = '';

            const { suspension, error } = await suspendUser({
                userId: this.target.id,
                channelId: this.form.scope === 'all' ? null : this.channelId,
                minutes: this.selectedDurationMinutes,
                reason: this.form.reason?.trim() || null
            });

            this.busy = false;
            if (error) {
                this.errorMsg = error.message || 'Error al suspender';
                return;
            }
            this.$emit('suspended', suspension);
            this.close();
        }
    }
};
</script>
