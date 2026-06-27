import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/users
 * Search users by name (case-insensitive contains match).
 * Auth required. Returns id + name + role only — no email for privacy.
 *
 * Query params:
 *   - search:  search string (min 2 chars to trigger a search)
 *   - limit:   max items (default 20, capped at 50)
 *
 * Response: { items: Array<{ id, name, role }> }
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") ?? "").trim();
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)),
      50
    );

    // Require at least 2 chars so we don't return the entire user table.
    if (search.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const users = await db.user.findMany({
      where: {
        name: { contains: search, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
      take: limit,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ items: users });
  } catch (error) {
    console.error("Users search error:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
