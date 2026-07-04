import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../env'
import * as schema from './schema'

// Single shared postgres.js connection pool + drizzle instance.
const queryClient = postgres(env.DATABASE_URL, { max: 10, onnotice: () => {} })

export const db = drizzle(queryClient, { schema, casing: 'snake_case' })
export const sqlClient = queryClient
export { schema }
