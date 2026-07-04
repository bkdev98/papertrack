import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db, sqlClient } from './client'

// Migrations folder lives next to the compiled/source file, one level up.
const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url))

async function main() {
  console.log('→ Running migrations from', migrationsFolder)
  await migrate(db, { migrationsFolder })
  console.log('✓ Migrations complete')
  await sqlClient.end()
}

main().catch((err) => {
  console.error('✗ Migration failed:', err)
  process.exit(1)
})
