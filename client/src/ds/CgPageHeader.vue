<script setup>
defineProps({
  eyebrow: { type: String, default: null },
  title: { type: String, required: true },
  subtitle: { type: String, default: null },
})
</script>

<template>
  <header class="cg-page-header">
    <div class="cg-page-header__top">
      <div class="cg-page-header__text">
        <div v-if="eyebrow" class="cg-page-header__eyebrow">{{ eyebrow }}</div>
        <h1 class="t-display cg-page-header__title">{{ title }}</h1>
      </div>
      <slot name="actions" />
    </div>
    <p v-if="subtitle" class="cg-page-header__subtitle">{{ subtitle }}</p>
  </header>
</template>

<style scoped>
.cg-page-header { display: flex; flex-direction: column; gap: 6px; }
.cg-page-header__top { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--space-3); }
.cg-page-header__text { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.cg-page-header__eyebrow {
  font-size: 0.8125rem;
  line-height: 16px;
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.cg-page-header__title { font-size: var(--fs-display-m); }
.cg-page-header__subtitle { font-size: var(--fs-body); line-height: 20px; color: var(--color-text-muted); }
</style>
