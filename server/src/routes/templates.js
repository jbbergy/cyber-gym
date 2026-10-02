import { Router } from 'express'
import { COLORS, HttpError, icon, int, oneOf, text, uuid } from '../http.js'

const LIST_SQL = `
SELECT t.id, t.name, t.muscles, t.color, t.icon, t.weekday, t.position,
  COALESCE(
    json_agg(json_build_object(
      'id', te.id, 'exerciseId', e.id, 'name', e.name, 'icon', e.icon, 'muscle', e.muscle,
      'sets', te.sets, 'reps', te.reps, 'restSeconds', te.rest_seconds
    ) ORDER BY te.position) FILTER (WHERE te.id IS NOT NULL),
    '[]'
  ) AS exercises
FROM templates t
LEFT JOIN template_exercises te ON te.template_id = t.id
LEFT JOIN exercises e ON e.id = te.exercise_id
`

function parseTemplate(body = {}) {
  const exercises = Array.isArray(body.exercises) ? body.exercises : []
  if (exercises.length > 30) throw new HttpError(400, '30 exercices maximum')
  return {
    name: text(body.name, 'Nom', { min: 1, max: 40 }),
    muscles: text(body.muscles ?? '', 'Muscles', { max: 80 }),
    color: oneOf(body.color ?? 'violet', 'Couleur', COLORS),
    icon: icon(body.icon ?? 'dumbbell'),
    weekday: int(body.weekday, 'Jour', { min: 1, max: 7, nullable: true }),
    exercises: exercises.map((ex, i) => ({
      // un exercice du catalogue (exerciseId) ou, à défaut, un nom (créé si inconnu)
      exerciseId: ex?.exerciseId ? uuid(ex.exerciseId, `Exercice ${i + 1}`) : null,
      name: ex?.exerciseId ? null : text(ex?.name, `Exercice ${i + 1}`, { min: 1, max: 60 }),
      sets: int(ex?.sets, 'Séries', { min: 1, max: 20 }),
      reps: int(ex?.reps, 'Répétitions', { min: 1, max: 100 }),
      restSeconds: int(ex?.restSeconds ?? 120, 'Repos', { min: 0, max: 900 }),
    })),
  }
}

export async function writeTemplateExercises(tx, templateId, exercises, fallbackIcon) {
  await tx.query('DELETE FROM template_exercises WHERE template_id = $1', [templateId])
  for (const [position, ex] of exercises.entries()) {
    let exerciseId = ex.exerciseId
    if (!exerciseId) {
      const { rows } = await tx.query(
        `INSERT INTO exercises (name, icon) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [ex.name, fallbackIcon],
      )
      exerciseId = rows[0].id
    }
    const { rows } = await tx.query(
      `INSERT INTO template_exercises (template_id, exercise_id, position, sets, reps, rest_seconds)
       SELECT $1, e.id, $3, $4, $5, $6 FROM exercises e WHERE e.id = $2
       RETURNING id`,
      [templateId, exerciseId, position, ex.sets, ex.reps, ex.restSeconds],
    )
    if (!rows[0]) throw new HttpError(400, `Exercice ${position + 1} introuvable dans le catalogue`)
  }
}

async function insertTemplate(tx, t) {
  const { rows } = await tx.query(
    `INSERT INTO templates (name, muscles, color, icon, weekday, position)
     VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(max(position) + 1, 0) FROM templates))
     RETURNING id`,
    [t.name, t.muscles, t.color, t.icon, t.weekday],
  )
  await writeTemplateExercises(tx, rows[0].id, t.exercises, t.icon)
  return rows[0].id
}

export default function templatesRouter(db) {
  const r = Router()

  async function getOne(id) {
    const { rows } = await db.query(`${LIST_SQL} WHERE t.id = $1 GROUP BY t.id`, [id])
    if (!rows[0]) throw new HttpError(404, 'Séance type introuvable')
    return rows[0]
  }

  r.get('/templates', async (_req, res) => {
    const { rows } = await db.query(
      `${LIST_SQL} GROUP BY t.id ORDER BY t.weekday NULLS LAST, t.position, t.created_at`,
    )
    res.json(rows)
  })

  r.get('/templates/:id', async (req, res) => {
    res.json(await getOne(uuid(req.params.id)))
  })

  r.post('/templates', async (req, res) => {
    const t = parseTemplate(req.body)
    const id = await db.tx((tx) => insertTemplate(tx, t))
    res.status(201).json(await getOne(id))
  })

  r.put('/templates/:id', async (req, res) => {
    const id = uuid(req.params.id)
    const t = parseTemplate(req.body)
    await db.tx(async (tx) => {
      const { rows } = await tx.query(
        `UPDATE templates SET name = $2, muscles = $3, color = $4, icon = $5, weekday = $6
         WHERE id = $1 RETURNING id`,
        [id, t.name, t.muscles, t.color, t.icon, t.weekday],
      )
      if (!rows[0]) throw new HttpError(404, 'Séance type introuvable')
      await writeTemplateExercises(tx, id, t.exercises, t.icon)
    })
    res.json(await getOne(id))
  })

  r.delete('/templates/:id', async (req, res) => {
    await db.query('DELETE FROM templates WHERE id = $1', [uuid(req.params.id)])
    res.status(204).end()
  })

  // Copie d'une séance type (sans jour fixe, pour ne pas doubler le planning)
  r.post('/templates/:id/duplicate', async (req, res) => {
    const src = await getOne(uuid(req.params.id))
    const id = await db.tx((tx) =>
      insertTemplate(tx, {
        name: `${src.name} (copie)`.slice(0, 40),
        muscles: src.muscles,
        color: src.color,
        icon: src.icon,
        weekday: null,
        exercises: src.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets, reps: e.reps, restSeconds: e.restSeconds })),
      }),
    )
    res.status(201).json(await getOne(id))
  })

  // Nouvelle séance type à partir d'une séance réalisée (exercices + nombre de séries faites)
  r.post('/sessions/:id/template', async (req, res) => {
    const sessionId = uuid(req.params.id)
    const s = await db.query('SELECT * FROM sessions WHERE id = $1', [sessionId])
    if (!s.rows[0]) throw new HttpError(404, 'Séance introuvable')
    const { rows: exercises } = await db.query(
      `SELECT se.exercise_id AS "exerciseId", se.target_reps AS reps, se.rest_seconds AS "restSeconds",
         GREATEST(count(ss.id) FILTER (WHERE ss.done_at IS NOT NULL), 1)::int AS sets
       FROM session_exercises se LEFT JOIN session_sets ss ON ss.session_exercise_id = se.id
       WHERE se.session_id = $1 GROUP BY se.id ORDER BY se.position`,
      [sessionId],
    )
    const { name, muscles, color, icon: ic } = s.rows[0]
    const id = await db.tx((tx) =>
      insertTemplate(tx, {
        name: text(req.body?.name ?? name, 'Nom', { min: 1, max: 40 }),
        muscles, color, icon: ic, weekday: null, exercises,
      }),
    )
    res.status(201).json(await getOne(id))
  })

  return r
}
