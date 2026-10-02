const LOCALE = 'fr-FR'
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
export const WEEKDAYS_SHORT = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']

const nf = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })

/** 77.5 → « 77,5 » */
export const formatNumber = (n) => (n === null || n === undefined || n === '' ? '—' : nf.format(n))
/** 6420 → « 6 420 » */
export const formatInt = (n) => nf0.format(Math.round(n ?? 0))
export const formatKg = (n) => `${formatInt(n)} kg`

/** « 77,5 » ou « 77.5 » → 77.5 ; vide → null */
export function parseDecimal(value) {
  if (value === null || value === undefined) return null
  const s = String(value).replace(/\s/g, '').replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** ISO 1 = lundi … 7 = dimanche */
export const isoWeekday = (d) => ((new Date(d).getDay() + 6) % 7) + 1

export function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
export function startOfWeek(d = new Date()) {
  const x = startOfDay(d)
  x.setDate(x.getDate() - (isoWeekday(x) - 1))
  return x
}
export function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime()

/** « Vendredi 2 octobre » */
export const formatLongDate = (d) =>
  capitalize(new Date(d).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }))
/** « 30 sept. » */
export const formatShortDate = (d) => new Date(d).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })
/** « Mer. 30 sept. » */
export const formatDayDate = (d) =>
  capitalize(new Date(d).toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' }))
/** « 21 septembre » */
export const formatDayMonth = (d) => new Date(d).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' })
export const formatTime = (d) => new Date(d).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })

export function durationMinutes(start, end) {
  if (!start || !end) return 0
  return Math.max(1, Math.round((new Date(end) - new Date(start)) / 60000))
}

/** secondes → « 1:32 » / « 1:02:05 » */
export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** 90 → « 1 min 30 » */
export function formatRest(seconds) {
  if (!seconds) return 'sans repos'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (!m) return `${s} s`
  return s ? `${m} min ${s}` : `${m} min`
}

export const plural = (n, one, many = `${one}s`) => `${formatInt(n)} ${n > 1 ? many : one}`
