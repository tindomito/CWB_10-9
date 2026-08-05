<!--
    Vista de una publicación individual (/publicaciones/:id).
    Es el destino de los links compartidos y de las notificaciones:
    carga el post, firma la URL de la imagen si hace falta y reutiliza
    la misma PublicationCard del feed.
-->
<template>
    <div class="max-w-4xl mx-auto px-4 sm:px-0 space-y-4">
        <h1 class="sr-only">Publicación</h1>
        <button @click="$router.back()" class="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white">
            <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
            </svg>
            Volver
        </button>

        <div v-if="loading" class="flex justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]"></div>
        </div>

        <div v-else-if="error" class="bg-[#C41E3A]/10 border border-[#C41E3A]/30 rounded-lg p-4 text-center">
            <p class="text-sm text-red-300">{{ error }}</p>
            <RouterLink to="/publicaciones" class="text-sm font-medium text-[#D4AF37] hover:text-amber-300 mt-2 inline-block">
                Ir a publicaciones
            </RouterLink>
        </div>

        <PublicationCard
            v-else-if="publication"
            :publication="publication"
            full
            @delete="handleDeleted"
            @edit="goToFeed"
        />
    </div>
</template>

<script>
import PublicationCard from '../components/PublicationCard.vue';
import { getPublication, deletePublication } from '../services/publications.js';
import { getSignedUrlForImage } from '../services/storage.js';

export default {
    name: 'PublicationDetail',
    components: { PublicationCard },
    data() {
        return {
            publication: null,
            loading: true,
            error: null
        };
    },
    watch: {
        '$route.params.id'(id) { if (id) this.load(id); }
    },
    methods: {
        async load(id) {
            this.loading = true;
            this.error = null;
            const { publication, error } = await getPublication(id);
            if (error || !publication) {
                this.error = 'No se encontró la publicación.';
                this.loading = false;
                return;
            }
            // El bucket es privado: si la URL no viene ya firmada, pedimos
            // una signed URL para poder mostrar la imagen
            if (publication.image_url && !publication.image_url.includes('token=')) {
                const { url } = await getSignedUrlForImage(publication.image_url);
                if (url) publication.image_url = url;
            }
            this.publication = publication;
            this.loading = false;
        },
        async handleDeleted(id) {
            await deletePublication(id);
            this.$router.push('/publicaciones');
        },
        goToFeed() {
            this.$router.push('/publicaciones');
        }
    },
    async mounted() {
        await this.load(this.$route.params.id);
    }
};
</script>
