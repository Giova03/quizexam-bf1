import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * V14d — LIMITATION DE CONNEXIONS : chaque instance serverless Vercel ouvre
 * son propre pool Prisma. Sans `connection_limit`, Prisma alloue par défaut
 * (CPU × 2 + 1) connexions — multiplié par le nombre d'instances, cela
 * épuise le quota de connexions Supabase (≈ 60 en plan gratuit) et fait
 * ATTENDRE les requêtes DB plusieurs dizaines de secondes (login 29 s,
 * chat > 50 s constatés). On plafonne donc chaque instance à 4 connexions
 * avec un timeout de pool de 8 s : l'attente devient impossible.
 */
function withConnectionLimit(url: string | undefined): string {
  if (!url || (!url.startsWith('postgresql://') && !url.startsWith('postgres://'))) {
    return url ?? ''
  }
  try {
    const u = new URL(url)
    if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', '4')
    if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '8')
    // pgBouncer (pooler Supabase port 6543) exige ce flag pour Prisma
    if (u.port === '6543') u.searchParams.set('pgbouncer', 'true')
    return u.toString()
  } catch {
    return url
  }
}

function createPrismaClient() {
  // On Vercel (production), use the DATABASE_URL from env
  // On local dev, fall back to SQLite if DATABASE_URL is not a valid PostgreSQL URL
  if (process.env.NODE_ENV === 'production') {
    // Production: use whatever DATABASE_URL is set (should be PostgreSQL)
    const url = withConnectionLimit(process.env.DATABASE_URL)
    return new PrismaClient(url ? { datasources: { db: { url } } } : undefined)
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
