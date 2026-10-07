import { Router } from 'express'
import { HttpError, int, uuid } from '../http.js'

export default function progressionRouter(db) {
  const r = Router()

  // Exercices ayant au moins une séance terminée, les plus pratiqués d'abord
  r.get('/progression', async (req, res) => {
    const { rows } = await db.query(
      `SELECT e.id, e.name, e.icon, count(*)::int AS sessions, max(t.started_at) AS "lastAt",
         (SELECT s.color FROM sessions s JOIN session_exercises se ON se.session_id = s.id
          WHERE se.exercise_id = e.id ORDER BY s.started_at DESC LIMIT 1) AS color
       FROM exercise_tops t JOIN exercises e ON e.id = t.exercise_id
       WHERE e.user_id = $1
       GROUP BY e.id ORDER BY sessions DESC, "lastAt" DESC`,
      [req.user.id],
    )
    res.json(rows)
  })

  r.get('/progression/:exerciseId', async (req, res) => {
    const exerciseId = uuid(req.params.exerciseId)
    const limit = int(req.query.limit ?? 12, 'limit', { min: 2, max: 100 })
    const ex = await db.query('SELECT id, name, icon FROM exercises WHERE id = $1 AND user_id = $2', [exerciseId, req.user.id])
    if (!ex.rows[0]) throw new HttpError(404, 'Exercice introuvable')

    const { rows: points } = await db.query(
      `SELECT t.session_id AS "sessionId", t.started_at AS date, t.top_weight AS "topWeight",
         t.e1rm, t.volume,
         (SELECT max(ss.reps) FROM session_sets ss JOIN session_exercises se ON se.id = ss.session_exercise_id
          WHERE se.session_id = t.session_id AND se.exercise_id = t.exercise_id
            AND ss.done_at IS NOT NULL AND ss.weight = t.top_weight) AS "topReps"
       FROM exercise_tops t WHERE t.exercise_id = $1
       ORDER BY t.started_at DESC LIMIT $2`,
      [exerciseId, limit],
    )
    const { rows: best } = await db.query(
      `SELECT ss.weight, ss.reps, s.started_at AS date
       FROM session_sets ss
       JOIN session_exercises se ON se.id = ss.session_exercise_id
       JOIN sessions s ON s.id = se.session_id AND s.ended_at IS NOT NULL
       WHERE se.exercise_id = $1 AND ss.done_at IS NOT NULL AND ss.weight IS NOT NULL AND ss.reps > 0
       ORDER BY ss.weight DESC, ss.reps DESC, s.started_at LIMIT 1`,
      [exerciseId],
    )
    const { rows: agg } = await db.query(
      'SELECT max(e1rm)::float8 AS e1rm FROM exercise_tops WHERE exercise_id = $1',
      [exerciseId],
    )
    points.reverse()
    res.json({
      exercise: ex.rows[0],
      points,
      best: best[0] ?? null,
      e1rm: agg[0]?.e1rm ?? null,
      lastVolume: points.at(-1)?.volume ?? null,
    })
  })

  return r
}
