import { Router } from 'express'
import {
  PUBLIC_USER, burnPasswordCheck, email, endSession, hashPassword, isProd, newToken, password,
  rateLimit, requireUser, startSession, tokenHash, verifyPassword,
} from '../auth.js'
import { DEV_ACCOUNT, countOrphans, createUser, ownerEmail } from '../accounts.js'
import { HttpError, int, num, oneOf, text } from '../http.js'
import { mailConfigured, sendMail } from '../mail.js'

const RESET_MINUTES = 60

const name = (value) => text(value, 'Nom', { min: 1, max: 40 })

// Lien envoyé par e-mail : APP_URL en production, sinon l'origine du front (Vite en dev)
function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  return req.get('origin') || `${req.protocol}://${req.get('host')}`
}

export default function authRouter(db) {
  const r = Router()
  const strict = rateLimit({ max: 10, windowMs: 15 * 60_000 })

  async function getUser(id) {
    const { rows } = await db.query(`SELECT ${PUBLIC_USER} FROM users u WHERE u.id = $1`, [id])
    return rows[0]
  }

  r.post('/auth/register', strict, async (req, res) => {
    const body = req.body ?? {}
    const account = { email: email(body.email), name: name(body.name), password: password(body.password) }
    if (account.email === DEV_ACCOUNT.email) throw new HttpError(400, 'Adresse réservée')
    const exists = await db.query('SELECT 1 FROM users WHERE lower(email) = $1', [account.email])
    if (exists.rows[0]) throw new HttpError(409, 'Un compte existe déjà avec cette adresse')
    const userId = await createUser(db, account)
    await startSession(db, res, userId)
    res.status(201).json(await getUser(userId))
  })

  r.post('/auth/login', strict, async (req, res) => {
    const body = req.body ?? {}
    const login = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const pass = typeof body.password === 'string' ? body.password : ''
    const { rows } = await db.query('SELECT id, password_hash FROM users WHERE lower(email) = $1', [login])
    const user = rows[0]
    if (!user) await burnPasswordCheck(pass)
    const ok = user && !(isProd && login === DEV_ACCOUNT.email) && (await verifyPassword(pass, user.password_hash))
    if (!ok) throw new HttpError(401, 'E-mail ou mot de passe incorrect')
    await startSession(db, res, user.id)
    res.json(await getUser(user.id))
  })

  r.post('/auth/logout', async (req, res) => {
    await endSession(db, req, res)
    res.status(204).end()
  })

  // Réponse identique que le compte existe ou non (pas d'énumération des adresses)
  r.post('/auth/forgot', strict, async (req, res) => {
    const address = email(req.body?.email)
    const { rows } = await db.query('SELECT id, email FROM users WHERE lower(email) = $1', [address])
    const result = { ok: true }
    if (rows[0] && !(isProd && address === DEV_ACCOUNT.email)) {
      const token = newToken()
      await db.query(
        `INSERT INTO password_resets (token_hash, user_id, expires_at)
         VALUES ($1, $2, now() + make_interval(mins => $3))`,
        [tokenHash(token), rows[0].id, RESET_MINUTES],
      )
      const link = `${appUrl(req)}/mot-de-passe/nouveau?token=${token}`
      await sendMail({
        to: rows[0].email,
        subject: 'Cyber Gym — réinitialisation du mot de passe',
        text: `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvre ce lien (valable ${RESET_MINUTES} minutes) :\n${link}\n\nSi tu n'as rien demandé, ignore ce message.`,
      })
      // en local sans SMTP, le lien est renvoyé pour pouvoir tester le parcours
      if (!isProd && !mailConfigured()) result.devResetUrl = link
    }
    res.json(result)
  })

  r.post('/auth/reset', strict, async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token : ''
    const newPassword = password(req.body?.password)
    const passwordHash = await hashPassword(newPassword)
    const userId = await db.tx(async (tx) => {
      const { rows } = await tx.query(
        `UPDATE password_resets SET used_at = now()
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
         RETURNING user_id`,
        [tokenHash(token)],
      )
      if (!rows[0]) throw new HttpError(400, 'Lien invalide ou expiré : refais une demande')
      const id = rows[0].user_id
      await tx.query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [id, passwordHash])
      // toutes les sessions et autres liens en cours deviennent invalides
      await tx.query('DELETE FROM auth_sessions WHERE user_id = $1', [id])
      await tx.query('UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [id])
      return id
    })
    await startSession(db, res, userId)
    res.json(await getUser(userId))
  })

  r.get('/auth/me', requireUser, (req, res) => res.json(req.user))

  r.put('/auth/me', requireUser, async (req, res) => {
    const body = req.body ?? {}
    const address = email(body.email)
    if (address !== req.user.email.toLowerCase()) {
      // l'adresse propriétaire donne accès aux données existantes : non transférable tant qu'elles attendent
      const reserved = address === DEV_ACCOUNT.email || (address === ownerEmail() && (await countOrphans(db)))
      if (reserved) throw new HttpError(400, 'Adresse réservée')
    }
    const taken = await db.query('SELECT 1 FROM users WHERE lower(email) = $1 AND id <> $2', [address, req.user.id])
    if (taken.rows[0]) throw new HttpError(409, 'Un compte existe déjà avec cette adresse')
    const year = new Date().getFullYear()
    await db.query(
      `UPDATE users SET name = $2, email = $3, weight_kg = $4, height_cm = $5, birth_year = $6, sex = $7, updated_at = now()
       WHERE id = $1`,
      [
        req.user.id,
        name(body.name),
        address,
        num(body.weightKg, 'Poids', { min: 20, max: 400, nullable: true }),
        int(body.heightCm, 'Taille', { min: 100, max: 250, nullable: true }),
        int(body.birthYear, 'Année de naissance', { min: 1900, max: year - 10, nullable: true }),
        body.sex ? oneOf(body.sex, 'Sexe', ['m', 'f']) : null,
      ],
    )
    res.json(await getUser(req.user.id))
  })

  r.put('/auth/password', requireUser, strict, async (req, res) => {
    const body = req.body ?? {}
    const current = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const next = password(body.newPassword, 'Nouveau mot de passe')
    const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    if (!(await verifyPassword(current, rows[0].password_hash))) throw new HttpError(400, 'Mot de passe actuel incorrect')
    await db.query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [req.user.id, await hashPassword(next)])
    // déconnecte les autres appareils, garde une session fraîche sur celui-ci
    await db.query('DELETE FROM auth_sessions WHERE user_id = $1', [req.user.id])
    await startSession(db, res, req.user.id)
    res.status(204).end()
  })

  return r
}
