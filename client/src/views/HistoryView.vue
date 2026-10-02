<script setup>
import { computed, onMounted, ref } from 'vue'
import { CgBadge, CgButton, CgEmptyState, CgListRow, CgPageHeader, CgSectionHeader } from '../ds'
import { api } from '../lib/api'
import { addDays, durationMinutes, formatDayMonth, formatKg, formatShortDate, startOfWeek } from '../lib/format'
import { toast } from '../lib/toast'

const PAGE = 30
const sessions = ref([])
const loading = ref(true)
const more = ref(false)

async function load(before) {
  loading.value = true
  try {
    const page = await api.sessions({ to: before, limit: PAGE })
    sessions.value.push(...page)
    more.value = page.length === PAGE
  } catch (err) {
    toast(err, { tone: 'danger' })
  } finally {
    loading.value = false
  }
}
onMounted(() => load())

const groups = computed(() => {
  const thisWeek = startOfWeek().getTime()
  const lastWeek = addDays(startOfWeek(), -7).getTime()
  const map = new Map()
  for (const s of sessions.value) {
    const wk = startOfWeek(s.startedAt).getTime()
    if (!map.has(wk)) {
      const title = wk === thisWeek ? 'Cette semaine' : wk === lastWeek ? 'Semaine dernière' : `Semaine du ${formatDayMonth(wk)}`
      map.set(wk, { key: wk, title, current: wk === thisWeek, items: [] })
    }
    map.get(wk).items.push(s)
  }
  return [...map.values()]
})

const meta = (s) => `${formatShortDate(s.startedAt)} · ${durationMinutes(s.startedAt, s.endedAt)} min · ${formatKg(s.volume)}`
</script>

<template>
  <main class="page">
    <CgPageHeader eyebrow="Séances passées" title="Historique" />

    <section v-for="g in groups" :key="g.key" class="stack stack--s">
      <CgSectionHeader :title="g.title" caps :muted="!g.current" />
      <CgListRow
        v-for="s in g.items"
        :key="s.id"
        :class="`accent-${s.color}`"
        :to="`/historique/${s.id}`"
        :icon="s.icon"
        :title="s.name"
        :meta="meta(s)"
      >
        <template v-if="s.records" #badge>
          <CgBadge tone="success">{{ s.records }} record{{ s.records > 1 ? 's' : '' }}</CgBadge>
        </template>
      </CgListRow>
    </section>

    <CgEmptyState
      v-if="!loading && !sessions.length"
      icon="clock"
      title="Aucune séance terminée"
      text="Tes séances apparaîtront ici une fois terminées."
    >
      <CgButton to="/" variant="outline" size="m" icon="bolt">Séance du jour</CgButton>
    </CgEmptyState>

    <CgButton v-if="more" variant="secondary" size="m" block :loading="loading" @click="load(sessions.at(-1).startedAt)">
      Charger plus
    </CgButton>
  </main>
</template>
