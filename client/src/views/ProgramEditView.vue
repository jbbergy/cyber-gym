<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  CgButton, CgCard, CgColorPicker, CgDialog, CgEmptyState, CgIcon, CgIconButton, CgIconPicker, CgNumberField, CgPageHeader,
  CgSectionHeader, CgSelect, CgTextField,
} from '../ds'
import ExercisePicker from '../components/ExercisePicker.vue'
import { api } from '../lib/api'
import { WEEKDAYS, formatRest } from '../lib/format'
import { muscleLabel } from '../lib/muscles'
import { toast } from '../lib/toast'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const isNew = !id

const form = reactive({ name: '', muscles: '', color: 'violet', icon: 'squat', weekday: null, exercises: [] })
const loading = ref(!isNew)
const saving = ref(false)
const confirmDelete = ref(false)
/** null = fermé · { mode: 'add' } · { mode: 'replace', index } */
const picker = ref(null)
let uid = 0

const DAY_OPTIONS = [{ value: null, label: 'Pas de jour fixe' }, ...WEEKDAYS.map((label, i) => ({ value: i + 1, label }))]
const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map((s) => ({ value: s, label: formatRest(s) }))

const valid = computed(() => form.name.trim() && form.exercises.every((e) => e.sets > 0 && e.reps > 0))
const presentIds = computed(() => form.exercises.map((e) => e.exerciseId))

const row = (e, extra = {}) => ({
  key: ++uid,
  exerciseId: e.exerciseId ?? e.id,
  name: e.name,
  icon: e.icon,
  muscle: e.muscle,
  sets: 3,
  reps: 10,
  restSeconds: 90,
  ...extra,
})

onMounted(async () => {
  if (isNew) return
  try {
    const t = await api.template(id)
    Object.assign(form, {
      name: t.name, muscles: t.muscles, color: t.color, icon: t.icon, weekday: t.weekday,
      exercises: t.exercises.map((e) => row(e, { sets: e.sets, reps: e.reps, restSeconds: e.restSeconds })),
    })
  } catch (err) {
    toast(err, { tone: 'danger' })
    if (err.status === 404) router.replace('/programmes')
  } finally {
    loading.value = false
  }
})

function onPick(list) {
  const p = picker.value
  picker.value = null
  if (!list.length) return
  if (p?.mode === 'replace') {
    const old = form.exercises[p.index]
    form.exercises.splice(p.index, 1, row(list[0], { sets: old.sets, reps: old.reps, restSeconds: old.restSeconds }))
  } else {
    form.exercises.push(...list.map((e) => row(e)))
  }
}

function move(i, delta) {
  const list = form.exercises
  const j = i + delta
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j], list[i]]
}

async function save() {
  if (!valid.value) return toast('Donne un nom au preset', { tone: 'danger' })
  saving.value = true
  const body = {
    ...form,
    exercises: form.exercises.map(({ exerciseId, sets, reps, restSeconds }) => ({ exerciseId, sets, reps, restSeconds })),
  }
  try {
    if (isNew) await api.createTemplate(body)
    else await api.updateTemplate(id, body)
    toast('Preset enregistré', { tone: 'success' })
    router.replace('/programmes')
  } catch (err) {
    toast(err, { tone: 'danger' })
  } finally {
    saving.value = false
  }
}

async function duplicate() {
  try {
    const copy = await api.duplicateTemplate(id)
    toast('Preset dupliqué', { tone: 'success' })
    router.replace(`/programmes/${copy.id}`)
  } catch (err) {
    toast(err, { tone: 'danger' })
  }
}

async function remove() {
  try {
    await api.deleteTemplate(id)
    toast('Preset supprimé')
    router.replace('/programmes')
  } catch (err) {
    toast(err, { tone: 'danger' })
  }
}
</script>

