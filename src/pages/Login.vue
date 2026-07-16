<!--
    Pantalla de inicio de sesión (email + contraseña vía Supabase Auth).
    Si venía de una ruta protegida, el guard le pasa ?redirect= y acá
    se lo devuelve a donde quería ir después de loguearse.
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
                    Iniciar Sesión
                </h1>
                <p class="mt-2 text-center text-sm text-gray-400">
                    Bancate tu tarjeta. El round no miente.
                </p>
            </div>

            <!-- Formulario -->
            <form @submit.prevent="handleLogin" class="mt-8 space-y-6">
                <!-- Mensaje de error -->
                <div v-if="error" class="bg-red-900/20 border border-red-700 rounded-md p-4">
                    <div class="flex">
                        <div class="ml-3">
                            <p class="text-sm font-medium text-red-300">
                                Error de autenticación
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
                            autocomplete="current-password"
                            required
                            v-model="form.password"
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
                        :disabled="loading"
                        class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-bold rounded-md text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                    >
                        <span v-if="!loading">Iniciar Sesión</span>
                        <span v-else class="flex items-center">
                            <svg aria-hidden="true" class="animate-spin -ml-1 mr-3 h-5 w-5 text-[#0D0D0D]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Iniciando sesión...
                        </span>
                    </button>
                </div>

                <!-- Links -->
                <div class="flex items-center justify-center">
                    <div class="text-sm">
                        <span class="text-gray-400">¿No tienes cuenta? </span>
                        <RouterLink
                            to="/registro"
                            class="font-medium text-amber-500 hover:text-amber-400 transition duration-200"
                        >
                            Regístrate aquí
                        </RouterLink>
                    </div>
                </div>
            </form>
        </div>
    </div>
</template>

<script>
import { login } from '../services/auth.js';
import { useAuth } from '../composables/useAuth.js';

export default {
    name: 'Login',
    setup() {
        const { refreshUser } = useAuth();
        return { refreshUser };
    },
    data() {
        return {
            form: {
                email: '',
                password: ''
            },
            loading: false,
            error: null,
            successMessage: null
        };
    },
    methods: {
        async handleLogin() {
            this.loading = true;
            this.error = null;
            this.successMessage = null;

            try {
                const { user, error } = await login(this.form.email, this.form.password);

                if (error) {
                    if (error.message.includes('Invalid login credentials')) {
                        this.error = 'Email o contraseña incorrectos';
                    } else if (error.message.includes('Email not confirmed')) {
                        this.error = 'Debes confirmar tu email antes de iniciar sesión';
                    } else {
                        this.error = error.message || 'Error al iniciar sesión';
                    }
                    return;
                }

                if (user) {
                    this.successMessage = 'Inicio de sesión exitoso';
                    await this.refreshUser();

                    setTimeout(() => {
                        this.$router.push('/');
                    }, 1000);
                }
            } catch (error) {
                this.error = 'Error inesperado. Intenta nuevamente.';
            } finally {
                this.loading = false;
            }
        }
    },
    mounted() {
        const { isAuthenticated } = useAuth();
        if (isAuthenticated.value) {
            this.$router.push('/');
        }
    }
};
</script>