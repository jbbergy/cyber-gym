<script setup>
defineProps({
  total: { type: Number, required: true },
  current: { type: Number, default: 0 },
  /** index des segments terminés */
  done: { type: Array, default: () => [] },
  labelFor: { type: Function, default: (i) => `Étape ${i + 1}` },
})
defineEmits(['select'])
</script>

<template>
  <div class="cg-segments" role="group">
    <button
      v-for="i in total"
      :key="i"
      type="button"
      class="cg-segments__item"
      :class="{ 'is-current': i - 1 === current, 'is-done': done.includes(i - 1) }"
      :aria-current="i - 1 === current ? 'step' : undefined"
      :aria-label="labelFor(i - 1)"
      @click="$emit('select', i - 1)"
    >
      <span class="cg-segments__bar" />
    </button>
  </div>
</template>

<style scoped>
.cg-segments { display: flex; gap: 6px; }
.cg-segments__item {
  flex: 1;
  min-width: 0;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  border: 0;
  background: transparent;
}
.cg-segments__bar {
  width: 100%;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--color-border);
  transition: background var(--dur), box-shadow var(--dur);
}
.is-done .cg-segments__bar { background: rgb(var(--rgb-primary) / 0.5); }
.is-current .cg-segments__bar { background: var(--color-primary); box-shadow: 0 0 10px rgb(var(--rgb-primary) / 0.7); }
</style>
