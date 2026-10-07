<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CgButton, CgChip, CgDialog, CgEmptyState, CgIcon, CgIconButton, CgIconTile, CgNumberField, CgSegments } from '../ds'
import ExercisePicker from '../components/ExercisePicker.vue'
import SetDetailDialog from '../components/SetDetailDialog.vue'
import { api, flushOutbox, hasPendingWrites } from '../lib/api'
import { REST_PRESETS, formatClock, formatDayDate, formatNumber, formatRest, formatShortDate, plural } from '../lib/format'
import { restAutoStart, setRestAutoStart, useRestTimer } from '../lib/restTimer'
import { toast } from '../lib/toast'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const SNAPSHOT_KEY = `cg.session.${id}`

const session = ref(null)
const exIndex = ref(0)
const selectedId = ref(null)
const finishing = ref(false)
const confirmFinish = ref(false)
const confirmRemove = ref(false)
/** série validée dont on affiche le détail */
const detailSet = ref(null)
/** l'aide « touche une série validée » disparaît une fois le détail découvert */
const DETAIL_HINT_KEY = 'cg.hint.setDetail'
const detailHintSeen = ref(readFlag(DETAIL_HINT_KEY))
function readFlag(key) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
function openDetail(set) {
  detailSet.value = set
  if (detailHintSeen.value) return
  detailHintSeen.value = true
  try {
    localStorage.setItem(DETAIL_HINT_KEY, '1')
  } catch {
    /* ignore */
  }
}
/** null · { mode: 'add' } · { mode: 'replace' } */
const picker = ref(null)
const now = ref(Date.now())
const rest = useRestTimer(id)
/** fenêtre de réglage du repos de l'exercice courant */
const restEditor = ref(false)
const restChoices = computed(() => {
  const current = ex.value?.restSeconds ?? 0
  return REST_PRESETS.includes(current) ? REST_PRESETS : [...REST_PRESETS, current].sort((a, b) => a - b)
})
/** charge pré-remplie de chaque série, pour savoir si l'utilisateur l'a modifiée */
const prefilled = new Map()

// ── Chargement : serveur, ou instantané local si des écritures attendent le réseau ──
function readSnapshot() {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOT_KEY))
  } catch {
    return null
  }
}

async function load() {
  await flushOutbox()
  const snap = readSnapshot()
  let data = null
  if (!(hasPendingWrites() && snap?.session)) {
    try {
      data = await api.session(id)
    } catch (err) {
      if (err.status === 404) {
        toast('Séance introuvable', { tone: 'danger' })
        return router.replace('/')
      }
    }
  }
  data ??= snap?.session
  if (!data) {
    toast('Impossible de charger la séance hors ligne', { tone: 'danger' })
    return router.replace('/')
  }
  if (data.endedAt) return router.replace(`/historique/${id}`)
  session.value = data
  data.exercises.forEach(registerPrefill)
  const firstOpen = data.exercises.findIndex((e) => e.sets.some((s) => !s.doneAt))
  exIndex.value = snap?.exIndex ?? (firstOpen === -1 ? Math.max(0, data.exercises.length - 1) : firstOpen)
  exIndex.value = Math.min(exIndex.value, data.exercises.length - 1)
}

watch(
  [session, exIndex],
  () => {
    if (!session.value) return
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ session: session.value, exIndex: exIndex.value }))
    } catch {
      /* ignore */
    }
  },
  { deep: true },
)

// ── État dérivé ──
const exercises = computed(() => session.value?.exercises ?? [])
const ex = computed(() => exercises.value[exIndex.value])
const nextEx = computed(() => exercises.value[exIndex.value + 1])
const activeSet = computed(() => {
  const sets = ex.value?.sets ?? []
  return sets.find((s) => s.id === selectedId.value && !s.doneAt) ?? sets.find((s) => !s.doneAt) ?? null
})
const doneExercises = computed(() =>
  exercises.value.map((e, i) => (e.sets.length && e.sets.every((s) => s.doneAt) ? i : -1)).filter((i) => i >= 0),
)
const setsDone = computed(() => exercises.value.reduce((n, e) => n + e.sets.filter((s) => s.doneAt).length, 0))
const elapsed = computed(() => (session.value ? (now.value - new Date(session.value.startedAt)) / 1000 : 0))

