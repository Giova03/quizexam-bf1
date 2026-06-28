import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
<<<<<<< Updated upstream
import { authOptions, generateReferralCode } from "@/lib/auth";
=======
import { authOptions } from "@/lib/auth";
>>>>>>> Stashed changes
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

<<<<<<< Updated upstream
const REFERRAL_XP_REWARD = 50;

/**
 * GET /api/referral
 * Returns the current user's referral code, number of referrals, and the
 * XP they have earned from referrals (referralCount × 50).
=======
/**
 * GET /api/referral
 * Returns the current user's referral code, the code that referred them
 * (if any), and the list of users they have referred (count + recent).
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
        email: true,
=======
>>>>>>> Stashed changes
        referralCode: true,
        referredBy: true,
      },
    });

    if (!user) {
<<<<<<< Updated upstream
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Backfill a missing referral code if necessary (legacy rows).
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = generateReferralCode();
      // Ensure uniqueness with a retry loop.
      let attempts = 0;
      while (attempts < 10) {
        const clash = await db.user.findUnique({
          where: { referralCode },
          select: { id: true },
        });
        if (!clash) break;
        referralCode = generateReferralCode();
        attempts += 1;
      }
      await db.user.update({
        where: { id: user.id },
        data: { referralCode },
      });
    }

    // Count referrals (users whose `referredBy` matches this user's code).
    const referralCount = await db.user.count({
      where: { referredBy: referralCode },
    });

    // Get the list of referred users (most recent first, limited).
    const referredUsers = await db.user.findMany({
      where: { referredBy: referralCode },
      select: {
=======
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Find users referred by this user's code
    const referrals = await db.user.findMany({
      where: { referredBy: user.referralCode },
      select: {
        id: true,
>>>>>>> Stashed changes
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
<<<<<<< Updated upstream
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
=======
      take: 50,
    });

    return NextResponse.json({
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      referralCount: referrals.length,
      referrals: referrals.map((r) => ({
        id: r.id,
        name: r.name,
        joinedAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("[referral] GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du parrainage" },
      { status: 500 }
    );
>>>>>>> Stashed changes
  }
}

/**
 * POST /api/referral
<<<<<<< Updated upstream
 * Body: { referralCode: string }
 * Called during/after signup to link the current user to a referrer.
 * If the current user already has a `referredBy` value, this is a no-op
 * (a user can only be referred once).
=======
 * Body: { referralCode: string } — the code of the user who referred me.
 * Sets `referredBy` on the current user. Cannot be changed once set, and
 * cannot be set to one's own code.
>>>>>>> Stashed changes
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
<<<<<<< Updated upstream
    const { referralCode } = body as { referralCode?: string };
    if (!referralCode || typeof referralCode !== "string") {
      return NextResponse.json({ error: "Code de parrainage requis" }, { status: 400 });
    }

    const trimmed = referralCode.trim().toUpperCase();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: "Code de parrainage invalide" }, { status: 400 });
=======
    const code =
      typeof body.referralCode === "string"
        ? body.referralCode.trim().toUpperCase()
        : "";
    if (!code) {
      return NextResponse.json(
        { error: "Code de parrainage requis" },
        { status: 400 }
      );
>>>>>>> Stashed changes
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, referralCode: true, referredBy: true },
    });
<<<<<<< Updated upstream

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
=======
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    if (user.referredBy) {
      return NextResponse.json(
        { error: "Vous avez déjà été parrainé" },
        { status: 400 }
      );
    }

    if (code === user.referralCode) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas vous parrainer vous-même" },
        { status: 400 }
      );
    }

    // Verify the referrer exists
    const referrer = await db.user.findUnique({
      where: { referralCode: code },
      select: { id: true, name: true },
    });
    if (!referrer) {
      return NextResponse.json(
        { error: "Code de parrainage invalide" },
        { status: 404 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: { referredBy: code },
>>>>>>> Stashed changes
    });

    return NextResponse.json({
      success: true,
<<<<<<< Updated upstream
      message: "Parrainage accepté !",
      referredBy: referrer.referralCode,
      referrerId: referrer.id,
    });
  } catch (error) {
    console.error("Referral POST error:", error);
    return NextResponse.json({ error: "Échec du parrainage" }, { status: 500 });
=======
      referredBy: code,
      referrerName: referrer.name,
    });
  } catch (error) {
    console.error("[referral] POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du parrainage" },
      { status: 500 }
    );
>>>>>>> Stashed changes
  }
}
