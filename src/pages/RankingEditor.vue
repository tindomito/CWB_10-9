<!--
    Editor de rankings propios (crear en /rankings/nuevo, editar en
    /rankings/:id/editar). Elegís división, buscás peleadores en la API
    y los ordenás en tu top; se puede publicar o guardar privado.
-->
<template>
    <div class="max-w-2xl mx-auto px-4 sm:px-0 space-y-4">
        <button @click="$router.back()" class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
            </svg>
            Volver
        </button>

        <div>
            <h1 class="text-2xl sm:text-3xl font-bold text-white">{{ isEdit ? 'Editar ranking' : 'Crear ranking' }}</h1>
            <p class="text-gray-400 text-sm mt-1">Armá tu top de la división. Reordená, renombrá o agregá peleadores.</p>
        </div>

        <!-- Selector de división -->
        <div class="bg-[#1C1C1C] border border-zinc-800 rounded-xl p-4">
            <label for="re-division" class="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">División</label>
            <select
                id="re-division"
                v-model="division"
                @change="onDivisionChange"
                class="w-full px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37]"
            >
                <option :value="''" disabled>— Elegí una división —</option>
                <option v-for="d in divisions" :key="d" :value="d">{{ d }}</option>
            </select>
            <button
                v-if="division"
                @click="reloadFromApi"
                :disabled="loadingFighters"
                class="mt-2 text-[11px] font-bold text-[#D4AF37] hover:text-amber-300 disabled:opacity-50"
            >
                {{ loadingFighters ? 'Cargando…' : '↻ Recargar 15 de la API (reemplaza la lista)' }}
            </button>
        </div>

        <!-- Loading peleadores -->
        <div v-if="loadingFighters" class="flex justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
        </div>

        <!-- Editor de la lista -->
        <template v-else-if="division">
            <div class="bg-[#1C1C1C] border border-zinc-800 rounded-xl overflow-hidden">
                <div class="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Tu ranking</p>
                    <span class="text-[10px] text-gray-500">{{ entries.length }}/{{ maxEntries }}</span>
                </div>

                <div v-if="entries.length === 0" class="px-4 py-8 text-center text-sm text-gray-500">
                    No hay peleadores. Recargá desde la API o agregá manualmente abajo.
                </div>

                <div v-else class="divide-y divide-zinc-800">
                    <div v-for="(entry, idx) in entries" :key="idx" class="flex items-center gap-2 px-3 py-2">
                        <!-- Posición -->
                        <span class="w-8 text-center text-xs font-bold shrink-0" :class="idx === 0 ? 'text-[#D4AF37]' : 'text-gray-500'">
                            {{ idx === 0 ? '👑' : '#' + idx }}
                        </span>
                        <!-- Foto -->
                        <div class="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                            <img v-if="entry.photo" :src="entry.photo" :alt="entry.name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                            <span v-else class="text-[9px] text-gray-500 font-bold">{{ initials(entry.name) }}</span>
                        </div>
                        <!-- Nombre editable -->
                        <input
                            v-model="entry.name"
                            maxlength="80"
                            aria-label="Nombre del peleador"
                            class="flex-1 min-w-0 bg-transparent text-sm text-white border-b border-transparent focus:border-[#D4AF37] focus:outline-none py-1"
                        />
                        <!-- Acciones -->
                        <div class="flex items-center gap-0.5 shrink-0">
                            <button @click="moveUp(idx)" :disabled="idx === 0" class="p-1 text-gray-500 hover:text-white disabled:opacity-30" title="Subir">
                                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"></path></svg>
                            </button>
                            <button @click="moveDown(idx)" :disabled="idx === entries.length - 1" class="p-1 text-gray-500 hover:text-white disabled:opacity-30" title="Bajar">
                                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                            <button @click="removeEntry(idx)" class="p-1 text-gray-500 hover:text-[#C41E3A]" title="Eliminar">
                                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Agregar custom -->
                <div v-if="entries.length < maxEntries" class="p-3 border-t border-zinc-800 flex gap-2">
                    <input
                        v-model="customName"
                        @keydown.enter="addCustom"
                        aria-label="Agregar peleador a mano"
                        placeholder="Agregar peleador a mano…"
                        maxlength="80"
                        class="flex-1 px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37]"
                    />
                    <button
                        @click="addCustom"
                        :disabled="!customName.trim()"
                        class="px-4 py-2 text-sm font-bold text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 rounded-lg disabled:opacity-40"
                    >
                        Agregar
                    </button>
                </div>
            </div>

            <p v-if="error" class="text-xs text-[#C41E3A]">{{ error }}</p>

            <!-- Guardar -->
            <div class="flex gap-2">
                <button
                    @click="save(false)"
                    :disabled="!canSave || saving"
                    class="flex-1 py-3 px-4 border border-zinc-700 text-gray-200 hover:bg-zinc-800 font-bold rounded-lg disabled:opacity-40 text-sm uppercase tracking-wide"
                >
                    {{ saving ? 'Guardando…' : 'Guardar privado' }}
                </button>
                <button
                    @click="save(true)"
                    :disabled="!canSave || saving"
                    class="flex-1 py-3 px-4 bg-[#D4AF37] hover:bg-amber-400 text-[#0D0D0D] font-bold rounded-lg disabled:opacity-40 text-sm uppercase tracking-wide"
                >
                    {{ saving ? 'Publicando…' : 'Publicar' }}
                </button>
            </div>
        </template>

        <!-- Confirmación de reemplazo de lista -->
        <ConfirmDialog
            :open="showReplaceConfirm"
            title="¿Reemplazar la lista?"
            :message="replaceMessage"
            confirmLabel="Reemplazar"
            variant="warning"
            @confirm="confirmReplace"
            @cancel="cancelReplace"
        />
    </div>
