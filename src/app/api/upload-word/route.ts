import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Fichier .docx requis" },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_BYTES / 1024 / 1024} Mo)` },
        { status: 400 }
      );
    }

    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Le fichier doit être un .docx Word (les .doc anciens ne sont pas supportés)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    // mammoth accepts { buffer } where buffer can be a Node Buffer or Uint8Array.
    // We pass the raw ArrayBuffer via a Uint8Array view for cross-runtime safety.
    const buffer = Buffer.from(arrayBuffer);

    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });

    let text = result.value || "";
    const truncated = text.length > 5000;
    if (truncated) {
      text = text.slice(0, 5000);
    }

    return NextResponse.json({
      text,
      truncated,
      totalLength: result.value?.length ?? 0,
      fileName: file.name,
      messages: result.messages?.length ?? 0,
    });
  } catch (error) {
    console.error("Word upload/parse error:", error);
    return NextResponse.json(
      { error: "Échec de l'extraction du texte du document Word" },
      { status: 500 }
    );
  }
}
