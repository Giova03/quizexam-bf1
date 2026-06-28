import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // On Vercel (production), use the DATABASE_URL from env
  // On local dev, fall back to SQLite if DATABASE_URL is not a valid PostgreSQL URL
  if (process.env.NODE_ENV === 'production') {
    // Production: use whatever DATABASE_URL is set (should be PostgreSQL)
    return new PrismaClient()
  }

  // Development: check if DATABASE_URL is valid
  const url = process.env.DATABASE_URL
  if (!url || (!url.startsWith('file:') && !url.startsWith('postgresql://') && !url.startsWith('postgres://'))) {
    process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db'
  }
  return new PrismaClient()
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
