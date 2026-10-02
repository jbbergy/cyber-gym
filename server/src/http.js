export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

export const COLORS = ['violet', 'pink', 'cyan', 'green', 'yellow']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ICON = /^[a-z][a-z-]{0,23}$/

export function uuid(value, field = 'id') {
  if (typeof value !== 'string' || !UUID.test(value)) throw new HttpError(400, `${field} invalide`)
  return value
}

export function text(value, field, { min = 0, max = 80 } = {}) {
  const v = typeof value === 'string' ? value.trim() : ''
  if (v.length < min || v.length > max) throw new HttpError(400, `${field} : ${min} à ${max} caractères`)
  return v
}

export function int(value, field, { min = 0, max = 10000, nullable = false } = {}) {
  if (nullable && (value === null || value === undefined || value === '')) return null
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${field} : entier entre ${min} et ${max}`)
  return n
}

export function num(value, field, { min = 0, max = 10000, nullable = false } = {}) {
  if (nullable && (value === null || value === undefined || value === '')) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${field} : nombre entre ${min} et ${max}`)
  return Math.round(n * 100) / 100
}

export function oneOf(value, field, list) {
  if (!list.includes(value)) throw new HttpError(400, `${field} invalide`)
  return value
}

export function icon(value) {
  if (typeof value !== 'string' || !ICON.test(value)) throw new HttpError(400, 'icône invalide')
  return value
}

export function date(value, field, { nullable = true } = {}) {
  if (nullable && (value === null || value === undefined || value === '')) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new HttpError(400, `${field} : date invalide`)
  return d.toISOString()
}
