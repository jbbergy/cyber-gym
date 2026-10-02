<script setup>
import { nextTick, ref, watch } from 'vue'

const props = defineProps({
  open: Boolean,
  title: { type: String, required: true },
  description: { type: String, default: null },
})
const emit = defineEmits(['close'])
const el = ref(null)

watch(
  () => props.open,
  async (open) => {
    await nextTick()
    if (!el.value) return
    if (open && !el.value.open) el.value.showModal()
    if (!open && el.value.open) el.value.close()
  },
  { immediate: true },
)

// clic sur le fond = fermeture
function onClick(e) {
  if (e.target === el.value) emit('close')
}
</script>

<template>
  <dialog ref="el" class="cg-dialog" aria-labelledby="cg-dialog-title" @close="emit('close')" @click="onClick">
    <div class="cg-dialog__panel">
      <div class="cg-dialog__head">
        <h2 id="cg-dialog-title" class="t-display cg-dialog__title">{{ title }}</h2>
        <p v-if="description" class="cg-dialog__desc">{{ description }}</p>
        <slot name="header" />
      </div>
      <div v-if="$slots.default" class="cg-dialog__body"><slot /></div>
      <div v-if="$slots.actions" class="cg-dialog__actions"><slot name="actions" /></div>
    </div>
  </dialog>
</template>

<style scoped>
.cg-dialog {
  width: 100%;
  max-width: var(--content-max);
  height: auto;
  max-height: 88dvh;
  margin: auto auto 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text);
}
.cg-dialog::backdrop { background: rgb(8 6 13 / 0.72); backdrop-filter: blur(4px); }
.cg-dialog[open] { animation: cg-sheet-in var(--dur) var(--ease-out); }
.cg-dialog__panel {
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 4vw, 16px);
  max-height: 88dvh;
  padding: var(--space-5) calc(var(--gutter) + var(--safe-right)) calc(var(--space-5) + var(--safe-bottom)) calc(var(--gutter) + var(--safe-left));
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  background: var(--color-bg-raised);
  border: var(--border-w) solid var(--color-border);
  border-bottom: 0;
}
.cg-dialog__head { display: flex; flex-direction: column; gap: var(--space-3); flex-shrink: 0; }
.cg-dialog__body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; margin-inline: -4px; padding-inline: 4px; }
.cg-dialog__title { font-size: clamp(1.5rem, 8vw, 2.25rem); }
.cg-dialog__desc { color: var(--color-text-muted); }
.cg-dialog__actions { display: flex; flex-wrap: wrap; gap: var(--space-2); flex-shrink: 0; }
.cg-dialog__actions > :deep(*) { flex: 1 1 100px; }
/* le bouton principal passe sur sa propre ligne plutôt que d'être tronqué (écrans étroits) */
.cg-dialog__actions > :deep(.cg-btn--primary) { flex: 2 1 150px; }
@media (min-width: 600px) {
  .cg-dialog { margin: auto; }
  .cg-dialog__panel { border-radius: var(--radius-xl); border-bottom: var(--border-w) solid var(--color-border); }
}
@keyframes cg-sheet-in { from { transform: translateY(24px); opacity: 0; } }
</style>
