<script setup>
import { computed } from 'vue'
import { EXERCISE_ICONS, FILLED_ICONS, UI_ICONS } from '../lib/icons'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 24 },
  /** épaisseur du trait ; par défaut 1.8 pour les pictos d'exercice, 2 pour l'interface */
  stroke: { type: Number, default: null },
  /** texte alternatif ; sans label l'icône est décorative */
  label: { type: String, default: null },
})

const filled = computed(() => props.name in FILLED_ICONS)
const isExercise = computed(() => !(props.name in UI_ICONS) && !filled.value)
const markup = computed(
  () => FILLED_ICONS[props.name] ?? UI_ICONS[props.name] ?? (EXERCISE_ICONS[props.name] ?? EXERCISE_ICONS.dumbbell).svg,
)
const strokeWidth = computed(() => props.stroke ?? (isExercise.value ? 1.8 : 2))
</script>

<template>
  <svg
    class="cg-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    :stroke="filled ? 'none' : 'currentColor'"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    v-html="markup"
  />
</template>

<style>
.cg-icon { flex-shrink: 0; }
</style>
