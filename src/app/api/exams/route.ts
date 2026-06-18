import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const exams = await db.exam.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { examQuestions: true } },
      },
    });
    return NextResponse.json(exams);
  } catch (error) {
    console.error("Failed to list exams:", error);
    return NextResponse.json(
      { error: "Failed to load exams" },
      { status: 500 }
    );
  }
}
