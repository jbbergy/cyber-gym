<script setup>
import { ref, watch } from 'vue'
import { CgButton, CgDialog } from '../ds'
import { cardFileName, drawSessionCard, shareText } from '../lib/shareCard'
import { toast } from '../lib/toast'

/** Partage d'une séance terminée : aperçu de la carte, puis menu de partage natif ou enregistrement de l'image. */
const props = defineProps({
  open: Boolean,
  session: { type: Object, default: null },
  exercises: { type: Array, default: () => [] },
  kcal: { type: Number, default: null },
})
const emit = defineEmits(['close'])

/** data URL : la CSP de production n'autorise pas blob: pour les images */
const preview = ref(null)
const file = ref(null)
const sharing = ref(false)
const canShareFiles = ref(false)

watch(
  () => props.open,
  async (open) => {
    if (!open || !props.session) return
    preview.value = null
    file.value = null
    try {
      const canvas = await drawSessionCard(props)
      preview.value = canvas.toDataURL('image/png')
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      file.value = new File([blob], cardFileName(props.session), { type: 'image/png' })
      canShareFiles.value = !!navigator.canShare?.({ files: [file.value] })
    } catch (err) {
      toast(err, { tone: 'danger' })
      emit('close')
    }
  },
)

async function share() {
  sharing.value = true
  const text = shareText(props)
  // les toasts passent sous la boîte modale : on la ferme avant d'en afficher un
  const done = (message) => {
    emit('close')
    if (message) toast(message, { tone: 'success' })
  }
  try {
    if (canShareFiles.value) await navigator.share({ files: [file.value], text })
    else if (navigator.share) await navigator.share({ title: props.session.name, text })
    else {
      // ordinateur sans menu de partage : image prête à coller dans une messagerie
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': file.value })])
      return done('Image copiée : colle-la où tu veux')
    }
    done()
  } catch (err) {
    if (err.name === 'AbortError') return // partage annulé par l'utilisateur
    download()
    done('Image enregistrée')
  } finally {
    sharing.value = false
  }
}

function download() {
  const a = document.createElement('a')
  a.href = preview.value
  a.download = file.value.name
  a.click()
}
</script>

<template>
  <CgDialog :open="open" title="Partager" description="Une image de ta séance à envoyer ou publier où tu veux." @close="emit('close')">
    <div class="share-preview" :aria-busy="!preview">
      <img v-if="preview" :src="preview" :alt="`Carte de la séance ${session?.name}`" />
    </div>
    <template #actions>
      <CgButton variant="secondary" size="m" icon="download" :disabled="!preview" @click="download">Image</CgButton>
      <CgButton size="m" icon="share" :disabled="!preview" :loading="sharing" @click="share">Partager</CgButton>
    </template>
  </CgDialog>
</template>

<style scoped>
.share-preview {
  width: min(100%, 360px, calc((88dvh - 260px) * 0.8));
  aspect-ratio: 4 / 5;
  margin-inline: auto;
  border-radius: var(--radius-m);
  overflow: hidden;
  background: var(--color-surface);
}
.share-preview[aria-busy='true'] { animation: share-pulse 1.2s ease-in-out infinite alternate; }
.share-preview img { display: block; width: 100%; height: 100%; }
@keyframes share-pulse { to { opacity: 0.5; } }
</style>
