<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  /** text · email · password */
  type: { type: String, default: 'text' },
  autocomplete: { type: String, default: 'off' },
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
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :list="list || undefined"
      :required="required"
      :autocomplete="autocomplete"
      :autocapitalize="type === 'text' ? undefined : 'off'"
      :spellcheck="type === 'text' ? undefined : 'false'"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </label>
</template>
