import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!exam) {
      return NextResponse.json(
        { error: "Exam not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(exam);
  } catch (error) {
    console.error("Failed to load exam:", error);
    return NextResponse.json(
      { error: "Failed to load exam" },
      { status: 500 }
    );
  }
}
