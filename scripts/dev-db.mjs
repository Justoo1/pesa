// Local development Postgres (no Docker needed): `npm run db:dev`.
//
// Runs a real PostgreSQL 17 (same major version as Neon production) from the
// `embedded-postgres` npm package, with its data in `.devdb/` (gitignored).
// Keep this running in its own terminal while you use `npm run dev`.
//
//   npm run db:dev          start (first run initialises + applies migrations)
//   npm run db:dev:reset    wipe the local data and start fresh
//
// Connection: postgresql://pesa:pesa@localhost:5433/pesa (see .env.example).
import EmbeddedPostgres from "embedded-postgres"
import { execSync } from "node:child_process"
import { existsSync, rmSync } from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const dataDir = path.join(root, ".devdb")
const port = Number(process.env.DEV_DB_PORT ?? 5433)
const url = `postgresql://pesa:pesa@localhost:${port}/pesa`

if (process.argv.includes("--reset") && existsSync(dataDir)) {
  rmSync(dataDir, { recursive: true, force: true })
  console.log("[dev-db] wiped .devdb/")
}

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "pesa",
  password: "pesa",
  port,
  persistent: true,
  // Windows defaults the cluster to WIN1252; the app stores "₵" and friends.
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
})

const fresh = !existsSync(path.join(dataDir, "PG_VERSION"))
if (fresh) await pg.initialise()
await pg.start()
if (fresh) await pg.createDatabase("pesa")

// Always bring the schema up to date, so pulling new migrations just works.
try {
  execSync("npx prisma migrate deploy", {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url },
  })
} catch {
  await pg.stop()
  process.exit(1)
}

console.log(`\n[dev-db] ready at ${url}  (Ctrl+C to stop)\n`)

let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await pg.stop()
  process.exit(0)
}
process.on("SIGINT", stop)
process.on("SIGTERM", stop)
setInterval(() => {}, 1 << 30) // keep the process alive
