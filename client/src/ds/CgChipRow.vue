<script setup>
defineProps({
  label: { type: String, required: true },
  /** puces compactes (36px) pour les filtres */
  compact: Boolean,
})
</script>

<template>
  <div class="cg-chip-row" :class="{ 'is-compact': compact }" role="group" :aria-label="label">
    <slot />
  </div>
</template>

<style scoped>
/* rangée défilante horizontalement, qui déborde jusqu'aux bords de l'écran */
.cg-chip-row {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  scroll-snap-type: x proximity;
  margin-inline: calc(-1 * var(--gutter));
  padding: 2px var(--gutter);
  scrollbar-width: none;
}
.cg-chip-row::-webkit-scrollbar { display: none; }
.is-compact :deep(.cg-chip) { height: 36px; padding-inline: 14px; font-size: var(--fs-body-s); }
</style>
