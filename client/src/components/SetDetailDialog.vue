<script setup>
import { computed } from 'vue'
import { CgButton, CgDialog, CgIcon } from '../ds'
import { formatDayDate, formatInt, formatNumber, formatRest, formatTime, plural } from '../lib/format'

const props = defineProps({
  /** exercice de séance : { name, sets, previous, previousDate, previousBest, restSeconds } */
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

const previousBest = computed(() => props.exercise?.previousBest ?? null)
const record = computed(() => previousBest.value !== null && weight.value > previousBest.value)

/** repos réel : écart avec la série de l'exercice validée juste avant */
const restTaken = computed(() => {
  if (!set.value?.doneAt) return null
  const at = new Date(set.value.doneAt)
  const before = (props.exercise?.sets ?? [])
    .filter((s) => s.doneAt && s.id !== set.value.id && new Date(s.doneAt) < at)
    .map((s) => new Date(s.doneAt))
    .sort((a, b) => b - a)[0]
  return before ? Math.round((at - before) / 1000) : null
})

// ── Comparaison avec la même série lors de la séance précédente sur cet exercice ──
const previousSets = computed(() => props.exercise?.previous ?? [])
const previousDate = computed(() => props.exercise?.previousDate ?? null)
const previous = computed(() => (set.value ? (previousSets.value[set.value.setNumber - 1] ?? null) : null))

function change(diff, unit, same) {
  if (!diff) return { tone: 'same', icon: null, text: same }
  return { tone: diff > 0 ? 'up' : 'down', icon: diff > 0 ? 'arrow-up' : 'arrow-down', text: `${diff > 0 ? '+' : '−'}${formatNumber(Math.abs(diff))} ${unit}` }
}
const changes = computed(() => {
  const p = previous.value
  if (!p) return []
  return [
    change(weight.value - (p.weight ?? 0), 'kg', 'même charge'),
    change(reps.value - (p.reps ?? 0), reps.value - (p.reps ?? 0) === 1 || reps.value - (p.reps ?? 0) === -1 ? 'répétition' : 'répétitions', 'mêmes répétitions'),
  ]
})
</script>

<template>
  <CgDialog
    :open="Boolean(set)"
    :title="set ? `Série ${set.setNumber}` : ''"
    :description="set ? `${exercise?.name ?? ''}${set.doneAt ? ` · validée à ${formatTime(set.doneAt)}` : ''}` : null"
    @close="emit('close')"
  >
    <template v-if="set">
      <div class="detail">
        <div class="t-num headline">
          {{ formatNumber(set.weight) }} <small>kg</small> × {{ set.reps ?? '—' }} <small>{{ set.reps > 1 ? 'répétitions' : 'répétition' }}</small>
        </div>

        <p v-if="record" class="callout callout--record">
          <CgIcon name="trophy" :size="20" />
          <span><strong>Nouveau record</strong> sur cet exercice : ton ancien maximum était de {{ formatNumber(previousBest) }} kg.</span>
        </p>

        <section class="block">
          <h3 class="t-label block__title">Par rapport à ta séance précédente</h3>
          <template v-if="previous">
            <p class="block__text">
              {{ formatDayDate(previousDate) }}, série {{ set.setNumber }} :
              <strong class="t-num">{{ formatNumber(previous.weight) }} kg × {{ previous.reps }}</strong>
            </p>
            <div class="changes">
              <span v-for="c in changes" :key="c.text" class="change" :class="`change--${c.tone}`">
                <CgIcon v-if="c.icon" :name="c.icon" :size="14" :stroke="3" />{{ c.text }}
              </span>
            </div>
          </template>
          <p v-else-if="previousDate" class="block__text t-muted">
            Le {{ formatDayDate(previousDate) }}, tu avais fait {{ plural(previousSets.length, 'série') }} : pas de série {{ set.setNumber }} à comparer.
          </p>
          <p v-else class="block__text t-muted">C'est la première fois que tu fais cet exercice : rien à comparer pour l'instant.</p>
        </section>

        <section class="block">
          <h3 class="t-label block__title">En chiffres</h3>
          <dl class="facts">
            <div class="facts__row">
              <dt>Poids total soulevé<span class="facts__hint">charge × répétitions</span></dt>
              <dd class="t-num">{{ formatInt(volume) }} kg</dd>
            </div>
            <div class="facts__row">
              <dt>Max estimé<span class="facts__hint">charge que tu pourrais soulever une seule fois</span></dt>
              <dd class="t-num">{{ formatInt(e1rm) }} kg</dd>
            </div>
            <div class="facts__row">
              <dt>
                Repos avant cette série
                <span class="facts__hint">
                  <template v-if="restTaken === null">première série de l'exercice</template>
                  <template v-else-if="exercise?.restSeconds">prévu : {{ formatRest(exercise.restSeconds) }}</template>
                </span>
              </dt>
              <dd class="t-num">{{ restTaken === null ? '—' : formatRest(restTaken) }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </template>
    <template #actions>
      <slot name="actions" />
      <CgButton variant="secondary" size="m" @click="emit('close')">Fermer</CgButton>
    </template>
  </CgDialog>
</template>

<style scoped>
.detail { display: flex; flex-direction: column; gap: var(--space-5); }
.headline { font-size: var(--fs-display-s); line-height: 1.1; color: var(--color-action); }
.headline small { font-size: 0.5em; color: var(--color-text-muted); }

.callout { display: flex; align-items: flex-start; gap: var(--space-3); margin: 0; padding: var(--space-3) 14px; border-radius: var(--radius-l); }
.callout--record { background: rgb(var(--rgb-action) / 0.1); border: var(--border-w) solid rgb(var(--rgb-action) / 0.45); color: var(--color-text); }
.callout--record :deep(svg) { flex-shrink: 0; color: var(--color-action); }

.block { display: flex; flex-direction: column; gap: var(--space-2); }
.block__title { margin: 0; letter-spacing: var(--tracking-caps); color: var(--color-text-muted); }
.block__text { margin: 0; line-height: 1.45; }

.changes { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.change {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: var(--radius-pill);
  border: var(--border-w) solid var(--color-border);
  font-size: var(--fs-body-s);
  font-weight: 700;
}
.change--up { color: var(--color-action); border-color: rgb(var(--rgb-action) / 0.5); }
.change--down { color: var(--color-danger); border-color: var(--color-danger); }
.change--same { color: var(--color-text-muted); font-weight: 600; }

.facts { margin: 0; display: flex; flex-direction: column; }
.facts__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding: 10px 0;
  border-top: var(--border-w) solid var(--color-border);
}
.facts dt { display: flex; flex-direction: column; gap: 2px; min-width: 0; font-weight: 600; }
.facts__hint { font-size: var(--fs-body-s); font-weight: 400; color: var(--color-text-muted); }
.facts__hint:empty { display: none; }
.facts dd { margin: 0; flex-shrink: 0; font-size: 1.25rem; text-align: right; }
</style>
