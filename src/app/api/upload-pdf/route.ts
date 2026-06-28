import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
<<<<<<< Updated upstream
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_TEXT_CHARS = 5000; // truncated for the LLM

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}

/**
 * Extract text from a PDF buffer using pdf-parse v1.
 *
 * We dynamically import the inner `lib/pdf-parse.js` file (instead of the
 * package's main entry) for two reasons:
 *   1. The package's `index.js` contains a `module.parent` debug guard that
 *      tries to read a test PDF when the module is loaded without a parent —
 *      this trips up Next.js/Bun module resolution and throws ENOENT.
 *   2. Dynamic import keeps the heavy pdf.js dependency out of the initial
 *      server bundle, so unrelated routes aren't slowed down.
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  const mod: unknown = await import("pdf-parse/lib/pdf-parse.js");
  // The CJS module exports the parse function as `module.exports = PDF`.
  // Under Next.js interop it may arrive as `.default` or as the namespace.
  const pdfParse = (
    typeof (mod as { default?: unknown }).default === "function"
      ? (mod as { default: (buf: Buffer) => Promise<{ text?: string }> }).default
      : (mod as (buf: Buffer) => Promise<{ text?: string }>)
  );
  const data = await pdfParse(buffer);
  return (data?.text ?? "").trim();
}

/**
 * Normalize whitespace and strip obvious PDF extraction artefacts so the LLM
 * gets cleaner text to work with.
 */
function normalize(text: string): string {
  return text
    // Collapse runs of whitespace into a single space
    .replace(/[ \t]+/g, " ")
    // Replace 3+ newlines with 2
    .replace(/\n{3,}/g, "\n\n")
    // Strip form-feed / vertical tab characters
    .replace(/[\f\v]/g, "\n")
    // Trim trailing spaces per line
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim();
}

export async function POST(request: Request) {
  // Admin-only: only admins can upload PDFs to generate question banks.
=======

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function POST(request: Request) {
>>>>>>> Stashed changes
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
<<<<<<< Updated upstream
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Requête invalide (multipart/form-data attendu)" },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Aucun fichier reçu. Champ attendu : 'file'." },
=======
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Fichier PDF requis" },
>>>>>>> Stashed changes
        { status: 400 }
      );
    }

<<<<<<< Updated upstream
    // Validate file type.
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json(
        { error: "Le fichier doit être au format PDF." },
        { status: 400 }
      );
    }

    // Validate file size (10 MB hard cap).
    if (file.size > MAX_BYTES) {
      const mb = Math.round((MAX_BYTES / 1024 / 1024) * 10) / 10;
      return NextResponse.json(
        { error: `Le fichier dépasse la taille maximale autorisée (${mb} Mo).` },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "Le fichier est vide." },
=======
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_BYTES / 1024 / 1024} Mo)` },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Le fichier doit être un PDF" },
>>>>>>> Stashed changes
        { status: 400 }
      );
    }

<<<<<<< Updated upstream
    // Read the file into a buffer.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text via pdf-parse.
    let rawText = "";
    try {
      rawText = await extractPdfText(buffer);
    } catch (err) {
      console.error("pdf-parse error:", err);
      return NextResponse.json(
        { error: "Impossible d'extraire le texte du PDF (fichier corrompu ou protégé ?)." },
        { status: 422 }
      );
    }

    if (!rawText) {
      return NextResponse.json(
        { error: "Aucun texte n'a pu être extrait du PDF (peut-être un PDF scanné sans OCR ?)." },
        { status: 422 }
      );
    }

    const cleaned = normalize(rawText);
    if (cleaned.length < 30) {
      return NextResponse.json(
        { error: "Texte extrait trop court pour générer des questions pertinentes." },
        { status: 422 }
      );
    }

    const truncated = cleaned.slice(0, MAX_TEXT_CHARS);
    const truncatedFlag = cleaned.length > MAX_TEXT_CHARS;

    return NextResponse.json({
      fileName: file.name,
      fileSize: file.size,
      totalChars: cleaned.length,
      truncated: truncatedFlag,
      text: truncated,
    });
  } catch (error: unknown) {
    console.error("upload-pdf error:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement du PDF." },
=======
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamic import to avoid bundling issues at build time.
    // pdf-parse v1.1.1 has a default export that is a function: (buffer) => Promise<{text, numpages, ...}>
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);

    let text = data.text || "";
    // Truncate to 5000 chars as per spec
    const truncated = text.length > 5000;
    if (truncated) {
      text = text.slice(0, 5000);
    }

    return NextResponse.json({
      text,
      truncated,
      totalLength: data.text?.length ?? 0,
      pages: data.numpages ?? null,
      fileName: file.name,
    });
  } catch (error) {
    console.error("PDF upload/parse error:", error);
    return NextResponse.json(
      { error: "Échec de l'extraction du texte du PDF" },
>>>>>>> Stashed changes
      { status: 500 }
    );
  }
}
