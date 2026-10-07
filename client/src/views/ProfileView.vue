<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CgButton, CgCard, CgNumberField, CgPageHeader, CgSectionHeader, CgSelect, CgTextField } from '../ds'
import { api, network } from '../lib/api'
import { auth, logout, setUser } from '../lib/auth'
import { ageOf, basalMetabolicRate } from '../lib/calories'
import { formatInt } from '../lib/format'
import { toast } from '../lib/toast'

const router = useRouter()

const name = ref(auth.user?.name ?? '')
const email = ref(auth.user?.email ?? '')
const savingProfile = ref(false)
const profileError = ref(null)

// Morphologie : sert à estimer les calories dépensées
const weightKg = ref(auth.user?.weightKg ?? null)
const heightCm = ref(auth.user?.heightCm ?? null)
const birthYear = ref(auth.user?.birthYear ?? null)
const sex = ref(auth.user?.sex ?? null)
const SEXES = [
  { value: null, label: 'Non précisé' },
  { value: 'f', label: 'Femme' },
  { value: 'm', label: 'Homme' },
]
const thisYear = new Date().getFullYear()
const age = computed(() => (birthYear.value >= 1900 && birthYear.value <= thisYear - 10 ? ageOf({ birthYear: birthYear.value }) : null))
const bmr = computed(() =>
  basalMetabolicRate({ weightKg: weightKg.value, heightCm: heightCm.value, birthYear: age.value === null ? null : birthYear.value, sex: sex.value }),
)
const savingBody = ref(false)
const bodyError = ref(null)

/** le serveur enregistre nom, e-mail et morphologie ensemble : chaque formulaire envoie ses champs + les valeurs enregistrées */
const saved = () => {
  const u = auth.user ?? {}
  return { name: u.name, email: u.email, weightKg: u.weightKg ?? null, heightCm: u.heightCm ?? null, birthYear: u.birthYear ?? null, sex: u.sex ?? null }
}

async function saveProfile() {
  profileError.value = null
  if (!name.value.trim() || !email.value.trim()) return (profileError.value = 'Nom et e-mail obligatoires')
  savingProfile.value = true
  try {
    setUser(await api.updateProfile({ ...saved(), name: name.value, email: email.value }))
    name.value = auth.user.name
    email.value = auth.user.email
    toast('Profil enregistré', { tone: 'success' })
  } catch (err) {
    profileError.value = err.message
  } finally {
    savingProfile.value = false
  }
}

async function saveBody() {
  bodyError.value = null
  if (weightKg.value !== null && (weightKg.value < 20 || weightKg.value > 400)) return (bodyError.value = 'Poids : entre 20 et 400 kg')
  if (heightCm.value !== null && (heightCm.value < 100 || heightCm.value > 250)) return (bodyError.value = 'Taille : entre 100 et 250 cm')
  if (birthYear.value !== null && age.value === null) return (bodyError.value = `Année de naissance : entre 1900 et ${thisYear - 10}`)
  savingBody.value = true
  try {
    const body = { weightKg: weightKg.value, heightCm: heightCm.value, birthYear: birthYear.value, sex: sex.value }
    setUser(await api.updateProfile({ ...saved(), ...body }))
    toast('Morphologie enregistrée', { tone: 'success' })
  } catch (err) {
    bodyError.value = err.message
  } finally {
    savingBody.value = false
  }
}

async function savePassword() {
  passwordError.value = null
  if (!current.value) return (passwordError.value = 'Renseigne ton mot de passe actuel')
  if (next.value.length < 8) return (passwordError.value = 'Nouveau mot de passe : 8 caractères minimum')
  if (next.value !== confirm.value) return (passwordError.value = 'Les deux mots de passe ne correspondent pas')
  savingPassword.value = true
  try {
    await api.changePassword(current.value, next.value)
    current.value = next.value = confirm.value = ''
    toast('Mot de passe modifié · autres appareils déconnectés', { tone: 'success' })
  } catch (err) {
    passwordError.value = err.message
  } finally {
    savingPassword.value = false
  }
}

