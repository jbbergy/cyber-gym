<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { CgButton, CgCard, CgPageHeader, CgSectionHeader, CgTextField } from '../ds'
import { api, network } from '../lib/api'
import { auth, logout, setUser } from '../lib/auth'
import { toast } from '../lib/toast'

const router = useRouter()

const name = ref(auth.user?.name ?? '')
const email = ref(auth.user?.email ?? '')
const savingProfile = ref(false)
const profileError = ref(null)

const current = ref('')
const next = ref('')
const confirm = ref('')
const savingPassword = ref(false)
const passwordError = ref(null)

const memberSince = auth.user?.createdAt
  ? new Date(auth.user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  : null

async function saveProfile() {
  profileError.value = null
  if (!name.value.trim() || !email.value.trim()) return (profileError.value = 'Nom et e-mail obligatoires')
  savingProfile.value = true
  try {
    setUser(await api.updateProfile({ name: name.value, email: email.value }))
    name.value = auth.user.name
    email.value = auth.user.email
    toast('Profil enregistré', { tone: 'success' })
  } catch (err) {
    profileError.value = err.message
  } finally {
    savingProfile.value = false
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
