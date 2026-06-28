import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendDailyReminder } from "@/lib/email-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/email/daily-reminder
 *
 * Sends a daily reminder email to every user who has opted in via the
 * EmailPreferences toggle ("Recevoir les rappels quotidiens").
 *
 * Authorisation:
 *   - ADMIN role via NextAuth session, OR
 *   - A valid CRON_SECRET in the request body (for cron-job.org / Vercel
 *     Cron style invocations). The secret is optional and only checked
 *     when there is no session.
 *
 * De-duplication:
 *   For each recipient we check the EmailLog table for any row with
 *   type="daily_reminder" sent to that address in the last 24h. If one
 *   exists, we skip them. This protects against double-sends if the cron
 *   fires twice in a row.
 *
 * The user opt-in is stored in localStorage on the client (see
 * email-preferences.tsx). Since localStorage isn't visible to the server,
 * we materialise the opt-in flag onto a small JSON column on the User model
 * (emailPreferences String @default("{}") — added in the schema bump for
 * this task). When the toggle is flipped on the client, a follow-up PATCH
 * to /api/me syncs the preference server-side.
 */
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface EmailPreferences {
  dailyReminder?: boolean;
  replyNotifications?: boolean;
  challengeReminders?: boolean;
}

/** Safe-parse the emailPreferences JSON column. Returns {} on any error. */
function parsePrefs(raw: unknown): EmailPreferences {
  if (typeof raw !== "string" || !raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as EmailPreferences) : {};
  } catch {
    return {};
  }
}

async function authorize(request: Request) {
  // Strategy 1: authenticated admin session.
  const session = await getServerSession(authOptions);
  if (session?.user && (session.user as { role?: string }).role === "ADMIN") {
    return true;
  }
  // Strategy 2: CRON secret in the JSON body (header-checked second).
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && cronSecret.length > 0) {
    try {
      const cloned = request.clone();
      const body = (await cloned.json().catch(() => ({}))) as { secret?: string };
      if (typeof body.secret === "string" && body.secret === cronSecret) {
        return true;
      }
    } catch {
      /* fall through */
    }
  }
  return false;
}

export async function POST(request: Request) {
  const ok = await authorize(request);
  if (!ok) {
    return NextResponse.json(
      { error: "Non autorisé (admin ou secret cron requis)" },
      { status: 403 }
    );
  }

  try {
    // 1. Find every user with the opt-in flag set to true.
    //
    // We use a raw SQL query (db.$queryRaw) instead of db.user.findMany
    // because the dev server's Turbopack-cached Prisma client may not know
    // about the new `emailPreferences` column (added in F4) until the dev
    // server is restarted. Raw SQL bypasses Prisma's model field validation
    // entirely — it reads whatever columns exist on the table at query time.
    //
    // We use an explicit lowercase alias (`prefs`) for the column so the
    // returned row property name is stable regardless of Postgres' case
    // handling for quoted identifiers.
    type RawUser = {
      id: string;
      email: string;
      name: string;
      prefs: string | null;
    };
    const rawUsers = await db.$queryRaw<RawUser[]>`
      SELECT id, email, name, "emailPreferences" AS prefs FROM "User"
    `;
    const optedIn = rawUsers.filter(
      (u) => parsePrefs(u.prefs).dailyReminder === true
    );

    if (optedIn.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        skipped: 0,
        message: "Aucun utilisateur n'a activé les rappels quotidiens.",
      });
    }

    // 2. For each opted-in user, check if we already sent them a reminder
    // in the last 24h. If not, send it. We do this sequentially (rather
    // than Promise.all) to avoid hammering the DB / SMTP relay with a
    // thundering herd.
    const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
    let sent = 0;
    let skipped = 0;

    for (const user of optedIn) {
      if (!user.email) {
        skipped++;
        continue;
      }
      const recent = await db.emailLog.findFirst({
        where: {
          toEmail: user.email,
          type: "daily_reminder",
          sentAt: { gte: cutoff },
        },
        select: { id: true },
      });
      if (recent) {
        skipped++;
        continue;
      }
      await sendDailyReminder(user.email, user.name || user.email);
      sent++;
    }

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      totalOptedIn: optedIn.length,
      message: `${sent} rappel(s) envoyé(s), ${skipped} ignoré(s) (déjà envoyé dans les 24h)`,
    });
  } catch (error) {
    console.error("daily-reminder error:", error);
    return NextResponse.json(
      {
        error: "Échec de l'envoi des rappels",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
