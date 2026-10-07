import { reactive } from 'vue'
import { api, clearOutbox, flushOutbox, setUnauthorizedHandler } from './api'

/**
 * Compte connecté. La session est un cookie httpOnly posé par l'API ; on garde
 * en plus le dernier utilisateur connu en localStorage pour démarrer hors ligne.
 */
const USER_KEY = 'cg.user.v1'
// survit à l'expiration de session : la file hors-ligne n'est rejouée que pour le même compte
const LAST_ID_KEY = 'cg.lastUserId'

export const auth = reactive({ user: readUser(), checked: false })

function readUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function setUser(user) {
  auth.user = user
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      localStorage.setItem(LAST_ID_KEY, user.id)
    } else localStorage.removeItem(USER_KEY)
  } catch {
    /* stockage bloqué : la session reste valable via le cookie */
  }
}

/** Réponses d'API en cache (service worker) : elles appartiennent au compte précédent. */
async function clearApiCache() {
  try {
    if ('caches' in window) await caches.delete('api')
  } catch {
    /* pas de cache disponible */
  }
}

let checking
/** Vérifie la session auprès de l'API (une fois au démarrage). Hors ligne : on garde l'utilisateur connu. */
export function checkSession() {
  checking ??= api
    .me()
    .then((user) => setUser(user))
    .catch((err) => {
      if (err.status === 401) setUser(null)
    })
    .finally(() => (auth.checked = true))
  return checking
}

/** Après connexion, inscription ou réinitialisation */
export async function signedIn(user) {
  let lastId = null
  try {
    lastId = localStorage.getItem(LAST_ID_KEY)
  } catch {
    /* stockage bloqué */
  }
  if (lastId && lastId !== user.id) {
    clearOutbox()
    await clearApiCache()
  }
  setUser(user)
  auth.checked = true
  flushOutbox()
}

export async function logout() {
  try {
    await api.logout()
  } catch {
    /* hors ligne : on oublie la session côté appareil malgré tout */
  }
  clearOutbox()
  await clearApiCache()
  setUser(null)
}

// Session expirée ou révoquée (mot de passe changé ailleurs) : retour à l'écran de connexion
let onExpired = () => {}
export const setExpiredHandler = (fn) => (onExpired = fn)
setUnauthorizedHandler(() => {
  if (!auth.user) return
  setUser(null)
  clearApiCache()
  onExpired()
})
