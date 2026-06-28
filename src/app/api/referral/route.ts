import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, generateReferralCode } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const REFERRAL_XP_REWARD = 50;

/**
 * GET /api/referral
 * Returns the current user's referral code, number of referrals, and the
 * XP they have earned from referrals (referralCount × 50).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // XP earned = referralCount × 50.
    const xpEarned = referralCount * REFERRAL_XP_REWARD;

    // Resolve referrer info (if this user was referred).
    let referrer: { name: string; referralCode: string } | null = null;
    if (user.referredBy) {
      const ref = await db.user.findUnique({
        where: { referralCode: user.referredBy },
        select: { name: true, referralCode: true },
      });
      if (ref) referrer = ref;
    }

    return NextResponse.json({
      referralCode,
      referralCount,
      xpEarned,
      xpPerReferral: REFERRAL_XP_REWARD,
      referredUsers: referredUsers.map((u) => ({
        name: u.name,
        joinedAt: u.createdAt,
      })),
      referredBy: user.referredBy,
      referrer,
    });
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json({ error: "Échec du chargement des parrainages" }, { status: 500 });
  }
}

/**
 * POST /api/referral
 * Body: { referralCode: string }
 * Called during/after signup to link the current user to a referrer.
 * If the current user already has a `referredBy` value, this is a no-op
 * (a user can only be referred once).
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { referralCode } = body as { referralCode?: string };
    if (!referralCode || typeof referralCode !== "string") {
      return NextResponse.json({ error: "Code de parrainage requis" }, { status: 400 });
    }

    const trimmed = referralCode.trim().toUpperCase();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: "Code de parrainage invalide" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, referralCode: true, referredBy: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // User already referred — no-op.
    if (user.referredBy) {
      return NextResponse.json({
        success: false,
        message: "Vous avez déjà été parrainé.",
        referredBy: user.referredBy,
      });
    }

    // Cannot refer yourself.
    if (user.referralCode === trimmed) {
      return NextResponse.json({ error: "Vous ne pouvez pas vous parrainer vous-même." }, { status: 400 });
    }

    // Find the referrer.
    const referrer = await db.user.findUnique({
      where: { referralCode: trimmed },
      select: { id: true, referralCode: true },
    });

    if (!referrer) {
      return NextResponse.json({ error: "Code de parrainage introuvable." }, { status: 404 });
    }

    // Link the referrer.
    await db.user.update({
      where: { id: user.id },
      data: { referredBy: referrer.referralCode },
    });

    return NextResponse.json({
      success: true,
      message: "Parrainage accepté !",
      referredBy: referrer.referralCode,
      referrerId: referrer.id,
    });
  } catch (error) {
    console.error("Referral POST error:", error);
    return NextResponse.json({ error: "Échec du parrainage" }, { status: 500 });
  }
}