async function signOut() {
  if (network.pending && !window.confirm(`${network.pending} modification(s) pas encore synchronisée(s) seront perdues. Se déconnecter quand même ?`)) return
  await logout()
  router.replace('/connexion')
}
</script>

<template>
  <main class="page">
    <CgPageHeader eyebrow="Mon compte" :title="auth.user?.name ?? 'Profil'" :subtitle="memberSince ? `Membre depuis ${memberSince}` : null" />

    <section class="stack">
      <CgSectionHeader title="Informations" />
      <CgCard as="form" novalidate @submit.prevent="saveProfile">
        <p v-if="profileError" class="form-error" role="alert">{{ profileError }}</p>
        <CgTextField v-model="name" label="Prénom ou pseudo" autocomplete="nickname" :maxlength="40" required />
        <CgTextField v-model="email" label="E-mail" type="email" autocomplete="email" :maxlength="254" required />
        <CgButton type="submit" variant="outline" size="m" block class="accent-violet" :loading="savingProfile">Enregistrer</CgButton>
      </CgCard>
    </section>

    <section class="stack">
      <CgSectionHeader title="Morphologie" />
      <CgCard as="form" novalidate @submit.prevent="saveBody">
        <p class="t-muted hint">
          Sert à estimer les calories dépensées à chaque série · <RouterLink to="/profil/calories">comment c'est calculé</RouterLink>
        </p>
        <p v-if="bodyError" class="form-error" role="alert">{{ bodyError }}</p>
        <div class="body-grid">
          <CgNumberField v-model="weightKg" label="Poids (kg)" :hide-label="false" decimal size="m" :min="0" :max="400" />
          <CgNumberField v-model="heightCm" label="Taille (cm)" :hide-label="false" size="m" :min="0" :max="250" />
          <CgNumberField v-model="birthYear" label="Année de naissance" :hide-label="false" size="m" :min="0" :max="thisYear" />
          <CgSelect v-model="sex" label="Sexe" :options="SEXES" />
        </div>
        <p v-if="bmr" class="t-muted hint">
          <template v-if="age !== null">{{ age }} ans · </template>métabolisme de base ≈ <strong class="t-num">{{ formatInt(bmr) }} kcal</strong> / jour
        </p>
        <CgButton type="submit" variant="outline" size="m" block class="accent-violet" :loading="savingBody">Enregistrer</CgButton>
      </CgCard>
    </section>

    <section class="stack">
      <CgSectionHeader title="Mot de passe" />
      <CgCard as="form" novalidate @submit.prevent="savePassword">
        <!-- champ caché : aide les gestionnaires de mots de passe à associer le compte -->
        <input class="sr-only" type="email" autocomplete="username" :value="auth.user?.email" tabindex="-1" aria-hidden="true" readonly />
        <p v-if="passwordError" class="form-error" role="alert">{{ passwordError }}</p>
        <CgTextField v-model="current" label="Mot de passe actuel" type="password" autocomplete="current-password" :maxlength="200" required />
        <CgTextField v-model="next" label="Nouveau mot de passe (8 caractères min.)" type="password" autocomplete="new-password" :maxlength="200" required />
        <CgTextField v-model="confirm" label="Confirmer le nouveau mot de passe" type="password" autocomplete="new-password" :maxlength="200" required />
        <CgButton type="submit" variant="outline" size="m" block class="accent-violet" :loading="savingPassword">Changer le mot de passe</CgButton>
      </CgCard>
    </section>

    <CgButton variant="danger" size="m" icon="logout" block @click="signOut">Se déconnecter</CgButton>
  </main>
</template>

<style scoped>
.hint { margin: 0; font-size: var(--fs-body-s); line-height: 1.45; }
.hint strong { color: var(--color-text); }
.hint a { color: var(--color-action); }
.body-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); align-items: end; }
.form-error {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgb(var(--rgb-pink) / 0.12);
  border: var(--border-w) solid rgb(var(--rgb-pink) / 0.5);
  color: var(--color-danger);
  font-size: var(--fs-body-s);
  font-weight: 600;
}
</style>
