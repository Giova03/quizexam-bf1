import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

<<<<<<< Updated upstream
/**
 * GET /api/groups/[id]
 * Fetch a single group with its members list (id, name, joinedAt).
 */
export async function GET(
  _request: Request,
=======
/** GET /api/groups/[id] — group details with members list. */
export async function GET(
  _req: Request,
>>>>>>> Stashed changes
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await db.studyGroup.findUnique({
      where: { id },
      include: {
<<<<<<< Updated upstream
        creator: { select: { id: true, name: true } },
        members: {
          orderBy: { joinedAt: "asc" },
          include: {
            user: { select: { id: true, name: true } },
          },
=======
        owner: { select: { id: true, name: true } },
        members: {
          orderBy: { joinedAt: "asc" },
          include: { user: { select: { id: true, name: true } } },
>>>>>>> Stashed changes
        },
        _count: { select: { members: true } },
      },
    });
<<<<<<< Updated upstream

    if (!group) {
      return NextResponse.json(
        { error: "Groupe introuvable" },
        { status: 404 }
      );
    }

    // Compute whether the current user is a member (for the Leave button).
    let isMember = false;
    let isCreator = false;
    const session = await getServerSession(authOptions);
    const uid = (session?.user as { id?: string } | undefined)?.id;
    if (uid) {
      isCreator = group.creatorId === uid;
      isMember = group.members.some((m) => m.userId === uid);
    }

    return NextResponse.json({
      id: group.id,
      name: group.name,
      description: group.description,
      inviteCode: group.inviteCode,
      creatorId: group.creatorId,
      creator: group.creator,
      membersCount: group._count.members,
      createdAt: group.createdAt,
      isMember,
      isCreator,
      members: group.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error) {
    console.error("Group GET error:", error);
    return NextResponse.json(
      { error: "Failed to load study group" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/[id]
 * Delete a group. Only the creator can delete it.
 * Deleting cascades to all StudyGroupMember rows.
 */
export async function DELETE(
  _request: Request,
=======
    if (!group) {
      return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
    }
    return NextResponse.json(group);
  } catch (error) {
    console.error("Failed to load group:", error);
    return NextResponse.json({ error: "Failed to load group" }, { status: 500 });
  }
}

/** DELETE /api/groups/[id] — only the owner can delete. */
export async function DELETE(
  _req: Request,
>>>>>>> Stashed changes
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
<<<<<<< Updated upstream
    if (!session?.user) {
      return NextResponse.json(
        { error: "Connexion requise" },
        { status: 401 }
      );
    }
    const userId = (session.user as { id?: string }).id;
    const role = (session.user as { role?: string }).role;

    const { id } = await params;
    const group = await db.studyGroup.findUnique({
      where: { id },
      select: { id: true, creatorId: true },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Groupe introuvable" },
        { status: 404 }
      );
    }

    if (group.creatorId !== userId && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Seul le créateur peut supprimer ce groupe" },
        { status: 403 }
      );
    }

    await db.studyGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Group DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete study group" },
      { status: 500 }
    );
=======
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const { id } = await params;
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }
    const group = await db.studyGroup.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!group) {
      return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
    }
    if (group.ownerId !== user.id) {
      return NextResponse.json({ error: "Seul le propriétaire peut supprimer ce groupe" }, { status: 403 });
    }
    await db.studyGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete group:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
>>>>>>> Stashed changes
  }
}
