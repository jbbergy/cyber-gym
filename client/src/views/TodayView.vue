<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  CgBadge, CgButton, CgCard, CgDialog, CgEmptyState, CgIconButton, CgIconTile, CgListRow, CgPageHeader, CgSectionHeader, CgWeekStrip,
} from '../ds'
import ExercisePicker from '../components/ExercisePicker.vue'
import { api } from '../lib/api'
import {
  WEEKDAYS, WEEKDAYS_SHORT, addDays, durationMinutes, formatClock, formatDayDate, formatLongDate, isoWeekday, plural, sameDay, startOfWeek,
} from '../lib/format'
import { toast } from '../lib/toast'

const router = useRouter()
const now = ref(new Date())
const templates = ref([])
const weekSessions = ref([])
const lastSession = ref(null)
const active = ref(null)
const loading = ref(true)
const loadError = ref(null)
const starting = ref(false)
const picker = ref(false)
const chosenId = ref(null)
const freePicker = ref(false)

const weekStart = computed(() => startOfWeek(now.value))
const today = computed(() => isoWeekday(now.value))

async function load() {
  loading.value = true
  loadError.value = null
  try {
    const [t, w, last, a] = await Promise.all([
      api.templates(),
      api.sessions({ from: weekStart.value, to: addDays(weekStart.value, 7) }),
      api.sessions({ limit: 1 }),
      api.activeSession(),
    ])
    templates.value = t
    weekSessions.value = w
    lastSession.value = last[0] ?? null
    active.value = a
  } catch (err) {
    loadError.value = err
  } finally {
    loading.value = false
  }
}

/** Séance proposée : celle prévue aujourd'hui si pas encore faite, sinon la prochaine du calendrier. */
const suggestion = computed(() => {
  if (chosenId.value) {
    const t = templates.value.find((x) => x.id === chosenId.value)
    if (t) return { template: t, when: 'choice' }
  }
  const planned = templates.value.filter((t) => t.weekday)
  const doneToday = weekSessions.value.filter((s) => sameDay(s.startedAt, now.value)).map((s) => s.templateId)
  const todays = planned.find((t) => t.weekday === today.value && !doneToday.includes(t.id))
  if (todays) return { template: todays, when: 'today' }
  for (let i = 1; i <= 7; i++) {
    const wd = ((today.value - 1 + i) % 7) + 1
    const next = planned.find((t) => t.weekday === wd)
    if (next) return { template: next, when: 'next', weekday: wd }
  }
  return templates.value[0] ? { template: templates.value[0], when: 'choice' } : null
})

const heroEyebrow = computed(() => {
  const s = suggestion.value
  if (!s) return ''
  if (s.when === 'today') return 'Séance du jour'
  if (s.when === 'next') return `Prochaine séance · ${WEEKDAYS[s.weekday - 1]}`
  return 'Séance choisie'
})

const week = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart.value, i)
    const sessions = weekSessions.value.filter((s) => sameDay(s.startedAt, date))
    const isToday = sameDay(date, now.value)
    return {
      key: date.toISOString(),
      label: WEEKDAYS_SHORT[i],
      day: date.getDate(),
      state: sessions.length ? 'done' : isToday ? 'today' : 'idle',
      color: sessions[0]?.color,
      title: sessions.map((s) => s.name).join(', ') || undefined,
    }
  }),
)
const weekTarget = computed(() => templates.value.filter((t) => t.weekday).length || templates.value.length)
const weekDone = computed(() => weekSessions.value.length)

const activeElapsed = computed(() => (active.value ? (now.value - new Date(active.value.startedAt)) / 1000 : 0))
const estimatedMinutes = (t) =>
  // échauffement 10 min + ~45 s d'effort et le repos par série
  Math.round((600 + t.exercises.reduce((acc, e) => acc + e.sets * (45 + e.restSeconds), 0)) / 60 / 5) * 5

async function start(templateId) {
  starting.value = true
  try {
    const s = await api.startSession(templateId)
    router.push(`/seance/${s.id}`)
  } catch (err) {
    if (err.status === 409 && err.data?.activeId) router.push(`/seance/${err.data.activeId}`)
    else toast(err.status === 0 ? 'Connexion requise pour démarrer une séance' : err, { tone: 'danger' })
  } finally {
    starting.value = false
  }
}

/** séance libre : exercices choisis dans le catalogue, 3 × 10 par défaut */
async function startFree(list) {
  freePicker.value = false
  if (!list.length) return
  starting.value = true
  try {
    const s = await api.startFreeSession(list.map((e) => ({ exerciseId: e.id, sets: 3, reps: 10, restSeconds: 90 })))
    router.push(`/seance/${s.id}`)
  } catch (err) {
    if (err.status === 409 && err.data?.activeId) router.push(`/seance/${err.data.activeId}`)
    else toast(err.status === 0 ? 'Connexion requise pour démarrer une séance' : err, { tone: 'danger' })
  } finally {
    starting.value = false
  }
}

function openFree() {
  picker.value = false
  freePicker.value = true
}

