<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  /** le halo reprend la couleur d'accent du parent */
  glow: { type: Boolean, default: true },
})
</script>

<template>
  <div class="cg-stat">
    <div class="t-label cg-stat__label">{{ label }}</div>
    <div class="t-num cg-stat__value" :class="{ 'has-glow': glow }">{{ value }}</div>
  </div>
</template>

<style scoped>
.cg-stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
  padding: 14px;
  border-radius: var(--radius-l);
  background: var(--color-surface);
  border: var(--border-w) solid var(--color-border);
}
.cg-stat__label { letter-spacing: var(--tracking-caps); }
.cg-stat__value { font-size: var(--fs-stat); line-height: 1.05; color: var(--accent); overflow-wrap: anywhere; }
.cg-stat__value.has-glow { text-shadow: 0 0 16px rgb(var(--rgb-accent) / 0.55); }
</style>
