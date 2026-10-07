<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CgBadge, CgButton, CgCard, CgDialog, CgIcon, CgIconButton, CgIconTile, CgPageHeader, CgStat } from '../ds'
import SetDetailDialog from '../components/SetDetailDialog.vue'
import ShareSessionDialog from '../components/ShareSessionDialog.vue'
import { api } from '../lib/api'
import { auth } from '../lib/auth'
import { exerciseCalories, sessionCalories } from '../lib/calories'
import { durationMinutes, formatDayDate, formatInt, formatNumber, formatTime } from '../lib/format'
import { toast } from '../lib/toast'

const route = useRoute()
const router = useRouter()
const session = ref(null)
const confirmDelete = ref(false)
const sharing = ref(false)
/** null · { exercise, set } : série dont on affiche le détail */
const detail = ref(null)

onMounted(async () => {
  try {
    session.value = await api.session(route.params.id)
    if (!session.value.endedAt) router.replace(`/seance/${session.value.id}`)
  } catch (err) {
    toast(err, { tone: 'danger' })
    router.replace('/historique')
  }
})

const exercises = computed(() =>
  (session.value?.exercises ?? []).map((e) => {
    const done = e.sets.filter((s) => s.doneAt)
    const top = Math.max(...done.map((s) => s.weight ?? 0))
    return {
      ...e,
      done,
      volume: done.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0),
      record: e.previousBest !== null && top > e.previousBest,
      kcal: exerciseCalories(auth.user, e),
      top,
    }
  }),
)

const kcal = computed(() => sessionCalories(auth.user, session.value))

const savingPreset = ref(false)
async function saveAsPreset() {
  savingPreset.value = true
  try {
    const t = await api.templateFromSession(session.value.id)
    toast('Preset créé : ajuste-le si besoin', { tone: 'success' })
    router.push(`/programmes/${t.id}`)
  } catch (err) {
    toast(err, { tone: 'danger' })
  } finally {
    savingPreset.value = false
  }
}

async function remove() {
  try {
    await api.deleteSession(session.value.id)
    toast('Séance supprimée')
    router.replace('/historique')
  } catch (err) {
    toast(err, { tone: 'danger' })
  }
}
</script>

<template>
  <main v-if="session" class="page" :class="`accent-${session.color}`">
    <CgPageHeader
      :eyebrow="`${formatDayDate(session.startedAt)} · ${formatTime(session.startedAt)}`"
      :title="session.name"
      :subtitle="session.muscles || null"
    >
      <template #actions>
        <CgIconButton icon="share" label="Partager la séance" @click="sharing = true" />
        <CgIconButton icon="chevron-left" label="Retour à l'historique" to="/historique" />
      </template>
    </CgPageHeader>

    <div class="stats">
      <CgStat class="accent-cyan" label="Durée" :value="`${durationMinutes(session.startedAt, session.endedAt)} min`" />
      <CgStat class="accent-pink" label="Volume" :value="`${formatInt(session.volume)} kg`" />
      <CgStat class="accent-violet" label="Séries" :value="session.setsDone" />
      <CgStat class="accent-green" label="Records" :value="session.records" />
      <RouterLink v-if="kcal !== null" to="/profil/calories" class="stats__wide stats__link" aria-label="Énergie estimée : voir le mode de calcul">
        <CgStat class="accent-yellow" label="Énergie estimée" :value="`${formatInt(kcal)} kcal`" />
      </RouterLink>
      <RouterLink v-else to="/profil" class="stats__wide t-muted stats__hint">
        Renseigne ton poids, ta taille et ton âge pour estimer les calories dépensées
      </RouterLink>
    </div>

    <CgCard v-for="e in exercises" :key="e.id" padding="s">
      <div class="ex-head">
        <CgIconTile :icon="e.icon" />
        <div class="grow">
          <div class="row row--wrap ex-title">
            <span class="ex-name">{{ e.name }}</span>
            <CgBadge v-if="e.record" tone="success">Record</CgBadge>
          </div>
          <div class="t-muted ex-meta">{{ formatInt(e.volume) }} kg · max {{ formatNumber(e.top) }} kg<template v-if="e.kcal !== null"> · {{ formatInt(e.kcal) }} kcal</template></div>
        </div>
      </div>
      <ol class="sets">
        <li v-for="s in e.done" :key="s.id">
          <button type="button" class="sets__item" :aria-label="`Détail de la série ${s.setNumber}`" @click="detail = { exercise: e, set: s }">
            <span class="t-num sets__n">{{ s.setNumber }}</span>
            <span class="t-num sets__v">{{ formatNumber(s.weight) }} <small>kg</small> × {{ s.reps }}</span>
            <CgIcon v-if="e.record && s.weight === e.top" name="trophy" :size="16" class="sets__pr" label="Record" />
            <CgIcon name="chevron-right" :size="16" class="sets__more" />
          </button>
        </li>
      </ol>
    </CgCard>

    <CgButton size="m" icon="share" block @click="sharing = true">Partager ma séance</CgButton>
    <CgButton variant="outline" size="m" icon="bookmark" block :loading="savingPreset" @click="saveAsPreset">
      Enregistrer comme preset
    </CgButton>
    <CgButton variant="ghost" size="s" icon="trash" class="danger" @click="confirmDelete = true">Supprimer cette séance</CgButton>

    <ShareSessionDialog :open="sharing" :session="session" :exercises="exercises" :kcal="kcal" @close="sharing = false" />
    <SetDetailDialog :exercise="detail?.exercise" :set="detail?.set ?? null" @close="detail = null" />

    <CgDialog :open="confirmDelete" title="Supprimer ?" description="Cette séance et ses séries seront définitivement effacées." @close="confirmDelete = false">
      <template #actions>
        <CgButton variant="secondary" size="m" @click="confirmDelete = false">Annuler</CgButton>
        <CgButton variant="danger" size="m" @click="remove">Supprimer</CgButton>
      </template>
    </CgDialog>
  </main>
</template>

<style scoped>
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.stats__wide { grid-column: 1 / -1; }
.stats__link { color: inherit; text-decoration: none; }
.stats__hint { font-size: var(--fs-body-s); text-decoration: underline; text-underline-offset: 3px; }
.ex-head { display: flex; align-items: center; gap: var(--space-3); }
.ex-title { gap: var(--space-2); }
.ex-name { font-weight: 700; font-size: var(--fs-body-l); line-height: 1.25; }
.ex-meta { font-size: var(--fs-body-s); }
.sets { margin: 0; padding: 0; list-style: none; }
.sets__item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 44px;
  padding: 0;
  background: transparent;
  border: 0;
  border-top: var(--border-w) solid var(--color-border);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.sets__item:hover .sets__more { color: var(--color-text); }
.sets__n { width: 24px; text-align: center; color: var(--color-text-muted); font-size: 1.125rem; }
.sets__v { font-size: 1.25rem; }
.sets__v small { font-size: 0.8rem; color: var(--color-text-muted); }
.sets__pr { color: var(--color-action); }
.sets__more { margin-left: auto; color: var(--color-text-muted); }
.danger { --accent: var(--color-danger); align-self: center; }
@media (max-width: 300px) {
  .stats { gap: var(--space-2); }
}
</style>
