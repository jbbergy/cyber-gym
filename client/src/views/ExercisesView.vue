<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  CgButton, CgChip, CgChipRow, CgDialog, CgIcon, CgIconButton, CgIconPicker, CgPageHeader, CgSearchField, CgSectionHeader, CgSelect, CgTextField,
} from '../ds'
import { api } from '../lib/api'
import { MUSCLES, muscleIcon, muscleLabel, normalize } from '../lib/muscles'
import { toast } from '../lib/toast'

const exercises = ref([])
const query = ref('')
const muscle = ref('all')
const editing = ref(null) // null = fermé · {} = nouveau · exercice
const form = reactive({ name: '', muscle: 'autre', icon: 'dumbbell' })
const saving = ref(false)

const MUSCLE_OPTIONS = MUSCLES.map((m) => ({ value: m.value, label: m.label }))

async function load() {
  try {
    exercises.value = await api.exercises()
  } catch (err) {
    toast(err, { tone: 'danger' })
  }
}
onMounted(load)

const groups = computed(() => {
  const q = normalize(query.value)
  const list = exercises.value.filter(
    (e) => (muscle.value === 'all' || e.muscle === muscle.value) && (!q || normalize(e.name).includes(q)),
  )
  return MUSCLES.map((m) => ({ ...m, items: list.filter((e) => e.muscle === m.value) })).filter((g) => g.items.length)
})

function open(e = null) {
  editing.value = e ?? {}
  const m = e?.muscle ?? (muscle.value === 'all' ? 'autre' : muscle.value)
  Object.assign(form, { name: e?.name ?? query.value.trim(), muscle: m, icon: e?.icon ?? muscleIcon(m) })
}

function onMuscle(m) {
  // l'icône suit le groupe tant qu'elle n'a pas été personnalisée
  if (form.icon === muscleIcon(form.muscle)) form.icon = muscleIcon(m)
  form.muscle = m
}

async function save() {
  if (!form.name.trim()) return toast('Nom requis', { tone: 'danger' })
  saving.value = true
  try {
    if (editing.value.id) await api.updateExercise(editing.value.id, form)
    else await api.createExercise(form)
    toast('Exercice enregistré', { tone: 'success' })
    editing.value = null
    load()
  } catch (err) {
    toast(err, { tone: 'danger' })
  } finally {
    saving.value = false
  }
}

async function remove() {
  try {
    await api.deleteExercise(editing.value.id)
    toast('Exercice supprimé')
    editing.value = null
    load()
  } catch (err) {
    toast(err, { tone: 'danger' })
  }
}

const usage = (e) =>
  [e.uses ? `${e.uses} séance${e.uses > 1 ? 's' : ''}` : null, e.inTemplates ? `${e.inTemplates} preset${e.inTemplates > 1 ? 's' : ''}` : null]
    .filter(Boolean)
    .join(' · ')
</script>

<template>
  <main class="page">
    <CgPageHeader eyebrow="Catalogue" title="Exercices" :subtitle="`${exercises.length} exercices`">
      <template #actions><CgIconButton icon="chevron-left" label="Retour au programme" to="/programmes" /></template>
    </CgPageHeader>

    <div class="stack stack--s">
      <CgSearchField v-model="query" label="Rechercher un exercice" />
      <CgChipRow label="Groupe musculaire" compact>
        <CgChip :pressed="muscle === 'all'" @click="muscle = 'all'">Tous</CgChip>
        <CgChip v-for="m in MUSCLES" :key="m.value" :pressed="muscle === m.value" @click="muscle = m.value">{{ m.label }}</CgChip>
      </CgChipRow>
    </div>

    <CgButton variant="outline" size="m" icon="plus" block @click="open()">Nouvel exercice</CgButton>

    <section v-for="g in groups" :key="g.value" class="stack stack--s">
      <CgSectionHeader :title="g.label" caps muted :aside="String(g.items.length)" />
      <ul class="list">
        <li v-for="e in g.items" :key="e.id">
          <button type="button" class="item" @click="open(e)">
            <span class="item__icon"><CgIcon :name="e.icon" :size="24" /></span>
            <span class="item__body">
              <span class="item__name">{{ e.name }}</span>
              <span v-if="usage(e)" class="item__meta">{{ usage(e) }}</span>
            </span>
            <CgIcon name="pencil" :size="18" class="t-muted" />
          </button>
        </li>
      </ul>
    </section>

    <p v-if="!groups.length && exercises.length" class="t-muted empty">Aucun exercice ne correspond.</p>

    <CgDialog :open="Boolean(editing)" :title="editing?.id ? 'Modifier' : 'Nouvel exercice'" @close="editing = null">
      <form id="exercise-form" class="stack" @submit.prevent="save">
        <CgTextField v-model="form.name" label="Nom" placeholder="Hack squat" :maxlength="60" required />
        <CgSelect :model-value="form.muscle" label="Groupe musculaire" :options="MUSCLE_OPTIONS" @update:model-value="onMuscle" />
        <div class="accent-violet"><CgIconPicker v-model="form.icon" /></div>
        <p v-if="editing?.id && (editing.uses || editing.inTemplates)" class="t-muted note">
          Utilisé dans {{ usage(editing) }} : il ne peut pas être supprimé, mais peut être renommé.
        </p>
      </form>
      <template #actions>
        <CgButton variant="secondary" size="m" @click="editing = null">Annuler</CgButton>
        <CgButton type="submit" form="exercise-form" size="m" :loading="saving">Enregistrer</CgButton>
        <CgButton
          v-if="editing?.id && !editing.uses && !editing.inTemplates"
          variant="ghost"
          size="s"
          icon="trash"
          class="danger"
          @click="remove"
        >
          Supprimer l'exercice
        </CgButton>
      </template>
    </CgDialog>
  </main>
</template>

<style scoped>
.list { margin: 0; padding: 0; list-style: none; border-radius: var(--radius-l); background: var(--color-surface); border: var(--border-w) solid var(--color-border); overflow: hidden; }
.list li + li { border-top: var(--border-w) solid var(--color-border); }
.item { display: flex; align-items: center; gap: var(--space-3); width: 100%; min-height: 56px; padding: 6px 12px; border: 0; background: transparent; color: var(--color-text); text-align: left; }
.item:hover { background: rgb(var(--rgb-primary) / 0.06); }
.item__icon { flex-shrink: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: var(--border-w) solid var(--color-border); color: var(--color-primary); }
.item__body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.item__name { font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
.item__meta { font-size: var(--fs-label); color: var(--color-text-muted); }
.empty { text-align: center; }
.note { font-size: var(--fs-body-s); }
.danger { --accent: var(--color-danger); flex-basis: 100% !important; }
</style>
