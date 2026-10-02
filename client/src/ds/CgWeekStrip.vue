<script setup>
import CgIcon from './CgIcon.vue'

defineProps({
  /** [{ key, label: 'LUN', day: 28, state: 'done' | 'today' | 'idle', color?: 'pink', title?: string }] */
  days: { type: Array, required: true },
})
</script>

<template>
  <ol class="cg-week">
    <li
      v-for="d in days"
      :key="d.key"
      class="cg-week__day"
      :class="[`is-${d.state}`, d.color ? `accent-${d.color}` : null]"
      :aria-current="d.state === 'today' ? 'date' : undefined"
      :title="d.title"
    >
      <span class="cg-week__label">{{ d.label }}</span>
      <span class="cg-week__num t-num">{{ d.day }}</span>
      <span class="cg-week__mark">
        <CgIcon v-if="d.state === 'done'" name="check" :size="14" :stroke="3.5" label="Séance faite" />
        <span v-else-if="d.state === 'today'" class="cg-week__dot" />
      </span>
    </li>
  </ol>
</template>

<style scoped>
.cg-week {
  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.cg-week__day {
  height: clamp(56px, 17.5vw, 68px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: var(--radius-m);
  border: var(--border-w) solid var(--color-border);
  color: var(--color-text-muted);
}
.cg-week__label { font-size: var(--fs-micro); font-weight: 700; letter-spacing: 0.08em; }
.cg-week__num { font-size: clamp(1.125rem, 5.6vw, 1.375rem); line-height: 1.1; }
.cg-week__mark { width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; }
.cg-week__dot { width: 6px; height: 6px; border-radius: var(--radius-pill); background: var(--color-primary); }

.is-done {
  background: rgb(var(--rgb-accent) / 0.08);
  border-color: rgb(var(--rgb-accent) / 0.55);
  color: var(--color-text);
}
.is-done .cg-week__label, .is-done .cg-week__mark { color: var(--accent); }
.is-today {
  background: var(--color-surface);
  border: var(--border-w-accent) solid var(--color-primary);
  box-shadow: 0 0 14px rgb(var(--rgb-primary) / 0.45);
  color: var(--color-text);
}
.is-today .cg-week__label { color: var(--color-primary); }
.is-today.is-done .cg-week__label { color: var(--accent); }

/* ≤ 260px de large : on serre */
@container (max-width: 260px) {
  .cg-week { gap: 3px; }
  .cg-week__day { border-radius: var(--radius-s); }
  .cg-week__label { font-size: 9.5px; letter-spacing: 0.02em; }
}
</style>
