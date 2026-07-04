import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db, sqlClient } from './client'
import { seed } from './seed'

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url))

// Drop everything and rebuild from migrations + seed. Dev convenience only.
async function main() {
  console.log('→ Dropping public schema')
  await db.execute(sql`DROP SCHEMA public CASCADE`)
  await db.execute(sql`CREATE SCHEMA public`)
  console.log('→ Migrating')
  await migrate(db, { migrationsFolder })
  console.log('→ Seeding')
  const counts = await seed()
  console.log('✓ Reset complete:', counts)
  await sqlClient.end()
}

main().catch((err) => {
  console.error('✗ Reset failed:', err)
  process.exit(1)
})
