<script setup>
defineProps({
  /** tag = pastille neutre (« 5 exercices ») · success = record · accent */
  tone: { type: String, default: 'tag' },
})
</script>

<template>
  <span class="cg-badge" :class="`cg-badge--${tone}`"><slot /></span>
</template>

<style scoped>
.cg-badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  white-space: nowrap;
  font-weight: 700;
}
.cg-badge--tag {
  height: 30px;
  padding: 0 12px;
  border: var(--border-w) solid var(--color-border);
  font-size: var(--fs-body-s);
  font-weight: 600;
  color: var(--color-text);
}
.cg-badge--success,
.cg-badge--accent {
  height: 20px;
  padding: 0 8px;
  font-size: var(--fs-label);
  border: var(--border-w) solid var(--color-action);
  color: var(--color-action);
}
.cg-badge--accent { border-color: var(--accent); color: var(--accent); }
</style>
