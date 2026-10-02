// Génère ~8 semaines d'historique Push / Pull / Legs pour la démo.
// Usage : `npm run db:demo` (serveur arrêté : PGlite n'accepte qu'un processus à la fois)
// ou `DEMO=1 npm run dev` (appliqué au démarrage si l'historique est vide).
import { pathToFileURL } from 'node:url'
import { createDb, migrate } from './db.js'
import { seedIfEmpty } from './seed.js'

// charge de départ, incrément, kg arrondis à
const LOADS = {
  'Développé couché': [62.5, 2.5],
  'Développé incliné haltères': [22, 1],
  'Développé militaire': [40, 1.25],
  'Élévations latérales': [8, 0.5],
  'Dips': [5, 2.5],
  'Extensions triceps poulie': [25, 2.5],
  'Tractions': [5, 1.25],
  'Rowing barre': [55, 2.5],
  'Tirage horizontal': [50, 2.5],
  'Face pull': [20, 1],
  'Curl barre': [30, 1.25],
  'Curl marteau': [12, 1],
  'Squat barre': [67.5, 2.5],
  'Presse à cuisses': [140, 10],
  'Soulevé de terre roumain': [70, 2.5],
  'Flexion des jambes allongé': [35, 2.5],
  'Extensions mollets debout': [60, 5],
}

export async function seedDemo(db, { weeks = 8, now = new Date() } = {}) {
  const { rows: templates } = await db.query('SELECT * FROM templates WHERE weekday IS NOT NULL ORDER BY weekday')
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const first = new Date(today)
  first.setDate(first.getDate() - weeks * 7)
  let count = 0

  await db.tx(async (tx) => {
    await tx.query('DELETE FROM sessions')
    for (let d = new Date(first); d < today; d.setDate(d.getDate() + 1)) {
      const iso = ((d.getDay() + 6) % 7) + 1
      const t = templates.find((x) => x.weekday === iso)
      if (!t) continue
      const week = Math.floor((d - first) / (7 * 86400000))
      const start = new Date(d)
      start.setHours(18, 20 + ((count * 7) % 25), 0, 0)
      const duration = 48 + ((count * 5) % 14)
      const end = new Date(start.getTime() + duration * 60000)
      const s = await tx.query(
        `INSERT INTO sessions (template_id, name, muscles, color, icon, started_at, ended_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [t.id, t.name, t.muscles, t.color, t.icon, start.toISOString(), end.toISOString()],
      )
      const { rows: tes } = await tx.query(
        `SELECT te.*, e.name FROM template_exercises te JOIN exercises e ON e.id = te.exercise_id
         WHERE te.template_id = $1 ORDER BY te.position`,
        [t.id],
      )
      let minute = 3
      for (const te of tes) {
        const se = await tx.query(
          `INSERT INTO session_exercises (session_id, exercise_id, position, target_sets, target_reps, rest_seconds)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [s.rows[0].id, te.exercise_id, te.position, te.sets, te.reps, te.rest_seconds],
        )
        const [base, inc] = LOADS[te.name] ?? [20, 1]
        const weight = base + inc * Math.floor(week * 0.6 + (te.position % 3) * 0.3)
        for (let i = 1; i <= te.sets; i++) {
          const reps = i === te.sets && (count + i) % 3 === 0 ? te.reps - 1 : te.reps
          minute += 2
          await tx.query(
            `INSERT INTO session_sets (session_exercise_id, set_number, weight, reps, done_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [se.rows[0].id, i, weight, reps, new Date(start.getTime() + Math.min(minute, duration) * 60000).toISOString()],
          )
        }
      }
      count++
    }
  })
  return count
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = await createDb()
  await migrate(db)
  await seedIfEmpty(db)
  const n = await seedDemo(db)
  console.log(`[demo] ${n} séances générées`)
  await db.close()
}
