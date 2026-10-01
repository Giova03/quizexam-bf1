/**
 * generate-pwa-icons.mjs — Icônes PWA/APK QuizExam BF.
 *
 * Les SVG ne suffisent pas pour Android (TWA/Play Store exige des PNG
 * réels 192/512 + variantes maskable). Ce script rasterise le logo
 * vectoriel via sharp :
 *   public/icons/icon-192.png / icon-512.png          (purpose any)
 *   public/icons/maskable-192.png / maskable-512.png  (zone sûre 80 %)
 *   public/icons/apple-touch-icon.png (180×180, fond opaque)
 *
 * Usage : node scripts/generate-pwa-icons.mjs
 */
import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = path.join(root, "public", "logo-quizexam.svg");
const outDir = path.join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const svgBuf = readFileSync(svgPath);

/** Fond vert émeraude (brand) pour les variantes maskable / apple. */
const BACKDROP = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" rx="0" fill="#ffffff"/>
</svg>`;

/** Logo réduit à 80 % centré (zone sûre maskable Android). */
function paddedSvg(percent) {
  const size = Math.round(512 * (percent / 100));
  const offset = Math.round((512 - size) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" fill="#ffffff"/>
  <g transform="translate(${offset},${offset}) scale(${size / 512})">
    <svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">${innerSvg()}</svg>
  </g>
</svg>`;
}

/** Extrait le contenu interne du SVG source (sans <svg> racine). */
function innerSvg() {
  let s = svgBuf.toString("utf8");
  s = s.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return s;
}

async function main() {
  const jobs = [
    // purpose:any — logo plein cadre (transparent)
    { out: "icon-192.png", data: svgBuf, size: 192 },
    { out: "icon-512.png", data: svgBuf, size: 512 },
    // maskable — logo à 80 % sur fond blanc opaque
    { out: "maskable-192.png", data: Buffer.from(paddedSvg(80)), size: 192 },
    { out: "maskable-512.png", data: Buffer.from(paddedSvg(80)), size: 512 },
    // iOS — 180×180 fond opaque
    { out: "apple-touch-icon.png", data: Buffer.from(paddedSvg(84)), size: 180 },
  ];
  for (const j of jobs) {
    await sharp(j.data)
      .resize(j.size, j.size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toFile(path.join(outDir, j.out));
    console.log("✓", j.out, `${j.size}x${j.size}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
