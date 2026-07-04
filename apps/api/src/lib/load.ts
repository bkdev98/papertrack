import { asc } from 'drizzle-orm'
import { db } from '../db/client'
import { conferences, papers, rewardCategories, specialIssues } from '../db/schema'
import { mapConference, mapPaper, mapRewardCategory, mapSpecialIssue } from '../mappers'

/** Load the papers + catalog rows the pure stat functions operate on, mapped to
 *  the shared domain shapes. Shared by the stats and AI routes. */
export async function loadAll() {
  const [p, conf, si, rc] = await Promise.all([
    db.select().from(papers).orderBy(asc(papers.position), asc(papers.id)),
    db.select().from(conferences),
    db.select().from(specialIssues),
    db.select().from(rewardCategories),
  ])
  return {
    papers: p.map(mapPaper),
    conferences: conf.map(mapConference),
    specialIssues: si.map(mapSpecialIssue),
    rewardCategories: rc.map(mapRewardCategory),
  }
}
