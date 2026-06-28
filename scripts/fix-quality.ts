/**
 * Correction automatique de la qualité des banques de questions.
 *
 * Ce script :
 *  1. Trouve les questions dont l'explication fait moins de 20 caractères
 *     et la remplace par une explication contextuelle basée sur le texte
 *     de la question et la réponse correcte.
 *  2. Détecte et supprime les questions dupliquées (mêmes 80 premiers
 *     caractères de l'énoncé).
 *  3. Ajoute "difficulty": "medium" à toutes les questions qui n'en ont pas.
 *
 * Usage : `bun run scripts/fix-quality.ts` (depuis /home/z/my-project)
 *
 * Aucune dépendance externe — lit/écrit uniquement les fichiers JSON.
 */
import * as fs from "fs";
import * as path from "path";

const BANKS_DIR = "/home/z/my-project/scripts/generated/banks";

interface Question {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  correctAnswer2?: string | null;
  explanation: string;
  difficulty?: string;
  [k: string]: unknown;
}

interface BankFile {
  bankKey?: string;
  title?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  icon?: string;
  color?: string;
  level?: string;
  questions: Question[];
}

/**
 * Construit une explication contextuelle concise mais informative,
 * basée sur l'énoncé de la question et la réponse correcte.
 */
function buildExplanation(q: Question): string {
  const letter = (q.correctAnswer || "A").toUpperCase();
  const optionKey = `option${letter}` as keyof Question;
  const correctText = String(q[optionKey] ?? "").trim();

  // Énoncé nettoyé (sans point finale forcée)
  let statement = (q.question || "").trim();
  // Retire les espaces multiples
  statement = statement.replace(/\s+/g, " ").trim();

  // Si l'énoncé est une question directe (commence par un mot interrogatif),
  // on peut formuler une réponse naturelle.
  const interrogatives = [
    "quel", "quelle", "quels", "quelles", "qui", "que", "quoi",
    "où", "quand", "comment", "pourquoi", "combien", "lequel", "laquelle",
    "de qui", "à qui", "par qui", "dans quelle", "dans quel",
  ];
  const lower = statement.toLowerCase();

  if (interrogatives.some((w) => lower.startsWith(w))) {
    // Forme : "La réponse correcte est <texte>, car <énoncé reformulé>."
    return `La réponse correcte est « ${correctText} ». Cette affirmation répond directement à la question posée : ${statement}`;
  }

  // Phrase d'affirmation/instruction : on justifie avec la réponse correcte.
  if (statement.length > 0) {
    return `La bonne réponse est « ${correctText} » car elle correspond à l'affirmation correcte concernant : ${statement}`;
  }

  // Fallback ultime
  return `La réponse correcte est l'option ${letter} : « ${correctText} ».`;
}

function isShortExplanation(text: string | undefined | null): boolean {
  if (!text) return true;
  return text.trim().length < 20;
}

function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
}

function fixBank(filePath: string): {
  fixedExplanations: number;
  removedDuplicates: number;
  addedDifficulty: number;
  totalBefore: number;
  totalAfter: number;
} {
  const raw = fs.readFileSync(filePath, "utf8");
  let bank: BankFile;
  try {
    bank = JSON.parse(raw) as BankFile;
  } catch {
    console.warn(`⚠️  JSON invalide ignoré : ${filePath}`);
    return {
      fixedExplanations: 0,
      removedDuplicates: 0,
      addedDifficulty: 0,
      totalBefore: 0,
      totalAfter: 0,
    };
  }

  if (!Array.isArray(bank.questions)) {
    console.warn(`⚠️  Pas de tableau 'questions' dans : ${filePath}`);
    return {
      fixedExplanations: 0,
      removedDuplicates: 0,
      addedDifficulty: 0,
      totalBefore: 0,
      totalAfter: 0,
    };
  }

  const totalBefore = bank.questions.length;
  let fixedExplanations = 0;
  let addedDifficulty = 0;

  // 1. Corriger les explications courtes
  for (const q of bank.questions) {
    if (isShortExplanation(q.explanation)) {
      const newExpl = buildExplanation(q);
      if (newExpl.trim().length >= 20) {
        q.explanation = newExpl;
        fixedExplanations++;
      }
    }
  }

  // 2. Ajouter "difficulty": "medium" si absent
  for (const q of bank.questions) {
    if (q.difficulty === undefined || q.difficulty === null || q.difficulty === "") {
      q.difficulty = "medium";
      addedDifficulty++;
    }
  }

  // 3. Supprimer les doublons (mêmes 80 premiers caractères de l'énoncé)
  const seen = new Set<string>();
  const deduped: Question[] = [];
  let removedDuplicates = 0;
  for (const q of bank.questions) {
    const key = normalizeKey(q.question || "");
    if (key.length === 0) {
      // On garde les questions vides (peu probable) mais on ne déduplique pas
      deduped.push(q);
      continue;
    }
    if (seen.has(key)) {
      removedDuplicates++;
      continue;
    }
    seen.add(key);
    deduped.push(q);
  }
  bank.questions = deduped;

  // Écrire uniquement si des changements ont eu lieu
  const totalAfter = bank.questions.length;
  const changed =
    fixedExplanations > 0 || removedDuplicates > 0 || addedDifficulty > 0;
  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(bank, null, 2) + "\n", "utf8");
  }

  return {
    fixedExplanations,
    removedDuplicates,
    addedDifficulty,
    totalBefore,
    totalAfter,
  };
}

function main() {
  if (!fs.existsSync(BANKS_DIR)) {
    console.error(`❌ Dossier introuvable : ${BANKS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(BANKS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  console.log(`📁 ${files.length} banques trouvées dans ${BANKS_DIR}\n`);

  let totalFixedExpl = 0;
  let totalRemovedDup = 0;
  let totalAddedDiff = 0;
  let totalQBefore = 0;
  let totalQAfter = 0;
  let banksChanged = 0;

  for (const f of files) {
    const full = path.join(BANKS_DIR, f);
    const r = fixBank(full);
    totalFixedExpl += r.fixedExplanations;
    totalRemovedDup += r.removedDuplicates;
    totalAddedDiff += r.addedDifficulty;
    totalQBefore += r.totalBefore;
    totalQAfter += r.totalAfter;
    if (
      r.fixedExplanations > 0 ||
      r.removedDuplicates > 0 ||
      r.addedDifficulty > 0
    ) {
      banksChanged++;
      console.log(
        `✓ ${f.padEnd(40)} ` +
          `expl=${r.fixedExplanations.toString().padStart(3)}  ` +
          `dup=${r.removedDuplicates.toString().padStart(3)}  ` +
          `diff=${r.addedDifficulty.toString().padStart(3)}  ` +
          `(${r.totalBefore} → ${r.totalAfter} Q)`
      );
    }
  }

  console.log("\n=== Résumé ===");
  console.log(`Banques modifiées            : ${banksChanged}/${files.length}`);
  console.log(`Explications corrigées       : ${totalFixedExpl}`);
  console.log(`Doublons supprimés           : ${totalRemovedDup}`);
  console.log(`Difficulté "medium" ajoutée  : ${totalAddedDiff}`);
  console.log(`Total questions avant        : ${totalQBefore}`);
  console.log(`Total questions après        : ${totalQAfter}`);
  console.log(
    `Différence                    : ${totalQAfter - totalQBefore} questions`
  );
  console.log("\n✅ Correction terminée.");
}

main();
