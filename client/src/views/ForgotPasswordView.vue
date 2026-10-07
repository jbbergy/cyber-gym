<script setup>
import { ref } from 'vue'
import AuthShell from '../components/AuthShell.vue'
import { CgButton, CgTextField } from '../ds'
import { api } from '../lib/api'

const email = ref('')
const error = ref(null)
const busy = ref(false)
const sent = ref(false)
const devLink = ref(null)

async function submit() {
  if (!email.value.trim()) return (error.value = 'Renseigne ton e-mail')
  busy.value = true
  error.value = null
  try {
    const res = await api.forgotPassword(email.value)
    sent.value = true
    // en local sans SMTP, l'API renvoie directement le lien
    devLink.value = res?.devResetUrl ? new URL(res.devResetUrl).pathname + new URL(res.devResetUrl).search : null
  } catch (err) {
    error.value = err.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AuthShell
    title="Mot de passe oublié"
    subtitle="Indique l'e-mail de ton compte : on t'envoie un lien pour choisir un nouveau mot de passe."
    :error="error"
    @submit="submit"
  >
    <template v-if="sent">
      <p class="sent" role="status">
        Si un compte existe pour <strong>{{ email.trim() }}</strong>, un e-mail vient de partir. Le lien est valable 1 heure.
      </p>
      <CgButton v-if="devLink" variant="outline" size="s" block :to="devLink">Ouvrir le lien (local)</CgButton>
      <CgButton variant="secondary" size="s" block @click="sent = false">Renvoyer</CgButton>
    </template>
    <template v-else>
      <CgTextField v-model="email" label="E-mail" type="email" autocomplete="email" :maxlength="254" required />
      <CgButton type="submit" block :loading="busy">Envoyer le lien</CgButton>
    </template>
    <template #links>
      <RouterLink to="/connexion">Retour à la connexion</RouterLink>
    </template>
  </AuthShell>
</template>

<style scoped>
.sent { font-size: var(--fs-body); line-height: 1.4; color: var(--color-text-muted); }
.sent strong { color: var(--color-text); overflow-wrap: anywhere; }
</style>
