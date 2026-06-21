import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const { subject, body } = await request.json();
    if (!subject || !body) return NextResponse.json({ error: "Subject and body required" }, { status: 400 });

    const users = await db.user.findMany({ where: { role: "VISITOR" }, select: { email: true } });
    const logs = await Promise.all(
      users.map((u) =>
        db.emailLog.create({ data: { toEmail: u.email, subject, body, type: "broadcast", status: "pending" } })
      )
    );

    return NextResponse.json({ sent: logs.length, message: `Message programmé pour ${logs.length} utilisateur(s)` });
  } catch (error) {
    console.error("Broadcast failed:", error);
    return NextResponse.json({ error: "Broadcast failed" }, { status: 500 });
  }
}
