/**
 * FedaPay client — server only (P5).
 *
 * Minimal REST integration for the premium checkout flow:
 *  1. POST /v1/transactions  — create the transaction (amount in XOF/FCFA,
 *     customer info, our custom_metadata.userId, callback_url).
 *  2. POST /v1/transactions/:id/tokens — obtain the hosted payment URL.
 *
 * Configuration (Vercel env vars):
 *  - FEDAPAY_SECRET_KEY     e.g. sk_sandbox_xxx / sk_live_xxx  (required)
 *  - FEDAPAY_ENVIRONMENT    "sandbox" | "live"                  (default: sandbox)
 *  - FEDAPAY_WEBHOOK_SECRET webhook signing secret              (webhook route)
 *
 * Graceful degradation: without FEDAPAY_SECRET_KEY the checkout route
 * answers 503 { code: "payment_not_configured" } and the pricing modal
 * falls back to the demo upgrade — the app keeps working before the
 * merchant account is wired.
 */

const PREMIUM_PRICE_FCFA = 2000; // XOF — displayed in the pricing modal.
const PREMIUM_LABEL = "Abonnement Premium QuizExam BF (1 mois)";

export const FEDAPAY_PRICE_FCFA = PREMIUM_PRICE_FCFA;

function environment(): "sandbox" | "live" {
  return process.env.FEDAPAY_ENVIRONMENT === "live" ? "live" : "sandbox";
}

function baseUrl(): string {
  return environment() === "live"
    ? "https://api.fedapay.com"
    : "https://sandbox-api.fedapay.com";
}

function secretKey(): string | undefined {
  const key = process.env.FEDAPAY_SECRET_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

export function isFedaPayConfigured(): boolean {
  return Boolean(secretKey());
}

/** Webhook signing secret (separate from the API secret key). */
export function fedapayWebhookSecret(): string | undefined {
  const key = process.env.FEDAPAY_WEBHOOK_SECRET?.trim();
  return key && key.length > 0 ? key : undefined;
}

export interface CheckoutInput {
  userId: string;
  userEmail: string;
  userName?: string | null;
  /** Absolute URL the customer returns to after paying. */
  callbackUrl: string;
}

export interface CheckoutResult {
  transactionId: string;
  paymentUrl: string;
}

interface FedapayTransactionResponse {
  "v1/transaction"?: { id?: number | string; status?: string };
  message?: string;
}

interface FedapayTokenResponse {
  token?: { url?: string; token?: string };
  message?: string;
}

async function fedapayFetch<T>(path: string, init: RequestInit): Promise<T> {
  const key = secretKey();
  if (!key) throw new Error("FEDAPAY_SECRET_KEY manquante");

  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      // FedaPay documents Basic auth with the API secret key.
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FedaPay ${res.status} sur ${path}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/**
 * Create a premium transaction and return the hosted payment URL.
 * Throws on network/API failure — the route maps errors to HTTP 502.
 */
export async function createPremiumCheckout(
  input: CheckoutInput,
): Promise<CheckoutResult> {
  const merchantReference = `premium-${input.userId}-${Date.now()}`;

  const txRes = await fedapayFetch<FedapayTransactionResponse>("/v1/transactions", {
    method: "POST",
    body: JSON.stringify({
      description: PREMIUM_LABEL,
      amount: PREMIUM_PRICE_FCFA,
      currency: { iso: "XOF" },
      callback_url: input.callbackUrl,
      merchant_reference: merchantReference,
      custom_metadata: { userId: input.userId },
      customer: {
        email: input.userEmail,
        firstname: input.userName?.split(" ")[0] || "Client",
        lastname: input.userName?.split(" ").slice(1).join(" ") || "QuizExam",
      },
    }),
  });

  const transactionId = txRes["v1/transaction"]?.id;
  if (transactionId === undefined || transactionId === null) {
    throw new Error("FedaPay: id de transaction manquant dans la réponse");
  }

  const tokenRes = await fedapayFetch<FedapayTokenResponse>(
    `/v1/transactions/${transactionId}/tokens`,
    { method: "POST" },
  );

  const paymentUrl = tokenRes.token?.url;
  if (!paymentUrl) {
    throw new Error("FedaPay: URL de paiement manquante dans la réponse du token");
  }

  return { transactionId: String(transactionId), paymentUrl };
}
