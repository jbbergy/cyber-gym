import { reactive } from 'vue'

export const toasts = reactive([])
let seq = 0

/** Message éphémère : toast('Séance enregistrée') ou toast(err, { tone: 'danger' }) */
export function toast(message, { tone = 'default', duration = 3200 } = {}) {
  const text = message instanceof Error ? message.message : String(message)
  const id = ++seq
  toasts.push({ id, text, tone })
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id)
    if (i !== -1) toasts.splice(i, 1)
  }, duration)
}
