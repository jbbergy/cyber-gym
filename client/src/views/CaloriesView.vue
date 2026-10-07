<script setup>
import { computed } from 'vue'
import { CgButton, CgCard, CgIconButton, CgPageHeader, CgSectionHeader } from '../ds'
import { auth } from '../lib/auth'
import {
  MAX_REST_SECONDS, MET_EFFORT, MET_REST, SECONDS_PER_REP, ageOf, basalMetabolicRate, hasBodyProfile, setCalories,
} from '../lib/calories'
import { formatInt, formatNumber, formatRest } from '../lib/format'

// Exemple chiffré : le profil de l'utilisateur s'il est complet, sinon un profil type
const EXAMPLE_USER = { weightKg: 80, heightCm: 180, birthYear: new Date().getFullYear() - 35, sex: 'm' }
const personal = computed(() => hasBodyProfile(auth.user))
const user = computed(() => (personal.value ? auth.user : EXAMPLE_USER))
const age = computed(() => ageOf(user.value))
const constant = computed(() => (user.value.sex === 'm' ? 5 : user.value.sex === 'f' ? -161 : -78))
const bmr = computed(() => basalMetabolicRate(user.value))
const perMinute = computed(() => bmr.value / 1440)

const REPS = 10
const REST = 90
const effortMin = (REPS * SECONDS_PER_REP) / 60
const restMin = REST / 60
const kcal = computed(() => setCalories(user.value, { reps: REPS }, REST))
const sexLabel = computed(() => ({ m: 'homme', f: 'femme' })[user.value.sex] ?? 'sexe non précisé')
const fmt = (n, digits = 1) => formatNumber(Math.round(n * 10 ** digits) / 10 ** digits)
</script>

