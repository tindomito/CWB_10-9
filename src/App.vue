<template>
    <DarkNavbar />

    <!-- Trama de marca global: panal octagonal detrás de todo el contenido.
         Borgoña en el mundo Publicaciones, oro en el resto de la app. -->
    <div class="trama-fondo" :class="tramaClass" aria-hidden="true"></div>

    <main
        class="container mx-auto p-3 sm:p-6 lg:p-8 pb-[calc(72px+env(safe-area-inset-bottom))] lg:pb-8 overflow-x-hidden"
    >
        <RouterView />
    </main>

    <!-- Footer solo en desktop (en mobile/tablet lo reemplaza el BottomNavbar) -->
    <div class="hidden lg:block">
        <MyFooter/>
    </div>

    <!-- Navbar inferior (solo mobile) -->
    <BottomNavbar />

    <!-- Sistema de notificaciones toast -->
    <ToastNotification />
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import DarkNavbar from './components/DarkNavbar.vue';
import BottomNavbar from './components/BottomNavbar.vue';
import MyFooter from './components/MyFooter.vue';
import ToastNotification from './components/ToastNotification.vue';
import { useAuth } from './composables/useAuth.js';

const route = useRoute();
const { initialize, isAuthenticated } = useAuth();

/**
 * Variante de la trama global según la sección:
 * borgoña (la más sutil) para el mundo Publicaciones/Rankings,
 * oro sobre negro (densidad baja) para el resto de la app.
 */
const tramaClass = computed(() => {
    const seccionBorgona = ['Publications', 'PublicationDetail', 'RankingDetail', 'RankingNew', 'RankingEdit'];
    return seccionBorgona.includes(route.name)
        ? 'trama-borgona-negro'
        : 'trama-oro-negro';
});

// Carga el perfil del usuario si está autenticado
async function loadProfileIfAuthenticated() {
    if (isAuthenticated.value) {
        // Importar dinámicamente para evitar dependencias circulares
        const { useProfile } = await import('./composables/useProfile.js');
        const { loadCurrentProfile } = useProfile();
        try {
            await loadCurrentProfile();
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }
}

onMounted(async () => {
    // Inicializar el sistema de autenticación
    await initialize();
    await loadProfileIfAuthenticated();
});
</script>
