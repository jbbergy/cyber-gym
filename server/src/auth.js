import crypto from 'node:crypto'
import { promisify } from 'node:util'
import { HttpError } from './http.js'

const scrypt = promisify(crypto.scrypt)

export const isProd = process.env.NODE_ENV === 'production'
export const COOKIE = 'cg_session'
export const SESSION_DAYS = 90 // PWA ouverte à la salle : on évite de redemander le mot de passe
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 }

// ── Mots de passe (scrypt natif, sel aléatoire) ─────────────────
// Format stocké : scrypt$N$r$p$sel$empreinte (base64url)
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p })
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), key.toString('base64url')].join('$')
}

export async function verifyPassword(password, stored) {
  const [algo, N, r, p, salt, hash] = String(stored).split('$')
  if (algo !== 'scrypt') return false
  const expected = Buffer.from(hash, 'base64url')
  const key = await scrypt(password, Buffer.from(salt, 'base64url'), expected.length, { N: +N, r: +r, p: +p })
  return crypto.timingSafeEqual(key, expected)
}

// Empreinte fixe pour garder un temps de réponse constant quand l'e-mail est inconnu
let dummyHash
export async function burnPasswordCheck(password) {
  dummyHash ??= await hashPassword('cyber-gym-dummy-password')
  await verifyPassword(password, dummyHash)
}

// ── Jetons opaques (cookie de session, lien de réinitialisation) ─
export const newToken = () => crypto.randomBytes(32).toString('base64url')
export const tokenHash = (token) => crypto.createHash('sha256').update(String(token)).digest('hex')

// ── Validation des champs de compte ─────────────────────────────
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function email(value) {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!EMAIL.test(v) || v.length > 254) throw new HttpError(400, 'Adresse e-mail invalide')
  return v
}

export function password(value, field = 'Mot de passe') {
  if (typeof value !== 'string' || value.length < 8) throw new HttpError(400, `${field} : 8 caractères minimum`)
  if (value.length > 200) throw new HttpError(400, `${field} : 200 caractères maximum`)
  return value
}

// ── Cookie de session ───────────────────────────────────────────
export function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i !== -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return null
}

function setCookie(res, value, maxAgeSeconds) {
  const attrs = [`${COOKIE}=${value}`, 'Path=/api', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`]
  if (isProd) attrs.push('Secure')
  res.append('Set-Cookie', attrs.join('; '))
}

/** Ouvre une session pour l'utilisateur et pose le cookie. */
export async function startSession(db, res, userId) {
  const token = newToken()
  await db.query(
    `INSERT INTO auth_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [tokenHash(token), userId, SESSION_DAYS],
  )
  setCookie(res, token, SESSION_DAYS * 86400)
}

export async function endSession(db, req, res) {
  const token = readCookie(req, COOKIE)
  if (token) await db.query('DELETE FROM auth_sessions WHERE token_hash = $1', [tokenHash(token)])
  setCookie(res, '', 0)
}

export const PUBLIC_USER = 'u.id, u.email, u.name, u.created_at AS "createdAt"'

/** Middleware : charge req.user depuis le cookie (sans l'exiger). */
export function loadUser(db) {
  return async (req, _res, next) => {
    const token = readCookie(req, COOKIE)
    if (!token) return next()
    const { rows } = await db.query(
      `UPDATE auth_sessions s SET last_seen_at = now()
       FROM users u
       WHERE s.token_hash = $1 AND s.expires_at > now() AND u.id = s.user_id
       RETURNING ${PUBLIC_USER}`,
      [tokenHash(token)],
    )
    req.user = rows[0] ?? null
    next()
  }
}

export function requireUser(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Connexion requise'))
  next()
}

/**
 * Limiteur en mémoire par IP + clé (connexion, inscription, oubli) :
 * `max` tentatives par fenêtre de `windowMs`.
 */
export function rateLimit({ max, windowMs }) {
  const hits = new Map()
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k)
  }, windowMs).unref()
  return (req, _res, next) => {
    const key = `${req.ip}|${req.path}`
    const now = Date.now()
    const entry = hits.get(key)
    if (!entry || entry.reset < now) hits.set(key, { count: 1, reset: now + windowMs })
    else if (++entry.count > max) return next(new HttpError(429, 'Trop de tentatives, réessaie dans quelques minutes'))
    next()
  }
}
