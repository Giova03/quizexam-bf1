/**
 * Task ID 4 - Generate QCM question banks from extracted PDF content.
 *
 * Reads the extracted PDF text files (JSON objects with a `data.pages[].text`
 * array), groups them into 7 topic banks, calls the z-ai-web-dev-sdk LLM to
 * generate QCM questions for each bank, validates the output and saves the
 * result as JSON files ready for database seeding.
 *
 * Run with: `bun run scripts/generate-questions.ts`
 */

import ZAI from 'z-ai-web-dev-sdk';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Paths & constants
// ---------------------------------------------------------------------------
const EXTRACTED_DIR = '/home/z/my-project/upload/extracted';
const OUTPUT_DIR = '/home/z/my-project/scripts/generated/banks';
const SUMMARY_PATH = '/home/z/my-project/scripts/generated/summary.json';

const MIN_VALID_QUESTIONS = 15; // If less, we make a second LLM call
const TARGET_QUESTIONS = 25; // Minimum target per bank
const MAX_RETRIES = 3; // Number of times to retry a failing LLM call

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ExtractedPage {
  page: number;
  chars: number;
  text: string;
}
interface ExtractedDoc {
  status: string;
  data: {
    total_pages: number;
    extracted_pages: number;
    total_chars: number;
    pages: ExtractedPage[];
  };
}

interface Question {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

interface Bank {
  bankKey: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  questions: Question[];
}

interface BankConfig {
  bankKey: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  sources: () => string;
  additionalGuidance: string;
}

// ---------------------------------------------------------------------------
// File / text helpers
// ---------------------------------------------------------------------------
function readExtracted(filename: string): ExtractedDoc {
  const fullPath = path.join(EXTRACTED_DIR, filename);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw) as ExtractedDoc;
}

/** Concatenate page texts, optionally restricting to a page range. */
function concatPages(
  doc: ExtractedDoc,
  pageRange?: [number, number]
): string {
  let pages = doc.data.pages;
  if (pageRange) {
    const [start, end] = pageRange;
    pages = pages.filter((p) => p.page >= start && p.page <= end);
  }
  return pages
    .map((p) => `--- Page ${p.page} ---\n${p.text}`)
    .join('\n\n');
}

/**
 * Normalise text from DOC-0062 which contains many mathematical bold
 * unicode characters (e.g. 𝐐𝐮𝐞𝐥𝐥𝐞). We convert them to their ASCII
 * equivalents so the LLM receives clean text.
 */
function normaliseText(s: string): string {
  return s.replace(/[\u{1D400}-\u{1D7FF}]/gu, (ch) => {
    const code = ch.codePointAt(0)!;
    // Mathematical Alphanumeric Symbols block starts at 0x1D400
    const offset = code - 0x1d400;
    // Map back to basic Latin (capital A=0, lowercase a=26, digits=...)
    if (offset < 26) return String.fromCharCode(65 + offset); // bold capital
    if (offset < 52) return String.fromCharCode(97 + (offset - 26)); // bold small
    if (offset >= 52 && offset < 62) return String.fromCharCode(48 + (offset - 52)); // bold digits
    return ch;
  });
}

// ---------------------------------------------------------------------------
// Question validation & parsing
// ---------------------------------------------------------------------------
function isValidQuestion(q: any): q is Question {
  if (!q || typeof q !== 'object') return false;
  const required = [
    'question',
    'optionA',
    'optionB',
    'optionC',
    'optionD',
    'correctAnswer',
    'explanation',
  ];
  for (const field of required) {
    if (typeof q[field] !== 'string' || q[field].trim().length === 0) {
      return false;
    }
  }
  if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) return false;
  return true;
}

function stripFences(s: string): string {
  let t = s.trim();
  // Strip ```json ... ``` or ``` ... ``` code fences.
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json|JSON)?\s*/, '').replace(/\u0060\u0060\u0060\s*$/, '');
  }
  return t.trim();
}

