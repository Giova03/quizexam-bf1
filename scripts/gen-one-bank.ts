/**
 * Single-bank QCM generator - generates ONE bank at a time.
 * Usage: bun run scripts/gen-one-bank.ts <bankKey>
 *
 * This is more robust than the all-in-one script: if one bank fails,
 * the others are unaffected, and each bank can be retried independently.
 */
import ZAI from "z-ai-web-dev-sdk";
import * as fs from "fs";
import * as path from "path";

const EXTRACTED_DIR = "/home/z/my-project/upload/extracted";
const OUTPUT_DIR = "/home/z/my-project/scripts/generated/banks";

interface ExtractedDoc {
  data: { pages: Array<{ page: number; text: string }> };
}

function readExtracted(filename: string): ExtractedDoc {
  return JSON.parse(
    fs.readFileSync(path.join(EXTRACTED_DIR, filename), "utf-8")
  );
}

function concatPages(doc: ExtractedDoc, range?: [number, number]): string {
  let pages = doc.data.pages;
  if (range) {
    pages = pages.filter((p) => p.page >= range[0] && p.page <= range[1]);
  }
  return pages.map((p) => p.text).join("\n");
}

function normaliseBold(s: string): string {
  return s.replace(/[\u{1D400}-\u{1D7FF}]/gu, (ch) => {
    const code = ch.codePointAt(0)!;
    const offset = code - 0x1d400;
    if (offset < 26) return String.fromCharCode(65 + offset);
    if (offset < 52) return String.fromCharCode(97 + (offset - 26));
    if (offset >= 52 && offset < 62) return String.fromCharCode(48 + (offset - 52));
    return ch;
  });
}

interface Question {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
}

function isValid(q: any): q is Question {
  if (!q || typeof q !== "object") return false;
  for (const f of ["question", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "explanation"]) {
    if (typeof q[f] !== "string" || q[f].trim().length === 0) return false;
  }
  return ["A", "B", "C", "D"].includes(q.correctAnswer);
}

