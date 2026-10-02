<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import CgIcon from './CgIcon.vue'

const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  to: { type: [String, Object], default: null },
})
const tag = computed(() => (props.to ? RouterLink : 'button'))
</script>

<template>
  <component :is="tag" :to="to || undefined" :type="to ? undefined : 'button'" class="cg-icon-btn" :aria-label="label" :title="label">
    <CgIcon :name="icon" :size="22" />
  </component>
</template>

<style scoped>
.cg-icon-btn {
  flex-shrink: 0;
  width: var(--tap);
  height: var(--tap);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-m);
  background: var(--color-surface);
  border: var(--border-w) solid var(--color-border);
  color: var(--color-text);
  padding: 0;
}
.cg-icon-btn:hover { color: var(--color-text); border-color: var(--color-border-strong); }
</style>
