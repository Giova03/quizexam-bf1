import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB hard cap (per task spec)

/** Allowed MIME types per family. Anything else is rejected with 415. */
const IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);
const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
]);

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const AUDIO_EXTS = new Set([".mp3", ".wav", ".ogg", ".webm", ".aac", ".m4a"]);

function extFor(mime: string, name: string): string {
  if (IMAGE_TYPES.has(mime) || AUDIO_TYPES.has(mime)) {
    const ext = path.extname(name).toLowerCase();
    if (ext) return ext;
  }
  // Fallbacks derived from MIME
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg" || mime === "image/jpg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "image/svg+xml") return ".svg";
  if (mime === "audio/mpeg" || mime === "audio/mp3") return ".mp3";
  if (mime === "audio/wav" || mime === "audio/wave" || mime === "audio/x-wav") return ".wav";
  if (mime === "audio/ogg") return ".ogg";
  if (mime === "audio/webm") return ".webm";
  if (mime === "audio/aac") return ".aac";
  if (mime === "audio/mp4" || mime === "audio/x-m4a") return ".m4a";
  return "";
}

function classify(mime: string, name: string): "image" | "audio" | null {
  const ext = path.extname(name).toLowerCase();
  if (IMAGE_TYPES.has(mime) || IMAGE_EXTS.has(ext)) return "image";
  if (AUDIO_TYPES.has(mime) || AUDIO_EXTS.has(ext)) return "audio";
  return null;
}

/** Allow ADMIN and CONTRIBUTOR roles to upload media. */
async function requirePrivileged() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const role = (session.user as { role?: string }).role ?? "VISITOR";
  if (role !== "ADMIN" && role !== "CONTRIBUTOR") return null;
  return session;
}

export async function POST(request: Request) {
  const session = await requirePrivileged();
  if (!session) {
    return NextResponse.json(
      { error: "Réservé aux administrateurs et contributeurs" },
      { status: 403 }
    );
  }

  try {
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
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "Le fichier est vide." },
        { status: 400 }
      );
    }

    if (file.size > MAX_BYTES) {
      const mb = Math.round((MAX_BYTES / 1024 / 1024) * 10) / 10;
      return NextResponse.json(
        { error: `Le fichier dépasse la taille maximale autorisée (${mb} Mo).` },
        { status: 413 }
      );
    }

    const kind = classify(file.type, file.name);
    if (!kind) {
      return NextResponse.json(
        {
          error:
            "Type de fichier non supporté. Formats acceptés : images (png, jpg, webp, gif, svg) et audio (mp3, wav, ogg, m4a).",
        },
        { status: 415 }
      );
    }

    // Ensure /public/uploads exists. Recursive + noop if already there.
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (err) {
      // If it already exists, mkdir throws EEXIST — safe to ignore.
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
        console.error("upload-media: mkdir error", err);
        return NextResponse.json(
          { error: "Impossible de créer le dossier d'upload." },
          { status: 500 }
        );
      }
    }

    // Build a unique filename: <kind>-<uuid>.<ext>
    const ext = extFor(file.type, file.name);
    const safeName = `${kind}-${randomUUID()}${ext}`;
    const targetPath = path.join(uploadsDir, safeName);

    // Stream the file bytes to disk.
    try {
      const arrayBuffer = await file.arrayBuffer();
      fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
    } catch (err) {
      console.error("upload-media: write error", err);
      return NextResponse.json(
        { error: "Échec de l'écriture du fichier sur disque." },
        { status: 500 }
      );
    }

    // Public URL (relative) — Next.js serves /public/* at the root.
    const url = `/uploads/${safeName}`;

    return NextResponse.json({
      success: true,
      url,
      kind,
      fileName: safeName,
      originalName: file.name,
      size: file.size,
      mime: file.type || "application/octet-stream",
    });
  } catch (error) {
    console.error("upload-media error:", error);
    return NextResponse.json(
      { error: "Erreur lors du traitement du fichier." },
      { status: 500 }
    );
  }
}
