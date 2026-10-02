<script setup>
import CgIcon from './CgIcon.vue'

defineProps({
  pressed: Boolean,
  icon: { type: String, default: null },
  /** classe d'accent pour l'icône quand la puce n'est pas active (ex. 'accent-pink') */
  iconAccent: { type: String, default: null },
})
defineEmits(['click'])
</script>

<template>
  <button type="button" class="cg-chip" :aria-pressed="pressed" @click="$emit('click')">
    <span v-if="icon" class="cg-chip__icon" :class="iconAccent"><CgIcon :name="icon" :size="22" /></span>
    <span class="cg-chip__label"><slot /></span>
  </button>
</template>

<style scoped>
.cg-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: var(--tap);
  padding: 0 var(--space-4) 0 14px;
  border-radius: var(--radius-pill);
  border: var(--border-w) solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-size: var(--fs-body);
  font-weight: 600;
  white-space: nowrap;
  scroll-snap-align: start;
  transition: background var(--dur), box-shadow var(--dur);
}
.cg-chip__icon { display: inline-flex; color: var(--accent); }
.cg-chip[aria-pressed='true'] {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-inverse);
  font-weight: 700;
  box-shadow: 0 0 16px rgb(var(--rgb-primary) / 0.5);
}
.cg-chip[aria-pressed='true'] .cg-chip__icon { color: inherit; }
</style>