<template>
  <main class="page">
    <CgPageHeader eyebrow="Mon compte" title="Calcul des calories" subtitle="Comment l'appli estime l'énergie dépensée à chaque série.">
      <template #actions>
        <CgIconButton icon="chevron-left" label="Retour au profil" to="/profil" />
      </template>
    </CgPageHeader>

    <CgCard class="formula">
      <p class="t-label formula__label">La formule</p>
      <p class="t-num formula__text">kcal = métabolisme de base par minute × Σ (MET × minutes)</p>
      <p class="t-muted note">
        C'est la méthode des « équivalents métaboliques » (MET), utilisée par la plupart des montres et applis de sport,
        ajustée à ta morphologie grâce au métabolisme de base.
      </p>
    </CgCard>

    <section class="stack">
      <CgSectionHeader title="1 · Ton métabolisme de base" />
      <CgCard>
        <p class="text">
          C'est l'énergie que ton corps dépense au repos complet sur une journée. On l'estime avec la formule de
          <strong>Mifflin-St Jeor</strong>, la plus fiable des formules courantes :
        </p>
        <p class="t-num equation">10 × poids (kg) + 6,25 × taille (cm) − 5 × âge + constante</p>
        <p class="t-muted note">
          Constante : + 5 pour un homme, − 161 pour une femme, − 78 (la moyenne) si le sexe n'est pas précisé.
          Divisé par 1 440 minutes, on obtient la dépense au repos par minute.
        </p>
      </CgCard>
    </section>

    <section class="stack">
      <CgSectionHeader title="2 · L'intensité (MET)" />
      <CgCard>
        <p class="text">
          Un MET indique combien de fois plus d'énergie une activité demande par rapport au repos. Les valeurs viennent du
          <strong>Compendium des activités physiques</strong>, la référence scientifique en la matière.
        </p>
        <dl class="facts">
          <div class="facts__row">
            <dt>Effort pendant la série<span class="facts__hint">musculation, effort soutenu</span></dt>
            <dd class="t-num">{{ formatNumber(MET_EFFORT) }} MET</dd>
          </div>
          <div class="facts__row">
            <dt>Récupération entre les séries<span class="facts__hint">debout, cœur encore rapide</span></dt>
            <dd class="t-num">{{ formatNumber(MET_REST) }} MET</dd>
          </div>
        </dl>
      </CgCard>
    </section>

    <section class="stack">
      <CgSectionHeader title="3 · La durée de chaque série" />
      <CgCard>
        <dl class="facts">
          <div class="facts__row">
            <dt>Effort<span class="facts__hint">≈ 2 s de descente et 2 s de montée par répétition</span></dt>
            <dd class="t-num">{{ SECONDS_PER_REP }} s × répétitions</dd>
          </div>
          <div class="facts__row">
            <dt>Récupération<span class="facts__hint">repos réellement pris avant la série, mesuré entre deux validations</span></dt>
            <dd class="t-num">≤ {{ formatRest(MAX_REST_SECONDS) }}</dd>
          </div>
        </dl>
        <p class="t-muted note">
          Le repos est plafonné à {{ formatRest(MAX_REST_SECONDS) }} : au-delà, c'est une pause, plus de la récupération.
          La première série d'un exercice ne compte que son effort. En additionnant toutes les séries, on couvre ainsi la séance entière.
        </p>
      </CgCard>
    </section>

    <section class="stack">
      <CgSectionHeader :title="personal ? 'Exemple avec ton profil' : 'Exemple'" />
      <CgCard>
        <p class="text">
          {{ personal ? 'Toi' : 'Une personne' }} : {{ formatNumber(user.weightKg) }} kg, {{ user.heightCm }} cm, {{ age }} ans, {{ sexLabel }}.
          Série de {{ REPS }} répétitions après {{ formatRest(REST) }} de repos.
        </p>
        <ol class="steps">
          <li>
            Métabolisme de base :
            <span class="t-num">10 × {{ fmt(user.weightKg) }} + 6,25 × {{ user.heightCm }} − 5 × {{ age }} {{ constant < 0 ? '−' : '+' }} {{ Math.abs(constant) }}</span>
            = <strong class="t-num">{{ formatInt(bmr) }} kcal / jour</strong>, soit {{ fmt(perMinute, 2) }} kcal / min
          </li>
          <li>
            Effort : {{ REPS }} × {{ SECONDS_PER_REP }} s = {{ fmt(effortMin, 2) }} min × {{ formatNumber(MET_EFFORT) }} MET
            = <span class="t-num">{{ fmt(effortMin * MET_EFFORT, 2) }}</span>
          </li>
          <li>
            Récupération : {{ fmt(restMin, 2) }} min × {{ formatNumber(MET_REST) }} MET = <span class="t-num">{{ fmt(restMin * MET_REST, 2) }}</span>
          </li>
          <li>
            Total : {{ fmt(perMinute, 2) }} × ({{ fmt(effortMin * MET_EFFORT, 2) }} + {{ fmt(restMin * MET_REST, 2) }})
            = <strong class="t-num result">{{ fmt(kcal) }} kcal</strong>
          </li>
        </ol>
        <CgButton v-if="!personal" variant="outline" size="m" block class="accent-violet" to="/profil">
          Renseigner mon profil
        </CgButton>
      </CgCard>
    </section>

    <section class="stack">
      <CgSectionHeader title="Les limites" />
      <CgCard>
        <ul class="limits">
          <li>C'est une <strong>estimation</strong>, à ± 20 à 30 % : seule une mesure des échanges respiratoires serait exacte.</li>
          <li>La <strong>charge soulevée ne compte pas</strong> directement : à durée égale, 60 kg et 100 kg donnent le même résultat.</li>
          <li>L'énergie dépensée après la séance (récupération, « afterburn ») n'est pas incluse.</li>
          <li>Le tempo réel n'est pas mesuré : un mouvement très lent ou très explosif s'écarte de la moyenne.</li>
        </ul>
      </CgCard>
    </section>
  </main>
</template>

<style scoped>
.formula { gap: var(--space-2); }
.formula__label { margin: 0; letter-spacing: var(--tracking-caps); color: var(--color-text-muted); }
.formula__text { margin: 0; font-size: 1.25rem; line-height: 1.3; color: var(--color-action); }
.text { margin: 0; line-height: 1.5; }
.note { margin: 0; font-size: var(--fs-body-s); line-height: 1.45; }
.equation {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--radius-s);
  background: var(--color-bg);
  border: var(--border-w) solid var(--color-border);
  line-height: 1.4;
}

.facts { margin: 0; display: flex; flex-direction: column; }
.facts__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding: 10px 0;
  border-top: var(--border-w) solid var(--color-border);
}
.facts__row:first-child { border-top: 0; padding-top: 0; }
.facts dt { display: flex; flex-direction: column; gap: 2px; min-width: 0; font-weight: 600; }
.facts__hint { font-size: var(--fs-body-s); font-weight: 400; color: var(--color-text-muted); }
.facts dd { margin: 0; flex-shrink: 0; text-align: right; }

.steps, .limits { margin: 0; padding-left: 1.25em; display: flex; flex-direction: column; gap: var(--space-2); line-height: 1.5; }
.steps .t-num { overflow-wrap: anywhere; }
.result { color: var(--color-action); }
</style>
