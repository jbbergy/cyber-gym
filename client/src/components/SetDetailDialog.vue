<script setup>
import { computed } from 'vue'
import { CgBadge, CgButton, CgDialog, CgStat } from '../ds'
import { formatClock, formatInt, formatNumber, formatRest, formatTime } from '../lib/format'

const props = defineProps({
  /** exercice de séance : { name, sets, previous, previousBest, restSeconds } */
  exercise: { type: Object, default: null },
  /** série validée affichée ; null = fenêtre fermée */
  set: { type: Object, default: null },
})
const emit = defineEmits(['close'])

const set = computed(() => props.set)
const weight = computed(() => set.value?.weight ?? 0)
const reps = computed(() => set.value?.reps ?? 0)
const volume = computed(() => weight.value * reps.value)
/** 1RM estimé (Epley), même formule que la vue exercise_tops */
const e1rm = computed(() => (reps.value <= 1 ? weight.value : weight.value * (1 + reps.value / 30)))

const record = computed(() => {
  const best = props.exercise?.previousBest
  return best !== null && best !== undefined && weight.value > best
})

/** repos réel : écart avec la série de l'exercice validée juste avant */
const restTaken = computed(() => {
  if (!set.value?.doneAt) return null
  const at = new Date(set.value.doneAt)
  const before = (props.exercise?.sets ?? [])
    .filter((s) => s.doneAt && s.id !== set.value.id && new Date(s.doneAt) < at)
    .map((s) => new Date(s.doneAt))
    .sort((a, b) => b - a)[0]
  return before ? (at - before) / 1000 : null
})

const previous = computed(() => (set.value ? (props.exercise?.previous?.[set.value.setNumber - 1] ?? null) : null))
const signed = (n, unit, same) => (n > 0 ? `+${formatNumber(n)} ${unit}` : n < 0 ? `−${formatNumber(-n)} ${unit}` : same)
const delta = computed(() => {
  const p = previous.value
  if (!p) return null
  return { weight: signed(weight.value - (p.weight ?? 0), 'kg', 'même charge'), reps: signed(reps.value - (p.reps ?? 0), 'rép.', 'mêmes rép.') }
})
</script>

<template>
  <CgDialog
    :open="Boolean(set)"
    :title="set ? `Série ${set.setNumber}` : ''"
    :description="exercise?.name ?? null"
    @close="emit('close')"
  >
    <template v-if="set">
      <div class="detail">
        <div class="headline">
          <span class="t-num headline__value">{{ formatNumber(set.weight) }} <small>kg</small> × {{ set.reps ?? '—' }}</span>
          <CgBadge v-if="record" tone="success">Record</CgBadge>
        </div>

        <div class="stats">
          <CgStat class="accent-pink" label="Volume" :value="`${formatInt(volume)} kg`" />
          <CgStat class="accent-violet" label="Max estimé" :value="`${formatInt(e1rm)} kg`" />
          <CgStat class="accent-cyan" label="Validée à" :value="set.doneAt ? formatTime(set.doneAt) : '—'" />
          <CgStat class="accent-green" label="Repos pris" :value="restTaken === null ? '—' : formatClock(restTaken)" />
        </div>

        <dl class="facts">
          <div v-if="exercise?.restSeconds" class="facts__row">
            <dt>Repos prévu</dt>
            <dd>{{ formatRest(exercise.restSeconds) }}</dd>
          </div>
          <div class="facts__row">
            <dt>Dernière fois</dt>
            <dd v-if="previous">
              <span class="t-num">{{ formatNumber(previous.weight) }} kg × {{ previous.reps }}</span>
              <span class="t-muted"> · {{ delta.weight }}, {{ delta.reps }}</span>
            </dd>
            <dd v-else class="t-muted">Première fois</dd>
          </div>
          <div v-if="exercise?.previousBest !== null && exercise?.previousBest !== undefined" class="facts__row">
            <dt>Record précédent</dt>
            <dd class="t-num">{{ formatNumber(exercise.previousBest) }} kg</dd>
          </div>
        </dl>
      </div>
    </template>
    <template #actions>
      <slot name="actions" />
      <CgButton variant="secondary" size="m" @click="emit('close')">Fermer</CgButton>
    </template>
  </CgDialog>
</template>

<style scoped>
.detail { display: flex; flex-direction: column; gap: var(--space-4); }
.headline { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.headline__value { font-size: var(--fs-display-s); line-height: 1.1; color: var(--color-action); }
.headline__value small { font-size: 0.55em; color: var(--color-text-muted); }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.facts { margin: 0; display: flex; flex-direction: column; }
.facts__row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
  padding: 10px 0;
  border-top: var(--border-w) solid var(--color-border);
}
.facts dt { color: var(--color-text-muted); font-size: var(--fs-body-s); }
.facts dd { margin: 0; text-align: right; }
@media (max-width: 300px) {
  .stats { gap: var(--space-2); }
}
</style>
