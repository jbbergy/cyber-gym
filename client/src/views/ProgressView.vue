<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { CgButton, CgCard, CgChip, CgEmptyState, CgIcon, CgLineChart, CgPageHeader, CgStat } from '../ds'
import { api } from '../lib/api'
import { formatInt, formatNumber, formatShortDate } from '../lib/format'
import { toast } from '../lib/toast'

const SELECTED_KEY = 'cg.progress.exercise'
const exercises = ref([])
const selectedId = ref(null)
const data = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    exercises.value = await api.progression()
    let saved = null
    try {
      saved = localStorage.getItem(SELECTED_KEY)
    } catch {
      /* ignore */
    }
    selectedId.value = exercises.value.find((e) => e.id === saved)?.id ?? exercises.value[0]?.id ?? null
  } catch (err) {
    toast(err, { tone: 'danger' })
  } finally {
    loading.value = false
  }
})

watch(selectedId, async (id) => {
  if (!id) return
  try {
    localStorage.setItem(SELECTED_KEY, id)
  } catch {
    /* ignore */
  }
  try {
    data.value = await api.exerciseProgression(id)
  } catch (err) {
    toast(err, { tone: 'danger' })
  }
})

const points = computed(() => (data.value?.points ?? []).map((p) => ({ value: p.topWeight, label: formatShortDate(p.date) })))
const gain = computed(() => {
  const pts = data.value?.points ?? []
  if (pts.length < 2) return null
  const kg = pts.at(-1).topWeight - pts[0].topWeight
  const weeks = Math.max(1, Math.round((new Date(pts.at(-1).date) - new Date(pts[0].date)) / (7 * 86400000)))
  return { kg, weeks }
})
const chartLabel = computed(() => {
  const pts = data.value?.points ?? []
  if (!pts.length) return ''
  return `Courbe de la charge max : de ${formatNumber(pts[0].topWeight)} kg le ${formatShortDate(pts[0].date)} à ${formatNumber(pts.at(-1).topWeight)} kg le ${formatShortDate(pts.at(-1).date)}`
})
</script>

<template>
  <main class="page page--bleed">
    <CgPageHeader class="page__inset" eyebrow="Par exercice" title="Progression" />

    <div v-if="exercises.length" class="chips" role="group" aria-label="Exercice">
      <CgChip
        v-for="e in exercises"
        :key="e.id"
        :icon="e.icon"
        :icon-accent="`accent-${e.color || 'violet'}`"
        :pressed="e.id === selectedId"
        @click="selectedId = e.id"
      >
        {{ e.name }}
      </CgChip>
    </div>

    <template v-if="data && data.best">
      <section class="page__inset best">
        <div class="t-label">Meilleure série</div>
        <div class="best__line">
          <span class="t-display best__value">{{ formatNumber(data.best.weight) }}</span>
          <span class="t-display best__unit">kg × {{ data.best.reps }}</span>
        </div>
        <div v-if="gain" class="best__gain" :class="{ 'is-down': gain.kg < 0 }">
          <CgIcon name="trend" :size="18" :stroke="2.5" />
          <span>{{ gain.kg >= 0 ? '+' : '−' }} {{ formatNumber(Math.abs(gain.kg)) }} kg en {{ gain.weeks }} semaine{{ gain.weeks > 1 ? 's' : '' }}</span>
        </div>
      </section>

      <div class="page__inset">
        <CgCard padding="s" class="chart-card">
          <h2 class="chart-card__title">Charge de travail, en kg</h2>
          <CgLineChart v-if="points.length" :points="points" :label="chartLabel" :format="formatNumber" />
        </CgCard>
      </div>

      <div class="page__inset stats">
        <CgStat class="accent-pink" label="Max estimé" :value="`${formatInt(data.e1rm)} kg`" />
        <CgStat class="accent-cyan" label="Dernier volume" :value="`${formatInt(data.lastVolume)} kg`" />
      </div>
    </template>

    <div v-if="!loading && !exercises.length" class="page__inset">
      <CgEmptyState icon="trend" title="Pas encore de données" text="Termine une première séance pour suivre ta progression exercice par exercice.">
        <CgButton to="/" variant="outline" size="m" icon="bolt">Séance du jour</CgButton>
      </CgEmptyState>
    </div>
  </main>
</template>

<style scoped>
.page--bleed { gap: 18px; }
.chips {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scroll-padding-inline: var(--gutter);
  padding: 2px calc(var(--gutter) + var(--safe-right)) 10px calc(var(--gutter) + var(--safe-left));
  margin-bottom: -10px;
  scrollbar-width: none;
}
.chips::-webkit-scrollbar { display: none; }

.best { display: flex; flex-direction: column; gap: var(--space-1); }
.best__line { display: flex; align-items: baseline; flex-wrap: wrap; column-gap: 10px; }
.best__value { font-size: var(--fs-display-xl); line-height: 0.95; color: var(--color-action); text-shadow: 0 0 26px rgb(var(--rgb-action) / 0.6); }
.best__unit { font-size: clamp(1.5rem, 7.6vw, 1.875rem); font-weight: 700; color: var(--color-text); }
.best__gain { display: flex; align-items: center; gap: 6px; font-size: var(--fs-body); line-height: 20px; font-weight: 600; color: var(--color-action); }
.best__gain.is-down { color: var(--color-danger); }
.best__gain.is-down .cg-icon { transform: scaleY(-1); }

.chart-card { gap: var(--space-2); }
.chart-card__title { font-size: var(--fs-body-s); line-height: 18px; font-weight: 700; }

.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
@media (max-width: 300px) {
  .stats { grid-template-columns: 1fr; gap: var(--space-2); }
}
</style>
