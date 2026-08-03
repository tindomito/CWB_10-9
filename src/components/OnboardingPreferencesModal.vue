<template>
    <Teleport to="body">
        <div
            v-if="open"
            class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
        >
            <div class="bg-[#1C1C1C] w-full sm:max-w-lg sm:rounded-2xl border border-zinc-800 shadow-2xl flex flex-col max-h-[92vh]">
                <!-- Header -->
                <div class="px-6 pt-6 pb-4 text-center border-b border-zinc-800">
                    <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-[#D4AF37]/15 flex items-center justify-center">
                        <svg aria-hidden="true" class="w-6 h-6 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h2 class="text-xl font-bold text-white">Configurá tus preferencias</h2>
                    <p class="text-sm text-gray-400 mt-1">Elegí qué organizaciones querés seguir. Podés cambiarlo cuando quieras desde Ajustes.</p>
                </div>

                <!-- Body -->
                <div class="overflow-y-auto px-6 py-5 space-y-6">
                    <!-- Próximo evento en el Home -->
                    <div>
                        <p class="text-sm font-semibold text-white mb-1">Próximo evento destacado</p>
                        <p class="text-xs text-gray-500 mb-3">¿De qué organización querés ver el próximo evento en el inicio?</p>
                        <div class="grid grid-cols-3 gap-2">
                            <button
                                v-for="org in homeOrgs"
                                :key="org"
                                type="button"
                                @click="homeEventOrg = org"
                                :aria-pressed="homeEventOrg === org"
                                :class="[
                                    'px-3 py-2.5 text-sm font-bold rounded-lg border transition-colors',
                                    homeEventOrg === org
                                        ? 'bg-[#D4AF37] text-[#0D0D0D] border-[#D4AF37]'
                                        : 'bg-zinc-900 text-gray-300 border-zinc-700 hover:border-zinc-600'
                                ]"
                            >
                                {{ orgLabel(org) }}
                            </button>
                        </div>
                    </div>

                    <!-- Organizaciones en el feed -->
                    <div>
                        <p class="text-sm font-semibold text-white mb-1">Organizaciones en tu feed</p>
                        <p class="text-xs text-gray-500 mb-3">Además de UFC, ¿qué organizaciones querés ver en próximas peleas, eventos y predicciones?</p>
                        <div class="space-y-2">
                            <label
                                class="flex items-center justify-between gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 opacity-70 cursor-not-allowed"
                            >
                                <span class="text-sm font-medium text-white">UFC</span>
                                <span class="text-[10px] text-gray-500 uppercase tracking-wide">Siempre incluida</span>
                            </label>
                            <label
                                v-for="org in seedOrgs"
                                :key="org"
                                class="flex items-center justify-between gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors"
                            >
                                <span class="text-sm font-medium text-white">{{ orgLabel(org) }}</span>
                                <input
                                    type="checkbox"
                                    v-model="feedVisible[org]"
                                    :aria-label="`Mostrar ${orgLabel(org)} en el feed`"
                                    class="h-5 w-5 rounded border-zinc-600 bg-zinc-800 text-[#D4AF37] focus:ring-[#D4AF37] focus:ring-offset-0"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 py-4 border-t border-zinc-800 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        @click="skip"
                        class="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                    >
                        Omitir por ahora
                    </button>
                    <button
                        type="button"
                        @click="save"
                        class="px-5 py-2.5 text-sm font-bold rounded-lg bg-[#D4AF37] text-[#0D0D0D] hover:bg-amber-400 transition-colors"
                    >
                        Guardar preferencias
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script>
import {
    allSeedOrgs,
    homeEventOrgOptions,
    getHomeEventOrg,
    setHomeEventOrg,
    isOrgVisible,
    setOrgVisible,
    setOnboardingDone,
    SEED_ORG_LABELS,
    UFC_ORG
} from '../services/sports/index.js';

export default {
    name: 'OnboardingPreferencesModal',
    props: {
        open: { type: Boolean, default: false }
    },
    emits: ['close', 'saved'],
    data() {
        return {
            homeOrgs: homeEventOrgOptions(),
            seedOrgs: allSeedOrgs(),
            homeEventOrg: UFC_ORG,
            feedVisible: {}
        };
    },
    watch: {
        // Al abrir, inicializamos el formulario con las preferencias actuales.
        open(val) {
            if (val) this.initFromPrefs();
        }
    },
    created() {
        this.initFromPrefs();
    },
    methods: {
        initFromPrefs() {
            this.homeEventOrg = getHomeEventOrg();
            this.feedVisible = Object.fromEntries(
                this.seedOrgs.map(o => [o, isOrgVisible(o)])
            );
        },
        orgLabel(org) {
            return org === UFC_ORG ? 'UFC' : (SEED_ORG_LABELS[org] || org);
        },
        skip() {
            // No cambia nada; solo marca el onboarding como visto.
            setOnboardingDone();
            this.$emit('close');
        },
        save() {
            setHomeEventOrg(this.homeEventOrg);
            for (const org of this.seedOrgs) {
                setOrgVisible(org, !!this.feedVisible[org]);
            }
            setOnboardingDone();
            this.$emit('saved');
            this.$emit('close');
        }
    }
};
</script>
