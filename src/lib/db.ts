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

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = getDatabaseUrl()
  // Set the env vars so Prisma client picks them up at construction
  if (url) {
    process.env.DATABASE_URL = url
    process.env.DIRECT_URL = process.env.DIRECT_URL?.startsWith('postgresql://')
      ? process.env.DIRECT_URL
      : 'postgresql://postgres.liwxrnvaycudbxpfoiam:Giov%401234200@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
  }
  return new PrismaClient()
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
