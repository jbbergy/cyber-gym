<script setup>
import { CgCard, CgPageHeader } from '../ds'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: null },
  /** message d'erreur affiché au-dessus du formulaire */
  error: { type: String, default: null },
})
defineEmits(['submit'])
</script>

<template>
  <main class="page auth">
    <div class="auth__brand">
      <img src="/logo.svg" alt="" width="44" height="44" />
      <span class="t-display auth__name">Cyber Gym</span>
    </div>
    <CgPageHeader :title="title" :subtitle="subtitle" />
    <CgCard as="form" class="accent-violet" novalidate @submit.prevent="$emit('submit')">
      <p v-if="error" class="auth__error" role="alert">{{ error }}</p>
      <slot />
    </CgCard>
    <nav v-if="$slots.links" class="auth__links"><slot name="links" /></nav>
  </main>
</template>

<style scoped>
.auth { max-width: 440px; }
.auth__brand { display: flex; align-items: center; gap: var(--space-3); }
.auth__brand img { border-radius: 12px; }
.auth__name { font-size: 1.5rem; color: var(--color-text-muted); }
.auth__error {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgb(var(--rgb-pink) / 0.12);
  border: var(--border-w) solid rgb(var(--rgb-pink) / 0.5);
  color: var(--color-danger);
  font-size: var(--fs-body-s);
  font-weight: 600;
}
.auth__links { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); font-size: var(--fs-body-s); }
.auth__links :deep(a) { color: var(--color-text-muted); }
.auth__links :deep(a:hover) { color: var(--color-text); }
.auth__links :deep(strong a) { color: var(--color-primary); }
</style>
