<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthShell from '../components/AuthShell.vue'
import { CgButton, CgTextField } from '../ds'
import { api } from '../lib/api'
import { signedIn } from '../lib/auth'
import { toast } from '../lib/toast'

const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')
const confirm = ref('')
const error = ref(null)
const busy = ref(false)

async function submit() {
  error.value = null
  if (!name.value.trim() || !email.value.trim()) return (error.value = 'Renseigne ton nom et ton e-mail')
  if (password.value.length < 8) return (error.value = 'Mot de passe : 8 caractères minimum')
  if (password.value !== confirm.value) return (error.value = 'Les deux mots de passe ne correspondent pas')
  busy.value = true
  try {
    const user = await api.register({ name: name.value, email: email.value, password: password.value })
    await signedIn(user)
    toast(`Bienvenue ${user.name} !`, { tone: 'success' })
    router.replace('/')
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell title="Créer un compte" subtitle="Un programme Push / Pull / Legs t'attend pour démarrer." :error="error" @submit="submit">
    <CgTextField v-model="name" label="Prénom ou pseudo" autocomplete="nickname" :maxlength="40" required />
    <CgTextField v-model="email" label="E-mail" type="email" autocomplete="email" :maxlength="254" required />
    <CgTextField v-model="password" label="Mot de passe (8 caractères min.)" type="password" autocomplete="new-password" :maxlength="200" required />
    <CgTextField v-model="confirm" label="Confirmer le mot de passe" type="password" autocomplete="new-password" :maxlength="200" required />
    <CgButton type="submit" block :loading="busy">Créer mon compte</CgButton>
    <template #links>
      <span class="t-muted">Déjà inscrit ? <strong><RouterLink to="/connexion">Se connecter</RouterLink></strong></span>
    </template>
  </AuthShell>
</template>