const prevFor = (set) => ex.value?.previous?.[set.setNumber - 1] ?? null
const prevLabel = (set) => {
  const p = prevFor(set)
  return p ? `${formatNumber(p.weight)} kg × ${p.reps}` : '—'
}
/** résumé de la séance précédente pour les écrans trop étroits pour la colonne de comparaison */
const prevSummary = computed(() => {
  const prev = ex.value?.previous ?? []
  if (!prev.length) return null
  const same = prev.every((p) => p.weight === prev[0].weight && p.reps === prev[0].reps)
  return same
    ? `${prev.length} × ${prev[0].reps} à ${formatNumber(prev[0].weight)} kg`
    : prev.map((p) => `${formatNumber(p.weight)}×${p.reps}`).join(' · ')
})
const prevDateLabel = computed(() => (ex.value?.previousDate ? formatDayDate(ex.value.previousDate) : null))
const showDetailHint = computed(() => !detailHintSeen.value && Boolean(ex.value?.sets.some((s) => s.doneAt)))
const isRecord = computed(() => {
  const best = ex.value?.previousBest
  if (best === null || best === undefined) return false
  return ex.value.sets.some((s) => s.doneAt && s.weight > best)
})

const cta = computed(() => {
  if (activeSet.value) return { label: `Valider la série ${activeSet.value.setNumber}`, action: () => validate(activeSet.value) }
  if (nextEx.value) return { label: 'Exercice suivant', action: () => goTo(exIndex.value + 1) }
  return { label: 'Terminer la séance', action: () => (confirmFinish.value = true) }
})

// ── Actions ──
async function persistSet(set) {
  try {
    await api.saveSet(set)
  } catch (err) {
    toast(err, { tone: 'danger' })
  }
}

function validate(set) {
  if (set.weight === null || set.reps === null) {
    toast('Renseigne la charge et les répétitions', { tone: 'danger' })
    return
  }
  const before = prefilled.get(set.id)
  set.doneAt = new Date().toISOString()
  // une charge modifiée se propage aux séries suivantes encore à faire et non retouchées
  for (const s of ex.value.sets) {
    if (!s.doneAt && s.setNumber > set.setNumber && s.weight === before && prefilled.get(s.id) === before) {
      s.weight = set.weight
      prefilled.set(s.id, set.weight)
    }
  }
  selectedId.value = null
  navigator.vibrate?.(30)
  persistSet(set)
  const lastOfSession = !nextEx.value && ex.value.sets.every((s) => s.doneAt)
  if (!lastOfSession && restAutoStart.value) rest.start(ex.value.restSeconds)
}

function toggle(set) {
  if (set.doneAt) {
    set.doneAt = null
    selectedId.value = set.id
    persistSet(set)
  } else {
    validate(set)
  }
}

function correct(set) {
  detailSet.value = null
  toggle(set)
}

function addSet() {
  const sets = ex.value.sets
  const last = sets.at(-1)
  const set = {
    id: crypto.randomUUID(),
    sessionExerciseId: ex.value.id,
    setNumber: (last?.setNumber ?? 0) + 1,
    weight: last?.weight ?? null,
    reps: last?.reps ?? ex.value.targetReps,
    doneAt: null,
  }
  sets.push(set)
  prefilled.set(set.id, set.weight)
  selectedId.value = set.id
  persistSet(set)
}

function registerPrefill(exercise) {
  for (const s of exercise.sets) prefilled.set(s.id, s.weight)
}

// ── Composition de la séance : ajouter / remplacer / retirer un exercice ──
const exStarted = computed(() => Boolean(ex.value?.sets.some((s) => s.doneAt)))
const presentIds = computed(() => exercises.value.map((e) => e.exerciseId))

