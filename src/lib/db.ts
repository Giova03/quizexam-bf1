import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL
  // If URL doesn't start with file: or postgresql:, use the SQLite default
  if (!url || (!url.startsWith('file:') && !url.startsWith('postgresql://') && !url.startsWith('postgres://'))) {
    process.env.DATABASE_URL = 'file:/home/z/my-project/db/custom.db'
  }
  return new PrismaClient()
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