function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json|JSON)?\s*/, "").replace(/```\s*$/, "");
  }
  return t.trim();
}

function parseQuestions(content: string): Question[] {
  if (!content) return [];
  const cleaned = stripFences(content);
  // Try direct parse
  try {
    const p = JSON.parse(cleaned);
    if (Array.isArray(p)) return p.filter(isValid);
    if (p && Array.isArray(p.questions)) return p.questions.filter(isValid);
  } catch {}
  // Try extracting object
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const p = JSON.parse(objMatch[0]);
      if (p && Array.isArray(p.questions)) return p.questions.filter(isValid);
      if (Array.isArray(p)) return p.filter(isValid);
    } catch {}
  }
  // Try extracting array
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const p = JSON.parse(arrMatch[0]);
      if (Array.isArray(p)) return p.filter(isValid);
    } catch {}
  }
  return [];
}

function dedupe(qs: Question[]): Question[] {
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const q of qs) {
    const key = q.question.trim().toLowerCase().replace(/\s+/g, " ");
    if (!seen.has(key)) {
      seen.add(key);
      out.push(q);
    }
  }
  return out;
}

interface BankDef {
  bankKey: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  content: string;
  guidance: string;
}

const BANKS: Record<string, BankDef> = {
  "culture-bf": {
    bankKey: "culture-bf",
    title: "Culture Générale - Burkina Faso",
    description:
      "Questions sur l'histoire, la géographie, les institutions et la culture du Burkina Faso",
    category: "Culture Générale",
    icon: "Landmark",
    color: "emerald",
    content: concatPages(readExtracted("DOC-20250626-WA0058.txt")) +
      "\n\n" +
      concatPages(readExtracted("DOC-20250626-WA0064.txt")),
    guidance:
      "Porte sur l'histoire, la géographie, les institutions politiques et administratives, les personnages clés et le ministère des Eaux et Forêts du Burkina Faso.",
  },
  "psycho-logique": {
    bankKey: "psycho-logique",
    title: "Tests Psychotechniques - Logique & Suites",
    description: "Suites numériques, séries logiques, codes et raisonnement",
    category: "Psychotechnique",
    icon: "Brain",
    color: "violet",
    content:
      concatPages(readExtracted("DOC-20250626-WA0060.txt")) +
      "\n\n" +
      concatPages(readExtracted("DOC-20250626-WA0063.txt")) +
      "\n\n" +
      concatPages(readExtracted("DOC-20250626-WA0065.txt")),
    guidance:
      "Suites numériques, séries alphabétiques, logiques de codes, devinettes mathématiques. Crée de nouvelles suites inspirées des exemples.",
  },
  "psycho-vocabulaire": {
    bankKey: "psycho-vocabulaire",
    title: "Tests Psychotechniques - Vocabulaire & Orthographe",
    description: "Synonymes, orthographe, accords et vocabulaire français",
    category: "Psychotechnique",
    icon: "SpellCheck",
    color: "amber",
    content: concatPages(readExtracted("DOC-20250626-WA0059.txt")),
    guidance:
      "Synonymes, orthographe correcte, accords (masculin/féminin, singulier/pluriel). Crée de nouvelles questions sur le même modèle.",
  },
  histoire: {
    bankKey: "histoire",
    title: "Histoire & Relations Internationales",
    description:
      "Histoire mondiale, décolonisation, organisations internationales et diplomatie",
    category: "Histoire",
    icon: "Globe2",
    color: "rose",
    content: concatPages(readExtracted("DOC-20250626-WA0061.txt"), [1, 8]),
    guidance:
      "Concentre-toi UNIQUEMENT sur les questions d'histoire, de relations internationales, d'organisations (ONU, FAO, UNESCO, UNICEF), de colonisation/décolonisation, de guerre froide et de diplomatie. Ignore les questions d'économie ou de sciences.",
  },
  economie: {
    bankKey: "economie",
    title: "Économie & Développement Durable",
    description:
      "Économie générale, politique économique, développement durable et environnement",
    category: "Économie",
    icon: "TrendingUp",
    color: "cyan",
    content: concatPages(readExtracted("DOC-20250626-WA0061.txt"), [1, 8]),
    guidance:
      "Concentre-toi UNIQUEMENT sur l'économie, la politique économique (budgétaire, monétaire, de rigueur, de relance), la croissance endogène, le développement durable, la soutenabilité, la taxe carbone, les quotas d'émission, les biens communs, le PIB et les chocs d'offre/demande. Ignore l'histoire et les sciences.",
  },
  francais: {
    bankKey: "francais",
    title: "Français & Littérature",
    description:
      "Littérature africaine et française, courants littéraires, grammaire et figures de style",
    category: "Français",
    icon: "BookMarked",
    color: "teal",
    content: concatPages(readExtracted("DOC-20250626-WA0061.txt"), [9, 11]),
    guidance:
      "Littérature (œuvres, thèmes, courants littéraires XIXe et XXe), grammaire (concordance des temps, accords des participes passés), figures de style et vocabulaire.",
  },
  geographie: {
    bankKey: "geographie",
    title: "Géographie & Sciences de la Terre",
    description:
      "Géographie physique et humaine, sciences de la Terre et environnement",
    category: "Géographie",
    icon: "Mountain",
    color: "sky",
    content: normaliseBold(concatPages(readExtracted("DOC-20250626-WA0062.txt"))),
    guidance:
      "Géographie physique et humaine, sciences de la Terre (couches terrestres, océans, continents, montagnes, déserts, climat, séismes, plaques tectoniques).",
  },
};

const SYSTEM_PROMPT = `Tu es un ingénieur pédagogique expert. À partir du contenu de cours fourni (documents de préparation aux concours du Burkina Faso), génère des questions à choix multiples (QCM) de haute qualité.

RÈGLES STRICTES:
- Chaque question a EXACTEMENT 4 options (A, B, C, D) avec une SEULE réponse correcte.
- Les 3 distracteurs doivent être plausibles mais clairement faux.
- Pas d'ambiguïté dans la formulation.
- Base-toi UNIQUEMENT sur le contenu fourni (tu peux reformuler et créer de nouvelles questions sur les mêmes notions).
- Chaque question doit avoir une courte explication (1-2 phrases).
- Réponds en JSON valide uniquement, sans texte supplémentaire ni markdown.`;

async function generateBank(bankKey: string) {
  const bank = BANKS[bankKey];
  if (!bank) {
    console.error(`Unknown bank: ${bankKey}. Available: ${Object.keys(BANKS).join(", ")}`);
    process.exit(1);
  }

  console.log(`Génération: ${bank.title}`);
  console.log(`Contenu: ${bank.content.length} caractères`);

  const zai = await ZAI.create();
  let allQuestions: Question[] = [];

  const userPrompt = `Banque: ${bank.title}
Catégorie: ${bank.category}
Consigne: ${bank.guidance}

Format de sortie (JSON STRICT, sans markdown):
{"questions":[{"question":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"A","explanation":"..."}]}

Génère 30 questions variées.

CONTENU DU COURS:
${bank.content}`;

  // First attempt
  console.log("Appel LLM...");
  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });
    const response = completion?.choices?.[0]?.message?.content ?? "";
    const qs = parseQuestions(response);
    console.log(`Premier appel: ${qs.length} questions valides`);
    allQuestions = dedupe([...allQuestions, ...qs]);
  } catch (e) {
    console.error("Premier appel échoué:", (e as Error).message);
  }

  // Second attempt if needed
  if (allQuestions.length < 20) {
    console.log(`Moins de 20 questions (${allQuestions.length}), second appel...`);
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:
              userPrompt +
              "\n\nGénère 25 questions SUPPLÉMENTAIRES et différentes de la première série.",
          },
        ],
        thinking: { type: "disabled" },
      });
      const response = completion?.choices?.[0]?.message?.content ?? "";
      const qs = parseQuestions(response);
      console.log(`Second appel: ${qs.length} questions valides`);
      allQuestions = dedupe([...allQuestions, ...qs]);
    } catch (e) {
      console.error("Second appel échoué:", (e as Error).message);
    }
  }

  console.log(`Total: ${allQuestions.length} questions`);

  const output = {
    bankKey: bank.bankKey,
    title: bank.title,
    description: bank.description,
    category: bank.category,
    icon: bank.icon,
    color: bank.color,
    questions: allQuestions,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `${bank.bankKey}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Sauvegardé: ${outPath}`);
}

const bankKey = process.argv[2];
if (!bankKey) {
  console.error("Usage: bun run scripts/gen-one-bank.ts <bankKey>");
  console.error(`Available: ${Object.keys(BANKS).join(", ")}`);
  process.exit(1);
}

generateBank(bankKey).catch((e) => {
  console.error("Erreur fatale:", e);
  process.exit(1);
});
