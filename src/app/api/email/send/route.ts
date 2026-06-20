import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    const body = await request.json();
    const { type = "info", subject, body: emailBody, toEmail } = body;
    const userEmail = (session.user as any).email ?? "";
    const recipient = toEmail || userEmail;
    if (!subject || !emailBody) return NextResponse.json({ error: "Sujet et corps requis" }, { status: 400 });
    const log = await db.emailLog.create({ data: { toEmail: recipient, subject, body: emailBody, type, status: "sent" } });
    console.log(`📧 Email logged: ${subject} -> ${recipient}`);
    return NextResponse.json({ success: true, message: `Notification envoyée à ${recipient}`, logId: log.id });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ emails: [] });
    const userEmail = (session.user as any).email ?? "";
    const logs = await db.emailLog.findMany({ where: { toEmail: userEmail }, orderBy: { sentAt: "desc" }, take: 20 });
    return NextResponse.json({ emails: logs });
  } catch { return NextResponse.json({ emails: [] }); }
}
