import {
  authorInputSchema,
  conferenceInputSchema,
  journalInputSchema,
  rewardCategoryInputSchema,
  specialIssueInputSchema,
} from '@papertrack/shared'
import { asc } from 'drizzle-orm'
import { Hono } from 'hono'
import { authors, conferences, journals, rewardCategories, specialIssues } from '../db/schema'
import { crudRoutes } from '../lib/crud'
import {
  mapAuthor,
  mapConference,
  mapJournal,
  mapRewardCategory,
  mapSpecialIssue,
} from '../mappers'

export const catalog = new Hono()

catalog.route(
  '/authors',
  crudRoutes({
    table: authors,
    schema: authorInputSchema,
    map: mapAuthor,
    orderBy: asc(authors.name),
  }),
)
catalog.route(
  '/journals',
  crudRoutes({
    table: journals,
    schema: journalInputSchema,
    map: mapJournal,
    orderBy: asc(journals.name),
  }),
)
catalog.route(
  '/conferences',
  crudRoutes({
    table: conferences,
    schema: conferenceInputSchema,
    map: mapConference,
    orderBy: asc(conferences.deadline),
  }),
)
catalog.route(
  '/special-issues',
  crudRoutes({
    table: specialIssues,
    schema: specialIssueInputSchema,
    map: mapSpecialIssue,
    orderBy: asc(specialIssues.deadline),
  }),
)
catalog.route(
  '/reward-categories',
  crudRoutes({
    table: rewardCategories,
    schema: rewardCategoryInputSchema,
    map: mapRewardCategory,
    orderBy: asc(rewardCategories.id),
  }),
)
