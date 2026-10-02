<script setup>
import { EXERCISE_ICONS } from '../lib/icons'
import CgIcon from './CgIcon.vue'
defineProps({
  modelValue: { type: String, required: true },
  label: { type: String, default: 'Icône' },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <fieldset class="cg-fieldset">
    <legend class="t-label">{{ label }}</legend>
    <div class="cg-icons">
      <label v-for="(def, name) in EXERCISE_ICONS" :key="name" class="cg-icons__item" :title="def.label">
        <input type="radio" class="sr-only" :value="name" :checked="modelValue === name" @change="$emit('update:modelValue', name)" />
        <CgIcon :name="name" :size="26" />
        <span class="sr-only">{{ def.label }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.cg-icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: var(--space-2); }
.cg-icons__item {
  height: var(--tap);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: var(--border-w) solid var(--color-border);
  color: var(--color-text-muted);
  cursor: pointer;
}
.cg-icons__item:has(input:checked) {
  border: var(--border-w-accent) solid var(--accent);
  color: var(--accent);
  box-shadow: 0 0 12px rgb(var(--rgb-accent) / 0.4);
}
.cg-icons__item:has(input:focus-visible) { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>
