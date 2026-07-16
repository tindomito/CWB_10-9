<!--
    Formulario colapsable de "Nueva Publicación" (arriba del feed).
    Arranca cerrado para no ocupar espacio; al expandir permite título,
    contenido, categoría e imagen (con preview y validación de tipo/peso
    antes de subir al bucket de Supabase Storage).
-->
<template>
    <div class="bg-zinc-900 rounded-lg shadow-md overflow-hidden">
        <!-- Header clickeable para expandir/colapsar -->
        <button
            type="button"
            @click="toggleExpanded"
            class="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#D4AF37]"
        >
            <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                    <svg aria-hidden="true" class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                </div>
                <span class="text-xl font-bold text-white">Nueva Publicación</span>
            </div>
            <svg aria-hidden="true"
                class="w-5 h-5 text-gray-400 transform transition-transform duration-200"
                :class="{ 'rotate-180': isExpanded }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
        </button>

        <!-- Contenido colapsable -->
        <transition
            name="collapse"
            @enter="onEnter"
            @after-enter="onAfterEnter"
            @leave="onLeave"
            @after-leave="onAfterLeave"
        >
            <div v-show="isExpanded" class="collapse-content">
                <div class="px-6 pb-6 pt-2 border-t border-zinc-800">
                    <form @submit.prevent="handleSubmit">

            <div class="mb-4">
                <label for="pub-category" class="block text-sm font-medium text-gray-300 mb-2">
                    Categoría
                </label>
                <div class="relative">
                    <select
                        id="pub-category"
                        v-model="form.category"
                        class="block w-full px-4 py-2 pr-8 bg-zinc-800 text-white border border-zinc-700 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent cursor-pointer"
                    >
                        <option :value="null" disabled>Selecciona una categoría...</option>
                        <option
                            v-for="category in categories"
                            :key="category.id"
                            :value="category.id"
                        >
                            {{ category.icon }} {{ category.name }}
                        </option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                        <svg aria-hidden="true" class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                        </svg>
                    </div>
                </div>
            </div>

            <div class="mb-4">
                <label for="pub-title" class="block text-sm font-medium text-gray-300 mb-2">
                    Título
                </label>
                <input
                    id="pub-title"
                    v-model="form.title"
                    type="text"
                    required
                    maxlength="200"
                    :disabled="loading"
                    placeholder="Título de tu publicación..."
                    class="w-full px-4 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p class="mt-1 text-xs text-gray-400 text-right">
                    {{ form.title.length }}/200
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                <div class="flex flex-col">
                    <label for="pub-content" class="block text-sm font-medium text-gray-300 mb-2">
                        Contenido
                    </label>
                    <textarea
                        id="pub-content"
                        v-model="form.content"
                        required
                        rows="6"
                        maxlength="10000"
                        :disabled="loading"
                        placeholder="Escribe el contenido de tu publicación..."
                        class="w-full px-4 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed flex-grow"
                    ></textarea>
                    <p class="mt-1 text-xs text-gray-400 text-right">
                        {{ form.content.length }}/10000
                    </p>
                </div>

                <div class="flex flex-col">
                    <label class="block text-sm font-medium text-gray-300 mb-2">
                        Imagen (opcional)
                    </label>

                    <div v-if="imagePreview" class="relative h-full min-h-[160px]">
                        <img
                            :src="imagePreview"
                            alt="Vista previa"
                            class="w-full h-full rounded-lg object-cover max-h-56 border border-zinc-700"
                        />
                        <button
                            type="button"
                            @click="removeImage"
                            :disabled="loading"
                            aria-label="Quitar imagen"
                            class="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
                        >
                            <svg aria-hidden="true" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div v-else class="flex-grow border-2 border-dashed border-zinc-700 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-amber-500 transition-colors bg-zinc-800 h-full min-h-[160px]">
                        <input
                            ref="fileInput"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            @change="handleImageSelect"
                            :disabled="loading"
                            aria-label="Subir imagen de la publicación"
                            class="hidden"
                        />
                        <button
                            type="button"
                            @click="$refs.fileInput.click()"
                            :disabled="loading"
                            class="inline-flex flex-col items-center text-amber-400 hover:text-amber-300 disabled:opacity-50"
                        >
                            <svg aria-hidden="true" class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span class="text-sm font-medium">Agregar imagen</span>
                            <span class="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WebP (max 5MB)</span>
                        </button>
                    </div>

                    <p v-if="imageError" class="mt-1 text-xs text-red-400">
                        {{ imageError }}
                    </p>
                </div>
            </div>

            <div v-if="error" class="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                <p class="text-sm text-red-400">{{ error }}</p>
            </div>

            <div class="flex justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button
                    v-if="showCancel"
                    type="button"
                    @click="handleCancel"
                    :disabled="loading"
                    class="px-4 py-2 text-sm font-medium text-gray-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    :disabled="loading || !isFormValid"
                    class="px-6 py-2 text-sm font-bold text-[#0D0D0D] bg-[#D4AF37] rounded-lg hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                    <span v-if="!loading">Publicar</span>
                    <span v-else class="flex items-center">
                        <svg aria-hidden="true" class="animate-spin -ml-1 mr-2 h-4 w-4 text-[#0D0D0D]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Publicando...
                    </span>
                </button>
            </div>
                    </form>
                </div>
            </div>
        </transition>
    </div>
