<!--
    Paso 2 de la recuperación: el usuario llega acá desde el enlace del correo
    y elige una contraseña nueva.

    El enlace trae un token en la URL que el cliente de Supabase canjea solo por
    una sesión temporal. Como ese canje es asincrónico, la pantalla espera a que
    exista sesión antes de mostrar el formulario: si no aparece, el enlace ya se
    usó o venció.
-->
<template>
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
            <div>
                <div class="mx-auto flex justify-center">
                    <img
                        src="/brand/logo-10-9.svg"
                        alt="10-9"
                        width="128"
                        height="128"
                        class="h-20 w-20 sm:h-24 sm:w-24 select-none"
                        draggable="false"
                    />
                </div>
                <h1 class="mt-6 text-center text-3xl font-bold text-white">
                    Nueva contraseña
                </h1>
            </div>

            <!-- Esperando a que se canjee el token del enlace -->
            <div v-if="verificando" class="flex justify-center py-8">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]"></div>
            </div>

            <!-- Enlace inválido o vencido -->
            <div v-else-if="!sesionValida" class="space-y-6">
                <div class="bg-red-900/20 border border-red-700 rounded-md p-4">
                    <p class="text-sm font-medium text-red-300 mb-1">Enlace inválido o vencido</p>
                    <p class="text-sm text-red-400">
                        Los enlaces de recuperación duran poco y se pueden usar una sola vez.
                        Pedí uno nuevo para continuar.
                    </p>
                </div>
                <RouterLink
                    to="/recuperar-password"
                    class="block w-full text-center py-2.5 px-4 rounded-md text-sm font-bold text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 transition-colors"
                >
                    Pedir un enlace nuevo
                </RouterLink>
            </div>

            <!-- Cambiada con éxito -->
            <div v-else-if="listo" class="space-y-6">
                <div class="bg-green-900/20 border border-green-700 rounded-md p-4">
                    <p class="text-sm font-medium text-green-300 mb-1">Contraseña actualizada</p>
                    <p class="text-sm text-green-400">Ya podés entrar con tu contraseña nueva.</p>
                </div>
                <RouterLink
                    to="/"
                    class="block w-full text-center py-2.5 px-4 rounded-md text-sm font-bold text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 transition-colors"
                >
                    Ir al inicio
                </RouterLink>
            </div>

            <!-- Formulario -->
            <form v-else @submit.prevent="handleSubmit" class="mt-8 space-y-6">
                <div v-if="error" class="bg-red-900/20 border border-red-700 rounded-md p-4">
                    <p class="text-sm font-medium text-red-300">No se pudo cambiar la contraseña</p>
                    <p class="mt-1 text-sm text-red-400">{{ error }}</p>
                </div>

                <div>
                    <label for="new-password" class="block text-sm font-medium text-gray-300 mb-1">
                        Nueva contraseña
                    </label>
                    <input
                        id="new-password"
                        v-model="password"
                        type="password"
                        autocomplete="new-password"
                        required
                        minlength="6"
                        class="block w-full px-3 py-2 border border-zinc-700 rounded-md shadow-sm bg-zinc-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                    />
                    <p class="mt-1 text-xs text-gray-500">Mínimo 6 caracteres</p>
                </div>

                <div>
                    <label for="confirm-password" class="block text-sm font-medium text-gray-300 mb-1">
                        Confirmar contraseña
                    </label>
                    <input
                        id="confirm-password"
                        v-model="confirmPassword"
                        type="password"
                        autocomplete="new-password"
                        required
                        class="block w-full px-3 py-2 border border-zinc-700 rounded-md shadow-sm bg-zinc-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                    />
                    <p v-if="confirmPassword && !coinciden" class="mt-1 text-xs text-[#C41E3A]">
                        Las contraseñas no coinciden
                    </p>
                </div>

                <button
                    type="submit"
                    :disabled="loading || !formularioValido"
                    class="w-full flex justify-center py-2.5 px-4 rounded-md text-sm font-bold text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {{ loading ? 'Guardando…' : 'Cambiar contraseña' }}
                </button>
            </form>
        </div>
    </div>
</template>

<script>
import { getCurrentUser, updatePassword, subscribeToAuthChanges } from '../services/auth.js';

export default {
    name: 'ResetPassword',
    data() {
        return {
            password: '',
            confirmPassword: '',
            loading: false,
            verificando: true,
            sesionValida: false,
            listo: false,
            error: null,
            subscription: null,
            timeoutId: null
        };
    },
    computed: {
        coinciden() {
            return this.password === this.confirmPassword;
        },
        formularioValido() {
            return this.password.length >= 6 && this.coinciden;
        }
    },
    async mounted() {
        // El token puede estar canjeado ya, o llegar en los milisegundos
        // siguientes: se contemplan las dos situaciones.
        const { user } = await getCurrentUser();
        if (user) {
            this.aceptarSesion();
            return;
        }

        this.subscription = subscribeToAuthChanges((event, session) => {
            if (session?.user) this.aceptarSesion();
        });

        // Si en unos segundos no hay sesión, el enlace no sirve.
        this.timeoutId = setTimeout(() => {
            this.verificando = false;
        }, 4000);
    },
    beforeUnmount() {
        clearTimeout(this.timeoutId);
        // onAuthStateChange devuelve { data: { subscription } }
        this.subscription?.data?.subscription?.unsubscribe();
    },
    methods: {
        aceptarSesion() {
            clearTimeout(this.timeoutId);
            this.sesionValida = true;
            this.verificando = false;
        },
        async handleSubmit() {
            if (!this.formularioValido) return;
            this.loading = true;
            this.error = null;

            const { success, error } = await updatePassword(this.password);

            this.loading = false;
            if (!success) {
                this.error = error?.message || 'Intentá de nuevo';
                return;
            }
            this.listo = true;
        }
    }
};
</script>
