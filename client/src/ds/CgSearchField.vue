<script setup>
import CgIcon from './CgIcon.vue'
defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Rechercher' },
  placeholder: { type: String, default: 'Rechercher…' },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <label class="cg-search">
    <CgIcon name="search" :size="20" />
    <span class="sr-only">{{ label }}</span>
    <input
      class="cg-search__input"
      type="search"
      :value="modelValue"
      :placeholder="placeholder"
      autocomplete="off"
      enterkeyhint="search"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </label>
</template>

<style scoped>
.cg-search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: var(--tap);
  padding: 0 12px;
  border-radius: 12px;
  background: var(--color-bg);
  border: var(--border-w) solid var(--color-border-strong);
  color: var(--color-text-muted);
}
.cg-search:focus-within { border-color: var(--color-primary); box-shadow: 0 0 0 2px rgb(var(--rgb-primary) / 0.4); }
.cg-search__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font-size: 1rem;
  outline: none;
}
</style>