</template>

<script>
import { PUBLICATION_CATEGORIES, createPublication } from '../services/publications.js';
import { uploadPostImage, validateImageFile } from '../services/storage.js';
import { useAuth } from '../composables/useAuth.js';
import { useToast } from '../composables/useToast.js';

export default {
    name: 'CreatePublication',
    props: {
        showCancel: {
            type: Boolean,
            default: false
        }
    },
    emits: ['created', 'cancel'],
    setup() {
        const { userId } = useAuth();
        const { success, error: showError } = useToast();
        return { currentUserId: userId, toastSuccess: success, toastError: showError };
    },
    data() {
        return {
            isExpanded: false,
            form: {
                title: '',
                content: '',
                category: 'articulo'
            },
            selectedImage: null,
            imagePreview: null,
            imageError: null,
            loading: false,
            error: null,
            categories: PUBLICATION_CATEGORIES
        };
    },
    computed: {
        isFormValid() {
            return (
                this.form.title.trim().length > 0 &&
                this.form.content.trim().length > 0 &&
                this.form.title.length <= 200 &&
                this.form.content.length <= 10000
            );
        }
    },
    methods: {
        handleImageSelect(event) {
            const file = event.target.files[0];
            if (!file) return;

            const { valid, error } = validateImageFile(file);
            if (!valid) {
                this.imageError = error;
                this.selectedImage = null;
                this.imagePreview = null;
                return;
            }

            this.selectedImage = file;
            this.imageError = null;

            const reader = new FileReader();
            reader.onload = (e) => {
                this.imagePreview = e.target.result;
            };
            reader.readAsDataURL(file);
        },

        removeImage() {
            this.selectedImage = null;
            this.imagePreview = null;
            this.imageError = null;
            if (this.$refs.fileInput) {
                this.$refs.fileInput.value = '';
            }
        },

        async handleSubmit() {
            if (!this.isFormValid) return;

            this.loading = true;
            this.error = null;

            try {
                let imageUrl = null;

                if (this.selectedImage) {
                    const { url, error } = await uploadPostImage(this.selectedImage, this.currentUserId);
                    if (error) {
                        this.error = error.message || 'Error al subir la imagen';
                        this.loading = false;
                        return;
                    }
                    imageUrl = url;
                }

                const publicationData = {
                    title: this.form.title.trim(),
                    content: this.form.content.trim(),
                    category: this.form.category
                };

                if (imageUrl) {
                    publicationData.image_url = imageUrl;
                }

                const { publication, error } = await createPublication(publicationData);

                if (error) {
                    this.error = error.message || 'Error al crear la publicación';
                    this.toastError(error.message || 'Error al crear la publicación');
                    return;
                }

                this.$emit('created', publication);

                this.form = {
                    title: '',
                    content: '',
                    category: 'articulo'
                };
                this.removeImage();
                this.collapseForm();

                this.toastSuccess('¡Publicación creada exitosamente!');
            } catch (error) {
                console.error('Error creating publication:', error);
                this.error = 'Error inesperado al crear la publicación';
                this.toastError('Error inesperado al crear la publicación');
            } finally {
                this.loading = false;
            }
        },

        handleCancel() {
            if (this.form.title || this.form.content) {
                if (confirm('¿Descartar los cambios?')) {
                    this.form = {
                        title: '',
                        content: '',
                        category: 'articulo'
                    };
                    this.$emit('cancel');
                }
            } else {
                this.$emit('cancel');
            }
        },

        toggleExpanded() {
            this.isExpanded = !this.isExpanded;
        },

        collapseForm() {
            this.isExpanded = false;
        },

        // Métodos para la transición de colapsar
        onEnter(el) {
            el.style.height = '0';
            el.style.overflow = 'hidden';
        },
        onAfterEnter(el) {
            el.style.height = el.scrollHeight + 'px';
            setTimeout(() => {
                el.style.height = 'auto';
                el.style.overflow = 'visible';
            }, 200);
        },
        onLeave(el) {
            el.style.height = el.scrollHeight + 'px';
            el.style.overflow = 'hidden';
            // Forzar un reflow
            el.offsetHeight;
            el.style.height = '0';
        },
        onAfterLeave(el) {
            el.style.height = '';
            el.style.overflow = '';
        }
    }
};
</script>

<style scoped>
/* Transición de colapsar/expandir */
.collapse-content {
    transition: height 0.2s ease-out;
}

.collapse-enter-active,
.collapse-leave-active {
    transition: height 0.2s ease-out;
    overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
    height: 0 !important;
}
</style>
