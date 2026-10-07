import { Router } from 'express'
import { HttpError, date, int, num, text, uuid } from '../http.js'

// Résumé d'une séance : durée, volume, séries faites et nombre de records
// (exercice dont la charge max dépasse toutes les séances précédentes).
const SUMMARY_SQL = `
WITH tops AS (
  SELECT session_id, exercise_id, top_weight,
    max(top_weight) OVER (
      PARTITION BY exercise_id ORDER BY started_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ) AS prev_best
  FROM exercise_tops
), recs AS (
  SELECT session_id, count(*)::int AS records
  FROM tops WHERE prev_best IS NOT NULL AND top_weight > prev_best
  GROUP BY session_id
), stats AS (
  SELECT se.session_id,
    count(DISTINCT se.id)::int AS exercise_count,
    count(ss.id) FILTER (WHERE ss.done_at IS NOT NULL)::int AS sets_done,
    COALESCE(sum(ss.weight * ss.reps) FILTER (WHERE ss.done_at IS NOT NULL), 0)::float8 AS volume
  FROM session_exercises se
  LEFT JOIN session_sets ss ON ss.session_exercise_id = se.id
  GROUP BY se.session_id
)
SELECT s.id, s.template_id AS "templateId", s.name, s.muscles, s.color, s.icon,
  s.started_at AS "startedAt", s.ended_at AS "endedAt",
  COALESCE(st.exercise_count, 0) AS "exerciseCount",
  COALESCE(st.sets_done, 0) AS "setsDone",
  COALESCE(st.volume, 0) AS volume,
  COALESCE(r.records, 0) AS records
FROM sessions s
LEFT JOIN stats st ON st.session_id = s.id
LEFT JOIN recs r ON r.session_id = s.id
`

