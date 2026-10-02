<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { CgBottomNav, CgIcon, CgToastHost } from './ds'
import { network } from './lib/api'

const route = useRoute()
const showNav = computed(() => route.meta.nav !== false)
const NAV = [
  { to: '/', label: "Aujourd'hui", icon: 'bolt', match: '/seance' },
  { to: '/programmes', label: 'Programmes', icon: 'list', match: '/exercices' },
  { to: '/historique', label: 'Historique', icon: 'clock' },
  { to: '/progression', label: 'Progression', icon: 'trend' },
]
</script>

<template>
  <div v-if="!network.online || network.pending" class="offline-bar" role="status">
    <CgIcon name="cloud-off" :size="16" />
    <span v-if="!network.online">Hors ligne</span>
    <span v-if="network.pending">· {{ network.pending }} modification{{ network.pending > 1 ? 's' : '' }} en attente</span>
  </div>
  <RouterView v-slot="{ Component, route: r }">
    <component :is="Component" :key="r.path" />
  </RouterView>
  <CgBottomNav v-if="showNav" :items="NAV" />
  <CgToastHost />
</template>

<style scoped>
.offline-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: calc(var(--safe-top) + 6px) var(--gutter) 6px;
  background: rgb(var(--rgb-pink) / 0.15);
  border-bottom: var(--border-w) solid rgb(var(--rgb-pink) / 0.5);
  color: var(--color-danger);
  font-size: var(--fs-body-s);
  font-weight: 600;
  backdrop-filter: blur(10px);
}
</style>
