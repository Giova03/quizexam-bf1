import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

<<<<<<< Updated upstream
/**
 * POST /api/groups/join
 * Join a study group by its invite code. Idempotent — joining a group you're
 * already a member of returns success without creating a duplicate row
 * (the @@unique([groupId, userId]) constraint also enforces this).
 *
 * Body: { inviteCode }
 *
 * Also supports a "leave" mode via { inviteCode, leave: true } so the same
 * endpoint can handle leaving without needing a separate route.
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
    const rawCode =
      typeof body.inviteCode === "string" ? body.inviteCode.trim() : "";
    const leave = body.leave === true;

    if (!rawCode) {
      return NextResponse.json(
        { error: "Code d'invitation requis" },
        { status: 400 }
      );
    }
    // Normalize: uppercase, strip whitespace, validate length.
    const inviteCode = rawCode.toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(inviteCode)) {
      return NextResponse.json(
        { error: "Code invalide — 6 caractères alphanumériques attendus" },
        { status: 400 }
      );
    }

    const group = await db.studyGroup.findUnique({
      where: { inviteCode },
      select: { id: true, name: true, creatorId: true },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Aucun groupe trouvé avec ce code" },
        { status: 404 }
      );
    }

    // Creator cannot leave (and would not need to — they should delete instead).
    if (leave) {
      if (group.creatorId === userId) {
        return NextResponse.json(
          { error: "Le créateur ne peut pas quitter son propre groupe — supprimez-le plutôt" },
          { status: 400 }
        );
      }
      await db.studyGroupMember.deleteMany({
        where: { groupId: group.id, userId },
      });
      return NextResponse.json({ success: true, left: true, groupId: group.id });
    }

    // Idempotent join: silently succeed if already a member.
    const existing = await db.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyMember: true,
        groupId: group.id,
        groupName: group.name,
      });
    }

    await db.studyGroupMember.create({
      data: { groupId: group.id, userId },
    });

    return NextResponse.json({
      success: true,
      groupId: group.id,
      groupName: group.name,
    });
  } catch (error) {
    console.error("Group join error:", error);
    return NextResponse.json(
      { error: "Impossible de rejoindre le groupe" },
      { status: 500 }
    );
=======
/** POST /api/groups/join — join a group by its invite code. */
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

    const body = (await request.json()) as { code?: string };
    const code = body.code?.trim().toUpperCase();
    if (!code || code.length < 4) {
      return NextResponse.json({ error: "Code d'invitation invalide" }, { status: 400 });
    }

    const group = await db.studyGroup.findUnique({
      where: { code },
      select: { id: true, name: true },
    });
    if (!group) {
      return NextResponse.json({ error: "Aucun groupe trouvé avec ce code" }, { status: 404 });
    }

    const existing = await db.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ alreadyMember: true, group });
    }

    await db.studyGroupMember.create({
      data: { groupId: group.id, userId: user.id },
    });
    return NextResponse.json({ joined: true, group }, { status: 201 });
  } catch (error) {
    console.error("Failed to join group:", error);
    return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
>>>>>>> Stashed changes
  }
}
