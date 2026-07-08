/**
 * Génère un lot supplémentaire de questions vérifiées via LLM pour des banques spécifiques.
 * Les questions sont ajoutées aux banques existantes (culture-bf, histoire, geographie, svt-lycee).
 */
import ZAI from "z-ai-web-dev-sdk";
import * as fs from "fs";
import * as path from "path";

const BANKS_DIR = "/home/z/my-project/scripts/generated/banks";

interface Question {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  correctAnswer2?: "A" | "B" | "C" | "D";
  explanation: string;
}

interface Bank {
  bankKey: string;
  title: string;
  questions: Question[];
  [k: string]: unknown;
}

const SYSTEM_PROMPT = `Tu es un ingénieur pédagogique expert en préparation aux concours du Burkina Faso. Génère des QCM de haute qualité, vérifiés et actualisés (juin 2025).

RÈGLES STRICTES:
- Chaque question a EXACTEMENT 4 options (A, B, C, D) avec une SEULE réponse correcte.
- Les 3 distracteurs doivent être plausibles mais clairement faux.
- Les informations doivent être VÉRIFIÉES et ACTUALISÉES (juin 2025).
- Pour le Burkina Faso: 17 régions, 47 provinces (depuis juillet 2025), président Ibrahim Traoré, président ALT = Ousmane Bougma.
- Base-toi sur des faits réels et vérifiables.
- Réponds en JSON valide uniquement, sans markdown.`;

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
  try {
    const p = JSON.parse(cleaned);
    if (Array.isArray(p)) return p.filter(isValid);
    if (p && Array.isArray(p.questions)) return p.questions.filter(isValid);
  } catch {}
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const p = JSON.parse(objMatch[0]);
      if (p && Array.isArray(p.questions)) return p.questions.filter(isValid);
      if (Array.isArray(p)) return p.filter(isValid);
    } catch {}
  }
  return [];
}

function isValid(q: any): q is Question {
  if (!q || typeof q !== "object") return false;
  for (const f of ["question", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "explanation"]) {
    if (typeof q[f] !== "string" || q[f].trim().length === 0) return false;
  }
  return ["A", "B", "C", "D"].includes(q.correctAnswer);
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

const PROMPTS: Array<{ bankKey: string; prompt: string }> = [
  {
    bankKey: "culture-bf",
    prompt: `Génère 25 QCM sur la culture générale du Burkina Faso (actualisé juin 2025). Thèmes: institutions politiques (président Ibrahim Traoré, ALT présidée par Ousmane Bougma depuis le 11 novembre 2022), Confédération des États du Sahel (AES créée le 16/09/2023, confédération depuis le 09/07/2024, devise "Un espace, un peuple, un destin"), nouveau découpage administratif (17 régions, 47 provinces depuis juillet 2025), histoire (Thomas Sankara, Capitaine Thomas Sankara 4 août 1984), FESPACO, SIAO, SNC, personnages historiques (Maurice Yaméogo, Sangoulé Lamizana, Thomas Sankara, Blaise Compaoré, Roch Marc Christian Kaboré, Paul Henri Sandaogo Damiba), économie (FCFA, BCEAO, mines d'or).

Format JSON: {"questions":[{"question":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"A","explanation":"..."}]}`,
  },
  {
    bankKey: "geographie",
    prompt: `Génère 25 QCM sur la géographie du Burkina Faso et de l'Afrique de l'Ouest (actualisé 2025). Thèmes: 17 régions du Burkina Faso (Boucle du Mouhoun, Cascades, Centre, Centre-Est, Centre-Nord, Centre-Ouest, Centre-Sud, Est, Hauts-Bassins, Nord, Plateau-Central, Sahel, Sud-Ouest + 4 nouvelles: Soum/Djibo, Sirba/Bogandé, Tapoa, Kourwéogo), fleuves (Mouhoun, Nakanbé, Nazinon), barrages (Samandéni, Bagré, Ziga, Kompienga), pays frontaliers (Mali, Niger, Bénin, Togo, Ghana, Côte d'Ivoire), capitales d'Afrique de l'Ouest, déserts, montagnes.

Format JSON: {"questions":[{"question":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"A","explanation":"..."}]}`,
  },
  {
    bankKey: "svt-lycee",
    prompt: `Génère 25 QCM en Sciences de la Vie et de la Terre (SVT) niveau lycée. Thèmes: génétique (ADN, ARN, transcription, traduction, mutations), immunologie (anticorps, lymphocytes, vaccination), géologie (plaques tectoniques, séismes, volcans), écologie (chaînes alimentaires, biodiversité, effet de serre), reproduction humaine, génie génétique, maladies (paludisme, VIH, drépanocytose).

Format JSON: {"questions":[{"question":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"A","explanation":"..."}]}`,
  },
  {
    bankKey: "histoire",
    prompt: `Génère 25 QCM en histoire et relations internationales. Thèmes: Seconde Guerre mondiale, décolonisation africaine (indépendances 1960), guerre froide, ONU et ses institutions, OUAs/Union Africaine, non-alignement, Burkina Faso sous Sankara (CNR, 1983-1987), CNR, FESPACO, apartheid, chute du mur de Berlin (1989), AES (Alliance des États du Sahel 2023-2024).

Format JSON: {"questions":[{"question":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"A","explanation":"..."}]}`,
  },
];

async function generateForBank(zai: any, bankKey: string, prompt: string): Promise<Question[]> {
  console.log(`\nGénération pour ${bankKey}...`);
  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      thinking: { type: "disabled" },
    });
    const response = completion?.choices?.[0]?.message?.content ?? "";
    const qs = parseQuestions(response);
    console.log(`  ${qs.length} questions valides générées`);
    return qs;
  } catch (e) {
    console.error(`  Erreur: ${(e as Error).message}`);
    return [];
  }
}

async function main() {
  const zai = await ZAI.create();
  let totalAdded = 0;

  for (const { bankKey, prompt } of PROMPTS) {
    const filePath = path.join(BANKS_DIR, `${bankKey}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`Banque ${bankKey} introuvable, ignorée.`);
      continue;
    }
    const bank = JSON.parse(fs.readFileSync(filePath, "utf-8")) as Bank;
    const existingCount = bank.questions.length;
    console.log(`${bankKey}: ${existingCount} questions existantes`);

    const newQs = await generateForBank(zai, bankKey, prompt);
    const merged = dedupe([...bank.questions, ...newQs]);
    const added = merged.length - existingCount;
    bank.questions = merged;

    fs.writeFileSync(filePath, JSON.stringify(bank, null, 2), "utf-8");
    console.log(`  ✓ ${bankKey}: ${existingCount} -> ${merged.length} (+${added})`);
    totalAdded += added;
  }

  console.log(`\n========== Total ajouté: ${totalAdded} questions ==========`);
}

main().catch((e) => {
  console.error("Erreur fatale:", e);
  process.exit(1);
});
