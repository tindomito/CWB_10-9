<template>
    <Teleport to="body">
        <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="close">
            <div class="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm"></div>

            <div class="relative w-full max-w-md bg-[#1C1C1C] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col" style="max-height: 90vh;">
                <!-- Header -->
                <div class="px-5 py-4 border-b border-zinc-800 bg-gradient-to-r from-[#7A0A1C]/40 to-transparent flex items-center justify-between">
                    <div>
                        <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest">Grupo</p>
                        <h3 class="text-lg font-semibold text-white">Información</h3>
                    </div>
                    <button @click="close" class="text-gray-400 hover:text-white" aria-label="Cerrar">
                        <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Body -->
                <div class="flex-1 overflow-y-auto">
                    <!-- Info del grupo -->
                    <div class="p-5 text-center border-b border-zinc-800">
                        <!-- Avatar (con botón cambiar foto si admin) -->
                        <div class="relative inline-block mb-3">
                            <div class="w-24 h-24 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                                <img v-if="group?.avatar_url" :src="group.avatar_url" :alt="group.name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                                <span v-else>{{ groupInitials }}</span>
                            </div>
                            <button
                                v-if="amAdmin"
                                @click="startEditAvatar"
                                class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#D4AF37] hover:bg-amber-400 text-[#0D0D0D] flex items-center justify-center shadow-lg"
                                title="Cambiar foto"
                            >
                                <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                            </button>
                        </div>

                        <!-- Nombre (editable inline) -->
                        <div v-if="editingField !== 'name'" class="flex items-center justify-center gap-2 mb-1">
                            <h2 class="text-xl font-bold text-white">{{ group?.name }}</h2>
                            <button v-if="amAdmin" @click="startEdit('name')" class="text-gray-500 hover:text-[#D4AF37]" title="Editar nombre">
                                <svg aria-hidden="true" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            </button>
                        </div>
                        <div v-else class="flex items-center justify-center gap-2 mb-1">
                            <input
                                v-model="editValue"
                                @keydown.enter="saveEdit"
                                @keydown.escape="cancelEdit"
                                type="text"
                                maxlength="60"
                                aria-label="Nombre del grupo"
                                ref="editInput"
                                class="text-lg font-bold text-center text-white bg-zinc-800 border border-[#D4AF37] rounded px-2 py-1 w-48 focus:outline-none"
                            />
                            <button @click="saveEdit" :disabled="busy" class="text-emerald-400 hover:text-emerald-300 disabled:opacity-50" title="Guardar">
                                <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                            <button @click="cancelEdit" class="text-gray-500 hover:text-white" title="Cancelar">
                                <svg aria-hidden="true" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <!-- Descripción -->
                        <div v-if="editingField !== 'description'">
                            <p v-if="group?.description" class="text-sm text-gray-400 mt-1 flex items-center justify-center gap-1.5">
                                <span>{{ group.description }}</span>
                                <button v-if="amAdmin" @click="startEdit('description')" aria-label="Editar descripción" class="text-gray-600 hover:text-[#D4AF37] shrink-0">
                                    <svg aria-hidden="true" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                </button>
                            </p>
                            <button
                                v-else-if="amAdmin"
                                @click="startEdit('description')"
                                class="mt-1 text-xs text-gray-500 hover:text-[#D4AF37] italic"
                            >
                                + Agregar descripción
                            </button>
                        </div>
                        <textarea
                            v-else
                            v-model="editValue"
                            @keydown.escape="cancelEdit"
                            maxlength="200"
                            rows="2"
                            aria-label="Descripción del grupo"
                            ref="editInput"
                            class="mt-2 w-full text-sm text-white bg-zinc-800 border border-[#D4AF37] rounded px-2 py-1.5 focus:outline-none resize-none"
                        ></textarea>
                        <div v-if="editingField === 'description'" class="flex justify-center gap-2 mt-2">
                            <button @click="cancelEdit" class="text-xs px-3 py-1 text-gray-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg">Cancelar</button>
                            <button @click="saveEdit" :disabled="busy" class="text-xs px-3 py-1 bg-[#D4AF37] text-[#0D0D0D] font-bold hover:bg-amber-400 rounded-lg disabled:opacity-50">Guardar</button>
                        </div>

                        <p class="text-[11px] text-gray-500 mt-3">
                            {{ members.length }} miembro{{ members.length === 1 ? '' : 's' }} ·
                            Creado el {{ formatCreated(group?.created_at) }}
                        </p>
                    </div>

                    <!-- CTA invitar (siempre arriba, prominente) -->
                    <div v-if="amAdmin" class="p-4 border-b border-zinc-800">
                        <button
                            @click="$emit('open-invite')"
                            class="w-full py-2.5 px-4 bg-[#D4AF37] hover:bg-amber-400 text-[#0D0D0D] font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
                            </svg>
                            Invitar miembros
                        </button>
                    </div>

                    <!-- Buscador miembros -->
                    <div v-if="members.length > 5" class="p-3 border-b border-zinc-800">
                        <input
                            v-model="memberFilter"
                            type="text"
                            aria-label="Buscar miembro del grupo"
                            placeholder="Buscar miembro..."
                            class="w-full px-3 py-1.5 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                        />
                    </div>

                    <!-- Lista miembros -->
                    <ul class="divide-y divide-zinc-800">
                        <li v-for="m in filteredMembers" :key="m.user_id" class="px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/40 transition-colors">
                            <RouterLink
                                :to="`/perfil/${createSlugFromDisplayName(m.display_name) || m.user_id}`"
                                @click="close"
                                class="block w-10 h-10 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold text-sm overflow-hidden shrink-0"
                            >
                                <img v-if="m.avatar_url" :src="m.avatar_url" :alt="m.display_name" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
                                <span v-else>{{ getInitials(m.display_name) }}</span>
                            </RouterLink>
                            <div class="flex-1 min-w-0">
                                <RouterLink
                                    :to="`/perfil/${createSlugFromDisplayName(m.display_name) || m.user_id}`"
                                    @click="close"
                                    class="text-sm font-semibold text-white hover:text-[#D4AF37] truncate block"
                                >
                                    {{ m.display_name || 'Usuario' }}
                                    <span v-if="m.user_id === currentUserId" class="ml-1 text-[10px] text-[#D4AF37] font-bold">(VOS)</span>
                                </RouterLink>
                                <span :class="roleBadgeClass(m.role)" class="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 border">
                                    <span>{{ roleIcon(m.role) }}</span>
                                    {{ roleLabel(m.role) }}
                                </span>
                            </div>

                            <!-- Menú kebab -->
                            <div v-if="canShowMenu(m)" class="relative" :ref="el => setMenuRef(m.user_id, el)">
                                <button
                                    @click.stop="toggleMenu(m.user_id)"
                                    class="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-zinc-800"
                                    aria-label="Más opciones"
                                >
                                    <svg aria-hidden="true" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                                    </svg>
                                </button>
                                <div
                                    v-if="openMenuId === m.user_id"
                                    class="absolute right-0 top-full mt-1 w-48 bg-[#0D0D0D] border border-zinc-700 rounded-lg shadow-xl py-1 z-10"
                                >
                                    <RouterLink
                                        :to="`/perfil/${createSlugFromDisplayName(m.display_name) || m.user_id}`"
                                        @click="close"
                                        class="block w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-zinc-800"
                                    >
                                        Ver perfil
                                    </RouterLink>
                                    <!-- Owner: promover member→admin -->
                                    <button
                                        v-if="amOwner && m.role === 'member'"
                                        @click="askPromote(m)"
                                        class="block w-full text-left px-3 py-2 text-xs text-[#D4AF37] hover:bg-zinc-800"
                                    >⚡ Hacer admin</button>
                                    <!-- Owner: bajar admin→member -->
                                    <button
                                        v-if="amOwner && m.role === 'admin'"
                                        @click="askDemote(m)"
                                        class="block w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-zinc-800"
                                    >Quitar admin</button>
                                    <!-- Owner: transferir ownership -->
                                    <button
                                        v-if="amOwner && m.role !== 'owner'"
                                        @click="askTransfer(m)"
                                        class="block w-full text-left px-3 py-2 text-xs text-[#D4AF37] hover:bg-zinc-800"
                                    >👑 Transferir ownership</button>
                                    <!-- Owner/Admin: kick (no al owner) -->
                                    <div v-if="amAdmin && m.role !== 'owner'" class="border-t border-zinc-800 my-1"></div>
                                    <button
                                        v-if="amAdmin && m.role !== 'owner'"
                                        @click="askKick(m)"
                                        class="block w-full text-left px-3 py-2 text-xs text-[#C41E3A] hover:bg-[#C41E3A]/10"
                                    >✕ Eliminar del grupo</button>
                                </div>
                            </div>
                        </li>
                        <li v-if="filteredMembers.length === 0" class="px-4 py-8 text-center text-xs text-gray-500">
                            Sin coincidencias
                        </li>
                    </ul>

                    <!-- Salir del grupo -->
                    <div class="p-4 border-t border-zinc-800">
                        <button
                            @click="askLeave"
                            class="w-full py-2.5 px-3 text-sm font-bold text-[#C41E3A] border border-[#C41E3A]/40 hover:bg-[#C41E3A]/10 rounded-lg flex items-center justify-center gap-2"
                        >
                            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                            </svg>
                            Salir del grupo
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal cambiar avatar (URL inline) -->
        <ConfirmDialog
            :open="showAvatarDialog"
            title="Cambiar foto del grupo"
            message="Pegá la URL de la imagen nueva"
            confirmLabel="Guardar"
            :busy="busy"
            @cancel="showAvatarDialog = false"
            @confirm="saveAvatar"
        >
            <template #body>
                <input
                    v-model="newAvatarUrl"
                    type="url"
                    placeholder="https://…"
                    aria-label="URL de la foto del grupo"
                    class="w-full px-3 py-2 text-sm bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37]"
                />
            </template>
        </ConfirmDialog>

        <!-- Dialog confirmaciones reutilizable -->
        <ConfirmDialog
            :open="dialog.open"
            :title="dialog.title"
            :message="dialog.message"
            :confirmLabel="dialog.confirmLabel"
            :variant="dialog.variant"
            :busy="busy"
            @cancel="dialog.open = false"
            @confirm="dialog.onConfirm"
        >
            <template v-if="dialog.targetMember" #body>
                <div class="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-2.5">
                    <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0">
                        <img v-if="dialog.targetMember.avatar_url" :src="dialog.targetMember.avatar_url" :alt="dialog.targetMember.display_name" class="w-full h-full object-cover" />
                        <span v-else>{{ getInitials(dialog.targetMember.display_name) }}</span>
                    </div>
                    <p class="text-sm font-semibold text-white truncate">{{ dialog.targetMember.display_name }}</p>
                </div>
            </template>
        </ConfirmDialog>
    </Teleport>
