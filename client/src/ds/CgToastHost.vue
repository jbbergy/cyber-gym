<script setup>
import { toasts } from '../lib/toast'
</script>

<template>
  <div class="cg-toasts" role="status" aria-live="polite">
    <TransitionGroup name="cg-toast">
      <div v-for="t in toasts" :key="t.id" class="cg-toast" :class="`cg-toast--${t.tone}`">{{ t.text }}</div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.cg-toasts {
  position: fixed;
  z-index: 50;
  inset: auto 0 calc(var(--nav-h) + var(--safe-bottom) + var(--space-3));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding-inline: var(--gutter);
  pointer-events: none;
}
.cg-toast {
  max-width: min(100%, 420px);
  padding: 10px 16px;
  border-radius: var(--radius-m);
  background: var(--color-bg-raised);
  border: var(--border-w) solid var(--color-primary);
  box-shadow: 0 0 18px rgb(var(--rgb-primary) / 0.4);
  font-weight: 600;
  text-align: center;
}
.cg-toast--danger { border-color: var(--color-danger); box-shadow: 0 0 18px rgb(var(--rgb-pink) / 0.45); }
.cg-toast--success { border-color: var(--color-action); box-shadow: 0 0 18px rgb(var(--rgb-action) / 0.4); }
.cg-toast-enter-active, .cg-toast-leave-active { transition: all var(--dur) var(--ease-out); }
.cg-toast-enter-from, .cg-toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
