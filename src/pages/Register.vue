<!--
    Registro de cuenta nueva: display name, email y contraseña.
    Al crear el usuario en Supabase Auth también se crea su fila en
    `profiles` (rango inicial Amateur, XP en cero).
-->
<template>
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <!-- Header -->
            <div>
                <div class="mx-auto flex justify-center">
                    <img
                        src="/brand/logo-10-9.svg"
                        alt="10-9"
                        width="128"
                        height="128"
                        class="h-20 w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 select-none"
                        draggable="false"
                    />
                </div>
                <h1 class="mt-6 text-center text-3xl font-bold text-white">
                    Crear Cuenta
                </h1>
                <p class="mt-2 text-center text-sm text-gray-400">
                    Sumate a la comunidad que banca su tarjeta.
                </p>
            </div>

            <!-- Formulario -->
            <form @submit.prevent="handleRegister" class="mt-8 space-y-6">
                <!-- Mensaje de error -->
                <div v-if="error" class="bg-red-900/20 border border-red-700 rounded-md p-4">
                    <div class="flex">
                        <div class="ml-3">
                            <p class="text-sm font-medium text-red-300">
                                Error en el registro
                            </p>
                            <div class="mt-2 text-sm text-red-400">
                                {{ error }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Mensaje de éxito -->
                <div v-if="successMessage" class="bg-green-900/20 border border-green-700 rounded-md p-4">
                    <div class="flex">
                        <div class="ml-3">
                            <div class="text-sm text-green-300">
                                {{ successMessage }}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <!-- Display Name -->
                    <div>
                        <label for="displayName" class="block text-sm font-medium text-gray-300">
                            Nombre de usuario
                        </label>
                        <input
                            id="displayName"
                            name="displayName"
                            type="text"
                            required
                            v-model="form.displayName"
                            :disabled="loading"
                            class="mt-1 block w-full px-3 py-2 bg-zinc-900 text-white border border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-500"
                            placeholder="Tu nombre de usuario"
                        />
                        <p class="mt-1 text-xs text-gray-500">
                            Este será tu nombre visible en la comunidad
                        </p>
                    </div>

                    <!-- Email -->
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-300">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autocomplete="email"
                            required
                            v-model="form.email"
                            :disabled="loading"
                            class="mt-1 block w-full px-3 py-2 bg-zinc-900 text-white border border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-500"
                            placeholder="tu@email.com"
                        />
                    </div>

                    <!-- Password -->
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-300">
                            Contraseña
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autocomplete="new-password"
                            required
                            v-model="form.password"
                            :disabled="loading"
                            class="mt-1 block w-full px-3 py-2 bg-zinc-900 text-white border border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-500"
                            placeholder="••••••••"
                        />
                        <p class="mt-1 text-xs text-gray-500">
                            Mínimo 6 caracteres
                        </p>
                    </div>

                    <!-- Confirm Password -->
                    <div>
                        <label for="confirmPassword" class="block text-sm font-medium text-gray-300">
                            Confirmar contraseña
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            autocomplete="new-password"
                            required
                            v-model="form.confirmPassword"
                            :disabled="loading"
                            class="mt-1 block w-full px-3 py-2 bg-zinc-900 text-white border border-zinc-700 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-500"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <!-- Botón submit -->
                <div>
                    <button
                        type="submit"
                        :disabled="loading || !isFormValid"
                        class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-bold rounded-md text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                    >
                        <span v-if="!loading">Crear Cuenta</span>
                        <span v-else class="flex items-center">
                            <svg aria-hidden="true" class="animate-spin -ml-1 mr-3 h-5 w-5 text-[#0D0D0D]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creando cuenta...
                        </span>
                    </button>
                </div>

                <!-- Links -->
                <div class="flex items-center justify-center">
                    <div class="text-sm">
                        <span class="text-gray-400">¿Ya tienes cuenta? </span>
                        <RouterLink
                            to="/ingresar"
                            class="font-medium text-amber-500 hover:text-amber-400 transition duration-200"
                        >
                            Inicia sesión aquí
                        </RouterLink>
                    </div>
                </div>
            </form>
        </div>
    </div>
</template>

<script>
import { register } from '../services/auth.js';

export default {
    name: 'Register',
    data() {
        return {
            form: {
                displayName: '',
                email: '',
                password: '',
                confirmPassword: ''
            },
            loading: false,
            error: null,
            successMessage: null
        };
    },
    computed: {
        isFormValid() {
            return (
                this.form.displayName.trim().length > 0 &&
                this.form.email.trim().length > 0 &&
                this.form.password.length >= 6 &&
                this.form.password === this.form.confirmPassword
            );
        }
    },
    methods: {
        async handleRegister() {
            if (this.form.password !== this.form.confirmPassword) {
                this.error = 'Las contraseñas no coinciden';
                return;
            }

            if (this.form.password.length < 6) {
                this.error = 'La contraseña debe tener al menos 6 caracteres';
                return;
            }

            if (this.form.displayName.trim().length === 0) {
                this.error = 'El nombre de usuario es requerido';
                return;
            }

            this.loading = true;
            this.error = null;
            this.successMessage = null;

            try {
                const { user, error } = await register(
                    this.form.email.trim(),
                    this.form.password,
                    this.form.displayName.trim()
                );

                if (error) {
                    if (error.message.includes('User already registered')) {
                        this.error = 'Ya existe una cuenta con este email';
                    } else if (error.message.includes('Password should be at least 6 characters')) {
                        this.error = 'La contraseña debe tener al menos 6 caracteres';
                    } else if (error.message.includes('Invalid email')) {
                        this.error = 'El email no es válido';
                    } else {
                        this.error = error.message || 'Error al crear la cuenta';
                    }
                    return;
                }

                if (user) {
                    this.successMessage = 'Cuenta creada exitosamente. Revisa tu email para confirmar tu cuenta.';

                    this.form = {
                        displayName: '',
                        email: '',
                        password: '',
                        confirmPassword: ''
                    };

                    setTimeout(() => {
                        this.$router.push('/ingresar');
                    }, 3000);
                }
            } catch (error) {
                this.error = 'Error inesperado. Intenta nuevamente.';
            } finally {
                this.loading = false;
            }
        }
    }
};
</script>