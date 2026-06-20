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
    const existing = await db.like.findUnique({ where: { postId_userId: { postId, userId } } });
    if (existing) {
      await db.like.delete({ where: { id: existing.id } });
      await db.post.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } });
      return NextResponse.json({ liked: false });
    } else {
      await db.like.create({ data: { postId, userId } });
      await db.post.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } });
      return NextResponse.json({ liked: true });
    }
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
