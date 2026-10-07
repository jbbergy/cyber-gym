import { Router } from 'express'
import { HttpError, icon, oneOf, text, uuid } from '../http.js'
import { MUSCLES } from '../seed.js'

const SELECT = `
SELECT e.id, e.name, e.icon, e.muscle,
  (SELECT count(*)::int FROM session_exercises se WHERE se.exercise_id = e.id) AS uses,
  (SELECT count(*)::int FROM template_exercises te WHERE te.exercise_id = e.id) AS "inTemplates"
FROM exercises e
`

function parse(body = {}) {
  return {
    name: text(body.name, 'Nom', { min: 1, max: 60 }),
    icon: icon(body.icon ?? 'dumbbell'),
    muscle: oneOf(body.muscle ?? 'autre', 'Groupe musculaire', MUSCLES),
  }
}

export default function exercisesRouter(db) {
  const r = Router()

  async function getOne(userId, id) {
    const { rows } = await db.query(`${SELECT} WHERE e.id = $1 AND e.user_id = $2`, [id, userId])
    if (!rows[0]) throw new HttpError(404, 'Exercice introuvable')
    return rows[0]
  }

  r.get('/exercises', async (req, res) => {
    const { rows } = await db.query(`${SELECT} WHERE e.user_id = $1 ORDER BY e.name`, [req.user.id])
    res.json(rows)
  })

  // Création idempotente : un nom existant (casse ignorée) renvoie l'exercice existant
  r.post('/exercises', async (req, res) => {
    const ex = parse(req.body)
    const userId = req.user.id
    const existing = await db.query('SELECT id FROM exercises WHERE user_id = $1 AND lower(name) = lower($2)', [userId, ex.name])
    if (existing.rows[0]) return res.json(await getOne(userId, existing.rows[0].id))
    const { rows } = await db.query(
      'INSERT INTO exercises (user_id, name, icon, muscle) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, ex.name, ex.icon, ex.muscle],
    )
    res.status(201).json(await getOne(userId, rows[0].id))
  })

  r.put('/exercises/:id', async (req, res) => {
    const id = uuid(req.params.id)
    const ex = parse(req.body)
    const { rows } = await db.query(
      'UPDATE exercises SET name = $2, icon = $3, muscle = $4 WHERE id = $1 AND user_id = $5 RETURNING id',
      [id, ex.name, ex.icon, ex.muscle, req.user.id],
    )
    if (!rows[0]) throw new HttpError(404, 'Exercice introuvable')
    res.json(await getOne(req.user.id, id))
  })

  r.delete('/exercises/:id', async (req, res) => {
    const ex = await getOne(req.user.id, uuid(req.params.id))
    if (ex.uses || ex.inTemplates) {
      throw new HttpError(409, 'Exercice utilisé dans une séance ou un preset : suppression impossible')
    }
    await db.query('DELETE FROM exercises WHERE id = $1', [ex.id])
    res.status(204).end()
  })

  return r
}
