<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  CgBadge, CgButton, CgCard, CgChip, CgChipRow, CgColorPicker, CgDialog, CgEmptyState, CgIcon, CgIconButton, CgIconPicker, CgIconTile,
  CgLineChart, CgListRow, CgNumberField, CgPageHeader, CgSearchField, CgSectionHeader, CgSegments, CgSelect, CgStat, CgTextField, CgWeekStrip,
} from '../ds'
import { EXERCISE_ICONS, FILLED_ICONS, UI_ICONS } from '../lib/icons'
import { toast } from '../lib/toast'

const width = ref(window.innerWidth)
const onResize = () => (width.value = window.innerWidth)
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

const COLORS = [
  ['--color-bg', 'Fond'], ['--color-bg-raised', 'Fond surélevé'], ['--color-surface', 'Surface'], ['--color-border', 'Bordure'],
  ['--color-border-strong', 'Bordure forte'], ['--color-text', 'Texte'], ['--color-text-muted', 'Texte atténué'],
  ['--cg-violet', 'Primaire · violet'], ['--cg-green', 'Action · vert'], ['--cg-pink', 'Danger · rose'], ['--cg-cyan', 'Info · cyan'],
]
const TYPE = [
  ['--fs-display-xl', 'Display XL', '77,5'], ['--fs-display-l', 'Display L', 'Jambes'], ['--fs-display-m', 'Display M', 'Historique'],
  ['--fs-display-s', 'Display S', 'Squat barre'], ['--fs-title', 'Titre de ligne', 'Poussée'], ['--fs-stat', 'Stat', '2 480 kg'],
]
const demo = ref({ q: '', filter: 'all', chip: 0, weight: 80, reps: 8, color: 'violet', icon: 'squat', name: '', day: 5, dialog: false, seg: 1 })
const week = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'].map((label, i) => ({
  key: label, label, day: 28 + i > 30 ? i - 2 : 28 + i,
  state: i === 0 || i === 2 ? 'done' : i === 4 ? 'today' : 'idle', color: i === 0 ? 'pink' : 'cyan',
}))
const chart = [67.5, 70, 70, 72.5, 72.5, 75, 75, 77.5].map((value, i) => ({ value, label: `S${i + 1}` }))
</script>

