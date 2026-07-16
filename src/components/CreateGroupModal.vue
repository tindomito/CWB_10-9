<!--
    Modal de creación de grupo de chat: nombre (obligatorio) y descripción.
    El creador queda como owner; después puede invitar gente desde el grupo.
-->
<template>
    <Teleport to="body">
        <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="close">
            <div class="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm"></div>

            <div class="relative w-full max-w-md bg-[#1C1C1C] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col" style="max-height: 90vh;">
                <!-- Header -->
                <div class="px-5 py-4 border-b border-zinc-800 bg-gradient-to-r from-[#7A0A1C]/40 to-transparent flex items-center justify-between">
                    <div>
                        <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Nuevo grupo</p>
                        <h3 class="text-lg font-semibold text-white">Crear grupo</h3>
                    </div>
                    <button @click="close" aria-label="Cerrar" class="text-gray-400 hover:text-white">
                        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Body -->
                <div class="flex-1 overflow-y-auto p-5 space-y-4">
                    <div>
                        <label for="cg-name" class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nombre del grupo *</label>
                        <input
                            id="cg-name"
                            v-model="form.name"
                            type="text"
                            maxlength="60"
                            placeholder="Ej: UFC Argentina"
                            class="w-full px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37]"
                        />
                        <p class="text-[10px] text-gray-500 text-right mt-0.5">{{ form.name.length }}/60</p>
                    </div>

                    <div>
                        <label for="cg-description" class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Descripción (opcional)</label>
                        <textarea
                            id="cg-description"
                            v-model="form.description"
                            maxlength="200"
                            rows="2"
                            placeholder="¿De qué va el grupo?"
                            class="w-full px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37] resize-none"
                        ></textarea>
                        <p class="text-[10px] text-gray-500 text-right mt-0.5">{{ (form.description || '').length }}/200</p>
                    </div>

                    <div>
                        <label for="cg-avatar" class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Foto del grupo (opcional · URL)</label>
                        <input
                            id="cg-avatar"
                            v-model="form.avatarUrl"
                            type="url"
                            placeholder="https://…"
                            class="w-full px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37]"
                        />
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
                        @click="submit"
                        :disabled="!form.name.trim() || busy"
                        class="flex-1 px-4 py-2 text-sm font-bold text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 rounded-lg disabled:opacity-50"
                    >
                        {{ busy ? 'Creando…' : 'Crear grupo' }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script>
import { createGroup } from '../services/group-chat.js';

export default {
    name: 'CreateGroupModal',
    props: { open: { type: Boolean, default: false } },
    emits: ['close', 'created'],
    data() {
        return {
            form: { name: '', description: '', avatarUrl: '' },
            busy: false,
            errorMsg: ''
        };
    },
    watch: {
        open(val) { if (val) this.reset(); }
    },
    methods: {
        reset() {
            this.form = { name: '', description: '', avatarUrl: '' };
            this.errorMsg = '';
        },
        close() { this.$emit('close'); },
        async submit() {
            if (!this.form.name.trim() || this.busy) return;
            this.busy = true;
            this.errorMsg = '';
            const { group, error } = await createGroup({
                name: this.form.name,
                description: this.form.description || null,
                avatarUrl: this.form.avatarUrl || null
            });
            this.busy = false;
            if (error) {
                this.errorMsg = error.message || 'Error al crear el grupo';
                return;
            }
            this.$emit('created', group);
            this.close();
        }
    }
};
</script>
