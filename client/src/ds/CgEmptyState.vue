<script setup>
import CgIcon from './CgIcon.vue'
defineProps({
  icon: { type: String, default: 'bolt' },
  title: { type: String, required: true },
  text: { type: String, default: null },
})
</script>

<template>
  <div class="cg-empty">
    <span class="cg-empty__icon"><CgIcon :name="icon" :size="32" /></span>
    <p class="cg-empty__title">{{ title }}</p>
    <p v-if="text" class="cg-empty__text">{{ text }}</p>
    <slot />
  </div>
</template>

<style scoped>
.cg-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  border-radius: var(--radius-l);
  border: var(--border-w) dashed var(--color-border-strong);
  text-align: center;
}
.cg-empty__icon { color: var(--accent); filter: drop-shadow(0 0 8px rgb(var(--rgb-accent) / 0.6)); }
.cg-empty__title { font-weight: 700; font-size: var(--fs-body-l); }
.cg-empty__text { color: var(--color-text-muted); max-width: 32ch; }
.cg-empty > :deep(.cg-btn) { margin-top: var(--space-2); }
</style>
