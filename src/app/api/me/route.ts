import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

interface EmailPreferences {
  dailyReminder?: boolean;
  replyNotifications?: boolean;
  challengeReminders?: boolean;
}

function parsePrefs(raw: unknown): EmailPreferences {
  if (typeof raw !== "string" || !raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as EmailPreferences)
      : {};
  } catch {
    return {};
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { id: (session.user as { id?: string }).id, email: session.user.email, name: session.user.name, role: (session.user as { role?: string }).role } });
}

/**
 * PATCH /api/me
 *
 * Updates the current user's profile. Currently only the `emailPreferences`
 * field is supported, but the route is designed to be extended (bio,
 * establishment, etc.) by adding more keys to the body.
 *
 * Body: { emailPreferences?: { dailyReminder?, replyNotifications?, challengeReminders? } }
 *
 * The preferences are stored as a JSON string on the User.emailPreferences
 * column (added in F4). The /api/email/daily-reminder cron reads this
 * column to decide who to send reminders to.
 */
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (
      body.emailPreferences &&
      typeof body.emailPreferences === "object"
    ) {
      // Merge with existing prefs so a partial PATCH (e.g. only flipping
      // one toggle) doesn't wipe the other flags.
      //
      // We read/write the `emailPreferences` column via raw SQL because the
      // dev server's Turbopack-cached Prisma client may not know about this
      // new column (added in F4) until the dev server is restarted.
      // Raw SQL bypasses Prisma's model field validation.
      type RawPrefRow = { emailpreferences: string | null };
      const rows = await db.$queryRaw<RawPrefRow[]>`
        SELECT "emailPreferences" FROM "User" WHERE id = ${userId}
      `;
      const current = parsePrefs(rows[0]?.emailpreferences);
      const incoming = body.emailPreferences as EmailPreferences;
      const merged: EmailPreferences = {
        dailyReminder:
          typeof incoming.dailyReminder === "boolean"
            ? incoming.dailyReminder
            : current.dailyReminder ?? false,
        replyNotifications:
          typeof incoming.replyNotifications === "boolean"
            ? incoming.replyNotifications
            : current.replyNotifications ?? false,
        challengeReminders:
          typeof incoming.challengeReminders === "boolean"
            ? incoming.challengeReminders
            : current.challengeReminders ?? false,
      };
      const mergedJson = JSON.stringify(merged);
      await db.$executeRaw`
        UPDATE "User" SET "emailPreferences" = ${mergedJson} WHERE id = ${userId}
      `;
      return NextResponse.json({
        success: true,
        emailPreferences: merged,
      });
    }
    return NextResponse.json(
      { error: "Aucun champ à mettre à jour" },
      { status: 400 }
    );
  } catch (error) {
    console.error("me PATCH error:", error);
    return NextResponse.json({ error: "Échec de la mise à jour" }, { status: 500 });
  }
}

