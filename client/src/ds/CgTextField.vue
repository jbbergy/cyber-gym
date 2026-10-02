<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  hideLabel: Boolean,
  placeholder: { type: String, default: '' },
  maxlength: { type: Number, default: 80 },
  list: { type: String, default: null },
  required: Boolean,
})
defineEmits(['update:modelValue'])
</script>

<template>
  <label class="cg-field">
    <span :class="hideLabel ? 'sr-only' : 't-label'">{{ label }}</span>
    <input
      class="cg-input"
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :list="list || undefined"
      :required="required"
      autocomplete="off"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </label>
</template>
