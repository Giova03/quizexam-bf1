import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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
    return NextResponse.json(bank);
  } catch (error) {
    console.error("Failed to load bank:", error);
    return NextResponse.json(
      { error: "Failed to load bank" },
      { status: 500 }
    );
  }
}
