<template>
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold text-white mb-6">Configuración del Perfil</h1>
        
        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center items-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
        </div>

        <!-- Main content -->
        <div v-else class="space-y-6">
            <!-- Mensajes de estado -->
            <div v-if="successMessage" class="bg-green-900/20 border border-green-700 rounded-md p-4">
                <div class="flex">
                    <div class="ml-3">
                        <div class="text-sm text-green-300">
                            {{ successMessage }}
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="errorMessage" class="bg-red-900/20 border border-red-700 rounded-md p-4">
                <div class="flex">
                    <div class="ml-3">
                        <h3 class="text-sm font-medium text-red-300">
                            Error al actualizar perfil
                        </h3>
                        <div class="mt-2 text-sm text-red-400">
                            {{ errorMessage }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Formulario de perfil -->
            <div class="bg-zinc-900 shadow rounded-lg">
                <div class="px-6 py-6">
                    <h2 class="text-lg font-medium text-white mb-6">Información Personal</h2>
                    
                    <form @submit.prevent="handleUpdateProfile" class="space-y-6">
                        <!-- Avatar section -->
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Foto de Perfil
                            </label>
                            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                                <div class="w-20 h-20 rounded-full bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A] flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                                    <img
                                        v-if="avatarPreview || form.avatar_url"
                                        :src="avatarPreview || form.avatar_url"
                                        :alt="'Avatar de ' + form.display_name"
                                        class="w-full h-full object-cover"
                                        @error="handleImageError"
                                    />
                                    <span v-else>{{ avatarInitials }}</span>
                                </div>
                                <div class="flex-1">
                                    <div class="flex items-center space-x-2">
                                        <label
                                            for="avatar-upload"
                                            class="cursor-pointer inline-flex items-center px-4 py-2 border border-zinc-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-zinc-800 hover:bg-zinc-700 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                                        >
                                            <svg aria-hidden="true" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                            Seleccionar Imagen
                                            <input
                                                id="avatar-upload"
                                                type="file"
                                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                                @change="handleAvatarChange"
                                                :disabled="saveLoading"
                                                class="sr-only"
                                            />
                                        </label>
                                        <button
                                            v-if="avatarPreview || form.avatar_url"
                                            type="button"
                                            @click="removeAvatar"
                                            :disabled="saveLoading"
                                            aria-label="Quitar foto de perfil"
                                            class="inline-flex items-center px-3 py-2 border border-red-600 rounded-md shadow-sm text-sm font-medium text-red-300 bg-red-900/20 hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-black disabled:opacity-50"
                                        >
                                            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                            </svg>
                                        </button>
                                    </div>
                                    <p class="mt-1 text-xs text-gray-400">
                                        JPG, PNG, GIF o WebP. Máximo 5MB.
                                    </p>
                                    <p v-if="avatarError" class="mt-1 text-xs text-red-400">
                                        {{ avatarError }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Cover (foto de portada) -->
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Foto de Portada
                            </label>
                            <div class="space-y-3">
                                <!-- Preview del cover (refleja la posición elegida) -->
                                <div class="relative h-28 sm:h-32 rounded-lg overflow-hidden bg-gradient-to-br from-[#7A0A1C] to-[#C41E3A]">
                                    <img
                                        v-if="coverPreview || form.cover_url"
                                        :src="coverPreview || form.cover_url"
                                        :alt="`Cover de ${form.display_name}`"
                                        class="absolute inset-0 w-full h-full object-cover"
                                        :style="{ objectPosition: `50% ${form.cover_position}%` }"
                                        @error="$event.target.style.display='none'"
                                    />
                                    <span
                                        v-if="!coverPreview && !form.cover_url"
                                        class="absolute inset-0 flex items-center justify-center text-xs text-white/70 font-medium uppercase tracking-widest"
                                    >
                                        Por defecto · borgoña
                                    </span>
                                </div>

                                <!-- Ajuste de posición vertical (solo si hay imagen) -->
                                <div v-if="coverPreview || form.cover_url" class="flex items-center gap-3">
                                    <svg aria-hidden="true" class="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V6a2 2 0 012-2h2M4 16v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m-4 12h2a2 2 0 002-2v-2"></path>
                                    </svg>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        v-model.number="form.cover_position"
                                        aria-label="Posición vertical de la portada"
                                        class="flex-1 accent-[#D4AF37] cursor-pointer"
                                    />
                                    <span class="text-[11px] text-gray-500 w-10 text-right shrink-0">{{ form.cover_position }}%</span>
                                </div>
                                <p v-if="coverPreview || form.cover_url" class="text-[11px] text-gray-500 -mt-1">
                                    Deslizá para encuadrar la imagen (la portada es ancha y baja).
                                </p>
                                <div class="flex items-center gap-2">
                                    <label
                                        for="cover-upload"
                                        class="cursor-pointer inline-flex items-center px-4 py-2 border border-zinc-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-zinc-800 hover:bg-zinc-700"
                                    >
                                        <svg aria-hidden="true" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        Seleccionar portada
                                        <input
                                            id="cover-upload"
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                            @change="handleCoverChange"
                                            :disabled="saveLoading"
                                            class="sr-only"
                                        />
                                    </label>
                                    <button
                                        v-if="coverPreview || form.cover_url"
                                        type="button"
                                        @click="removeCover"
                                        :disabled="saveLoading"
                                        class="inline-flex items-center px-3 py-2 border border-red-600 rounded-md shadow-sm text-sm font-medium text-red-300 bg-red-900/20 hover:bg-red-900/30 disabled:opacity-50"
                                        title="Volver a la portada por defecto"
                                    >
                                        <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                        </svg>
                                    </button>
                                </div>
                                <p class="text-xs text-gray-400">
                                    JPG, PNG, GIF o WebP. Máximo 5MB. Opcional — si no subís nada, el cover queda en borgoña.
                                </p>
                                <p v-if="coverError" class="text-xs text-red-400">{{ coverError }}</p>
                            </div>
                        </div>

                        <!-- Nombre de usuario -->
                        <div>
                            <label for="display_name" class="block text-sm font-medium text-gray-300">
                                Nombre de Usuario
                            </label>
                            <input
                                id="display_name"
                                type="text"
                                v-model="form.display_name"
                                :disabled="saveLoading"
                                required
                                class="mt-1 block w-full px-3 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] disabled:opacity-50"
                                placeholder="Tu nombre de usuario"
                            />
                            <p class="mt-1 text-xs text-gray-400">
                                Este nombre será visible para otros usuarios
                            </p>
                        </div>

                        <!-- Bio -->
                        <div>
                            <label for="bio" class="block text-sm font-medium text-gray-300">
                                Biografía
                            </label>
                            <textarea
                                id="bio"
                                v-model="form.bio"
                                :disabled="saveLoading"
                                rows="4"
                                class="mt-1 block w-full px-3 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] disabled:opacity-50"
                                placeholder="Cuéntanos sobre ti, tu experiencia en MMA, tus luchadores favoritos..."
                            ></textarea>
                            <p class="mt-1 text-xs text-gray-400">
                                Máximo 500 caracteres. {{ bioCharCount }}/500
                            </p>
                        </div>

                        <!-- Rango (solo lectura para usuarios normales) -->
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Rango Actual
                            </label>
                            <div class="p-4 bg-zinc-800 rounded-md">
                                <RankBadge
                                    :rango="currentProfile?.rango || 'Amateur'"
                                    :isPro="currentProfile?.pro || false"
                                    :showProgress="true"
                                />
                                <p class="mt-2 text-xs text-gray-400">
                                    Los rangos se actualizan automáticamente según tu actividad en la comunidad
                                </p>
                            </div>
                        </div>

                        <!-- Estado Admin -->
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Estado de Administrador
                            </label>
                            <div class="p-4 bg-zinc-800 rounded-md">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <span class="text-sm font-medium text-white">
                                            {{ currentProfile?.pro ? 'Administrador' : 'Miembro Estándar' }}
                                        </span>
                                        <p class="text-xs text-gray-400 mt-1">
                                            {{ currentProfile?.pro ? 'Tienes permisos de administrador' : 'Usuario estándar' }}
                                        </p>
                                    </div>
                                    <div>
                                        <span
                                            v-if="currentProfile?.pro"
                                            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-500 to-red-700 text-white"
                                        >
                                            👑 Admin
                                        </span>
                                        <span
                                            v-else
                                            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-600 text-gray-300"
                                        >
                                            Usuario
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Información de la cuenta -->
                        <div>
                            <label class="block text-sm font-medium text-gray-300 mb-2">
                                Información de la cuenta
                            </label>
                            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-zinc-800 rounded-md">
                                <div>
                                    <dt class="text-xs text-gray-400">Miembro desde</dt>
                                    <dd class="mt-0.5 text-sm text-white">{{ memberSinceDetailed }}</dd>
                                </div>
                                <div>
                                    <dt class="text-xs text-gray-400">Última actividad</dt>
                                    <dd class="mt-0.5 text-sm text-white">{{ lastActivityFormatted }}</dd>
                                </div>
                                <div>
                                    <dt class="text-xs text-gray-400">Estado</dt>
                                    <dd class="mt-0.5">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300">
                                            Activo
                                        </span>
                                    </dd>
                                </div>
                                <div>
                                    <dt class="text-xs text-gray-400">Email</dt>
                                    <dd class="mt-0.5 text-sm text-white truncate">{{ userEmail }}</dd>
                                </div>
                            </dl>
                        </div>

                        <!-- Botones de acción -->
                        <div class="flex justify-between">
                            <button
                                type="button"
                                @click="resetForm"
                                :disabled="saveLoading"
                                class="inline-flex items-center px-4 py-2 border border-zinc-700 text-sm font-medium rounded-md text-gray-300 bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] focus:ring-offset-black disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                :disabled="saveLoading || !isFormValid"
                                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] focus:ring-offset-black disabled:opacity-50"
                            >
                                <span v-if="!saveLoading">Guardar Cambios</span>
                                <span v-else class="flex items-center">
                                    <svg aria-hidden="true" class="animate-spin -ml-1 mr-2 h-4 w-4 text-[#0D0D0D]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Guardando...
                                </span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Sección de cuenta -->
            <div class="bg-zinc-900 shadow rounded-lg">
                <div class="px-6 py-6">
                    <h2 class="text-lg font-medium text-white mb-6">Configuración de Cuenta</h2>
                    
                    <div class="space-y-4">
                        <!-- Email (solo lectura) -->
                        <div>
                            <label for="settings-email" class="block text-sm font-medium text-gray-300">
                                Email
                            </label>
                            <input
                                id="settings-email"
                                type="email"
                                :value="userEmail"
                                readonly
                                class="mt-1 block w-full px-3 py-2 border border-zinc-700 rounded-md shadow-sm bg-zinc-800 text-gray-400"
                            />
                            <p class="mt-1 text-xs text-gray-400">
                                Para cambiar tu email, contáctanos
                            </p>
                        </div>

                        <!-- Cambiar contraseña -->
                        <div class="pt-4 border-t border-zinc-800">
                            <h3 class="text-md font-medium text-white mb-4">Cambiar Contraseña</h3>

                            <form @submit.prevent="handleChangePassword" class="space-y-4">
                                <div>
                                    <label for="new_password" class="block text-sm font-medium text-gray-300">
                                        Nueva Contraseña
                                    </label>
                                    <input
                                        id="new_password"
                                        type="password"
                                        v-model="passwordForm.newPassword"
                                        :disabled="passwordLoading"
                                        class="mt-1 block w-full px-3 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] disabled:opacity-50"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>

                                <div>
                                    <label for="confirm_password" class="block text-sm font-medium text-gray-300">
                                        Confirmar Nueva Contraseña
                                    </label>
                                    <input
                                        id="confirm_password"
                                        type="password"
                                        v-model="passwordForm.confirmPassword"
                                        :disabled="passwordLoading"
                                        class="mt-1 block w-full px-3 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] disabled:opacity-50"
                                        placeholder="Repite la contraseña"
                                    />
                                </div>

                                <!-- Mensaje de éxito de contraseña -->
                                <div v-if="passwordSuccess" class="p-3 bg-green-900/20 border border-green-700 rounded-md">
                                    <p class="text-sm text-green-300">{{ passwordSuccess }}</p>
                                </div>

                                <!-- Mensaje de error de contraseña -->
                                <div v-if="passwordError" class="p-3 bg-red-900/20 border border-red-700 rounded-md">
                                    <p class="text-sm text-red-400">{{ passwordError }}</p>
                                </div>

                                <button
                                    type="submit"
                                    :disabled="passwordLoading || !isPasswordFormValid"
                                    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg aria-hidden="true" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                    </svg>
                                    <span v-if="!passwordLoading">Cambiar Contraseña</span>
                                    <span v-else class="flex items-center">
                                        <svg aria-hidden="true" class="animate-spin -ml-1 mr-2 h-4 w-4 text-[#0D0D0D]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Cambiando...
                                    </span>
                                </button>
                            </form>
                        </div>

                        <!-- Botón de cerrar sesión -->
                        <div class="pt-4 border-t border-zinc-800">
                            <button
                                @click="handleLogout"
                                type="button"
                                class="inline-flex items-center px-4 py-2 border border-red-600 text-sm font-medium rounded-md text-red-300 bg-red-900/20 hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                <svg aria-hidden="true" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                </svg>
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { useAuth } from '../composables/useAuth.js';
import { useProfile } from '../composables/useProfile.js';
import { useToast } from '../composables/useToast.js';
import { logout, getCurrentUser, updatePassword } from '../services/auth.js';
import { uploadProfileAvatar, validateImageFile, deleteProfileAvatar, uploadProfileCover, deleteProfileCover } from '../services/storage.js';
import RankBadge from '../components/RankBadge.vue';

export default {
    name: 'Settings',
    components: {
        RankBadge
    },
    setup() {
        const { userEmail, clearUser } = useAuth();
        const {
            currentProfile,
            loadCurrentProfile,
            updateCurrentProfile,
            profileLoading
        } = useProfile();
        const { success, error: showError } = useToast();

        return {
            userEmail,
            currentProfile,
            loadCurrentProfile,
            updateCurrentProfile,
            profileLoading,
            clearUser,
            toastSuccess: success,
            toastError: showError
        };
    },
    data() {
        return {
            loading: true,
            saveLoading: false,
            successMessage: null,
            errorMessage: null,
            form: {
                display_name: '',
                bio: '',
                avatar_url: '',
                cover_url: '',
                cover_position: 50
            },
            avatarFile: null, // Archivo de imagen seleccionado
            avatarPreview: null, // URL de vista previa de la imagen
            avatarError: null, // Error de validación de avatar
            coverFile: null,
            coverPreview: null,
            coverError: null,
            passwordForm: {
                newPassword: '',
                confirmPassword: ''
            },
            passwordLoading: false,
            passwordSuccess: null,
            passwordError: null
        };
    },
    computed: {
        // Validación del formulario
        isFormValid() {
            return this.form.display_name.trim().length > 0 && 
                   this.bioCharCount <= 500;
        },
        
        // Contador de caracteres de la bio
        bioCharCount() {
            return this.form.bio.length;
        },
        
        // Iniciales para el avatar
        avatarInitials() {
            if (this.form.display_name) {
                return this.form.display_name
                    .split(' ')
                    .map(name => name.charAt(0))
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
            }
            return 'U';
        },
        
        // Validación del formulario de contraseña
        isPasswordFormValid() {
            return (
                this.passwordForm.newPassword.length >= 6 &&
                this.passwordForm.newPassword === this.passwordForm.confirmPassword
            );
        },

        // Fecha detallada de cuando se unió
        memberSinceDetailed() {
            if (!this.currentProfile?.created_at) return 'Fecha desconocida';
            return new Date(this.currentProfile.created_at).toLocaleDateString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        },

        // Última actividad formateada
        lastActivityFormatted() {
            if (!this.currentProfile?.updated_at) return 'Nunca';
            const date = new Date(this.currentProfile.updated_at);
            const diffDays = Math.ceil(Math.abs(Date.now() - date) / (1000 * 60 * 60 * 24));
            if (diffDays <= 1) return 'Hoy';
            if (diffDays < 7) return `Hace ${diffDays} días`;
            if (diffDays < 30) return `Hace ${Math.ceil(diffDays / 7)} semanas`;
            return `Hace ${Math.ceil(diffDays / 30)} meses`;
        }
    },
    methods: {
        // Inicializa el formulario con los datos del perfil
        initializeForm() {
            if (this.currentProfile) {
                this.form = {
                    display_name: this.currentProfile.display_name || '',
                    bio: this.currentProfile.bio || '',
                    avatar_url: this.currentProfile.avatar_url || '',
                    cover_url: this.currentProfile.cover_url || '',
                    cover_position: this.currentProfile.cover_position ?? 50
                };
            }
        },
        
        // Resetea el formulario a los valores originales
        resetForm() {
            this.initializeForm();
            this.clearMessages();
        },
        
        // Limpia los mensajes de estado
        clearMessages() {
            this.successMessage = null;
            this.errorMessage = null;
        },
        
        // Maneja el cambio de archivo de avatar
        handleAvatarChange(event) {
            this.avatarError = null;
            const file = event.target.files[0];

            if (!file) {
                return;
            }

            // Validar archivo
            const validation = validateImageFile(file);
            if (!validation.valid) {
                this.avatarError = validation.error;
                event.target.value = ''; // Limpiar input
                return;
            }

            // Guardar archivo
            this.avatarFile = file;

            // Crear vista previa
            const reader = new FileReader();
            reader.onload = (e) => {
                this.avatarPreview = e.target.result;
            };
            reader.readAsDataURL(file);
        },

        // Elimina el avatar seleccionado
        removeAvatar() {
            this.avatarFile = null;
            this.avatarPreview = null;
            this.avatarError = null;
            this.form.avatar_url = '';

            // Limpiar input de archivo
            const fileInput = document.getElementById('avatar-upload');
            if (fileInput) {
                fileInput.value = '';
            }
        },

        // Cambio de archivo de cover
        handleCoverChange(event) {
            this.coverError = null;
            const file = event.target.files[0];
            if (!file) return;

            const validation = validateImageFile(file);
            if (!validation.valid) {
                this.coverError = validation.error;
                event.target.value = '';
                return;
            }
            this.coverFile = file;
            this.form.cover_position = 50; // nueva imagen → encuadre centrado por defecto
            const reader = new FileReader();
            reader.onload = (e) => { this.coverPreview = e.target.result; };
            reader.readAsDataURL(file);
        },

        // Volver a cover por defecto (borgoña)
        removeCover() {
            this.coverFile = null;
            this.coverPreview = null;
            this.coverError = null;
            this.form.cover_url = '';
            this.form.cover_position = 50;
            const fileInput = document.getElementById('cover-upload');
            if (fileInput) fileInput.value = '';
        },

        // Maneja la actualización del perfil
        async handleUpdateProfile() {
            this.clearMessages();
            this.avatarError = null;
            this.saveLoading = true;

            try {
                // Validaciones
                if (this.form.display_name.trim().length === 0) {
                    this.errorMessage = 'El nombre de usuario es requerido';
                    return;
                }

                if (this.bioCharCount > 500) {
                    this.errorMessage = 'La biografía no puede exceder 500 caracteres';
                    return;
                }

                // Subir avatar si se seleccionó uno nuevo
                let avatarUrl = this.form.avatar_url;
                if (this.avatarFile) {
                    const user = await getCurrentUser();
                    if (!user) {
                        this.errorMessage = 'No se pudo obtener el usuario actual';
                        return;
                    }

                    const { url, error } = await uploadProfileAvatar(this.avatarFile, user.id);

                    if (error) {
                        this.avatarError = error.message || 'Error al subir la imagen';
                        return;
                    }

                    avatarUrl = url;
                }

                // Subir cover si se seleccionó uno nuevo
                let coverUrl = this.form.cover_url;
                if (this.coverFile) {
                    const user = await getCurrentUser();
                    if (!user) {
                        this.errorMessage = 'No se pudo obtener el usuario actual';
                        return;
                    }
                    const { url, error } = await uploadProfileCover(this.coverFile, user.id);
                    if (error) {
                        this.coverError = error.message || 'Error al subir la portada';
                        return;
                    }
                    coverUrl = url;
                }
                // Si el usuario quitó la cover y la anterior estaba en nuestro storage, borrarla
                if (!coverUrl && this.currentProfile?.cover_url) {
                    await deleteProfileCover(this.currentProfile.cover_url);
                }

                // Preparar datos para actualizar
                const updates = {
                    display_name: this.form.display_name.trim(),
                    bio: this.form.bio.trim(),
                    avatar_url: avatarUrl || null,
                    cover_url: coverUrl || null,
                    cover_position: coverUrl ? this.form.cover_position : 50
                };

                const { success, error } = await this.updateCurrentProfile(updates);

                if (!success) {
                    this.errorMessage = error?.message || 'Error al actualizar el perfil';
                    this.toastError(error?.message || 'Error al actualizar el perfil');
                    return;
                }

                // Limpiar datos de archivo después de guardar exitosamente
                this.avatarFile = null;
                this.avatarPreview = null;
                this.form.avatar_url = avatarUrl || '';
                this.coverFile = null;
                this.coverPreview = null;
                this.form.cover_url = coverUrl || '';

                this.successMessage = 'Perfil actualizado correctamente';
                this.toastSuccess('¡Perfil actualizado correctamente!');

                // Limpiar mensaje de éxito después de 3 segundos
                setTimeout(() => {
                    this.successMessage = null;
                }, 3000);

            } catch (error) {
                console.error('Error updating profile:', error);
                this.errorMessage = 'Error inesperado al actualizar el perfil';
                this.toastError('Error inesperado al actualizar el perfil');
            } finally {
                this.saveLoading = false;
            }
        },
        
        // Maneja el cambio de contraseña
        async handleChangePassword() {
            this.passwordSuccess = null;
            this.passwordError = null;

            // Validación de coincidencia de contraseñas
            if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
                this.passwordError = 'Las contraseñas no coinciden';
                return;
            }

            this.passwordLoading = true;

            try {
                const { success, error } = await updatePassword(this.passwordForm.newPassword);

                if (!success) {
                    this.passwordError = error?.message || 'Error al cambiar la contraseña';
                    this.toastError(error?.message || 'Error al cambiar la contraseña');
                    return;
                }

                // exito
                this.passwordSuccess = 'Contraseña cambiada correctamente';
                this.toastSuccess('¡Contraseña cambiada correctamente!');

                // Limpiar formulario
                this.passwordForm = {
                    newPassword: '',
                    confirmPassword: ''
                };

                // Limpiar mensaje de éxito después de 5 segundos
                setTimeout(() => {
                    this.passwordSuccess = null;
                }, 5000);

            } catch (error) {
                console.error('Error changing password:', error);
                this.passwordError = 'Error inesperado al cambiar la contraseña';
                this.toastError('Error inesperado al cambiar la contraseña');
            } finally {
                this.passwordLoading = false;
            }
        },
        
        // Maneja el cierre de sesión
        async handleLogout() {
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                try {
                    const { error } = await logout();
                    
                    if (error) {
                        console.error('Error during logout:', error);
                        this.errorMessage = 'Error al cerrar sesión';
                        return;
                    }
                    
                    this.clearUser();
                    this.$router.push('/');
                } catch (error) {
                    console.error('Unexpected error during logout:', error);
                    this.errorMessage = 'Error inesperado al cerrar sesión';
                }
            }
        },
        
        // Maneja errores de carga de imagen
        handleImageError(event) {
            event.target.style.display = 'none';
        }
    },
    
    async mounted() {
        this.loading = true;
        
        try {
            // Cargar perfil actual si no está cargado
            if (!this.currentProfile) {
                await this.loadCurrentProfile();
            }
            
            // Inicializar formulario
            this.initializeForm();
        } catch (error) {
            console.error('Error loading profile in settings:', error);
            this.errorMessage = 'Error al cargar la configuración del perfil';
        } finally {
            this.loading = false;
        }
    },
    
    // Watcher para actualizar el formulario cuando cambie el perfil
    watch: {
        currentProfile: {
            handler(newProfile) {
                if (newProfile) {
                    this.initializeForm();
                }
            },
            immediate: true
        }
    }
};
</script>