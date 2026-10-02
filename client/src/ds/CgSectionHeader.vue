<script setup>
defineProps({
  title: { type: String, required: true },
  /** texte d'appoint à droite (ex. « 2 séances sur 3 ») */
  aside: { type: String, default: null },
  /** variante sur-titre en capitales (listes groupées) */
  caps: Boolean,
  muted: Boolean,
  level: { type: String, default: 'h2' },
})
</script>

<template>
  <div class="cg-section-header">
    <component :is="level" class="cg-section-header__title" :class="{ 'is-caps': caps, 'is-muted': muted }">{{ title }}</component>
    <div v-if="aside || $slots.aside" class="cg-section-header__aside"><slot name="aside">{{ aside }}</slot></div>
  </div>
</template>

<style scoped>
.cg-section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  column-gap: var(--space-3);
}
.cg-section-header__title { margin: 0; font-size: var(--fs-body-l); line-height: 22px; font-weight: 700; }
.cg-section-header__title.is-caps { font-size: 0.8125rem; line-height: 20px; letter-spacing: var(--tracking-caps); text-transform: uppercase; }
.cg-section-header__title.is-muted { color: var(--color-text-muted); }
.cg-section-header__aside { font-size: var(--fs-body-s); line-height: 22px; font-weight: 600; color: var(--color-action); }
</style>