<template>
  <main class="page editor" :class="`accent-${form.color}`">
    <CgPageHeader :eyebrow="isNew ? 'Nouveau preset de séance' : 'Modifier le preset'" :title="form.name || 'Preset'">
      <template #actions>
        <CgIconButton icon="x" label="Annuler" to="/programmes" />
      </template>
    </CgPageHeader>

    <form v-if="!loading" class="stack editor__form" @submit.prevent="save">
      <CgCard>
        <CgTextField v-model="form.name" label="Nom" placeholder="Jambes" :maxlength="40" required />
        <CgTextField v-model="form.muscles" label="Muscles ciblés" placeholder="Quadriceps, ischios, mollets" :maxlength="80" />
        <CgSelect v-model="form.weekday" label="Jour" :options="DAY_OPTIONS" />
        <CgColorPicker v-model="form.color" />
        <CgIconPicker v-model="form.icon" />
      </CgCard>

      <CgSectionHeader :title="`Exercices (${form.exercises.length})`" />

      <CgEmptyState
        v-if="!form.exercises.length"
        icon="dumbbell"
        title="Aucun exercice"
        text="Choisis les exercices de ce preset dans le catalogue."
      />

      <CgCard v-for="(e, i) in form.exercises" :key="e.key" padding="s" class="ex">
        <div class="ex__head">
          <span class="t-num ex__index">{{ i + 1 }}</span>
          <CgIcon :name="e.icon" :size="26" class="t-accent ex__icon" />
          <div class="grow">
            <div class="ex__name">{{ e.name }}</div>
            <div class="ex__muscle">{{ muscleLabel(e.muscle) }}</div>
          </div>
          <CgIconButton icon="swap" :label="`Remplacer ${e.name}`" @click="picker = { mode: 'replace', index: i }" />
        </div>
        <div class="ex__grid">
          <CgNumberField v-model="e.sets" :hide-label="false" label="Séries" size="m" :min="1" :max="20" />
          <CgNumberField v-model="e.reps" :hide-label="false" label="Rép." size="m" :min="1" :max="100" />
          <CgSelect v-model="e.restSeconds" label="Repos" :options="REST_OPTIONS" class="ex__rest" />
        </div>
        <div class="ex__tools">
          <CgIconButton icon="arrow-up" :label="`Monter ${e.name}`" :disabled="i === 0" @click="move(i, -1)" />
          <CgIconButton icon="arrow-down" :label="`Descendre ${e.name}`" :disabled="i === form.exercises.length - 1" @click="move(i, 1)" />
          <CgIconButton icon="trash" :label="`Retirer ${e.name}`" class="ex__trash" @click="form.exercises.splice(i, 1)" />
        </div>
      </CgCard>

      <CgButton variant="outline" size="m" icon="plus" block @click="picker = { mode: 'add' }">Ajouter des exercices</CgButton>

      <div class="editor__actions">
        <CgButton type="submit" block :loading="saving" :disabled="!valid">Enregistrer</CgButton>
        <div v-if="!isNew" class="row row--wrap editor__secondary">
          <CgButton variant="ghost" size="s" icon="copy" @click="duplicate">Dupliquer</CgButton>
          <CgButton variant="ghost" size="s" icon="trash" class="danger" @click="confirmDelete = true">Supprimer</CgButton>
        </div>
      </div>
    </form>

    <ExercisePicker
      :open="Boolean(picker)"
      :multiple="picker?.mode !== 'replace'"
      :title="picker?.mode === 'replace' ? 'Remplacer par…' : 'Ajouter des exercices'"
      :present="presentIds"
      @close="picker = null"
      @pick="onPick"
    />

    <CgDialog
      :open="confirmDelete"
      title="Supprimer ?"
      description="Le preset sera retiré du programme. L'historique des séances déjà faites est conservé."
      @close="confirmDelete = false"
    >
      <template #actions>
        <CgButton variant="secondary" size="m" @click="confirmDelete = false">Annuler</CgButton>
        <CgButton variant="danger" size="m" @click="remove">Supprimer</CgButton>
      </template>
    </CgDialog>
  </main>
</template>

<style scoped>
.editor { padding-bottom: calc(var(--space-8) + var(--safe-bottom)); }
.editor__form { gap: var(--space-4); }
.ex { container-type: inline-size; gap: var(--space-3); }
.ex__head { display: flex; align-items: center; gap: var(--space-2); }
.ex__index { width: 20px; flex-shrink: 0; text-align: center; font-size: 1.25rem; color: var(--accent); }
.ex__name { font-weight: 700; line-height: 1.25; overflow-wrap: anywhere; }
.ex__muscle { font-size: var(--fs-label); color: var(--color-text-muted); }
.ex__grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr); gap: var(--space-2); }
.ex__tools { display: flex; gap: var(--space-2); }
.ex__tools :disabled { opacity: 0.35; }
.ex__trash { margin-left: auto; color: var(--color-danger); }
.editor__actions { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-2); }
.editor__secondary { justify-content: center; gap: var(--space-2); }
.danger { --accent: var(--color-danger); }

@container (max-width: 250px) {
  .ex__grid { grid-template-columns: 1fr 1fr; }
  .ex__rest { grid-column: 1 / -1; }
  .ex__icon { display: none; }
}
</style>
