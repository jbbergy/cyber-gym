<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthShell from '../components/AuthShell.vue'
import { CgButton, CgTextField } from '../ds'
import { api } from '../lib/api'
import { signedIn } from '../lib/auth'
import { safeRedirect } from '../router'

const route = useRoute()
const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref(null)
const busy = ref(false)
const isDev = import.meta.env.DEV

async function submit() {
  if (!email.value.trim() || !password.value) return (error.value = 'Renseigne ton e-mail et ton mot de passe')
  busy.value = true
  error.value = null
  try {
    await signedIn(await api.login(email.value, password.value))
    router.replace(safeRedirect(route.query.redirect))
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}

// Compte de test créé par le serveur hors production (voir README) — absent du build de production
function fillTestAccount() {
  if (import.meta.env.DEV) {
    email.value = 'test@cybergym.local'
    password.value = 'cybergym-test'
  }
}
</script>

<template>
  <AuthShell title="Connexion" subtitle="Retrouve tes programmes et ta progression." :error="error" @submit="submit">
    <CgTextField v-model="email" label="E-mail" type="email" autocomplete="username" :maxlength="254" required />
    <CgTextField v-model="password" label="Mot de passe" type="password" autocomplete="current-password" :maxlength="200" required />
    <CgButton type="submit" block :loading="busy">Se connecter</CgButton>
    <CgButton v-if="isDev" variant="secondary" size="s" block @click="fillTestAccount">Compte de test (local)</CgButton>
    <template #links>
      <RouterLink to="/mot-de-passe-oublie">Mot de passe oublié ?</RouterLink>
      <span class="t-muted">Pas encore de compte ? <strong><RouterLink to="/inscription">Créer un compte</RouterLink></strong></span>
    </template>
  </AuthShell>
</template>