</template>

<script>
import { getInitials } from '../utils/format.js';
import { useAuth } from '../composables/useAuth.js';
import {
    getGroupMembers,
    removeMember,
    changeMemberRole,
    leaveGroup,
    updateGroup,
    transferOwnership
} from '../services/group-chat.js';
import { createSlugFromDisplayName } from '../services/profiles.js';
import ConfirmDialog from './ConfirmDialog.vue';

export default {
    name: 'GroupInfoModal',
    components: { ConfirmDialog },
    props: {
        open: { type: Boolean, default: false },
        group: { type: Object, default: null }
    },
    emits: ['close', 'open-invite', 'left', 'updated'],
    setup() {
        const { userId } = useAuth();
        return { currentUserId: userId, createSlugFromDisplayName };
    },
    data() {
        return {
            members: [],
            busy: false,
            memberFilter: '',
            // Edición inline
            editingField: null,
            editValue: '',
            // Avatar
            showAvatarDialog: false,
            newAvatarUrl: '',
            // Menú kebab por miembro
            openMenuId: null,
            menuRefs: {},
            outsideClickHandler: null,
            // Dialog confirmaciones
            dialog: {
                open: false,
                title: '',
                message: '',
                confirmLabel: '',
                variant: 'primary',
                targetMember: null,
                onConfirm: () => {}
            }
        };
    },
    computed: {
        myMembership() { return this.members.find(m => m.user_id === this.currentUserId); },
        amAdmin() { return this.myMembership && (this.myMembership.role === 'owner' || this.myMembership.role === 'admin'); },
        amOwner() { return this.myMembership?.role === 'owner'; },
        groupInitials() {
            return getInitials(this.group?.name, 'G');
        },
        filteredMembers() {
            const q = this.memberFilter.trim().toLowerCase();
            if (!q) return this.members;
            return this.members.filter(m => (m.display_name || '').toLowerCase().includes(q));
        }
    },
    watch: {
        open(val) {
            if (val) {
                this.loadMembers();
                this.outsideClickHandler = (e) => {
                    if (!this.openMenuId) return;
                    const el = this.menuRefs[this.openMenuId];
                    if (el && !el.contains(e.target)) this.openMenuId = null;
                };
                document.addEventListener('click', this.outsideClickHandler);
            } else {
                this.editingField = null;
                this.openMenuId = null;
                if (this.outsideClickHandler) {
                    document.removeEventListener('click', this.outsideClickHandler);
                    this.outsideClickHandler = null;
                }
            }
        }
    },
    methods: {
        async loadMembers() {
            if (!this.group?.id) return;
            const { members } = await getGroupMembers(this.group.id);
            // Ordenar: owner → admin → member, dentro de cada grupo por display_name
            const order = { owner: 0, admin: 1, member: 2 };
            this.members = [...members].sort((a, b) => {
                const r = order[a.role] - order[b.role];
                if (r !== 0) return r;
                return (a.display_name || '').localeCompare(b.display_name || '');
            });
        },
        canShowMenu() {
            // Siempre mostrar el menú (al menos "Ver perfil")
            return true;
        },
        toggleMenu(uid) { this.openMenuId = this.openMenuId === uid ? null : uid; },
        setMenuRef(uid, el) { if (el) this.menuRefs[uid] = el; },

        // Edición inline
        startEdit(field) {
            this.editingField = field;
            this.editValue = this.group?.[field] || '';
            this.$nextTick(() => this.$refs.editInput?.focus());
        },
        cancelEdit() { this.editingField = null; this.editValue = ''; },
        async saveEdit() {
            if (this.busy) return;
            this.busy = true;
            const payload = { [this.editingField]: this.editValue };
            // Mapear avatarUrl → avatar_url
            const apiPayload = {
                name: this.editingField === 'name' ? this.editValue : undefined,
                description: this.editingField === 'description' ? this.editValue : undefined,
                avatarUrl: this.editingField === 'avatar_url' ? this.editValue : undefined
            };
            const { group, error } = await updateGroup(this.group.id, apiPayload);
            this.busy = false;
            if (error) return;
            this.editingField = null;
            this.$emit('updated', group);
        },
        startEditAvatar() {
            this.newAvatarUrl = this.group?.avatar_url || '';
            this.showAvatarDialog = true;
        },
        async saveAvatar() {
            this.busy = true;
            const { group, error } = await updateGroup(this.group.id, { avatarUrl: this.newAvatarUrl });
            this.busy = false;
            this.showAvatarDialog = false;
            if (!error) this.$emit('updated', group);
        },

        // Acciones por miembro
        askPromote(m) {
            this.openMenuId = null;
            this.dialog = {
                open: true,
                title: '¿Hacer admin?',
                message: 'Va a poder invitar, eliminar miembros y editar el grupo.',
                confirmLabel: 'Hacer admin',
                variant: 'primary',
                targetMember: m,
                onConfirm: () => this.runPromote(m)
            };
        },
        async runPromote(m) {
            this.busy = true;
            await changeMemberRole(this.group.id, m.user_id, 'admin');
            this.busy = false;
            this.dialog.open = false;
            this.loadMembers();
        },
        askDemote(m) {
            this.openMenuId = null;
            this.dialog = {
                open: true,
                title: '¿Quitar admin?',
                message: 'Va a perder los permisos de admin pero sigue en el grupo.',
                confirmLabel: 'Quitar admin',
                variant: 'warning',
                targetMember: m,
                onConfirm: () => this.runDemote(m)
            };
        },
        async runDemote(m) {
            this.busy = true;
            await changeMemberRole(this.group.id, m.user_id, 'member');
            this.busy = false;
            this.dialog.open = false;
            this.loadMembers();
        },
        askKick(m) {
            this.openMenuId = null;
            this.dialog = {
                open: true,
                title: '¿Eliminar del grupo?',
                message: 'No va a poder leer ni enviar mensajes, salvo que sea invitado de nuevo.',
                confirmLabel: 'Eliminar',
                variant: 'danger',
                targetMember: m,
                onConfirm: () => this.runKick(m)
            };
        },
        async runKick(m) {
            this.busy = true;
            await removeMember(this.group.id, m.user_id);
            this.busy = false;
            this.dialog.open = false;
            this.loadMembers();
        },
        askTransfer(m) {
            this.openMenuId = null;
            this.dialog = {
                open: true,
                title: '¿Transferir ownership?',
                message: `Esta persona va a pasar a ser el owner del grupo y vos vas a quedar como admin. Esta acción no se puede deshacer fácilmente.`,
                confirmLabel: 'Transferir',
                variant: 'warning',
                targetMember: m,
                onConfirm: () => this.runTransfer(m)
            };
        },
        async runTransfer(m) {
            this.busy = true;
            await transferOwnership(this.group.id, m.user_id);
            this.busy = false;
            this.dialog.open = false;
            this.loadMembers();
        },
        askLeave() {
            const willBeAlone = this.members.length === 1;
            const ownerNeedsTransfer = this.amOwner && this.members.filter(m => m.role === 'owner').length === 1 && this.members.length > 1;
            let message = '¿Estás seguro de salir? No vas a poder leer ni enviar mensajes hasta que te inviten de nuevo.';
            if (willBeAlone) {
                message = 'Sos el último miembro: si salís, el grupo se va a borrar definitivamente.';
            } else if (ownerNeedsTransfer) {
                message = 'Sos el único owner. Al salir, el owner se va a pasar automáticamente al admin más antiguo (o al member más antiguo si no hay admins).';
            }
            this.dialog = {
                open: true,
                title: willBeAlone ? '¿Borrar grupo?' : '¿Salir del grupo?',
                message,
                confirmLabel: willBeAlone ? 'Borrar grupo' : 'Salir',
                variant: 'danger',
                targetMember: null,
                onConfirm: () => this.runLeave()
            };
        },
        async runLeave() {
            this.busy = true;
            await leaveGroup(this.group.id);
            this.busy = false;
            this.dialog.open = false;
            this.$emit('left', this.group.id);
            this.close();
        },

        roleLabel(role) { return { owner: 'Owner', admin: 'Admin', member: 'Miembro' }[role] || role; },
        roleIcon(role) { return { owner: '👑', admin: '⚡', member: '·' }[role] || ''; },
        roleBadgeClass(role) {
            if (role === 'owner') return 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/40';
            if (role === 'admin') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40';
            return 'bg-zinc-800 text-gray-400 border-zinc-700';
        },
        getInitials,
        formatCreated(ts) {
            if (!ts) return '';
            return new Date(ts).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
        },
        close() { this.$emit('close'); }
    },
    beforeUnmount() {
        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler);
        }
    }
};
</script>