<template>
  <main class="page ds">
    <CgPageHeader eyebrow="Cyber Gym" title="Design system" :subtitle="`Viewport : ${width}px — testé jusqu'à 279px`">
      <template #actions><CgIconButton icon="chevron-left" label="Retour" to="/programmes" /></template>
    </CgPageHeader>

    <section class="stack">
      <CgSectionHeader title="Couleurs" caps />
      <div class="swatches">
        <div v-for="[token, name] in COLORS" :key="token" class="swatch">
          <span class="swatch__chip" :style="{ background: `var(${token})` }" />
          <span class="swatch__name">{{ name }}</span>
          <code>{{ token }}</code>
        </div>
      </div>
      <p class="t-muted note">Les accents (<code>.accent-violet|pink|cyan|green|yellow</code>) définissent <code>--accent</code> et <code>--rgb-accent</code>, repris par les composants pour la couleur et le halo néon.</p>
    </section>

    <section class="stack">
      <CgSectionHeader title="Typographie" caps />
      <div v-for="[token, name, sample] in TYPE" :key="token" class="type-row">
        <span class="t-display" :style="{ fontSize: `var(${token})` }">{{ sample }}</span>
        <code>{{ name }} · {{ token }}</code>
      </div>
      <div class="type-row"><span class="t-label">Sur-titre · t-label</span></div>
      <div class="type-row"><span>Corps 15px Barlow — texte courant</span></div>
      <div class="type-row"><span class="t-muted">Texte atténué · t-muted</span></div>
    </section>

    <section class="stack">
      <CgSectionHeader title="Boutons" caps />
      <CgButton block icon="play">Démarrer la séance</CgButton>
      <div class="row row--wrap">
        <CgButton variant="outline" size="m" icon="plus">Outline</CgButton>
        <CgButton variant="secondary">+ 30 s</CgButton>
        <CgButton variant="danger">Terminer</CgButton>
        <CgButton variant="ghost" icon="plus">Ghost</CgButton>
        <CgButton variant="secondary" disabled>Désactivé</CgButton>
        <CgIconButton icon="chevron-down" label="Réduire" />
      </div>
    </section>

    <section class="stack">
      <CgSectionHeader title="Cartes & lignes" caps />
      <CgCard highlight class="accent-violet">
        <div class="t-label">Carte mise en avant</div>
        <div class="t-display t-accent t-glow" style="font-size: var(--fs-display-l)">Jambes</div>
        <div class="row row--wrap"><CgBadge>5 exercices</CgBadge><CgBadge>env. 60 min</CgBadge></div>
      </CgCard>
      <CgListRow class="accent-cyan" icon="pull" title="Tirage" meta="30 sept. · 52 min · 6 420 kg" />
      <CgListRow class="accent-pink" icon="bench" title="Poussée" meta="28 sept. · 58 min · 7 180 kg">
        <template #badge><CgBadge tone="success">1 record</CgBadge></template>
      </CgListRow>
      <div class="stats">
        <CgStat class="accent-pink" label="Max estimé" value="98 kg" />
        <CgStat class="accent-cyan" label="Dernier volume" value="2 480 kg" />
      </div>
    </section>

    <section class="stack">
      <CgSectionHeader title="Navigation & progression" caps aside="2 séances sur 3" />
      <CgWeekStrip :days="week" />
      <CgSegments :total="5" :current="demo.seg" :done="[0]" @select="demo.seg = $event" />
      <div class="chips">
        <CgChip v-for="(n, i) in ['Squat barre', 'Développé couché', 'Tractions']" :key="n" :icon="['squat', 'bench', 'pull'][i]"
          :icon-accent="['accent-violet', 'accent-pink', 'accent-cyan'][i]" :pressed="demo.chip === i" @click="demo.chip = i">{{ n }}</CgChip>
      </div>
      <CgCard padding="s"><CgLineChart :points="chart" label="Exemple de courbe" /></CgCard>
    </section>

    <section class="stack">
      <CgSectionHeader title="Formulaires" caps />
      <div class="form-grid">
        <CgNumberField v-model="demo.weight" decimal label="Kg" :hide-label="false" />
        <CgNumberField v-model="demo.reps" label="Rép." :hide-label="false" />
      </div>
      <CgTextField v-model="demo.name" label="Texte" placeholder="Nom de l'exercice" />
      <CgSearchField v-model="demo.q" placeholder="Rechercher ou créer…" />
      <CgChipRow label="Filtre" compact>
        <CgChip v-for="f in ['Tous', 'Pectoraux', 'Dos', 'Épaules', 'Jambes']" :key="f" :pressed="demo.filter === f" @click="demo.filter = f">{{ f }}</CgChip>
      </CgChipRow>
      <CgSelect v-model="demo.day" label="Sélection" :options="[{ value: 1, label: 'Lundi' }, { value: 5, label: 'Vendredi' }]" />
      <CgColorPicker v-model="demo.color" />
      <div :class="`accent-${demo.color}`"><CgIconPicker v-model="demo.icon" /></div>
    </section>

    <section class="stack">
      <CgSectionHeader title="Icônes" caps />
      <div class="icons">
        <span v-for="(def, n) in EXERCISE_ICONS" :key="n" class="icons__item accent-violet" :title="n"><CgIconTile :icon="n" /></span>
      </div>
      <div class="icons">
        <span v-for="n in [...Object.keys(UI_ICONS), ...Object.keys(FILLED_ICONS)]" :key="n" class="icons__ui" :title="n"><CgIcon :name="n" /></span>
      </div>
    </section>

    <section class="stack">
      <CgSectionHeader title="Retours" caps />
      <div class="row row--wrap">
        <CgButton variant="secondary" @click="toast('Séance enregistrée', { tone: 'success' })">Toast succès</CgButton>
        <CgButton variant="secondary" @click="toast('Hors ligne', { tone: 'danger' })">Toast erreur</CgButton>
        <CgButton variant="secondary" @click="demo.dialog = true">Dialogue</CgButton>
      </div>
      <CgEmptyState title="État vide" text="Message d'aide quand une liste n'a pas encore de contenu." />
      <CgDialog :open="demo.dialog" title="Terminer la séance ?" description="12 séries validées." @close="demo.dialog = false">
        <template #actions>
          <CgButton variant="secondary" size="m" @click="demo.dialog = false">Continuer</CgButton>
          <CgButton size="m" @click="demo.dialog = false">Terminer</CgButton>
        </template>
      </CgDialog>
    </section>
  </main>
</template>

<style scoped>
.ds code { font-size: var(--fs-label); color: var(--color-text-muted); overflow-wrap: anywhere; }
.note { font-size: var(--fs-body-s); }
.swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--space-2); }
.swatch { display: grid; grid-template-columns: 32px 1fr; column-gap: var(--space-2); align-items: center; min-width: 0; }
.swatch__chip { grid-row: span 2; width: 32px; height: 32px; border-radius: var(--radius-s); border: var(--border-w) solid var(--color-border-strong); }
.swatch__name { font-size: var(--fs-body-s); font-weight: 600; }
.type-row { display: flex; flex-direction: column; gap: 2px; padding-bottom: var(--space-2); border-bottom: var(--border-w) solid var(--color-border); min-width: 0; }
.stats, .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.chips { display: flex; gap: var(--space-2); overflow-x: auto; scrollbar-width: none; }
.icons { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.icons__ui { width: var(--tap); height: var(--tap); display: flex; align-items: center; justify-content: center; border-radius: 12px; border: var(--border-w) solid var(--color-border); }
</style>
