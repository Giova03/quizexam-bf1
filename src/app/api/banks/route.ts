import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const banks = await db.questionBank.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { questions: true } },
      },
    });
    return NextResponse.json(banks);
  } catch (error) {
    console.error("Failed to list banks:", error);
    return NextResponse.json(
      { error: "Failed to load question banks" },
      { status: 500 }
    );
  }
}
