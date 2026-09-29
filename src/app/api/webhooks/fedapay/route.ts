/**
 * POST /api/webhooks/fedapay — P5.
 *
 * PUBLIC endpoint called by FedaPay after payment events. Security model:
 * 1. The raw body is read as TEXT (never parsed before verification).
 * 2. `X-FEDAPAY-SIGNATURE` is verified against FEDAPAY_WEBHOOK_SECRET with
 *    a constant-time comparison and a 5-minute replay window (pure logic
 *    lives in the subscription domain, unit-tested).
 * 3. ONLY `transaction.approved` events (or an approved status) activate
 *    premium — and the target user comes from OUR checkout metadata
 *    (custom_metadata.userId), never from any customer-controlled field.
 * 4. Activation is idempotent (re-deliveries are no-ops).
 *
 * The webhook secret is REQUIRED: without it the endpoint refuses to
 * process anything (503) instead of accepting unverifiable requests.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { captureError, captureMessage } from "@/lib/observability";
import { fedapayWebhookSecret } from "@/lib/fedapay";
import {
  verifyFedapaySignature,
  parseFedapayEvent,
  resolvePremiumActivation,
} from "@/server/domain/subscription/webhook-domain";
import { recordAuditLog } from "@/server/infrastructure/repositories/audit-log-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();

  const secret = fedapayWebhookSecret();
  if (!secret) {
    // No secret configured — refuse to trust any payload.
    return NextResponse.json(
      { error: "Webhook non configuré" },
      { status: 503 },
    );
  }

  const signatureHeader =
    request.headers.get("x-fedapay-signature") ??
    request.headers.get("X-FEDAPAY-SIGNATURE") ??
    "";

  const valid = verifyFedapaySignature(secret, rawBody, signatureHeader);
  if (!valid) {
    captureMessage("Webhook FedaPay rejeté — signature invalide", {
      scope: "api/webhooks/fedapay",
    });
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  const event = parseFedapayEvent(rawBody);
  if (!event) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const resolution = resolvePremiumActivation(event);
  if (resolution.kind === "ignore") {
    // Expected for declined/canceled/other events — ack quietly.
    console.info(`[FEDAPAY] Événement ignoré (${resolution.reason})`);
    return NextResponse.json({ received: true, ignored: resolution.reason });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: resolution.userId },
      select: { id: true, email: true, subscription: true },
    });
    if (!user) {
      // Unknown user in metadata — ack to prevent retry storms, log loudly.
      console.error(
        `[FEDAPAY] transaction ${resolution.transactionId}: utilisateur inconnu ${resolution.userId}`,
      );
      return NextResponse.json({ received: true, ignored: "unknown_user" });
    }

    if (user.subscription === "premium" || user.subscription === "admin") {
      // Idempotent re-delivery.
      return NextResponse.json({ received: true, alreadyPremium: true });
    }

    await db.user.update({
      where: { id: user.id },
      data: { subscription: "premium" },
    });

    console.info(
      `[FEDAPAY] Premium activé pour ${user.email} (transaction ${resolution.transactionId})`,
    );

    // Durable trace of the activation (best-effort by repository contract).
    await recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      action: "subscription.activated",
      entity: "User",
      entityId: user.id,
      newValue: JSON.stringify({ subscription: "premium" }),
      metadata: {
        provider: "fedapay",
        transactionId: resolution.transactionId,
      },
    });

    return NextResponse.json({ received: true, activated: true });
  } catch (error) {
    captureError(error, { scope: "api/webhooks/fedapay" });
    // 500 lets FedaPay retry — appropriate for a real DB failure.
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
