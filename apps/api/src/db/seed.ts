import { DEFAULT_REWARD_CATEGORIES } from '@papertrack/shared'
import { sql } from 'drizzle-orm'
import seedData from '../seed-data.json'
import { db, schema, sqlClient } from './client'
import { type NormalizedBundle, normalizeBundle, normalizeRewardCategory } from './convert'

const SEQ_TABLES = [
  'papers',
  'authors',
  'journals',
  'conferences',
  'special_issues',
  'reward_categories',
  'attachments',
] as const

/** Ensure a bundle has reward categories, falling back to the regulation defaults. */
export function withDefaultRewards(bundle: NormalizedBundle): NormalizedBundle {
  if (!bundle.rewardCategories.length) {
    bundle.rewardCategories = DEFAULT_REWARD_CATEGORIES.map((c) => normalizeRewardCategory(c))
  }
  return bundle
}

/** Seed from the bundled DEFAULT_DB snapshot. */
export function seed() {
  return applyBundle(withDefaultRewards(normalizeBundle(seedData as any)))
}

/** Replace all catalog + paper data with a normalized bundle (transactional). */
export async function applyBundle(bundle: NormalizedBundle) {
  await db.transaction(async (tx) => {
    // Clear (attachments first — FK to papers).
    await tx.delete(schema.attachments)
    await tx.delete(schema.papers)
    await tx.delete(schema.authors)
    await tx.delete(schema.journals)
    await tx.delete(schema.conferences)
    await tx.delete(schema.specialIssues)
    await tx.delete(schema.rewardCategories)

    if (bundle.papers.length) await tx.insert(schema.papers).values(bundle.papers)
    if (bundle.authors.length) await tx.insert(schema.authors).values(bundle.authors)
    if (bundle.journals.length) await tx.insert(schema.journals).values(bundle.journals)
    if (bundle.conferences.length) await tx.insert(schema.conferences).values(bundle.conferences)
    if (bundle.specialIssues.length)
      await tx.insert(schema.specialIssues).values(bundle.specialIssues)
    if (bundle.rewardCategories.length)
      await tx.insert(schema.rewardCategories).values(bundle.rewardCategories)

    // Keep serial sequences ahead of the explicit ids we inserted.
    for (const t of SEQ_TABLES) {
      await tx.execute(
        sql.raw(
          `SELECT setval(pg_get_serial_sequence('${t}', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM "${t}"), 1))`,
        ),
      )
    }
  })

  return {
    papers: bundle.papers.length,
    authors: bundle.authors.length,
    journals: bundle.journals.length,
    conferences: bundle.conferences.length,
    specialIssues: bundle.specialIssues.length,
    rewardCategories: bundle.rewardCategories.length,
  }
}

// Run directly via `pnpm db:seed`.
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('seed.ts') ||
  process.argv[1]?.endsWith('seed.js')
) {
  seed()
    .then((counts) => {
      console.log('✓ Seeded:', counts)
      return sqlClient.end()
    })
    .catch((err) => {
      console.error('✗ Seed failed:', err)
      process.exit(1)
    })
}
