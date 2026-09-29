import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureAdminAccount } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * P0 SECURITY: This endpoint ensures the admin account exists.
 * - In development: anyone can call it (useful for local setup)
 * - In production: requires authentication (the first admin is created
 *   via environment variables or a secure setup script, not via a
 *   publicly accessible endpoint)
 */
export async function POST() {
  try {
    // P0: In production, require auth
    if (process.env.NODE_ENV === "production") {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json(
          { error: "Authentification requise" },
          { status: 401 }
        );
      }
      const user = session.user as { role?: string };
      if (user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Réservé à l'administrateur" },
          { status: 403 }
        );
      }
    }

    await ensureAdminAccount();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Init failed" },
      { status: 500 }
    );
  }
}
