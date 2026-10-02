<script setup>
defineProps({
  modelValue: { type: String, required: true },
  label: { type: String, default: 'Couleur' },
  colors: { type: Array, default: () => [
    { value: 'violet', label: 'Violet' },
    { value: 'pink', label: 'Rose' },
    { value: 'cyan', label: 'Cyan' },
    { value: 'green', label: 'Vert' },
    { value: 'yellow', label: 'Jaune' },
  ] },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <fieldset class="cg-fieldset">
    <legend class="t-label">{{ label }}</legend>
    <div class="cg-swatches">
      <label v-for="c in colors" :key="c.value" class="cg-swatch" :class="`accent-${c.value}`" :title="c.label">
        <input type="radio" class="sr-only" :value="c.value" :checked="modelValue === c.value" @change="$emit('update:modelValue', c.value)" />
        <span class="cg-swatch__dot" />
        <span class="sr-only">{{ c.label }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.cg-swatches { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.cg-swatch { width: var(--tap); height: var(--tap); display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-pill); cursor: pointer; }
.cg-swatch__dot { width: 28px; height: 28px; border-radius: var(--radius-pill); background: var(--accent); transition: box-shadow var(--dur); }
.cg-swatch:has(input:checked) .cg-swatch__dot { box-shadow: 0 0 0 3px var(--color-bg), 0 0 0 5px var(--accent), 0 0 16px rgb(var(--rgb-accent) / 0.7); }
.cg-swatch:has(input:focus-visible) { outline: 2px solid var(--color-primary); outline-offset: 2px; }
</style>
