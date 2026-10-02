import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb, migrate } from './db.js'
import { HttpError } from './http.js'
import { seedIfEmpty, syncCatalog } from './seed.js'
import { seedDemo } from './demo.js'
import templatesRouter from './routes/templates.js'
import exercisesRouter from './routes/exercises.js'
import sessionsRouter from './routes/sessions.js'
import progressionRouter from './routes/progression.js'

const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || '127.0.0.1'
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')

const db = await createDb()
await migrate(db)
await seedIfEmpty(db)
await syncCatalog(db)
if (process.env.DEMO === '1') {
  const { rows } = await db.query('SELECT count(*)::int AS n FROM sessions')
  if (rows[0].n === 0) console.log(`[demo] ${await seedDemo(db)} séances générées`)
}

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '100kb' }))

const api = express.Router()
api.get('/health', (_req, res) => res.json({ ok: true, db: db.kind }))
api.use(exercisesRouter(db))
api.use(templatesRouter(db))
api.use(sessionsRouter(db))
api.use(progressionRouter(db))
api.use((_req, _res, next) => next(new HttpError(404, 'Route inconnue')))
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
}, api)

// En production le serveur sert aussi la PWA compilée
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, {
    setHeaders(res, file) {
      if (file.includes(`${path.sep}assets${path.sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable')
      else res.set('Cache-Control', 'no-cache')
    },
  }))
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...err.extra })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalide' })
  if (err.code === '23505') return res.status(409).json({ error: 'Conflit : cette donnée existe déjà' })
  if (err.code === '23503') return res.status(409).json({ error: 'Donnée utilisée ailleurs : suppression impossible' })
  console.error(err)
  res.status(500).json({ error: 'Erreur serveur' })
})

const server = app.listen(PORT, HOST, () => {
  console.log(`[api] http://${HOST}:${PORT} (base : ${db.kind}${db.dataDir ? ` → ${db.dataDir}` : ''})`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close()
    db.close().finally(() => process.exit(0))
  })
}