async function onPick(list) {
  const mode = picker.value?.mode
  picker.value = null
  if (!list.length) return
  try {
    if (mode === 'replace') {
      const old = ex.value
      const added = await api.addSessionExercise(id, {
        exerciseId: list[0].id, sets: old.targetSets, reps: old.targetReps, restSeconds: old.restSeconds, replaceId: old.id,
      })
      registerPrefill(added)
      session.value.exercises.splice(exIndex.value, 1, added)
      selectedId.value = null
    } else {
      const first = exercises.value.length
      for (const e of list) {
        const added = await api.addSessionExercise(id, { exerciseId: e.id, sets: 3, reps: 10, restSeconds: 90 })
        registerPrefill(added)
        session.value.exercises.push(added)
      }
      goTo(first)
      toast(list.length > 1 ? `${list.length} exercices ajoutés` : `${list[0].name} ajouté`, { tone: 'success' })
    }
  } catch (err) {
    toast(err.status === 0 ? 'Connexion requise pour modifier les exercices' : err, { tone: 'danger' })
  }
}

async function removeExercise() {
  confirmRemove.value = false
  const target = ex.value
  session.value.exercises.splice(exIndex.value, 1)
  goTo(Math.min(exIndex.value, Math.max(0, exercises.value.length - 1)))
  try {
    await api.deleteSessionExercise(target.id)
  } catch (err) {
    toast(err, { tone: 'danger' })
  }
}

async function setRest(seconds) {
  const target = ex.value
  if (target.restSeconds === seconds) return
  target.restSeconds = seconds
  if (!seconds) rest.skip()
  try {
    await api.setSessionExerciseRest(target.id, seconds)
  } catch (err) {
    toast(err, { tone: 'danger' })
  }
}

function goTo(i) {
  exIndex.value = i
  selectedId.value = null
}

async function finish() {
  finishing.value = true
  try {
    const res = await api.finishSession(id)
    cleanup()
    if (res?.deleted) {
      toast('Séance vide : rien à enregistrer')
      router.replace('/')
    } else if (res?.queued) {
      toast('Séance terminée — synchronisation dès le retour du réseau', { tone: 'success' })
      router.replace('/')
    } else {
      toast('Séance enregistrée', { tone: 'success' })
      router.replace(`/historique/${id}`)
    }
  } catch (err) {
    toast(err, { tone: 'danger' })
  } finally {
    finishing.value = false
  }
}

async function abandon() {
  try {
    await api.deleteSession(id)
    cleanup()
    toast('Séance abandonnée')
    router.replace('/')
  } catch (err) {
    toast(err.status === 0 ? 'Connexion requise pour abandonner' : err, { tone: 'danger' })
  }
}

function cleanup() {
  rest.skip()
  rest.clear()
  try {
    localStorage.removeItem(SNAPSHOT_KEY)
  } catch {
    /* ignore */
  }
}

// ── Écran allumé pendant la séance ──
let wakeLock = null
async function lockScreen() {
  try {
    if (document.visibilityState === 'visible') wakeLock = await navigator.wakeLock?.request('screen')
  } catch {
    /* refusé ou non supporté */
  }
}

