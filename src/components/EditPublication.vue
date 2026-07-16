<!--
    Formulario de edición de una publicación existente. Reemplaza a la
    card en el feed mientras se edita (borde rojo = "modo edición").
    Si se cambia la imagen, sube la nueva y borra la anterior del bucket.
-->
<template>
    <div class="bg-zinc-900 rounded-lg shadow-md p-6 border-2 border-red-500">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-white">Editar Publicación</h2>
            <span class="px-3 py-1 bg-red-500/20 text-amber-300 text-xs font-medium rounded-full">
                Modo edición
            </span>
        </div>

        <form @submit.prevent="handleSubmit">

            <div class="mb-4">
                <label for="edit-pub-category" class="block text-sm font-medium text-gray-300 mb-2">
                    Categoría
                </label>
                <div class="relative">
                    <select
                        id="edit-pub-category"
                        v-model="form.category"
                        class="block w-full px-4 py-2 pr-8 bg-zinc-800 text-white border border-zinc-700 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent cursor-pointer"
                    >
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
                <label for="edit-pub-title" class="block text-sm font-medium text-gray-300 mb-2">
                    Título
                </label>
                <input
                    id="edit-pub-title"
                    v-model="form.title"
                    type="text"
                    required
                    maxlength="200"
                    :disabled="loading"
                    class="w-full px-4 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p class="mt-1 text-xs text-gray-400 text-right">
                    {{ form.title.length }}/200
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                <div class="flex flex-col">
                    <label for="edit-pub-content" class="block text-sm font-medium text-gray-300 mb-2">
                        Contenido
                    </label>
                    <textarea
                        id="edit-pub-content"
                        v-model="form.content"
                        required
                        rows="6"
                        maxlength="10000"
                        :disabled="loading"
                        class="w-full px-4 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed flex-grow"
                    ></textarea>
                    <p class="mt-1 text-xs text-gray-400 text-right">
                        {{ form.content.length }}/10000
                    </p>
                </div>

                <div class="flex flex-col">
                    <label class="block text-sm font-medium text-gray-300 mb-2">
                        Imagen
                    </label>

                    <div v-if="imagePreview || publication.image_url" class="relative h-full min-h-[160px]">
                        <img
                            :src="imagePreview || publication.image_url"
                            alt="Vista previa"
                            class="w-full h-full rounded-lg object-cover max-h-56 border border-zinc-700"
                        />
                        <div class="absolute top-2 right-2 flex space-x-2">
                            <button
                                type="button"
                                @click="$refs.fileInput.click()"
                                :disabled="loading"
                                class="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
                                title="Cambiar imagen"
                            >
                                <svg aria-hidden="true" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                            </button>

                        </div>
                        <input
                            ref="fileInput"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            @change="handleImageSelect"
                            :disabled="loading"
                            aria-label="Subir imagen de la publicación"
                            class="hidden"
                        />
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
                    <span v-if="!loading">Guardar cambios</span>
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
</template>

<script>
import { PUBLICATION_CATEGORIES, updatePublication } from '../services/publications.js';
import { uploadPostImage, deletePostImage, validateImageFile } from '../services/storage.js';
import { useAuth } from '../composables/useAuth.js';
import { useToast } from '../composables/useToast.js';

export default {
    name: 'EditPublication',
    props: {
        publication: {
            type: Object,
            required: true
        }
    },
    emits: ['updated', 'cancel'],
    setup() {
        const { userId } = useAuth();
        const { success, error: showError } = useToast();
        return { currentUserId: userId, toastSuccess: success, toastError: showError };
    },
    data() {
        return {
            form: {
                title: this.publication.title || '',
                content: this.publication.content || '',
                category: this.publication.category || 'articulo'
            },
            selectedImage: null,
            imagePreview: null,
            imageError: null,
            removeCurrentImage: false,
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
            this.removeCurrentImage = false;

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
            this.removeCurrentImage = true;
            if (this.$refs.fileInput) {
                this.$refs.fileInput.value = '';
            }
        },

        async handleSubmit() {
            if (!this.isFormValid) return;

            this.loading = true;
            this.error = null;

            try {
                const updates = {
                    title: this.form.title.trim(),
                    content: this.form.content.trim(),
                    category: this.form.category
                };

                // Si hay una nueva imagen seleccionada
                if (this.selectedImage) {
                    // Subir nueva imagen
                    const { url, error } = await uploadPostImage(this.selectedImage, this.currentUserId);
                    if (error) {
                        this.error = error.message || 'Error al subir la imagen';
                        this.loading = false;
                        return;
                    }

                    // Eliminar imagen anterior si existía
                    if (this.publication.image_url) {
                        await deletePostImage(this.publication.image_url);
                    }

                    updates.image_url = url;
                }
                // Si se marcó para eliminar la imagen
                else if (this.removeCurrentImage && this.publication.image_url) {
                    await deletePostImage(this.publication.image_url);
                    updates.image_url = null;
                }

                const { publication, error } = await updatePublication(this.publication.id, updates);

                if (error) {
                    this.error = error.message || 'Error al actualizar la publicación';
                    this.toastError(error.message || 'Error al actualizar la publicación');
                    return;
                }

                this.$emit('updated', publication);
                this.toastSuccess('¡Publicación actualizada exitosamente!');
            } catch (error) {
                console.error('Error updating publication:', error);
                this.error = 'Error inesperado al actualizar la publicación';
                this.toastError('Error inesperado al actualizar la publicación');
            } finally {
                this.loading = false;
            }
        },

        handleCancel() {
            this.$emit('cancel');
        }
    }
};
</script>
