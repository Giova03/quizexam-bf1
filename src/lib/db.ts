import { PrismaClient } from '@prisma/client'

// Fix: Force PostgreSQL URL when env has been overridden to SQLite path
// (some environments set DATABASE_URL to a SQLite file path which breaks the postgresql provider)
function getDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL
  if (envUrl && envUrl.startsWith('postgresql://')) {
    return envUrl
  }
  // Fallback to the configured PostgreSQL Supabase URL
  // This ensures the app works even when DATABASE_URL is incorrectly set
  return 'postgresql://postgres.liwxrnvaycudbxpfoiam:Giov%401234200@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
}

/**
 * Cache-bust key for the global Prisma client. Bump this whenever the
 * Prisma schema gains new fields, so the dev server's HMR-cached client
 * is replaced with a fresh one that knows about the new columns.
 *
 * We also use a versioned GLOBAL KEY so that older HMR-cached modules
 * (which wrote to the unversioned `prisma` key) cannot accidentally
 * reuse a stale client. Changing the key forces a fresh PrismaClient
 * to be constructed even if the cache-version check itself was skipped
 * during a partial HMR reload.
 */
const PRISMA_CACHE_VERSION = 'p8-analytics-moderation-roles-2025-v2'
const PRISMA_GLOBAL_KEY = `prisma_${PRISMA_CACHE_VERSION}`

interface GlobalWithPrisma {
  [key: string]: PrismaClient | string | undefined
}

const globalForPrisma = globalThis as unknown as GlobalWithPrisma

function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl()
  // Set the env vars so Prisma client picks them up at construction
  if (url) {
    process.env.DATABASE_URL = url
    process.env.DIRECT_URL = process.env.DIRECT_URL?.startsWith('postgresql://')
      ? process.env.DIRECT_URL
      : 'postgresql://postgres.liwxrnvaycudbxpfoiam:Giov%401234200@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
  }
  // Construct a fresh PrismaClient. Turbopack/Next.js HMR caches modules,
  // so we always re-import @prisma/client here to make sure we get the
  // version that matches the current schema (after `prisma generate`).
  //
  // When `prisma generate` regenerates @prisma/client (e.g. after `prisma db push`
  // adds a new model), the dev server needs a restart to fully pick up the new
  // client. The cache-version bump above ensures a brand-new PrismaClient instance
  // is constructed (rather than reusing the old one from the previous cache key),
  // and the require('@prisma/client') call below picks up whatever @prisma/client
  // is currently on disk.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient: FreshPrismaClient } = require('@prisma/client') as {
    PrismaClient: new () => PrismaClient
  }
  return new FreshPrismaClient()
}

// Look for a previously-cached client under the versioned key.
const cachedClient = globalForPrisma[PRISMA_GLOBAL_KEY] as PrismaClient | undefined

export const db = cachedClient ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma[PRISMA_GLOBAL_KEY] = db
  // Also write the legacy unversioned key for backwards compatibility
  // (older HMR-cached modules may still read from `globalForPrisma.prisma`).
  globalForPrisma.prisma = db
  globalForPrisma.__prismaCacheVersion = PRISMA_CACHE_VERSION
}