</template>

<script>
import { getInitials } from '../utils/format.js';
import { DIVISIONS, MAX_ENTRIES, createRanking, updateRanking, getRanking } from '../services/rankings.js';
import { getFightersByDivision } from '../services/sports/index.js';
import ConfirmDialog from '../components/ConfirmDialog.vue';

export default {
    name: 'RankingEditor',
    components: { ConfirmDialog },
    data() {
        return {
            divisions: DIVISIONS,
            maxEntries: MAX_ENTRIES,
            division: '',
            entries: [],
            customName: '',
            loadingFighters: false,
            saving: false,
            error: null,
            editId: null,
            // Confirmación de "reemplazar lista actual"
            showReplaceConfirm: false,
            pendingAction: null,       // 'division' | 'reload'
            lastGoodDivision: ''       // división reflejada en la lista (para revertir el select al cancelar)
        };
    },
    computed: {
        replaceMessage() {
            return this.pendingAction === 'reload'
                ? 'Esto reemplaza tu lista actual con los 15 peleadores de la API. ¿Continuar?'
                : 'Cambiar de división va a reemplazar la lista actual. ¿Continuar?';
        },
        isEdit() {
            return !!this.editId;
        },
        canSave() {
            return this.division && this.entries.length > 0;
        }
    },
    methods: {
        initials: (name) => getInitials(name, '?'),
        onDivisionChange() {
            // Si ya hay lista cargada, pedimos confirmación antes de reemplazarla.
            if (this.entries.length > 0 && this.division !== this.lastGoodDivision) {
                this.pendingAction = 'division';
                this.showReplaceConfirm = true;
                return;
            }
            this.lastGoodDivision = this.division;
            this.loadFighters();
        },
        reloadFromApi() {
            if (this.entries.length > 0) {
                this.pendingAction = 'reload';
                this.showReplaceConfirm = true;
                return;
            }
            this.loadFighters();
        },
        confirmReplace() {
            this.showReplaceConfirm = false;
            this.pendingAction = null;
            this.lastGoodDivision = this.division;
            this.loadFighters();
        },
        cancelReplace() {
            this.showReplaceConfirm = false;
            // Si el cambio venía del select, revertimos su valor visible
            if (this.pendingAction === 'division') this.division = this.lastGoodDivision;
            this.pendingAction = null;
        },
        async loadFighters() {
            if (!this.division) return;
            this.loadingFighters = true;
            this.error = null;
            try {
                const { fighters } = await getFightersByDivision(this.division, MAX_ENTRIES);
                this.entries = fighters.map(f => ({
                    name: f.name,
                    external_id: f.externalId,
                    photo: f.photo
                }));
                if (this.entries.length === 0) {
                    this.error = 'La API no devolvió peleadores para esta división. Agregalos a mano.';
                }
            } finally {
                this.loadingFighters = false;
            }
        },
        moveUp(idx) {
            if (idx === 0) return;
            const arr = this.entries;
            [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
        },
        moveDown(idx) {
            if (idx === this.entries.length - 1) return;
            const arr = this.entries;
            [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
        },
        removeEntry(idx) {
            this.entries.splice(idx, 1);
        },
        addCustom() {
            const name = this.customName.trim();
            if (!name || this.entries.length >= this.maxEntries) return;
            this.entries.push({ name, external_id: null, photo: null });
            this.customName = '';
        },
        async save(isPublic) {
            if (!this.canSave || this.saving) return;
            this.saving = true;
            this.error = null;
            try {
                let result;
                if (this.isEdit) {
                    result = await updateRanking(this.editId, {
                        division: this.division,
                        entries: this.entries,
                        isPublic
                    });
                } else {
                    result = await createRanking({
                        division: this.division,
                        entries: this.entries,
                        isPublic
                    });
                }
                if (result.error) {
                    this.error = result.error.message || 'Error al guardar';
                    return;
                }
                this.$router.push({ name: 'RankingDetail', params: { id: result.ranking.id } });
            } finally {
                this.saving = false;
            }
        },
        async loadForEdit(id) {
            const { ranking, error } = await getRanking(id);
            if (error || !ranking) {
                this.error = 'No se pudo cargar el ranking';
                return;
            }
            this.editId = ranking.id;
            this.division = ranking.division;
            this.lastGoodDivision = ranking.division;
            this.entries = (ranking.entries || []).map(e => ({
                name: e.name,
                external_id: e.external_id || null,
                photo: e.photo || null
            }));
        }
    },
    async mounted() {
        const id = this.$route.params.id;
        if (id) {
            await this.loadForEdit(id);
        }
    }
};
</script>
