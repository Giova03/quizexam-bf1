/**
 * Observability helpers (P6) — zero-dependency error capture.
 *
 * Why not Sentry right away? The Sentry SDK is only useful once a DSN is
 * provisioned on the dashboard; adding it blind would bloat the bundle for
 * nothing. `captureError` is the SINGLE funnel for error reporting, so when
 * Sentry (or anything else) is adopted, only this file changes.
 *
 * What it does today:
 * 1. Structured one-line JSON on stderr — Vercel log drains and search
 *    tools (Better Stack, Datadog, Logtail…) parse this natively.
 * 2. Optional push to `ERROR_WEBHOOK_URL` (Slack/Discord-compatible
 *    {"content": ...} payload) — fire-and-forget, never blocks, never throws.
 *
 * Privacy rule: NO personal data (email, name, answers…) may go through
 * these helpers — pass ids/hashes only. (Platform analytics rule, ROADMAP P6.)
 */

const MAX_MESSAGE_LENGTH = 600;

interface ErrorContext {
  /** Logical module or route, e.g. "api/webhooks/fedapay". */
  scope?: string;
  /** Non-personal identifiers, e.g. { userId, sessionId }. */
  [key: string]: unknown;
}

function truncate(value: string): string {
  return value.length > MAX_MESSAGE_LENGTH ? `${value.slice(0, MAX_MESSAGE_LENGTH)}…` : value;
}

function errorToSummary(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: truncate(error.message),
      stack: error.stack ? truncate(error.stack) : undefined,
    };
  }
  return { name: "NonError", message: truncate(String(error)) };
}

/** Structured error log + optional webhook. Never throws. */
export function captureError(error: unknown, context: ErrorContext = {}): void {
  try {
    const summary = errorToSummary(error);
    // One-line JSON on stderr (console.error) for log drains.
    console.error(
      JSON.stringify({
        level: "error",
        ts: new Date().toISOString(),
        ...summary,
        context,
      }),
    );

    const webhookUrl = process.env.ERROR_WEBHOOK_URL?.trim();
    if (webhookUrl) {
      const payload = {
        content: `🔴 QuizExam — ${summary.name}: ${summary.message}${
          context.scope ? ` (scope: ${String(context.scope)})` : ""
        }`,
      };
      // Fire-and-forget: swallow every failure, 5s timeout.
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5_000),
      }).catch(() => {});
    }
  } catch {
    // Observability must NEVER be the thing that breaks the request.
  }
}

/** Structured info log (same envelope, level "info"). Never throws. */
export function captureMessage(message: string, context: ErrorContext = {}): void {
  try {
    console.info(
      JSON.stringify({
        level: "info",
        ts: new Date().toISOString(),
        message: truncate(message),
        context,
      }),
    );
  } catch {
    // Ignore.
  }
}