export default function sessionsRouter(db) {
  const r = Router()

  async function summary(userId, id) {
    const { rows } = await db.query(`${SUMMARY_SQL} WHERE s.id = $1 AND s.user_id = $2`, [id, userId])
    return rows[0] ?? null
  }

  async function detail(userId, id) {
    const s = await summary(userId, id)
    if (!s) throw new HttpError(404, 'Séance introuvable')
    const { rows: exercises } = await db.query(
      `SELECT se.id, se.exercise_id AS "exerciseId", e.name, e.icon, e.muscle, se.position,
         se.target_sets AS "targetSets", se.target_reps AS "targetReps", se.rest_seconds AS "restSeconds"
       FROM session_exercises se JOIN exercises e ON e.id = se.exercise_id
       WHERE se.session_id = $1 ORDER BY se.position`,
      [id],
    )
    const { rows: sets } = await db.query(
      `SELECT ss.id, ss.session_exercise_id AS "sessionExerciseId", ss.set_number AS "setNumber",
         ss.weight, ss.reps, ss.done_at AS "doneAt"
       FROM session_sets ss JOIN session_exercises se ON se.id = ss.session_exercise_id
       WHERE se.session_id = $1 ORDER BY se.position, ss.set_number`,
      [id],
    )
    const exerciseIds = JSON.stringify([...new Set(exercises.map((e) => e.exerciseId))])
    // Séries de la dernière séance terminée (antérieure) pour chaque exercice → colonne « Préc. »
    const { rows: previous } = await db.query(
      `WITH ids AS (SELECT json_array_elements_text($1::json)::uuid AS id),
       last AS (
         SELECT DISTINCT ON (se.exercise_id) se.exercise_id, se.session_id
         FROM session_exercises se JOIN sessions s ON s.id = se.session_id
         WHERE se.exercise_id IN (SELECT id FROM ids)
           AND s.ended_at IS NOT NULL AND s.started_at < $2 AND s.id <> $3
           AND EXISTS (SELECT 1 FROM session_sets x WHERE x.session_exercise_id = se.id AND x.done_at IS NOT NULL)
         ORDER BY se.exercise_id, s.started_at DESC
       )
       SELECT se.exercise_id AS "exerciseId", ss.weight, ss.reps
       FROM last
       JOIN session_exercises se ON se.session_id = last.session_id AND se.exercise_id = last.exercise_id
       JOIN session_sets ss ON ss.session_exercise_id = se.id AND ss.done_at IS NOT NULL
       ORDER BY se.position, ss.set_number`,
      [exerciseIds, s.startedAt, id],
    )
    const { rows: bests } = await db.query(
      `SELECT exercise_id AS "exerciseId", max(top_weight) AS best
       FROM exercise_tops
       WHERE exercise_id IN (SELECT json_array_elements_text($1::json)::uuid) AND started_at < $2 AND session_id <> $3
       GROUP BY exercise_id`,
      [exerciseIds, s.startedAt, id],
    )
    const best = new Map(bests.map((b) => [b.exerciseId, b.best]))
    return {
      ...s,
      exercises: exercises.map((e) => ({
        ...e,
        previousBest: best.get(e.exerciseId) ?? null,
        previous: previous.filter((p) => p.exerciseId === e.exerciseId).map(({ weight, reps }) => ({ weight, reps })),
        sets: sets.filter((x) => x.sessionExerciseId === e.id),
      })),
    }
  }

  r.get('/sessions', async (req, res) => {
    const from = date(req.query.from, 'from')
    const to = date(req.query.to ?? req.query.before, 'to')
    const limit = int(req.query.limit ?? 50, 'limit', { min: 1, max: 200 })
    const { rows } = await db.query(
      `${SUMMARY_SQL}
       WHERE s.user_id = $4 AND s.ended_at IS NOT NULL
         AND ($1::timestamptz IS NULL OR s.started_at >= $1)
         AND ($2::timestamptz IS NULL OR s.started_at < $2)
       ORDER BY s.started_at DESC LIMIT $3`,
      [from, to, limit, req.user.id],
    )
    res.json(rows)
  })

  r.get('/sessions/active', async (req, res) => {
    const { rows } = await db.query(`${SUMMARY_SQL} WHERE s.user_id = $1 AND s.ended_at IS NULL LIMIT 1`, [req.user.id])
    res.json(rows[0] ?? null)
  })

  r.get('/sessions/:id', async (req, res) => {
    res.json(await detail(req.user.id, uuid(req.params.id)))
  })

  // Ajoute un exercice à une séance, séries pré-remplies avec les charges de la dernière fois
  async function addExercise(tx, userId, sessionId, position, ex) {
    const se = await tx.query(
      `INSERT INTO session_exercises (session_id, exercise_id, position, target_sets, target_reps, rest_seconds)
       SELECT $1, e.id, $3, $4, $5, $6 FROM exercises e WHERE e.id = $2 AND e.user_id = $7 RETURNING id`,
      [sessionId, ex.exerciseId, position, ex.sets, ex.reps, ex.restSeconds, userId],
    )
    if (!se.rows[0]) throw new HttpError(400, 'Exercice introuvable dans le catalogue')
    const { rows: prev } = await tx.query(
      `SELECT ss.weight FROM session_sets ss
       WHERE ss.session_exercise_id = (
         SELECT se2.id FROM session_exercises se2 JOIN sessions s2 ON s2.id = se2.session_id
         WHERE se2.exercise_id = $1 AND s2.ended_at IS NOT NULL
           AND EXISTS (SELECT 1 FROM session_sets y WHERE y.session_exercise_id = se2.id AND y.done_at IS NOT NULL)
         ORDER BY s2.started_at DESC LIMIT 1
       ) AND ss.done_at IS NOT NULL
       ORDER BY ss.set_number`,
      [ex.exerciseId],
    )
    for (let i = 0; i < ex.sets; i++) {
      const weight = (prev[i] ?? prev.at(-1))?.weight ?? null
      await tx.query(
        'INSERT INTO session_sets (session_exercise_id, set_number, weight, reps) VALUES ($1, $2, $3, $4)',
        [se.rows[0].id, i + 1, weight, ex.reps],
      )
    }
    return se.rows[0].id
  }

  const parseExercise = (ex = {}, i = 0) => ({
    exerciseId: uuid(ex.exerciseId, `Exercice ${i + 1}`),
    sets: int(ex.sets ?? 3, 'Séries', { min: 1, max: 20 }),
    reps: int(ex.reps ?? 10, 'Répétitions', { min: 1, max: 100 }),
    restSeconds: int(ex.restSeconds ?? 90, 'Repos', { min: 0, max: 900 }),
  })

  // Démarre une séance : depuis une séance type ({ templateId }) ou libre ({ exercises: [...] })
  r.post('/sessions', async (req, res) => {
    const body = req.body ?? {}
    const templateId = body.templateId ? uuid(body.templateId, 'templateId') : null
    const free = templateId ? null : (Array.isArray(body.exercises) ? body.exercises : []).map(parseExercise)
    if (free && !free.length) throw new HttpError(400, 'Choisis au moins un exercice')
    if (free && free.length > 30) throw new HttpError(400, '30 exercices maximum')
    const userId = req.user.id
    const id = await db.tx(async (tx) => {
      const active = await tx.query('SELECT id FROM sessions WHERE user_id = $1 AND ended_at IS NULL', [userId])
      if (active.rows[0]) throw new HttpError(409, 'Une séance est déjà en cours', { activeId: active.rows[0].id })
      let meta = { name: text(body.name ?? 'Séance libre', 'Nom', { min: 1, max: 40 }), muscles: '', color: 'green', icon: 'dumbbell' }
      let exercises = free
      if (templateId) {
        const t = await tx.query('SELECT * FROM templates WHERE id = $1 AND user_id = $2', [templateId, userId])
        if (!t.rows[0]) throw new HttpError(404, 'Séance type introuvable')
        meta = t.rows[0]
        const { rows } = await tx.query(
          `SELECT exercise_id AS "exerciseId", sets, reps, rest_seconds AS "restSeconds"
           FROM template_exercises WHERE template_id = $1 ORDER BY position`,
          [templateId],
        )
        exercises = rows
      }
      const s = await tx.query(
        `INSERT INTO sessions (user_id, template_id, name, muscles, color, icon) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, templateId, meta.name, meta.muscles, meta.color, meta.icon],
      )
      for (const [position, ex] of exercises.entries()) await addExercise(tx, userId, s.rows[0].id, position, ex)
      return s.rows[0].id
    })
    res.status(201).json(await detail(userId, id))
  })

  // Ajoute un exercice en fin de séance, ou en remplace un (replaceId) à la même place
  r.post('/sessions/:id/exercises', async (req, res) => {
    const id = uuid(req.params.id)
    const ex = parseExercise(req.body)
    const replaceId = req.body?.replaceId ? uuid(req.body.replaceId, 'replaceId') : null
    const userId = req.user.id
    const newId = await db.tx(async (tx) => {
      const s = await tx.query('SELECT id FROM sessions WHERE id = $1 AND user_id = $2', [id, userId])
      if (!s.rows[0]) throw new HttpError(404, 'Séance introuvable')
      let position
      if (replaceId) {
        const old = await tx.query(
          `SELECT se.position,
             EXISTS (SELECT 1 FROM session_sets ss WHERE ss.session_exercise_id = se.id AND ss.done_at IS NOT NULL) AS started
           FROM session_exercises se WHERE se.id = $1 AND se.session_id = $2`,
          [replaceId, id],
        )
        if (!old.rows[0]) throw new HttpError(404, 'Exercice de séance introuvable')
        if (old.rows[0].started) throw new HttpError(409, 'Des séries sont déjà validées sur cet exercice')
        position = old.rows[0].position
        await tx.query('DELETE FROM session_exercises WHERE id = $1', [replaceId])
      } else {
        const p = await tx.query('SELECT COALESCE(max(position) + 1, 0)::int AS p FROM session_exercises WHERE session_id = $1', [id])
        position = p.rows[0].p
      }
      return addExercise(tx, userId, id, position, ex)
    })
    const d = await detail(userId, id)
    res.status(201).json(d.exercises.find((e) => e.id === newId))
  })

  r.delete('/session-exercises/:id', async (req, res) => {
    await db.query(
      `DELETE FROM session_exercises se USING sessions s
       WHERE se.id = $1 AND s.id = se.session_id AND s.user_id = $2`,
      [uuid(req.params.id), req.user.id],
    )
    res.status(204).end()
  })

  // Termine la séance : on retire les séries non validées ; une séance vide est supprimée.
  r.patch('/sessions/:id', async (req, res) => {
    const id = uuid(req.params.id)
    const endedAt = date(req.body?.endedAt, 'endedAt')
    const result = await db.tx(async (tx) => {
      const found = await tx.query('SELECT id FROM sessions WHERE id = $1 AND user_id = $2', [id, req.user.id])
      if (!found.rows[0]) throw new HttpError(404, 'Séance introuvable')
      await tx.query(
        `DELETE FROM session_sets ss USING session_exercises se
         WHERE se.id = ss.session_exercise_id AND se.session_id = $1 AND ss.done_at IS NULL`,
        [id],
      )
      await tx.query(
        `DELETE FROM session_exercises se WHERE se.session_id = $1
         AND NOT EXISTS (SELECT 1 FROM session_sets ss WHERE ss.session_exercise_id = se.id)`,
        [id],
      )
      const left = await tx.query('SELECT 1 FROM session_exercises WHERE session_id = $1 LIMIT 1', [id])
      if (!left.rows[0]) {
        await tx.query('DELETE FROM sessions WHERE id = $1', [id])
        return { deleted: true }
      }
      await tx.query('UPDATE sessions SET ended_at = COALESCE(ended_at, $2::timestamptz, now()) WHERE id = $1', [id, endedAt])
      return { deleted: false }
    })
    res.json(result.deleted ? { id, deleted: true } : await summary(req.user.id, id))
  })

  r.delete('/sessions/:id', async (req, res) => {
    await db.query('DELETE FROM sessions WHERE id = $1 AND user_id = $2', [uuid(req.params.id), req.user.id])
    res.status(204).end()
  })

  // Upsert idempotent d'une série (l'id vient du client → rejouable depuis la file hors-ligne)
  r.put('/sets/:id', async (req, res) => {
    const id = uuid(req.params.id)
    const b = req.body ?? {}
    const sessionExerciseId = uuid(b.sessionExerciseId, 'sessionExerciseId')
    const done = b.done === true
    const { rows } = await db.query(
      `INSERT INTO session_sets (id, session_exercise_id, set_number, weight, reps, done_at)
       SELECT $1, se.id, $3, $4, $5, CASE WHEN $6::boolean THEN COALESCE($7::timestamptz, now()) END
       FROM session_exercises se JOIN sessions s ON s.id = se.session_id AND s.user_id = $8
       WHERE se.id = $2
       ON CONFLICT (id) DO UPDATE SET
         set_number = EXCLUDED.set_number, weight = EXCLUDED.weight, reps = EXCLUDED.reps,
         done_at = CASE WHEN $6::boolean THEN COALESCE(session_sets.done_at, EXCLUDED.done_at) END
       -- l'exercice de séance vient d'être vérifié comme appartenant au compte : on n'écrase que ses séries
       WHERE session_sets.session_exercise_id = EXCLUDED.session_exercise_id
       RETURNING id, session_exercise_id AS "sessionExerciseId", set_number AS "setNumber", weight, reps, done_at AS "doneAt"`,
      [
        id,
        sessionExerciseId,
        int(b.setNumber, 'setNumber', { min: 1, max: 50 }),
        num(b.weight, 'Charge', { min: 0, max: 1000, nullable: true }),
        int(b.reps, 'Répétitions', { min: 0, max: 500, nullable: true }),
        done,
        date(b.doneAt, 'doneAt'),
        req.user.id,
      ],
    )
    if (!rows[0]) throw new HttpError(404, 'Exercice de séance introuvable')
    res.json(rows[0])
  })

  r.delete('/sets/:id', async (req, res) => {
    await db.query(
      `DELETE FROM session_sets ss USING session_exercises se, sessions s
       WHERE ss.id = $1 AND se.id = ss.session_exercise_id AND s.id = se.session_id AND s.user_id = $2`,
      [uuid(req.params.id), req.user.id],
    )
    res.status(204).end()
  })

  return r
}
