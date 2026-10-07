import { computed, onBeforeUnmount, reactive, ref } from 'vue'

const KEY = 'cg.rest.v1'
let audio

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? null
  } catch {
    return null
  }
}

function beep() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)()
    const t = audio.currentTime
    for (const offset of [0, 0.22]) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, t + offset)
      gain.gain.exponentialRampToValueAtTime(0.25, t + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.16)
      osc.connect(gain).connect(audio.destination)
      osc.start(t + offset)
      osc.stop(t + offset + 0.18)
    }
  } catch {
    /* audio indisponible */
  }
}

/** préférence de l'appareil : lancer le repos automatiquement après chaque série validée */
const AUTO_KEY = 'cg.rest.auto'
export const restAutoStart = ref(readAuto())
function readAuto() {
  try {
    return localStorage.getItem(AUTO_KEY) !== '0'
  } catch {
    return true
  }
}
export function setRestAutoStart(on) {
  restAutoStart.value = on
  try {
    localStorage.setItem(AUTO_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/**
 * Minuteur de repos basé sur une heure de fin (et non un décompte) :
 * il reste juste après un rechargement ou une mise en veille du téléphone.
 */
export function useRestTimer(sessionId) {
  const saved = load()
  const state = reactive(saved?.sessionId === sessionId ? saved : { sessionId, endsAt: null, total: 0 })
  const now = ref(Date.now())
  const finishedAt = ref(0)

  const persist = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }

  const remaining = computed(() => (state.endsAt ? Math.max(0, Math.ceil((state.endsAt - now.value) / 1000)) : 0))
  const running = computed(() => remaining.value > 0)
  const justFinished = computed(() => now.value - finishedAt.value < 2500)

  const timer = setInterval(() => {
    now.value = Date.now()
    if (state.endsAt && now.value >= state.endsAt) {
      state.endsAt = null
      persist()
      finishedAt.value = now.value
      navigator.vibrate?.([200, 100, 200])
      beep()
    }
  }, 250)
  onBeforeUnmount(() => clearInterval(timer))

  return {
    remaining,
    running,
    justFinished,
    total: computed(() => state.total),
    start(seconds) {
      if (!seconds) return
      // créé pendant un geste utilisateur pour être autorisé à sonner plus tard
      try {
        audio ??= new (window.AudioContext || window.webkitAudioContext)()
        audio.resume?.()
      } catch {
        /* ignore */
      }
      state.total = seconds
      state.endsAt = Date.now() + seconds * 1000
      now.value = Date.now()
      persist()
    },
    add(seconds) {
      if (!state.endsAt) return
      state.endsAt += seconds * 1000
      state.total += seconds
      persist()
    },
    skip() {
      state.endsAt = null
      persist()
    },
    clear() {
      try {
        localStorage.removeItem(KEY)
      } catch {
        /* ignore */
      }
    },
  }
}
