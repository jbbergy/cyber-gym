<script setup>
import { useRoute } from 'vue-router'
import CgIcon from './CgIcon.vue'

defineProps({
  /** [{ to, label, icon, match?: string | string[] }] */
  items: { type: Array, required: true },
})
const route = useRoute()
/** item.match : préfixe(s) de route supplémentaires qui activent l'onglet */
const isActive = (item) =>
  [item.to, ...[].concat(item.match ?? [])].some((p) => (p === '/' ? route.path === '/' : route.path.startsWith(p)))
</script>

<template>
  <nav class="cg-nav" aria-label="Navigation principale">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="cg-nav__item"
      :aria-current="isActive(item) ? 'page' : undefined"
    >
      <CgIcon :name="item.icon" :size="24" />
      <span class="cg-nav__label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.cg-nav {
  /* élément du shell (pas position: fixed) : immobile pendant le défilement */
  flex-shrink: 0;
  position: relative;
  z-index: 20;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  height: calc(var(--nav-h) + var(--safe-bottom));
  padding: 6px calc(var(--space-2) + var(--safe-right)) var(--safe-bottom) calc(var(--space-2) + var(--safe-left));
  background: var(--color-bg-raised);
  border-top: var(--border-w) solid var(--color-border);
}
.cg-nav__item {
  flex: 1;
  max-width: 130px;
  min-width: 0;
  min-height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  border-radius: var(--radius-m);
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: var(--fs-micro);
  font-weight: 600;
  letter-spacing: 0.02em;
}
.cg-nav__item:hover { color: var(--color-text); }
.cg-nav__item[aria-current='page'] { color: var(--color-action); font-weight: 700; }
.cg-nav__item[aria-current='page'] .cg-icon { filter: drop-shadow(0 0 6px rgb(var(--rgb-action) / 0.7)); }
.cg-nav__label { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* très petits écrans (≤ 300px) : libellés compactés */
@media (max-width: 300px) {
  .cg-nav { padding-inline: 2px; }
  .cg-nav__label { font-size: 10px; letter-spacing: 0; }
}
</style>
