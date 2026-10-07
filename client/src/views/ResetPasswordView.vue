<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthShell from '../components/AuthShell.vue'
import { CgButton, CgTextField } from '../ds'
import { api } from '../lib/api'
import { signedIn } from '../lib/auth'
import { toast } from '../lib/toast'

const route = useRoute()
const router = useRouter()
const token = typeof route.query.token === 'string' ? route.query.token : ''
const password = ref('')
const confirm = ref('')
const error = ref(token ? null : 'Lien incomplet : ouvre le lien reçu par e-mail ou refais une demande.')
const busy = ref(false)

async function submit() {
  error.value = null
  if (password.value.length < 8) return (error.value = 'Mot de passe : 8 caractères minimum')
  if (password.value !== confirm.value) return (error.value = 'Les deux mots de passe ne correspondent pas')
  busy.value = true
  try {
    await signedIn(await api.resetPassword(token, password.value))
    toast('Mot de passe modifié', { tone: 'success' })
    router.replace('/')
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell title="Nouveau mot de passe" subtitle="Tes autres appareils seront déconnectés." :error="error" @submit="submit">
    <CgTextField v-model="password" label="Nouveau mot de passe (8 caractères min.)" type="password" autocomplete="new-password" :maxlength="200" required />
    <CgTextField v-model="confirm" label="Confirmer le mot de passe" type="password" autocomplete="new-password" :maxlength="200" required />
    <CgButton type="submit" block :loading="busy" :disabled="!token">Enregistrer</CgButton>
    <template #links>
      <RouterLink to="/mot-de-passe-oublie">Refaire une demande</RouterLink>
      <RouterLink to="/connexion">Retour à la connexion</RouterLink>
    </template>
  </AuthShell>
</template>
