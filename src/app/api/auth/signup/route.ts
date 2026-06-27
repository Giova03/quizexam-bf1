import { NextResponse } from "next/server";
import { createVisitorAccount } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password, referralCode } = body;
    if (!email || !name || !password) return NextResponse.json({ error: "Tous les champs sont obligatoires." }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Mot de passe min. 6 caractères." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    const user = await createVisitorAccount(email, name, password, referralCode);
    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, referralCode: user.referralCode, referredBy: user.referredBy } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur lors de l'inscription.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