let tick
onMounted(() => {
  load()
  lockScreen()
  document.addEventListener('visibilitychange', lockScreen)
  tick = setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => {
  clearInterval(tick)
  document.removeEventListener('visibilitychange', lockScreen)
  wakeLock?.release?.()
})
</script>

<template>
  <main v-if="session" class="session" :class="`accent-${session.color}`">
    <header class="topbar">
      <CgIconButton icon="chevron-down" label="Réduire la séance" to="/" />
      <div class="topbar__center">
        <div class="t-label truncate topbar__label">{{ session.name }}<span class="wide-only"> · en cours</span></div>
        <div class="t-num topbar__clock">{{ formatClock(elapsed) }}</div>
      </div>
      <CgButton variant="danger" size="s" @click="confirmFinish = true">Terminer</CgButton>
    </header>

    <div v-if="ex" class="stack stack--s">
      <CgSegments
        :total="exercises.length"
        :current="exIndex"
        :done="doneExercises"
        :label-for="(i) => `Exercice ${i + 1} : ${exercises[i].name}`"
        @select="goTo"
      />
      <div class="progress-row">
        <div class="progress-label">Exercice {{ exIndex + 1 }} sur {{ exercises.length }}</div>
        <div class="ex-tools">
          <CgIconButton icon="plus" label="Ajouter des exercices" @click="picker = { mode: 'add' }" />
          <CgIconButton
            icon="swap"
            :label="exStarted ? 'Remplacement impossible : séries déjà validées' : `Remplacer ${ex.name}`"
            :disabled="exStarted"
            @click="picker = { mode: 'replace' }"
          />
          <CgIconButton icon="trash" :label="`Retirer ${ex.name}`" class="ex-tools__trash" @click="exStarted ? (confirmRemove = true) : removeExercise()" />
        </div>
      </div>
    </div>

    <template v-if="ex">
    <div class="exercise">
      <CgIconTile :icon="ex.icon" size="m" />
      <div class="exercise__text">
        <h1 class="t-display exercise__name">{{ ex.name }}</h1>
        <div class="exercise__goal">
          Objectif : {{ plural(ex.targetSets, 'série') }} de {{ ex.targetReps }} rép. · {{ ex.restSeconds ? `repos ${formatRest(ex.restSeconds)}` : 'sans repos' }}
          <span v-if="isRecord" class="record"><CgIcon name="trophy" :size="16" /> Record</span>
        </div>
        <div v-if="prevSummary" class="exercise__prev">Séance précédente<template v-if="prevDateLabel"> ({{ prevDateLabel }})</template> : {{ prevSummary }}</div>
      </div>
    </div>

    <section class="sets" aria-label="Séries">
      <p v-if="ex.previousDate" class="sets__hint col-prev">La colonne datée rappelle ta séance précédente sur cet exercice.</p>
      <div class="sets__grid sets__head" aria-hidden="true">
        <div><span class="col-prev">Série</span><span class="narrow-only">N°</span></div>
        <div class="col-prev">{{ ex.previousDate ? `Le ${formatShortDate(ex.previousDate)}` : 'Avant' }}</div>
        <div class="center">Kg</div>
        <div class="center">Rép.</div>
        <div />
      </div>

      <div
        v-for="set in ex.sets"
        :key="set.id"
        class="sets__grid set"
        :class="{ 'is-done': set.doneAt, 'is-active': activeSet?.id === set.id }"
        @click="set.doneAt ? openDetail(set) : (selectedId = set.id)"
      >
        <div class="t-num set__num">{{ set.setNumber }}</div>
        <div class="set__prev col-prev">{{ prevLabel(set) }}</div>
        <template v-if="activeSet?.id === set.id">
          <CgNumberField
            v-model="set.weight"
            decimal
            :max="1000"
            :label="`Charge de la série ${set.setNumber}, en kilos`"
            :placeholder="prevFor(set) ? formatNumber(prevFor(set).weight) : 'kg'"
            @enter="validate(set)"
          />
          <CgNumberField
            v-model="set.reps"
            :max="500"
            :label="`Répétitions de la série ${set.setNumber}`"
            :placeholder="String(ex.targetReps)"
            @enter="validate(set)"
          />
        </template>
        <template v-else>
          <div class="t-num set__val">{{ formatNumber(set.weight) }}</div>
          <div class="t-num set__val">{{ set.reps ?? '—' }}</div>
        </template>
        <button
          type="button"
          class="set__check"
          :aria-pressed="Boolean(set.doneAt)"
          :aria-label="set.doneAt ? `Série ${set.setNumber} validée — annuler` : `Valider la série ${set.setNumber}`"
          @click.stop="toggle(set)"
        >
          <span class="set__check-dot"><CgIcon v-if="set.doneAt" name="check" :size="16" :stroke="3.5" /></span>
        </button>
      </div>

      <p v-if="showDetailHint" class="sets__hint">Touche une série validée pour voir son détail ou la corriger.</p>
      <CgButton variant="ghost" size="s" icon="plus" class="sets__add" @click="addSet">Ajouter une série</CgButton>
    </section>

    <div
      v-if="ex.restSeconds || rest.running.value"
      class="rest"
      :class="{ 'is-running': rest.running.value, 'is-over': rest.justFinished.value }"
      role="timer"
      aria-live="off"
    >
      <button type="button" class="rest__text" :aria-label="`Repos de ${formatRest(ex.restSeconds)} — modifier`" @click="restEditor = true">
        <span class="t-label rest__label">Repos<CgIcon name="pencil" :size="14" /></span>
        <span class="t-display rest__clock">
          <template v-if="rest.running.value">{{ formatClock(rest.remaining.value) }}</template>
          <template v-else-if="rest.justFinished.value">Go !</template>
          <template v-else>{{ formatClock(ex.restSeconds) }}</template>
        </span>
        <span v-if="!rest.running.value && !rest.justFinished.value && !restAutoStart" class="rest__mode">lancement manuel</span>
      </button>
      <div class="rest__actions">
        <template v-if="rest.running.value">
          <CgButton variant="secondary" size="s" @click="rest.add(30)">+ 30 s</CgButton>
          <CgButton variant="secondary" size="s" @click="rest.skip()">Passer</CgButton>
        </template>
        <CgButton v-else variant="secondary" size="s" icon="clock" @click="rest.start(ex.restSeconds)">Lancer</CgButton>
      </div>
    </div>
    <div v-else class="rest rest--off">
      <span class="t-label">Sans repos</span>
      <CgButton variant="ghost" size="s" icon="clock" @click="restEditor = true">Définir un repos</CgButton>
    </div>

    </template>
    <CgEmptyState v-else icon="dumbbell" title="Aucun exercice" text="Ajoute des exercices pour commencer.">
      <CgButton variant="outline" size="m" icon="plus" @click="picker = { mode: 'add' }">Ajouter des exercices</CgButton>
    </CgEmptyState>

    <footer class="footer">
      <div v-if="nextEx" class="next">
        <span class="t-muted">Ensuite</span>
        <span class="next__name"><CgIcon :name="nextEx.icon" :size="20" class="t-accent" /><span class="truncate">{{ nextEx.name }} · {{ nextEx.targetSets }} × {{ nextEx.targetReps }}</span></span>
      </div>
      <CgButton block :loading="finishing" @click="cta.action()">{{ cta.label }}</CgButton>
    </footer>

    <ExercisePicker
      :open="Boolean(picker)"
      :multiple="picker?.mode !== 'replace'"
      :title="picker?.mode === 'replace' ? `Remplacer ${ex?.name ?? ''}` : 'Ajouter à la séance'"
      :present="presentIds"
      @close="picker = null"
      @pick="onPick"
    />

    <SetDetailDialog :exercise="ex" :set="detailSet" @close="detailSet = null">
      <template #actions>
        <CgButton variant="outline" size="m" icon="pencil" @click="correct(detailSet)">Corriger</CgButton>
      </template>
    </SetDetailDialog>

    <CgDialog
      :open="restEditor"
      title="Temps de repos"
      :description="ex ? `Entre les séries de ${ex.name}.` : null"
      @close="restEditor = false"
    >
      <div v-if="ex" class="stack stack--s">
        <div class="rest-choices" role="group" aria-label="Durée du repos">
          <CgChip v-for="s in restChoices" :key="s" :pressed="ex.restSeconds === s" @click="setRest(s)">
            {{ s ? formatRest(s) : 'Sans repos' }}
          </CgChip>
        </div>
        <div class="t-label rest-choices__title">Après chaque série validée</div>
        <div class="rest-choices" role="group" aria-label="Lancement du minuteur">
          <CgChip :pressed="restAutoStart" @click="setRestAutoStart(true)">Lancer le repos</CgChip>
          <CgChip :pressed="!restAutoStart" @click="setRestAutoStart(false)">Ne rien lancer</CgChip>
        </div>
      </div>
      <template #actions>
        <CgButton size="m" @click="restEditor = false">OK</CgButton>
      </template>
    </CgDialog>

    <CgDialog
      :open="confirmRemove"
      :title="`Retirer ${ex?.name ?? ''} ?`"
      description="Les séries déjà validées de cet exercice seront supprimées."
      @close="confirmRemove = false"
    >
      <template #actions>
        <CgButton variant="secondary" size="m" @click="confirmRemove = false">Garder</CgButton>
        <CgButton variant="danger" size="m" @click="removeExercise">Retirer</CgButton>
      </template>
    </CgDialog>

    <CgDialog
      :open="confirmFinish"
      title="Terminer la séance ?"
      :description="`${plural(setsDone, 'série validée', 'séries validées')}. Les séries non validées seront retirées.`"
      @close="confirmFinish = false"
    >
      <template #actions>
        <CgButton variant="secondary" size="m" @click="confirmFinish = false">Continuer</CgButton>
        <CgButton size="m" :loading="finishing" @click="finish">Terminer</CgButton>
        <CgButton variant="ghost" size="s" class="abandon" @click="abandon">Abandonner sans enregistrer</CgButton>
      </template>
    </CgDialog>
  </main>
  <main v-else class="session session--loading" aria-busy="true">
    <div class="t-label">Chargement de la séance…</div>
  </main>
</template>

<style scoped>
.session {
  width: 100%;
  max-width: var(--content-max);
  min-height: 100%;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: calc(var(--safe-top) + clamp(16px, 7vw, 56px)) calc(var(--gutter) + var(--safe-right)) 0 calc(var(--gutter) + var(--safe-left));
}
.session--loading { align-items: center; justify-content: center; }

.topbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.topbar__center { flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 0; }
.topbar__label { max-width: 100%; }
.topbar > :deep(.cg-btn) { flex-shrink: 0; padding-inline: 12px; }
.narrow-only { display: none; }
@media (max-width: 340px) {
  .wide-only { display: none; }
}
.topbar__clock { font-size: 1.625rem; line-height: 28px; }
.progress-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); }
.ex-tools { display: flex; gap: 6px; margin-left: auto; }
.ex-tools :disabled { opacity: 0.35; cursor: not-allowed; }
.ex-tools__trash { color: var(--color-danger); }
.progress-label { font-size: 0.8125rem; line-height: 18px; font-weight: 600; color: var(--color-text-muted); }

