<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CgButton, CgEmptyState, CgIcon, CgIconButton, CgListRow, CgPageHeader } from '../ds'
import { api } from '../lib/api'
import { WEEKDAYS, formatRest, plural } from '../lib/format'
import { toast } from '../lib/toast'

const router = useRouter()
const templates = ref([])
const loading = ref(true)
const openId = ref(null)
const starting = ref(false)

const perWeek = computed(() => templates.value.filter((t) => t.weekday).length)

onMounted(async () => {
  try {
    templates.value = await api.templates()
  } catch (err) {
    toast(err, { tone: 'danger' })
  } finally {
    loading.value = false
  }
})

const meta = (t) => [t.weekday ? WEEKDAYS[t.weekday - 1] : null, plural(t.exercises.length, 'exercice')].filter(Boolean).join(' · ')

async function duplicate(t) {
  try {
    const copy = await api.duplicateTemplate(t.id)
    templates.value = await api.templates()
    openId.value = copy.id
    toast('Preset dupliqué', { tone: 'success' })
  } catch (err) {
    toast(err, { tone: 'danger' })
  }
}

async function start(t) {
  starting.value = true
  try {
    const s = await api.startSession(t.id)
    router.push(`/seance/${s.id}`)
  } catch (err) {
    if (err.status === 409 && err.data?.activeId) router.push(`/seance/${err.data.activeId}`)
    else toast(err, { tone: 'danger' })
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <main class="page">
    <CgPageHeader
      eyebrow="Programme actif"
      title="Mon programme"
      :subtitle="perWeek ? `${plural(perWeek, 'séance')} par semaine` : null"
    />

    <div class="stack">
      <template v-for="t in templates" :key="t.id">
        <div v-if="openId === t.id" class="open-card" :class="`accent-${t.color}`">
          <CgListRow
            bare
            filled-icon
            :icon="t.icon"
            :title="t.name"
            trailing="chevron-up"
            :aria-expanded="true"
            @click="openId = null"
          >
            <template #meta>
              <span class="meta-day">{{ meta(t) }}</span>
              <span v-if="t.muscles" class="meta-muscles">{{ t.muscles }}</span>
            </template>
          </CgListRow>
          <ul class="exercises">
            <li v-for="e in t.exercises" :key="e.id" class="exercises__item">
              <CgIcon :name="e.icon" :size="24" class="t-accent" />
              <span class="exercises__name">{{ e.name }}</span>
              <span class="exercises__rest">{{ formatRest(e.restSeconds) }}</span>
              <span class="t-num exercises__scheme">{{ e.sets }} × {{ e.reps }}</span>
            </li>
            <li v-if="!t.exercises.length" class="exercises__item t-muted">Aucun exercice pour l'instant</li>
          </ul>
          <div class="open-card__actions">
            <CgButton size="s" icon="play" :loading="starting" :disabled="!t.exercises.length" @click="start(t)">Démarrer</CgButton>
            <CgButton variant="outline" size="s" icon="pencil" :to="`/programmes/${t.id}`">Modifier</CgButton>
            <CgIconButton icon="copy" :label="`Dupliquer ${t.name}`" class="open-card__dup" @click="duplicate(t)" />
          </div>
        </div>
        <CgListRow
          v-else
          :class="`accent-${t.color}`"
          :icon="t.icon"
          :title="t.name"
          trailing="chevron-down"
          :aria-expanded="false"
          @click="openId = t.id"
        >
          <template #meta>
            <span class="meta-day">{{ meta(t) }}</span>
            <span v-if="t.muscles" class="meta-muscles">{{ t.muscles }}</span>
          </template>
        </CgListRow>
      </template>

      <CgEmptyState
        v-if="!loading && !templates.length"
        icon="list"
        title="Programme vide"
        text="Crée un preset de séance (Poussée, Jambes…) et choisis ses exercices."
      />
    </div>

    <CgButton variant="outline" size="m" icon="plus" block to="/programmes/nouveau">Nouveau preset</CgButton>
    <CgButton variant="secondary" size="m" icon="dumbbell" block to="/exercices">Catalogue d'exercices</CgButton>

    <RouterLink to="/design-system" class="ds-link">Design system</RouterLink>
  </main>
</template>

<style scoped>
.meta-day { display: block; font-weight: 600; font-size: 0.8125rem; }
.meta-muscles { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.open-card {
  display: flex;
  flex-direction: column;
  padding: 0 clamp(10px, 3.6vw, 14px) var(--space-3);
  border-radius: var(--radius-l);
  background: var(--color-surface);
  border: var(--border-w-accent) solid var(--accent);
  box-shadow: 0 0 22px rgb(var(--rgb-accent) / 0.35);
}
.exercises { margin: 0; padding: 0; list-style: none; }
.exercises__item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 6px 0;
  border-top: var(--border-w) solid var(--color-border);
}
.exercises__name { flex: 1; min-width: 0; font-size: var(--fs-body); line-height: 1.25; }
.exercises__rest { font-size: var(--fs-label); color: var(--color-text-muted); white-space: nowrap; }
.exercises__scheme { font-size: 1.1875rem; white-space: nowrap; }
.open-card__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); padding-top: var(--space-3); border-top: var(--border-w) solid var(--color-border); }
.open-card__actions > * { flex: 1 1 96px; }
.open-card__actions > :first-child { flex-basis: 100%; }
.open-card__actions > .open-card__dup { flex: 0 0 var(--tap); }
.ds-link { align-self: center; font-size: var(--fs-body-s); color: var(--color-text-muted); }

@media (max-width: 340px) {
  .exercises__rest { display: none; }
}
</style>
