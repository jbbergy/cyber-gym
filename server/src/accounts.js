import { hashPassword, isProd } from './auth.js'
import { seedUser } from './seed.js'

/**
 * Compte de test, créé au démarrage uniquement hors production (NODE_ENV ≠ production).
 * En production, la connexion à ce compte est refusée même s'il existait en base.
 */
export const DEV_ACCOUNT = { email: 'test@cybergym.local', password: 'cybergym-test', name: 'Testeur' }

/**
 * Compte qui reçoit les données créées avant l'arrivée des comptes (user_id NULL) :
 * OWNER_EMAIL, ou à défaut le compte de test en local.
 */
export function ownerEmail() {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase()
  return owner || (isProd ? null : DEV_ACCOUNT.email)
}

export const countOrphans = async (db) =>
  (await db.query(
    `SELECT ((SELECT count(*) FROM exercises WHERE user_id IS NULL)
           + (SELECT count(*) FROM templates WHERE user_id IS NULL)
           + (SELECT count(*) FROM sessions  WHERE user_id IS NULL))::int AS n`,
  )).rows[0].n > 0

/**
 * Rattache les données sans propriétaire au compte. Un exercice orphelin portant le
 * nom d'un exercice déjà présent dans le catalogue du compte est fusionné avec lui.
 */
export async function adoptOrphans(tx, userId) {
  const dup = `FROM exercises o JOIN exercises u ON u.user_id = $1 AND u.name = o.name WHERE o.user_id IS NULL`
  await tx.query(`UPDATE template_exercises x SET exercise_id = u.id ${dup} AND x.exercise_id = o.id`, [userId])
  await tx.query(`UPDATE session_exercises x SET exercise_id = u.id ${dup} AND x.exercise_id = o.id`, [userId])
  await tx.query(`DELETE FROM exercises o USING exercises u WHERE o.user_id IS NULL AND u.user_id = $1 AND u.name = o.name`, [userId])
  // une seule séance en cours par compte : on ne garde que la plus récente, et aucune si le compte en a déjà une
  await tx.query(
    `UPDATE sessions o SET ended_at = now()
     WHERE o.user_id IS NULL AND o.ended_at IS NULL
       AND (EXISTS (SELECT 1 FROM sessions WHERE user_id = $1 AND ended_at IS NULL)
         OR EXISTS (SELECT 1 FROM sessions n WHERE n.user_id IS NULL AND n.ended_at IS NULL AND n.started_at > o.started_at))`,
    [userId],
  )
  await tx.query('UPDATE exercises SET user_id = $1 WHERE user_id IS NULL', [userId])
  await tx.query(
    `UPDATE templates SET user_id = $1,
       position = position + (SELECT COALESCE(max(position) + 1, 0) FROM templates WHERE user_id = $1)
     WHERE user_id IS NULL`,
    [userId],
  )
  const { rows } = await tx.query('UPDATE sessions SET user_id = $1 WHERE user_id IS NULL RETURNING id', [userId])
  return rows.length
}

/**
 * Crée un compte. Le compte propriétaire récupère les données existantes ;
 * les autres partent du catalogue et du programme de départ.
 */
export async function createUser(db, { email, name, password }) {
  const passwordHash = await hashPassword(password)
  return db.tx(async (tx) => {
    const { rows } = await tx.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [email, name, passwordHash],
    )
    const userId = rows[0].id
    if (email === ownerEmail() && (await countOrphans(tx))) {
      const n = await adoptOrphans(tx, userId)
      console.log(`[auth] données existantes rattachées à ${email} (${n} séances)`)
    } else {
      await seedUser(tx, userId)
    }
    return userId
  })
}

/** Au démarrage : compte de test (local) et rattachement des données orphelines. */
export async function bootstrapAccounts(db) {
  if (!isProd) {
    const { rows } = await db.query('SELECT 1 FROM users WHERE lower(email) = $1', [DEV_ACCOUNT.email])
    if (!rows[0]) {
      await createUser(db, DEV_ACCOUNT)
      console.log(`[auth] compte de test créé : ${DEV_ACCOUNT.email} (voir README)`)
    }
  }
  if (!(await countOrphans(db))) return
  const owner = ownerEmail()
  const { rows } = owner ? await db.query('SELECT id FROM users WHERE lower(email) = $1', [owner]) : { rows: [] }
  if (rows[0]) {
    const n = await db.tx((tx) => adoptOrphans(tx, rows[0].id))
    console.log(`[auth] données existantes rattachées à ${owner} (${n} séances)`)
  } else {
    console.warn(
      owner
        ? `[auth] données sans propriétaire : elles seront rattachées au compte ${owner} dès sa création`
        : '[auth] données sans propriétaire : définir OWNER_EMAIL pour les rattacher à un compte',
    )
  }
}

export async function userIdOf(db, emailValue) {
  const { rows } = await db.query('SELECT id FROM users WHERE lower(email) = $1', [emailValue])
  return rows[0]?.id ?? null
}
