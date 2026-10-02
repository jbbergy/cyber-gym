import { reactive } from 'vue'

/**
 * Client HTTP + file d'attente hors-ligne.
 * Les écritures « rejouables » (séries, fin de séance) partent dans une file
 * persistée en localStorage quand le réseau manque, puis sont rejouées dans
 * l'ordre au retour de la connexion. Elles sont idempotentes côté serveur
 * (PUT avec id généré par le client), donc un rejeu en double est sans risque.
 */

const OUTBOX_KEY = 'cg.outbox.v1'

export const network = reactive({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: readOutbox().length,
  syncing: false,
})

/** erreur réseau ou passerelle (API coupée derrière un proxy) : on réessaiera */
const isTransient = (err) => err.status === 0 || err.status >= 502

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

function readOutbox() {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]')
  } catch {
    return []
  }
}
function writeOutbox(list) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(list))
  } catch {
    /* stockage plein ou bloqué : tant pis, on garde en mémoire */
  }
  network.pending = list.length
}

async function send(method, url, body) {
  let res
  try {
    res = await fetch(`/api${url}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    network.online = false
    throw new ApiError(0, 'Hors ligne', { cause: err })
  }
  network.online = navigator.onLine // une réponse peut venir du cache du service worker
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message = data?.error || (res.status >= 502 ? 'Serveur injoignable' : `Erreur ${res.status}`)
    throw new ApiError(res.status, message, data)
  }
  return data
}

export async function flushOutbox() {
  if (network.syncing) return
  let list = readOutbox()
  if (!list.length) return
  network.syncing = true
  try {
    while (list.length) {
      const op = list[0]
      try {
        await send(op.method, op.url, op.body)
      } catch (err) {
        if (isTransient(err)) break // toujours injoignable : on réessaiera plus tard
        console.warn('[outbox] opération abandonnée', op, err) // 4xx : invalide, on la jette
      }
      list = readOutbox().slice(1)
      writeOutbox(list)
    }
  } finally {
    network.syncing = false
  }
}

/** Écriture rejouable : si le réseau manque, mise en file et résolution optimiste. */
async function queued(method, url, body) {
  if (readOutbox().length) {
    // préserver l'ordre : on passe derrière les opérations déjà en attente
    writeOutbox([...readOutbox(), { method, url, body }])
    flushOutbox()
    return { queued: true }
  }
  try {
    return await send(method, url, body)
  } catch (err) {
    if (!isTransient(err)) throw err
    writeOutbox([...readOutbox(), { method, url, body }])
    return { queued: true }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    network.online = true
    flushOutbox()
  })
  window.addEventListener('offline', () => (network.online = false))
  // l'API peut revenir sans événement « online » (serveur redémarré) : nouvel essai régulier
  setInterval(() => network.pending && flushOutbox(), 20000)
}

export const api = {
  health: () => send('GET', '/health'),

  exercises: () => send('GET', '/exercises'),
  createExercise: (body) => send('POST', '/exercises', body),
  updateExercise: (id, body) => send('PUT', `/exercises/${id}`, body),
  deleteExercise: (id) => send('DELETE', `/exercises/${id}`),
  templates: () => send('GET', '/templates'),
  template: (id) => send('GET', `/templates/${id}`),
  createTemplate: (body) => send('POST', '/templates', body),
  updateTemplate: (id, body) => send('PUT', `/templates/${id}`, body),
  deleteTemplate: (id) => send('DELETE', `/templates/${id}`),
  duplicateTemplate: (id) => send('POST', `/templates/${id}/duplicate`),
  templateFromSession: (sessionId, name) => send('POST', `/sessions/${sessionId}/template`, name ? { name } : {}),

  sessions: ({ from, to, limit } = {}) => {
    const q = new URLSearchParams()
    if (from) q.set('from', new Date(from).toISOString())
    if (to) q.set('to', new Date(to).toISOString())
    if (limit) q.set('limit', limit)
    return send('GET', `/sessions?${q}`)
  },
  activeSession: () => send('GET', '/sessions/active'),
  session: (id) => send('GET', `/sessions/${id}`),
  startSession: (templateId) => send('POST', '/sessions', { templateId }),
  /** séance libre : exercises = [{ exerciseId, sets, reps, restSeconds }] */
  startFreeSession: (exercises, name) => send('POST', '/sessions', { exercises, name }),
  addSessionExercise: (sessionId, body) => send('POST', `/sessions/${sessionId}/exercises`, body),
  deleteSessionExercise: (id) => queued('DELETE', `/session-exercises/${id}`),
  finishSession: (id, endedAt = new Date().toISOString()) => queued('PATCH', `/sessions/${id}`, { endedAt }),
  deleteSession: (id) => send('DELETE', `/sessions/${id}`),

  saveSet: (set) =>
    queued('PUT', `/sets/${set.id}`, {
      sessionExerciseId: set.sessionExerciseId,
      setNumber: set.setNumber,
      weight: set.weight,
      reps: set.reps,
      done: Boolean(set.doneAt),
      doneAt: set.doneAt,
    }),
  deleteSet: (id) => queued('DELETE', `/sets/${id}`),

  progression: () => send('GET', '/progression'),
  exerciseProgression: (id, limit = 12) => send('GET', `/progression/${id}?limit=${limit}`),
}

export const hasPendingWrites = () => readOutbox().length > 0
