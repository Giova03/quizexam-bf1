import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    const userId = (session.user as any).id;
    const { id: postId } = await params;
    const body = await request.json();
    const { content } = body;
    if (!content?.trim()) return NextResponse.json({ error: "Contenu requis" }, { status: 400 });
    const comment = await db.comment.create({
      data: { postId, authorId: userId, content: content.trim() },
      include: { author: { select: { id: true, name: true } } },
    });
    return NextResponse.json(comment);
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
