import { NextResponse } from "next/server";
import { getExam } from "@/server/application/content/get-exam";

export const dynamic = "force-dynamic";

/**
 * GET /api/exams/[id] — one exam with its questions (via the join table,
 * ordered). P3: logic moved to the application layer. Contract unchanged.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await getExam(id);
    if (result.kind === "not_found") {
      return NextResponse.json(
        { error: "Exam not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.exam);
  } catch (error) {
    console.error("Failed to load exam:", error);
    return NextResponse.json(
      { error: "Failed to load exam" },
      { status: 500 }
    );
  }
}
