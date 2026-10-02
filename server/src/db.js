import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Adaptateur commun PGlite / PostgreSQL.
 * Les deux moteurs exposent `query(text, params) -> { rows }` avec des paramètres `$1…`,
 * on n'a donc qu'à normaliser `exec` (multi-instructions) et `tx` (transaction).
 */
export async function createDb() {
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
    return {
      kind: 'postgres',
      query: (text, params) => pool.query(text, params),
      exec: (sql) => pool.query(sql),
      async tx(fn) {
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          const result = await fn({ query: (t, p) => client.query(t, p), exec: (sql) => client.query(sql) })
          await client.query('COMMIT')
          return result
        } catch (err) {
          await client.query('ROLLBACK')
          throw err
        } finally {
          client.release()
        }
      },
      close: () => pool.end(),
    }
  }

  const { PGlite } = await import('@electric-sql/pglite')
  const dataDir = path.resolve(serverRoot, process.env.PGLITE_DIR || 'data/pgdata')
  await fs.mkdir(path.dirname(dataDir), { recursive: true })
  const db = await PGlite.create(dataDir)
  return {
    kind: 'pglite',
    dataDir,
    query: (text, params) => db.query(text, params),
    exec: (sql) => db.exec(sql),
    tx: (fn) => db.transaction((tx) => fn({ query: (t, p) => tx.query(t, p), exec: (sql) => tx.exec(sql) })),
    close: () => db.close(),
  }
}

export async function migrate(db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`)
  const dir = path.join(serverRoot, 'migrations')
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
  const { rows } = await db.query('SELECT name FROM schema_migrations')
  const applied = new Set(rows.map((r) => r.name))
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await fs.readFile(path.join(dir, file), 'utf8')
    await db.tx(async (tx) => {
      await tx.exec(sql)
      await tx.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
    })
    console.log(`[db] migration appliquée : ${file}`)
  }
}
