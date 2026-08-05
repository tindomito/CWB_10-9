<!--
    Paso 1 de la recuperación de contraseña: el usuario deja su email y recibe
    un enlace. El paso 2 (elegir la contraseña nueva) es ResetPassword.vue.

    Tras enviarlo se muestra siempre el mismo mensaje de éxito, exista o no una
    cuenta con ese email: informar lo contrario permitiría averiguar quién está
    registrado en la app.
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
                        class="h-20 w-20 sm:h-24 sm:w-24 select-none"
                        draggable="false"
                    />
                </div>
                <h1 class="mt-6 text-center text-3xl font-bold text-white">
                    Recuperar contraseña
                </h1>
                <p class="mt-2 text-center text-sm text-gray-400">
                    Te mandamos un enlace para elegir una nueva.
                </p>
            </div>

            <!-- Enviado -->
            <div v-if="enviado" class="space-y-6">
                <div class="bg-green-900/20 border border-green-700 rounded-md p-4">
                    <p class="text-sm font-medium text-green-300 mb-1">Revisá tu correo</p>
                    <p class="text-sm text-green-400">
                        Si hay una cuenta asociada a <span class="font-semibold">{{ email }}</span>,
                        vas a recibir un enlace para restablecer tu contraseña. Puede tardar
                        unos minutos y a veces cae en spam.
                    </p>
                </div>
                <div class="text-center space-y-3">
                    <button
                        type="button"
                        @click="enviado = false"
                        class="text-sm font-medium text-[#D4AF37] hover:text-amber-300"
                    >
                        Usar otro email
                    </button>
                    <p>
                        <RouterLink to="/ingresar" class="text-sm text-gray-400 hover:text-white">
                            Volver a iniciar sesión
                        </RouterLink>
                    </p>
                </div>
            </div>

            <!-- Formulario -->
            <form v-else @submit.prevent="handleSubmit" class="mt-8 space-y-6">
                <div v-if="error" class="bg-red-900/20 border border-red-700 rounded-md p-4">
                    <p class="text-sm font-medium text-red-300">No se pudo enviar el correo</p>
                    <p class="mt-1 text-sm text-red-400">{{ error }}</p>
                </div>

                <div>
                    <label for="reset-email" class="block text-sm font-medium text-gray-300 mb-1">
                        Email
                    </label>
                    <input
                        id="reset-email"
                        v-model.trim="email"
                        type="email"
                        autocomplete="email"
                        required
                        placeholder="tu@email.com"
                        class="block w-full px-3 py-2 border border-zinc-700 rounded-md shadow-sm bg-zinc-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                    />
                    <p class="mt-1 text-xs text-gray-500">
                        El de la cuenta que querés recuperar.
                    </p>
                </div>

                <button
                    type="submit"
                    :disabled="loading || !email"
                    class="w-full flex justify-center py-2.5 px-4 rounded-md text-sm font-bold text-[#0D0D0D] bg-[#D4AF37] hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {{ loading ? 'Enviando…' : 'Enviar enlace' }}
                </button>

                <p class="text-center text-sm text-gray-400">
                    ¿Te acordaste?
                    <RouterLink to="/ingresar" class="font-semibold text-[#D4AF37] hover:text-amber-300">
                        Iniciá sesión
                    </RouterLink>
                </p>
            </form>
        </div>
    </div>
</template>

<script>
import { sendPasswordReset } from '../services/auth.js';

export default {
    name: 'ForgotPassword',
    data() {
        return {
            email: '',
            loading: false,
            enviado: false,
            error: null
        };
    },
    methods: {
        async handleSubmit() {
            this.loading = true;
            this.error = null;

            const { success, error } = await sendPasswordReset(this.email);

            this.loading = false;
            if (!success) {
                this.error = error?.message || 'Intentá de nuevo en unos minutos';
                return;
            }
            this.enviado = true;
        }
    }
};
</script>
