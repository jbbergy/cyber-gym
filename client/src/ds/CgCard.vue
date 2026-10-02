<script setup>
defineProps({
  as: { type: String, default: 'section' },
  /** carte mise en avant : contour accent + halo néon */
  highlight: Boolean,
  /** m = 20px · s = 14px · none */
  padding: { type: String, default: 'm' },
})
</script>

<template>
  <component :is="as" class="cg-card" :class="[`cg-card--pad-${padding}`, { 'cg-card--highlight': highlight }]">
    <slot />
  </component>
</template>

<style scoped>
.cg-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  border-radius: var(--radius-l);
  background: var(--color-surface);
  border: var(--border-w) solid var(--color-border);
}
.cg-card--pad-m { padding: clamp(14px, 5vw, 20px); gap: 14px; }
.cg-card--pad-s { padding: clamp(12px, 3.8vw, 16px); }
.cg-card--pad-none { padding: 0; }
.cg-card--highlight {
  border-radius: var(--radius-xl);
  border: var(--border-w-accent) solid var(--accent);
  box-shadow: var(--glow-l) rgb(var(--rgb-accent) / 0.38), inset 0 0 22px rgb(var(--rgb-accent) / 0.1);
}
</style>
