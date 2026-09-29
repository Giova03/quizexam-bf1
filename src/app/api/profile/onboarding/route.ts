import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID_LEVELS = new Set(["BEPC", "BAC", "LICENCE", "CONCOURS"]);

/**
 * GET /api/profile/onboarding — returns the current user's onboarding state.
 * Used by the OnboardingWizard to decide whether to show itself.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { onboardingDone: true, educationLevel: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/profile/onboarding failed:", error);
    return NextResponse.json(
      { error: "Erreur serveur." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile/onboarding — persists the onboarding wizard result.
 * Body: { educationLevel?: "BEPC"|"BAC"|"LICENCE"|"CONCOURS", skipped?: boolean }
 * Marks onboardingDone = true either way (completed or skipped).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { educationLevel, skipped } = body as {
      educationLevel?: string;
      skipped?: boolean;
    };

    // Light validation — no zod dependency needed for two optional fields.
    let level: string | null = null;
    if (
      typeof educationLevel === "string" &&
      VALID_LEVELS.has(educationLevel.toUpperCase())
    ) {
      level = educationLevel.toUpperCase();
    } else if (!skipped && educationLevel) {
      return NextResponse.json(
        { error: "Niveau d'études invalide." },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: userId },
      data: {
        educationLevel: level,
        onboardingDone: true,
      },
    });

    return NextResponse.json({ success: true, educationLevel: level });
  } catch (error) {
    console.error("POST /api/profile/onboarding failed:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de l'onboarding." },
      { status: 500 }
    );
  }
}
