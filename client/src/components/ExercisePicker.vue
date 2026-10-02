<script setup>
import { computed, ref, watch } from 'vue'
import { CgButton, CgChip, CgChipRow, CgDialog, CgIcon, CgSearchField } from '../ds'
import { api } from '../lib/api'
import { MUSCLES, muscleIcon, muscleLabel, normalize } from '../lib/muscles'
import { toast } from '../lib/toast'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: 'Choisir des exercices' },
  /** false : un seul choix, renvoyé dès le clic (ex. remplacer un exercice) */
  multiple: { type: Boolean, default: true },
  /** ids déjà présents dans la séance / le preset (signalés, mais sélectionnables) */
  present: { type: Array, default: () => [] },
  confirmLabel: { type: String, default: 'Ajouter' },
})
const emit = defineEmits(['close', 'pick'])

// Catalogue partagé entre les ouvertures (rechargé à chaque ouverture)
const catalog = ref([])
const loading = ref(false)
const query = ref('')
const muscle = ref('all')
const selected = ref([])
const creating = ref(false)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    query.value = ''
    muscle.value = 'all'
    selected.value = []
    loading.value = !catalog.value.length
    try {
      catalog.value = await api.exercises()
    } catch (err) {
      toast(err, { tone: 'danger' })
    } finally {
      loading.value = false
    }
  },
  { immediate: true },
)

const filtered = computed(() => {
  const q = normalize(query.value)
  return catalog.value.filter(
    (e) => (muscle.value === 'all' || e.muscle === muscle.value) && (!q || normalize(e.name).includes(q)),
  )
})

/** sans recherche : « Fréquents » puis groupes musculaires ; avec recherche : liste à plat */
const groups = computed(() => {
  if (query.value.trim() || muscle.value !== 'all') return [{ key: 'results', title: null, items: filtered.value }]
  const frequent = [...catalog.value].filter((e) => e.uses > 0).sort((a, b) => b.uses - a.uses).slice(0, 6)
  const out = frequent.length ? [{ key: 'frequent', title: 'Fréquents', items: frequent }] : []
  for (const m of MUSCLES) {
    const items = catalog.value.filter((e) => e.muscle === m.value)
    if (items.length) out.push({ key: m.value, title: m.label, items })
  }
  return out
})

const availableMuscles = computed(() => MUSCLES.filter((m) => catalog.value.some((e) => e.muscle === m.value)))
const canCreate = computed(() => {
  const q = normalize(query.value)
  return q.length > 1 && !catalog.value.some((e) => normalize(e.name) === q)
})
const isSelected = (e) => selected.value.some((s) => s.id === e.id)

function toggle(e) {
  if (!props.multiple) return emit('pick', [e])
  selected.value = isSelected(e) ? selected.value.filter((s) => s.id !== e.id) : [...selected.value, e]
}

async function create() {
  creating.value = true
  const m = muscle.value === 'all' ? 'autre' : muscle.value
  try {
    const e = await api.createExercise({ name: query.value.trim(), muscle: m, icon: muscleIcon(m) })
    if (!catalog.value.some((x) => x.id === e.id)) catalog.value = [...catalog.value, e]
    query.value = ''
    toggle(e)
    toast(`« ${e.name} » ajouté au catalogue`, { tone: 'success' })
  } catch (err) {
    toast(err, { tone: 'danger' })
  } finally {
    creating.value = false
  }
}

function confirm() {
  emit('pick', selected.value)
}
</script>

<template>
  <CgDialog :open="open" :title="title" class="picker" @close="emit('close')">
    <template #header>
      <CgSearchField v-model="query" label="Rechercher un exercice" placeholder="Rechercher ou créer…" />
      <CgChipRow label="Groupe musculaire" compact>
        <CgChip :pressed="muscle === 'all'" @click="muscle = 'all'">Tous</CgChip>
        <CgChip v-for="m in availableMuscles" :key="m.value" :pressed="muscle === m.value" @click="muscle = m.value">
          {{ m.label }}
        </CgChip>
      </CgChipRow>
    </template>

    <div class="list">

      <section v-for="g in groups" :key="g.key" class="group">
        <h3 v-if="g.title" class="t-label group__title">{{ g.title }}</h3>
        <button
          v-for="e in g.items"
          :key="g.key + e.id"
          type="button"
          class="item"
          :role="multiple ? 'checkbox' : undefined"
          :aria-checked="multiple ? isSelected(e) : undefined"
          @click="toggle(e)"
        >
          <span class="item__icon"><CgIcon :name="e.icon" :size="24" /></span>
          <span class="item__body">
            <span class="item__name">{{ e.name }}</span>
            <span class="item__meta">
              {{ muscleLabel(e.muscle) }}<template v-if="present.includes(e.id)"> · déjà présent</template>
            </span>
          </span>
          <span v-if="multiple" class="item__check">
            <CgIcon v-if="isSelected(e)" name="check" :size="16" :stroke="3.5" />
            <span v-if="isSelected(e)" class="sr-only">sélectionné</span>
          </span>
          <CgIcon v-else name="chevron-right" :size="18" class="t-muted" />
        </button>
      </section>

      <button v-if="canCreate" type="button" class="item item--create" :disabled="creating" @click="create">
        <span class="item__icon"><CgIcon name="plus" :size="20" /></span>
        <span class="item__body">
          <span class="item__name">Créer « {{ query.trim() }} »</span>
          <span class="item__meta">{{ muscle === 'all' ? 'Groupe : autre' : muscleLabel(muscle) }} · modifiable dans le catalogue</span>
        </span>
      </button>
      <p v-if="!loading && !filtered.length && !canCreate" class="empty t-muted">Aucun exercice trouvé.</p>
      <p v-if="loading" class="empty t-muted">Chargement…</p>
    </div>

    <template #actions>
      <CgButton variant="secondary" size="m" @click="emit('close')">Annuler</CgButton>
      <CgButton v-if="multiple" size="m" class="picker__confirm" :disabled="!selected.length" @click="confirm">
        {{ confirmLabel }}{{ selected.length ? ` (${selected.length})` : '' }}
      </CgButton>
    </template>
  </CgDialog>
</template>

<style scoped>
.picker :deep(.cg-dialog__panel) { height: 88dvh; }
.list { display: flex; flex-direction: column; gap: var(--space-3); }
.group { display: flex; flex-direction: column; }
.group__title { padding: var(--space-1) 0; }
.item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 52px;
  padding: 6px 4px;
  border: 0;
  border-bottom: var(--border-w) solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  text-align: left;
}
.item:hover { background: rgb(var(--rgb-primary) / 0.06); }
.item__icon { flex-shrink: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 10px; border: var(--border-w) solid var(--color-border); color: var(--color-primary); }
.item__body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.item__name { font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
.item__meta { font-size: var(--fs-label); color: var(--color-text-muted); }
.item__check {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  border: 2px solid var(--color-border-strong);
  color: var(--color-text-inverse);
}
.item[aria-checked='true'] .item__check { background: var(--color-action); border-color: var(--color-action); box-shadow: 0 0 10px rgb(var(--rgb-action) / 0.5); }
.item[aria-checked='true'] .item__name { color: var(--color-action); }
.item--create { border: var(--border-w) dashed var(--color-primary); border-radius: var(--radius-m); padding-inline: 8px; }
.item--create .item__icon { border-color: var(--color-primary); }
.item--create .item__name { color: var(--color-primary); }
.empty { padding: var(--space-6) 0; text-align: center; }
</style>