.exercise { display: flex; align-items: center; gap: 14px; }
.exercise__text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.exercise__name { font-size: var(--fs-display-s); }
.exercise__goal { display: flex; flex-wrap: wrap; align-items: center; column-gap: var(--space-2); font-size: var(--fs-body); line-height: 22px; color: var(--color-text-muted); }
.exercise__prev { display: none; font-size: var(--fs-body-s); color: var(--color-text-muted); }
.record { display: inline-flex; align-items: center; gap: 4px; color: var(--color-action); font-weight: 700; }

/* ── Tableau des séries ── */
.sets { container-type: inline-size; display: flex; flex-direction: column; gap: var(--space-2); }
.sets__grid {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 68px 56px 44px;
  gap: var(--space-2);
  align-items: center;
  padding: 0 var(--space-2);
}
.sets__head { font-size: var(--fs-label); line-height: 18px; font-weight: 700; letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--color-text-muted); }
.center { text-align: center; }
.set {
  height: 56px;
  border-radius: var(--radius-m);
  border: var(--border-w) solid var(--color-border);
  color: var(--color-text-muted);
  cursor: pointer;
}
.set__num { font-size: 1.375rem; text-align: center; }
.set__prev { font-size: var(--fs-body-s); font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.set__val { font-size: var(--fs-number); text-align: center; }
.set.is-done { background: rgb(var(--rgb-action) / 0.08); border-color: rgb(var(--rgb-action) / 0.4); color: var(--color-text); }
.set.is-done .set__val { color: var(--color-action); }
.set.is-done .set__prev { color: var(--color-text-muted); }
.set.is-active {
  background: var(--color-surface);
  border: var(--border-w-accent) solid var(--color-primary);
  box-shadow: 0 0 18px rgb(var(--rgb-primary) / 0.4);
  color: var(--color-text);
  cursor: default;
}
.set.is-active .set__num { color: var(--color-primary); }
.set.is-active .set__prev { color: var(--color-text-muted); }

.set__check { width: var(--tap); height: var(--tap); padding: 0; display: flex; align-items: center; justify-content: center; background: transparent; border: 0; }
.set__check-dot {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  border: 2px solid var(--color-border-strong);
  color: var(--color-text-inverse);
  transition: background var(--dur-fast), box-shadow var(--dur);
}
.is-active .set__check-dot { border-color: var(--color-primary); }
.set__check[aria-pressed='true'] .set__check-dot { background: var(--color-action); border-color: var(--color-action); box-shadow: 0 0 12px rgb(var(--rgb-action) / 0.55); }
.sets__hint { margin: 0; padding: 0 var(--space-2); font-size: var(--fs-body-s); color: var(--color-text-muted); }
.sets__add { align-self: flex-start; --accent: var(--color-primary); }

/* Écrans étroits (< 330px de tableau) : on retire la colonne de comparaison et on affiche un résumé */
@container (max-width: 330px) {
  .sets__grid { grid-template-columns: 24px minmax(0, 1fr) minmax(0, 1fr) 44px; gap: 6px; padding: 0 4px 0 6px; }
  .col-prev { display: none; }
  .narrow-only { display: inline; }
  .set__num { font-size: 1.125rem; }
}
@media (max-width: 370px) {
  .exercise__prev { display: block; }
}

/* ── Repos ── */
.rest {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-3);
  padding: var(--space-3) 14px;
  border-radius: var(--radius-l);
  background: var(--color-surface);
  border: var(--border-w) solid var(--color-border);
}
.rest__text { display: flex; flex-direction: column; align-items: flex-start; padding: 0; background: none; border: 0; color: inherit; text-align: left; cursor: pointer; }
.rest__label { display: inline-flex; align-items: center; gap: 6px; }
.rest__mode { font-size: var(--fs-body-s); color: var(--color-text-muted); }
.rest--off { padding-block: var(--space-2); border-style: dashed; }
.rest-choices { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.rest-choices :deep(.cg-chip) { height: 40px; padding-inline: 14px; }
.rest-choices__title { margin-top: var(--space-2); }
.rest__clock { font-size: var(--fs-timer); line-height: 1; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
.rest.is-running .rest__clock,
.rest.is-over .rest__clock { color: var(--color-info); text-shadow: 0 0 18px rgb(var(--rgb-cyan) / 0.6); }
.rest.is-over { border-color: var(--color-info); animation: rest-pulse 0.6s ease-in-out 3; }
.rest__actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
@keyframes rest-pulse { 50% { box-shadow: 0 0 24px rgb(var(--rgb-cyan) / 0.6); } }

/* ── Pied collant ── */
.footer {
  position: sticky;
  bottom: 0;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: var(--space-4) 0 calc(var(--space-4) + var(--safe-bottom));
  background: linear-gradient(to bottom, rgb(8 6 13 / 0), var(--color-bg) var(--space-4));
}
.next { display: flex; align-items: baseline; justify-content: space-between; gap: var(--space-3); font-size: var(--fs-body-s); line-height: 20px; min-width: 0; }
.next__name { display: flex; align-items: center; gap: var(--space-2); font-weight: 600; min-width: 0; }
.abandon { --accent: var(--color-danger); flex-basis: 100% !important; }
</style>
