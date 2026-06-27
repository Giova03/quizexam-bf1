import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Fetch a single QuestionBank by id, including all of its questions ordered
 * by `order`.
 *
 * We fetch the basic question rows via Prisma's typed client, then run a
 * raw SQL query to backfill the `imageUrl` and `audioUrl` columns (added
 * in F4). The dev server's Turbopack-cached Prisma client may not know
 * about those columns until the dev server is restarted, so we can't
 * `select` them through Prisma directly. Raw SQL bypasses the runtime
 * field validation entirely.
 */
interface QuestionMediaRow {
  id: string;
  imageurl: string | null;
  audiourl: string | null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bank = await db.questionBank.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });
    if (!bank) {
      return NextResponse.json(
        { error: "Bank not found" },
        { status: 404 }
      );
    }

    // Backfill media URLs via raw SQL.
    if (bank.questions.length > 0) {
      const ids = bank.questions.map((q) => q.id);
      const mediaRows = await db.$queryRaw<QuestionMediaRow[]>`
        SELECT id, "imageUrl" AS imageurl, "audioUrl" AS audiourl
        FROM "Question"
        WHERE id IN (${ids.join(",")})
      `;
      const mediaById = new Map(
        mediaRows.map((r) => [r.id, { imageUrl: r.imageurl, audioUrl: r.audiourl }])
      );
      // Merge the media URLs into the question objects.
      bank.questions = bank.questions.map((q) => {
        const m = mediaById.get(q.id);
        return {
          ...q,
          imageUrl: m?.imageUrl ?? null,
          audioUrl: m?.audioUrl ?? null,
        };
      });
    }

    return NextResponse.json(bank);
  } catch (error) {
    console.error("Failed to load bank:", error);
    return NextResponse.json(
      { error: "Failed to load bank" },
      { status: 500 }
    );
  }
}