function parseQuestionsFromResponse(content: string): Question[] {
  if (!content) return [];
  const cleaned = stripFences(content);

  // First, try direct JSON.parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidQuestion);
    }
    if (parsed && Array.isArray(parsed.questions)) {
      return parsed.questions.filter(isValidQuestion);
    }
  } catch {
    // fall through
  }

  // Otherwise, try to extract the first JSON object/array via regex.
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      if (parsed && Array.isArray(parsed.questions)) {
        return parsed.questions.filter(isValidQuestion);
      }
      if (Array.isArray(parsed)) return parsed.filter(isValidQuestion);
    } catch {
      // fall through
    }
  }
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const parsed = JSON.parse(arrMatch[0]);
      if (Array.isArray(parsed)) return parsed.filter(isValidQuestion);
    } catch {
      // fall through
    }
  }
  return [];
}

function dedupeQuestions(questions: Question[]): Question[] {
  const seen = new Set<string>();
  const result: Question[] = [];
  for (const q of questions) {
    const key = q.question.trim().toLowerCase().replace(/\s+/g, ' ');
    if (key.length > 0 && !seen.has(key)) {
      seen.add(key);
      result.push(q);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// LLM helpers
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Tu es un ingénieur pédagogique expert. À partir du contenu de cours fourni (extrait de documents de préparation aux concours du Burkina Faso), génère des questions à choix multiples (QCM) de haute qualité.

RÈGLES STRICTES:
- Chaque question a EXACTEMENT 4 options (A, B, C, D) avec une SEULE réponse correcte.
- Les 3 distracteurs doivent être plausibles mais clairement faux.
- Pas d'ambiguïté dans la formulation.
- Base-toi UNIQUEMENT sur le contenu fourni (tu peux reformuler et créer de nouvelles questions sur les mêmes notions).
- Chaque question doit avoir une courte explication (1-2 phrases) qui référence le contenu du cours.
- Réponds en JSON valide uniquement, sans texte supplémentaire ni commentaires markdown.`;

function buildUserPrompt(bank: BankConfig, content: string, extra: string = ''): string {
  return `Banque: ${bank.title}
Catégorie: ${bank.category}
Consigne spécifique: ${bank.additionalGuidance}

Format de sortie attendu (JSON STRICT, sans markdown, sans texte autour):
{"questions":[{"question":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"A","explanation":"..."}]}

Génère au moins ${TARGET_QUESTIONS} questions (et jusqu'à 40) pour cette banque. ${extra}

CONTENU DU COURS:
${content}`;
}

async function callLLM(
  zai: any,
  bank: BankConfig,
  content: string,
  extra: string = ''
): Promise<string> {
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(bank, content, extra) },
        ],
        thinking: { type: 'disabled' },
      });
      const response = completion?.choices?.[0]?.message?.content;
      if (typeof response === 'string' && response.length > 0) {
        return response;
      }
      lastErr = new Error('Réponse vide du LLM');
    } catch (err) {
      lastErr = err;
      console.warn(`  Tentative ${attempt} échouée: ${(err as Error).message}`);
    }
    if (attempt < MAX_RETRIES) {
      const delay = 2000 * attempt;
      console.warn(`  Attente ${delay}ms avant retry...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr ?? new Error('Échec LLM');
}

// ---------------------------------------------------------------------------
// Bank configurations
// ---------------------------------------------------------------------------
const BANK_CONFIGS: BankConfig[] = [
  {
    bankKey: 'culture-bf',
    title: 'Culture Générale - Burkina Faso',
    description:
      "Questions sur l'histoire, la géographie, les institutions et la culture du Burkina Faso",
    category: 'Culture Générale',
    icon: 'Landmark',
    color: 'emerald',
    sources: () => {
      const doc58 = readExtracted('DOC-20250626-WA0058.txt');
      const doc64 = readExtracted('DOC-20250626-WA0064.txt');
      return (
        concatPages(doc58) + '\n\n' + concatPages(doc64)
      );
    },
    additionalGuidance:
      "Porte sur l'histoire, la géographie, les institutions politiques et administratives, les personnages clés et le ministère des Eaux et Forêts du Burkina Faso. Tu peux créer de nouvelles questions inspirées du contenu.",
  },
  {
    bankKey: 'psycho-logique',
    title: 'Tests Psychotechniques - Logique & Suites',
    description:
      'Suites numériques, séries logiques, codes et raisonnement',
    category: 'Psychotechnique',
    icon: 'Brain',
    color: 'violet',
    sources: () => {
      const doc60 = readExtracted('DOC-20250626-WA0060.txt');
      const doc63 = readExtracted('DOC-20250626-WA0063.txt');
      const doc65 = readExtracted('DOC-20250626-WA0065.txt');
      return (
        concatPages(doc60) +
        '\n\n' +
        concatPages(doc63) +
        '\n\n' +
        concatPages(doc65)
      );
    },
    additionalGuidance:
      "Suites numériques, séries alphabétiques, logiques de codes, devinettes mathématiques. Tu peux créer de nouvelles suites en t'inspirant des exemples fournis.",
  },
  {
    bankKey: 'psycho-vocabulaire',
    title: 'Tests Psychotechniques - Vocabulaire & Orthographe',
    description:
      'Synonymes, orthographe, accords et vocabulaire français',
    category: 'Psychotechnique',
    icon: 'SpellCheck',
    color: 'amber',
    sources: () => {
      const doc59 = readExtracted('DOC-20250626-WA0059.txt');
      return concatPages(doc59);
    },
    additionalGuidance:
      "Synonymes, orthographe correcte, accords (masculin/féminin, singulier/pluriel). Tu peux créer de nouvelles questions sur le même modèle.",
  },
  {
    bankKey: 'histoire',
    title: 'Histoire & Relations Internationales',
    description:
      'Histoire mondiale, décolonisation, organisations internationales et diplomatie',
    category: 'Histoire',
    icon: 'Globe2',
    color: 'rose',
    sources: () => {
      const doc61 = readExtracted('DOC-20250626-WA0061.txt');
      return concatPages(doc61, [1, 8]);
    },
    additionalGuidance:
      "Concentre-toi UNIQUEMENT sur les questions d'histoire, de relations internationales, d'organisations (ONU, FAO, UNESCO, UNICEF), de colonisation/décolonisation, de guerre froide, d'après-guerre froide, de la participation de l'Afrique à la Seconde Guerre mondiale, et de la diplomatie. Ignore les questions d'économie, de physique ou de biologie.",
  },
  {
    bankKey: 'economie',
    title: 'Économie & Développement Durable',
    description:
      'Économie générale, politique économique, développement durable et environnement',
    category: 'Économie',
    icon: 'TrendingUp',
    color: 'cyan',
    sources: () => {
      const doc61 = readExtracted('DOC-20250626-WA0061.txt');
      return concatPages(doc61, [1, 8]);
    },
    additionalGuidance:
      "Concentre-toi UNIQUEMENT sur les questions d'économie, de politique économique (budgétaire, monétaire, de rigueur, de relance), de croissance endogène, de développement durable, de soutenabilité (faible/forte), de taxe carbone, de marchés de quotas d'émission, de biens communs, de PIB, de FBCF et de chocs d'offre/demande. Ignore les questions d'histoire/diplomatie et de sciences dures.",
  },
  {
    bankKey: 'francais',
    title: 'Français & Littérature',
    description:
      'Littérature africaine et française, courants littéraires, grammaire et figures de style',
    category: 'Français',
    icon: 'BookMarked',
    color: 'teal',
    sources: () => {
      const doc61 = readExtracted('DOC-20250626-WA0061.txt');
      return concatPages(doc61, [9, 11]);
    },
    additionalGuidance:
      "Littérature (œuvres, thèmes, courants littéraires du XIXe et XXe siècle), grammaire (concordance des temps, accords des participes passés), figures de style (métaphore, litote, etc.) et vocabulaire. Tu peux créer de nouvelles questions sur les mêmes thèmes.",
  },
  {
    bankKey: 'geographie',
    title: 'Géographie & Sciences de la Terre',
    description:
      'Géographie physique et humaine, sciences de la Terre et environnement',
    category: 'Géographie',
    icon: 'Mountain',
    color: 'sky',
    sources: () => {
      const doc62 = readExtracted('DOC-20250626-WA0062.txt');
      return normaliseText(concatPages(doc62));
    },
    additionalGuidance:
      "Géographie physique et humaine, sciences de la Terre (couches terrestres, océans, continents, montagnes, déserts, climat, séismes, plaques tectoniques, etc.). Tu peux créer de nouvelles questions du même type inspirées du contenu.",
  },
];

// Only regenerate banks whose saved JSON has fewer than this many questions.
const REGEN_THRESHOLD = 15;

function existingBankCount(bankKey: string): number {
  const filePath = path.join(OUTPUT_DIR, `${bankKey}.json`);
  if (!fs.existsSync(filePath)) return 0;
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Array.isArray(data.questions) ? data.questions.length : 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Main per-bank generation
// ---------------------------------------------------------------------------
async function generateForBank(
  zai: any,
  bank: BankConfig
): Promise<Bank> {
  console.log(`\n=== Génération pour: ${bank.bankKey} (${bank.title}) ===`);
  const content = bank.sources();
  console.log(`Taille du contenu: ${content.length} caractères`);

  let allQuestions: Question[] = [];

  // First LLM call
  console.log('Appel LLM (1)...');
  const response1 = await callLLM(zai, bank, content);
  const qs1 = parseQuestionsFromResponse(response1);
  console.log(`Réponse 1: ${qs1.length} questions valides`);
  allQuestions = dedupeQuestions([...allQuestions, ...qs1]);

  // Second LLM call if we don't have enough valid questions
  if (allQuestions.length < MIN_VALID_QUESTIONS) {
    console.log(
      `Moins de ${MIN_VALID_QUESTIONS} questions valides (${allQuestions.length}). Appel LLM (2)...`
    );
    const response2 = await callLLM(
      zai,
      bank,
      content,
      'Génère 25 questions SUPPLÉMENTAIRES et différentes de la première série.'
    );
    const qs2 = parseQuestionsFromResponse(response2);
    console.log(`Réponse 2: ${qs2.length} questions valides`);
    allQuestions = dedupeQuestions([...allQuestions, ...qs2]);
  }

  console.log(`Total: ${allQuestions.length} questions pour ${bank.bankKey}`);

  return {
    bankKey: bank.bankKey,
    title: bank.title,
    description: bank.description,
    category: bank.category,
    icon: bank.icon,
    color: bank.color,
    questions: allQuestions,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log('Initialisation du client ZAI...');
  const zai = await ZAI.create();

  const summary: Record<string, any> = {};
  let total = 0;

  for (const bank of BANK_CONFIGS) {
    const existing = existingBankCount(bank.bankKey);
    if (existing >= REGEN_THRESHOLD) {
      console.log(`\n=== ${bank.bankKey}: déjà ${existing} questions, ignoré ===`);
      summary[bank.bankKey] = {
        title: bank.title,
        category: bank.category,
        icon: bank.icon,
        color: bank.color,
        count: existing,
      };
      total += existing;
      continue;
    }
    const bankData = await generateForBank(zai, bank);
    const filePath = path.join(OUTPUT_DIR, `${bank.bankKey}.json`);
    fs.writeFileSync(filePath, JSON.stringify(bankData, null, 2), 'utf-8');
    console.log(`Sauvegardé: ${filePath} (${bankData.questions.length} questions)`);
    summary[bank.bankKey] = {
      title: bank.title,
      category: bank.category,
      icon: bank.icon,
      color: bank.color,
      count: bankData.questions.length,
    };
    total += bankData.questions.length;
  }

  summary._total = total;
  fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2), 'utf-8');

  console.log('\n========== Résumé ==========');
  for (const bank of BANK_CONFIGS) {
    const c = summary[bank.bankKey].count;
    console.log(`  ${bank.bankKey.padEnd(22)} : ${c} questions`);
  }
  console.log(`  ${'TOTAL'.padEnd(22)} : ${total} questions`);
  console.log(`Résumé sauvegardé: ${SUMMARY_PATH}`);
}

main().catch((err) => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
