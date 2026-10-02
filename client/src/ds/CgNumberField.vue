<script setup>
import { ref, watch } from 'vue'
import { formatNumber, parseDecimal } from '../lib/format'

const props = defineProps({
  modelValue: { type: Number, default: null },
  /** libellé accessible (masqué visuellement si hideLabel) */
  label: { type: String, required: true },
  hideLabel: { type: Boolean, default: true },
  decimal: Boolean,
  placeholder: { type: String, default: '' },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 1000 },
  size: { type: String, default: 'l' },
})
const emit = defineEmits(['update:modelValue', 'enter'])

const toText = (v) => (v === null || v === undefined ? '' : props.decimal ? formatNumber(v) : String(v))
const text = ref(toText(props.modelValue))
watch(
  () => props.modelValue,
  (v) => {
    if (parseDecimal(text.value) !== v) text.value = toText(v)
  },
)

function onInput(e) {
  const raw = e.target.value.replace(props.decimal ? /[^\d.,]/g : /\D/g, '')
  text.value = raw
  e.target.value = raw
  let n = parseDecimal(raw)
  if (n !== null && !props.decimal) n = Math.trunc(n)
  if (n !== null) n = Math.min(props.max, Math.max(props.min, n))
  emit('update:modelValue', n)
}
</script>

<template>
  <label class="cg-number" :class="`cg-number--${size}`">
    <span :class="hideLabel ? 'sr-only' : 'cg-number__label t-label'">{{ label }}</span>
    <input
      class="cg-number__input t-num"
      type="text"
      :inputmode="decimal ? 'decimal' : 'numeric'"
      autocomplete="off"
      enterkeyhint="done"
      :placeholder="placeholder"
      :value="text"
      @input="onInput"
      @focus="$event.target.select()"
      @keydown.enter.prevent="$emit('enter')"
    />
  </label>
</template>

<style scoped>
.cg-number { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.cg-number__input {
  width: 100%;
  min-width: 0;
  height: 42px;
  padding: 0 4px;
  border-radius: var(--radius-s);
  background: var(--color-bg);
  border: var(--border-w) solid var(--color-primary);
  color: var(--color-text);
  text-align: center;
  font-size: var(--fs-number);
}
.cg-number--m .cg-number__input { height: var(--tap); font-size: 1.25rem; border-color: var(--color-border-strong); }
.cg-number__input:focus { outline: none; box-shadow: 0 0 0 2px rgb(var(--rgb-primary) / 0.45); border-color: var(--color-primary); }
</style>
