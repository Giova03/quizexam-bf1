/**
 * POST /api/subscription/checkout — P5 (FedaPay).
 *
 * Authenticated users only. Creates a FedaPay transaction (2 000 FCFA /
 * month) bound to the caller via custom_metadata.userId and returns the
 * hosted payment URL. The PREMIUM tier is NOT granted here — activation
 * happens exclusively through the signed webhook
 * (POST /api/webhooks/fedapay), so a client can never self-upgrade.
 *
 * Responses:
 * - 200 { paymentUrl, transactionId }
 * - 401 { error }            not authenticated
 * - 409 { error, code }      already premium
 * - 503 { error, code }      FEDAPAY_SECRET_KEY not configured yet
 * - 502 { error }            FedaPay API/network failure
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { captureError } from "@/lib/observability";
import {
  createPremiumCheckout,
  isFedaPayConfigured,
} from "@/lib/fedapay";

export const dynamic = "force-dynamic";

/** Resolve an absolute callback URL from Origin/Referer or the request URL. */
function resolveCallbackUrl(request: Request): string {
  const originHeader =
    request.headers.get("origin") ??
    request.headers.get("referer") ??
    new URL(request.url).origin;
  try {
    return new URL(originHeader).origin;
  } catch {
    return new URL(request.url).origin;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    const userEmail = session?.user?.email;
    if (!userId || !userEmail) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Graceful degradation before the merchant account is configured.
    if (!isFedaPayConfigured()) {
      return NextResponse.json(
        {
          error: "Paiement en ligne pas encore activé. Revenez bientôt !",
          code: "payment_not_configured",
        },
        { status: 503 },
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, subscription: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }
    // Already premium — nothing to pay (idempotent UX).
    if (user.subscription === "premium" || user.subscription === "admin") {
      return NextResponse.json(
        { error: "Vous êtes déjà Premium.", code: "already_premium" },
        { status: 409 },
      );
    }

    const checkout = await createPremiumCheckout({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      callbackUrl: resolveCallbackUrl(request),
    });

    return NextResponse.json({
      paymentUrl: checkout.paymentUrl,
      transactionId: checkout.transactionId,
    });
  } catch (error) {
    captureError(error, { scope: "api/subscription/checkout" });
    return NextResponse.json(
      { error: "Le service de paiement est momentanément indisponible." },
      { status: 502 },
    );
  }
}
