import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
<<<<<<< Updated upstream
 * Generate a unique 6-char uppercase alphanumeric invite code.
 * Alphabet excludes ambiguous chars (0/O, 1/I/L) for readability.
 * Retries up to 10 times on collision (extremely unlikely — 30^6 ≈ 729M combos).
 */
const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    const bytes = new Uint8Array(6);
    if (typeof globalThis.crypto?.getRandomValues === "function") {
      globalThis.crypto.getRandomValues(bytes);
      for (let i = 0; i < 6; i++) {
        code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
      }
    } else {
      for (let i = 0; i < 6; i++) {
        code += INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)];
      }
    }
    const existing = await db.studyGroup.findUnique({
      where: { inviteCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  // Last-resort fallback: append a unix suffix to force uniqueness.
  return (INVITE_ALPHABET[Math.floor(Math.random() * INVITE_ALPHABET.length)] +
    Date.now().toString(36).toUpperCase().slice(0, 5)).slice(0, 6);
}

/**
 * GET /api/groups
 * List all public study groups with their member count and creator info.
 * Optionally pass ?mine=1 to filter to groups the current user is a member of.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mine = searchParams.get("mine") === "1";

    let memberUserId: string | undefined;
    if (mine) {
      const session = await getServerSession(authOptions);
      const uid = (session?.user as { id?: string } | undefined)?.id;
      if (!uid) {
        return NextResponse.json(
          { error: "Connexion requise" },
          { status: 401 }
        );
      }
      memberUserId = uid;
    }

    const groups = await db.studyGroup.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, name: true } },
        members: mine
          ? {
              where: memberUserId ? { userId: memberUserId } : undefined,
              select: { id: true },
            }
          : false,
        _count: { select: { members: true } },
      },
    });

    const items = groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      inviteCode: g.inviteCode,
      creatorId: g.creatorId,
      creator: g.creator,
      membersCount: g._count.members,
      isMember: mine ? (g.members?.length ?? 0) > 0 : undefined,
      createdAt: g.createdAt,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Groups GET error:", error);
    return NextResponse.json(
      { error: "Failed to load study groups" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups
 * Create a new study group. The creator is automatically added as a member.
 * Body: { name, description? }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Connexion requise" },
        { status: 401 }
      );
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json(
        { error: "Session invalide" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Le nom du groupe est requis" },
        { status: 400 }
      );
    }
    if (name.length > 80) {
      return NextResponse.json(
        { error: "Le nom est trop long (80 caractères max)" },
        { status: 400 }
      );
    }
    if (description.length > 500) {
      return NextResponse.json(
        { error: "La description est trop longue (500 caractères max)" },
        { status: 400 }
      );
    }

    const inviteCode = await generateUniqueInviteCode();
=======
 * GET /api/groups — list public study groups with member count + owner.
 * POST /api/groups — create a new study group (requires auth).
 */
export async function GET() {
  try {
    const groups = await db.studyGroup.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    });
    return NextResponse.json(groups);
  } catch (error) {
    console.error("Failed to list study groups:", error);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const body = (await request.json()) as {
      name?: string;
      description?: string;
      subject?: string;
    };
    const name = body.name?.trim();
    if (!name || name.length < 3) {
      return NextResponse.json({ error: "Le nom doit faire au moins 3 caractères" }, { status: 400 });
    }

    // Generate a unique 6-char invite code (uppercase, no ambiguous chars)
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    let attempts = 0;
    while (attempts < 10) {
      code = "";
      const bytes = crypto.getRandomValues(new Uint8Array(6));
      for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length];
      const exists = await db.studyGroup.findUnique({ where: { code }, select: { id: true } });
      if (!exists) break;
      attempts++;
    }
>>>>>>> Stashed changes

    const group = await db.studyGroup.create({
      data: {
        name,
<<<<<<< Updated upstream
        description,
        creatorId: userId,
        inviteCode,
        members: {
          create: { userId },
        },
      },
      include: {
        creator: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    });

    return NextResponse.json(
      {
        id: group.id,
        name: group.name,
        description: group.description,
        inviteCode: group.inviteCode,
        creatorId: group.creatorId,
        creator: group.creator,
        membersCount: group._count.members,
        createdAt: group.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Groups POST error:", error);
    return NextResponse.json(
      { error: "Failed to create study group" },
      { status: 500 }
    );
=======
        description: body.description?.trim() ?? "",
        subject: body.subject?.trim() ?? "",
        code,
        ownerId: user.id,
        members: { create: [{ userId: user.id }] },
      },
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    });
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error("Failed to create study group:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
>>>>>>> Stashed changes
  }
}
