import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/change-password — changement de mot de passe (utilisateur
 * connecté). Exige la session NextAuth + le mot de passe ACTUEL.
 *
 * Corps : { currentPassword: string, newPassword: string }
 *
 * - Compte credentials : le mot de passe actuel est vérifié (bcrypt).
 * - Compte Google sans mot de passe connu : le hash stocké est aléatoire et
 *   invérifiable → la vérification est contournée si et seulement si le
 *   compte est lié à Google (googleId présent), conformément à la règle
 *   métier "connexion Google = identité vérifiée".
 * - Le nouveau mot de passe (min. 6 caractères) est haché (bcrypt coût 10).
 */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Connexion requise." },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request
      .json()
      .catch(() => ({}));
    const cleanCurrent = String(currentPassword ?? "");
    const cleanNew = String(newPassword ?? "");

    if (cleanNew.length < 6) {
      return NextResponse.json(
        { error: "Nouveau mot de passe min. 6 caractères." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email.trim().toLowerCase() },
    });
    if (!user) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }

    // Vérification du mot de passe actuel — sauf compte Google (identité
    // déjà vérifiée par OAuth ; le hash stocké est aléatoire non utilisable).
    const isGoogleLinked = Boolean(user.googleId);
    if (!isGoogleLinked) {
      const valid = await bcrypt.compare(cleanCurrent, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Mot de passe actuel incorrect." },
          { status: 400 }
        );
      }
    } else if (!cleanCurrent) {
      // Compte Google : champ actuel facultatif mais on exige une intention
      // explicite (le front envoie une chaîne vide acceptée).
      // Rien à faire ici — la vérification est contournée par conception.
    }

    const hash = await bcrypt.hash(cleanNew, 10);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hash },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("change-password:", error);
    return NextResponse.json(
      { error: "Erreur serveur. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}
