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
import { computed, onMounted, watch } from 'vue';
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

/**
 * Mantiene el perfil en memoria alineado con la sesión activa: lo carga al
 * iniciar sesión y lo descarta al cerrarla.
 *
 * El estado del composable vive a nivel de módulo (es compartido por toda la
 * app) y la SPA no se recarga al cambiar de cuenta. Sin esta sincronización,
 * los datos del usuario anterior sobreviven al logout — la navbar seguiría
 * mostrando su avatar — y los del nuevo no se cargarían hasta refrescar.
 */
async function syncProfileWithSession() {
    // Import dinámico para evitar dependencias circulares.
    const { useProfile } = await import('./composables/useProfile.js');
    const { loadCurrentProfile, clearCurrentProfile } = useProfile();

    if (!isAuthenticated.value) {
        clearCurrentProfile();
        return;
    }
    try {
        await loadCurrentProfile();
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

watch(isAuthenticated, syncProfileWithSession);

onMounted(async () => {
    // Inicializar el sistema de autenticación
    await initialize();
    await syncProfileWithSession();
});
</script>
