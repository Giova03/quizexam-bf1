/**
 * Bank Repository — infrastructure layer (server only).
 *
 * P3: Prisma data-access for question banks.
 *
 * `findBankWithQuestions` keeps the legacy raw-SQL backfill of `imageUrl` /
 * `audioUrl` (added in F4): the Turbopack-cached Prisma client may not know
 * those columns until restart, so raw SQL bypasses runtime field validation.
 * Moving it here keeps that workaround an infrastructure concern.
 */

import { db } from "@/lib/db";
import type { LevelFilter } from "@/server/domain/banks/bank-domain";

/** Bank with its question count — shape of GET /api/banks rows. */
export type BankWithCount = Awaited<ReturnType<typeof findBanksForFilter>>[number];

export async function findBanksForFilter(filter: LevelFilter) {
  const where =
    filter.kind === "level_or_wildcard"
      ? {
          OR: [
            { educationLevel: filter.level },
            { educationLevel: "TOUS" },
          ],
        }
      : undefined;

  return db.questionBank.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { questions: true } },
    },
  });
}

interface QuestionMediaRow {
  id: string;
  imageurl: string | null;
  audiourl: string | null;
}

export async function findBankWithQuestions(id: string) {
  const bank = await db.questionBank.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });
  if (!bank) return null;

  // Backfill media URLs via raw SQL (legacy F4 workaround, see header).
  if (bank.questions.length > 0) {
    const ids = bank.questions.map((q) => q.id);
    const mediaRows = await db.$queryRaw<QuestionMediaRow[]>`
      SELECT id, "imageUrl" AS imageurl, "audioUrl" AS audiourl
      FROM "Question"
      WHERE id IN (${ids.join(",")})
    `;
    const mediaById = new Map(
      mediaRows.map((r) => [
        r.id,
        { imageUrl: r.imageurl, audioUrl: r.audiourl },
      ])
    );
    bank.questions = bank.questions.map((q) => {
      const m = mediaById.get(q.id);
      return {
        ...q,
        imageUrl: m?.imageUrl ?? null,
        audioUrl: m?.audioUrl ?? null,
      };
    });
  }

  return bank;
}