function choose(id) {
  chosenId.value = id
  picker.value = false
}

let tick
onMounted(() => {
  load()
  tick = setInterval(() => (now.value = new Date()), 1000)
})
onBeforeUnmount(() => clearInterval(tick))
</script>

<template>
  <main class="page">
    <CgPageHeader :eyebrow="formatLongDate(now)" title="Aujourd'hui">
      <template #actions>
        <CgIconButton icon="user" label="Mon profil" to="/profil" />
      </template>
    </CgPageHeader>

    <!-- Séance en cours -->
    <CgCard v-if="active" highlight :class="`accent-${active.color}`">
      <div class="hero">
        <div class="hero__text">
          <div class="t-label">Séance en cours</div>
          <div class="t-display hero__title t-accent t-glow">{{ active.name }}</div>
          <div class="hero__sub t-num">{{ formatClock(activeElapsed) }} · {{ plural(active.setsDone, 'série') }}</div>
        </div>
        <CgIconTile :icon="active.icon" size="l" />
      </div>
      <CgButton :to="`/seance/${active.id}`" block icon="play">Reprendre la séance</CgButton>
    </CgCard>

    <!-- Séance proposée -->
    <CgCard v-else-if="suggestion" highlight :class="`accent-${suggestion.template.color}`">
      <div class="hero">
        <div class="hero__text">
          <div class="t-label">{{ heroEyebrow }}</div>
          <div class="t-display hero__title t-accent t-glow">{{ suggestion.template.name }}</div>
          <div v-if="suggestion.template.muscles" class="hero__sub">{{ suggestion.template.muscles }}</div>
        </div>
        <CgIconTile :icon="suggestion.template.icon" size="l" />
      </div>
      <div class="row row--wrap tags">
        <CgBadge>{{ plural(suggestion.template.exercises.length, 'exercice') }}</CgBadge>
        <CgBadge>env. {{ estimatedMinutes(suggestion.template) }} min</CgBadge>
      </div>
      <CgButton block icon="play" :loading="starting" :disabled="!suggestion.template.exercises.length" @click="start(suggestion.template.id)">
        Démarrer la séance
      </CgButton>
      <CgButton variant="ghost" size="s" icon="swap" class="other" @click="picker = true">
        Autre preset ou séance libre
      </CgButton>
    </CgCard>

    <CgEmptyState
      v-else-if="loadError"
      icon="cloud-off"
      class="accent-pink"
      title="Serveur injoignable"
      :text="loadError.message"
    >
      <CgButton variant="outline" size="m" icon="swap" @click="load">Réessayer</CgButton>
    </CgEmptyState>

    <CgEmptyState
      v-else-if="!loading"
      icon="list"
      title="Aucun preset de séance"
      text="Crée tes presets pour savoir quoi faire chaque jour, ou lance une séance libre."
    >
      <CgButton to="/programmes/nouveau" variant="outline" size="m" icon="plus">Créer un preset</CgButton>
      <CgButton variant="secondary" size="m" icon="dumbbell" @click="freePicker = true">Séance libre</CgButton>
    </CgEmptyState>

    <section class="stack">
      <CgSectionHeader title="Cette semaine" :aside="`${plural(weekDone, 'séance')} sur ${weekTarget}`" />
      <CgWeekStrip :days="week" />
    </section>

    <section v-if="lastSession" class="stack stack--s">
      <CgSectionHeader title="Dernière séance" />
      <CgListRow
        :class="`accent-${lastSession.color}`"
        :to="`/historique/${lastSession.id}`"
        :icon="lastSession.icon"
        :title="lastSession.name"
        :meta="`${formatDayDate(lastSession.startedAt)} · ${durationMinutes(lastSession.startedAt, lastSession.endedAt)} min`"
      />
    </section>

    <CgDialog :open="picker" title="Autre séance" @close="picker = false">
      <div class="stack stack--s">
        <CgListRow
          class="accent-green"
          icon="dumbbell"
          title="Séance libre"
          meta="Choisir les exercices maintenant"
          @click="openFree"
        />
        <CgListRow
          v-for="t in templates"
          :key="t.id"
          :class="`accent-${t.color}`"
          :icon="t.icon"
          :title="t.name"
          :meta="`${t.weekday ? WEEKDAYS[t.weekday - 1] + ' · ' : ''}${plural(t.exercises.length, 'exercice')}`"
          trailing="chevron-right"
          @click="choose(t.id)"
        />
      </div>
      <template #actions>
        <CgButton variant="secondary" @click="picker = false">Annuler</CgButton>
      </template>
    </CgDialog>

    <ExercisePicker
      :open="freePicker"
      title="Séance libre"
      confirm-label="Démarrer"
      @close="freePicker = false"
      @pick="startFree"
    />
  </main>
</template>

<style scoped>
.hero { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
.hero__text { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
.hero__title { font-size: var(--fs-display-l); }
.hero__sub { font-size: var(--fs-body-l); line-height: 22px; }
.tags { gap: var(--space-2); }
.other { align-self: center; margin-top: calc(var(--space-1) * -1); }
</style>
