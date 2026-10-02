<script setup>
import CgIcon from './CgIcon.vue'

defineProps({
  icon: { type: String, required: true },
  /** s = 48 · m = 60 · l = 64 (fluides) */
  size: { type: String, default: 's' },
  /** fond plein accent (élément sélectionné) */
  filled: Boolean,
})
</script>

<template>
  <span class="cg-tile" :class="[`cg-tile--${size}`, { 'cg-tile--filled': filled }]">
    <CgIcon :name="icon" size="100%" />
  </span>
</template>

<style scoped>
.cg-tile {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: var(--border-w-accent) solid var(--accent);
  color: var(--accent);
  box-shadow: var(--glow-s) rgb(var(--rgb-accent) / 0.4);
}
.cg-tile :deep(svg) { width: 60%; height: 60%; }
.cg-tile--s { width: var(--tile-s); height: var(--tile-s); border-radius: 12px; }
.cg-tile--m { width: var(--tile-m); height: var(--tile-m); border-radius: 16px; }
.cg-tile--l { width: var(--tile-l); height: var(--tile-l); border-radius: 18px; }
.cg-tile--filled { background: var(--accent); color: var(--color-text-inverse); box-shadow: none; }
</style>
