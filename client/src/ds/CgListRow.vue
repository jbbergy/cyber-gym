<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import CgIcon from './CgIcon.vue'
import CgIconTile from './CgIconTile.vue'

const props = defineProps({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  meta: { type: String, default: null },
  to: { type: [String, Object], default: null },
  /** chevron-right (navigation) · chevron-down/up (accordéon) · null */
  trailing: { type: String, default: 'chevron-right' },
  filledIcon: Boolean,
  /** rendu « nu » (dans une carte accordéon) */
  bare: Boolean,
  as: { type: String, default: null },
})
defineEmits(['click'])
const tag = computed(() => props.as ?? (props.to ? RouterLink : 'button'))
</script>

<template>
  <component
    :is="tag"
    :to="to || undefined"
    :type="tag === 'button' ? 'button' : undefined"
    class="cg-row"
    :class="{ 'cg-row--bare': bare }"
    @click="$emit('click', $event)"
  >
    <CgIconTile :icon="icon" :filled="filledIcon" />
    <span class="cg-row__body">
      <span class="cg-row__head">
        <span class="cg-row__title">{{ title }}</span>
        <slot name="badge" />
      </span>
      <span v-if="meta || $slots.meta" class="cg-row__meta"><slot name="meta">{{ meta }}</slot></span>
    </span>
    <span v-if="trailing" class="cg-row__trailing" :class="{ 'is-open': trailing === 'chevron-up' }">
      <CgIcon :name="trailing" :size="20" />
    </span>
  </component>
</template>

<style scoped>
.cg-row {
  display: flex;
  align-items: center;
  gap: clamp(10px, 3.6vw, 14px);
  width: 100%;
  min-height: var(--row-h);
  padding: var(--space-2) clamp(10px, 3.6vw, 14px);
  border-radius: var(--radius-l);
  background: var(--color-surface);
  border: var(--border-w) solid var(--color-border);
  color: var(--color-text);
  text-align: left;
  text-decoration: none;
  transition: border-color var(--dur), transform var(--dur-fast) var(--ease-out);
}
.cg-row:hover { color: var(--color-text); border-color: var(--color-border-strong); }
.cg-row:active { transform: scale(0.99); }
.cg-row--bare { padding-inline: 0; background: transparent; border: 0; border-radius: 0; }
.cg-row__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cg-row__head { display: flex; align-items: center; flex-wrap: wrap; column-gap: var(--space-2); row-gap: 2px; min-width: 0; }
.cg-row__title {
  min-width: 0;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 700;
  font-size: clamp(1.25rem, 6.4vw, 1.5rem);
  line-height: 1.1;
  text-transform: uppercase;
  color: var(--accent);
  overflow-wrap: anywhere;
}
.cg-row__meta {
  font-size: var(--fs-body-s);
  line-height: 18px;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.cg-row__trailing { display: inline-flex; color: var(--color-text-muted); }
.cg-row__trailing.is-open { color: var(--accent); }
</style>
