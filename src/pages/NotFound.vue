<!--
    Página 404. Hace falta una ruta catch-all porque en producción el servidor
    devuelve index.html para cualquier URL (es lo que necesita el router en modo
    history): sin esta pantalla, una dirección inexistente dejaría la app en
    blanco, con solo el navbar.
-->
<template>
    <div class="min-h-[60vh] flex items-center justify-center px-4">
        <div class="text-center max-w-md">
            <!-- Marcador tipo tarjeta de puntuación -->
            <p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.2em] mb-3">
                Error 404
            </p>

            <div class="flex items-center justify-center gap-3 mb-6">
                <span class="text-6xl sm:text-7xl font-black text-white leading-none">4</span>
                <span class="text-6xl sm:text-7xl font-black text-[#C41E3A] leading-none">0</span>
                <span class="text-6xl sm:text-7xl font-black text-white leading-none">4</span>
            </div>

            <h1 class="text-xl sm:text-2xl font-bold text-white mb-2">
                Esta página no está en la cartelera
            </h1>
            <p class="text-sm text-gray-400 mb-8">
                El enlace que seguiste no existe o el contenido se dio de baja.
            </p>

            <div class="flex flex-wrap items-center justify-center gap-3">
                <RouterLink
                    to="/"
                    class="px-5 py-2.5 text-sm font-bold rounded-lg bg-[#D4AF37] text-[#0D0D0D] hover:bg-amber-400 transition-colors"
                >
                    Volver al inicio
                </RouterLink>
                <RouterLink
                    to="/predicciones"
                    class="px-5 py-2.5 text-sm font-semibold rounded-lg border border-zinc-700 text-gray-300 hover:border-zinc-600 hover:text-white transition-colors"
                >
                    Ver predicciones
                </RouterLink>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'NotFound'
};
</script>
