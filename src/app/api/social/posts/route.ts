import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await db.post.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      include: {
        author: { select: { id: true, name: true, email: true } },
        comments: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
        likes: { select: { userId: true } },
      },
    });
    return NextResponse.json(posts);
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    const userId = (session.user as any).id;
    const body = await request.json();
    const { content, type = "discussion", tags = "" } = body;
    if (!content?.trim()) return NextResponse.json({ error: "Contenu requis" }, { status: 400 });
    const post = await db.post.create({
      data: { authorId: userId, content: content.trim(), type, tags },
      include: { author: { select: { id: true, name: true, email: true } }, comments: { include: { author: { select: { id: true, name: true } } } }, likes: { select: { userId: true } } },
    });
    return NextResponse.json(post);
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
