<script setup>
import CgIcon from './CgIcon.vue'
defineProps({
  modelValue: { type: [String, Number, null], default: null },
  label: { type: String, required: true },
  hideLabel: Boolean,
  /** [{ value, label }] */
  options: { type: Array, required: true },
})
const emit = defineEmits(['update:modelValue'])
function onChange(e, options) {
  const opt = options[e.target.selectedIndex]
  emit('update:modelValue', opt.value)
}
</script>

<template>
  <label class="cg-field">
    <span :class="hideLabel ? 'sr-only' : 't-label'">{{ label }}</span>
    <span class="cg-select">
      <select class="cg-input" @change="onChange($event, options)">
        <option v-for="o in options" :key="String(o.value)" :selected="o.value === modelValue">{{ o.label }}</option>
      </select>
      <CgIcon name="chevron-down" :size="18" class="cg-select__chevron" />
    </span>
  </label>
</template>

<style scoped>
.cg-select { position: relative; display: block; }
.cg-select select { appearance: none; padding-right: 34px; cursor: pointer; }
.cg-select__chevron { position: absolute; right: 10px; top: 50%; translate: 0 -50%; color: var(--color-text-muted); pointer-events: none; }
</style>
