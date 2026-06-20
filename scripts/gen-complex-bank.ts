/**
 * Génère des QCM complexes via LLM pour une banque spécifique.
 * Usage: bun run scripts/gen-complex-bank.ts <bankKey> <subject> <count>
 */
import ZAI from "z-ai-web-dev-sdk";
import * as fs from "fs";

const BANKS_DIR = "/home/z/my-project/scripts/generated/banks";

interface Question {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  correctAnswer2?: string;
  explanation: string;
}

function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json|JSON)?\s*/, "").replace(/```\s*$/, "");
  }
  return t.trim();
}

function parse(content: string): Question[] {
  if (!content) return [];
  const cleaned = stripFences(content);
  try {
    const p = JSON.parse(cleaned);
    if (Array.isArray(p)) return p.filter(isValid);
    if (p && Array.isArray(p.questions)) return p.questions.filter(isValid);
  } catch {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const p = JSON.parse(m[0]);
      if (p && Array.isArray(p.questions)) return p.questions.filter(isValid);
    } catch {}
  }
  const arrM = cleaned.match(/\[[\s\S]*\]/);
  if (arrM) {
    try {
      const p = JSON.parse(arrM[0]);
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
  if (!["A", "B", "C", "D"].includes(q.correctAnswer)) return false;
  const opts = [q.optionA, q.optionB, q.optionC, q.optionD].map((s: string) => s.trim().toLowerCase());
  if (new Set(opts).size < 4) return false;
  return true;
}

function dedupe(qs: Question[]): Question[] {
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const q of qs) {
    const key = q.question.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 100);
    if (!seen.has(key)) { seen.add(key); out.push(q); }
  }
  return out;
}

async function genBatch(zai: any, prompt: string): Promise<Question[]> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: "Tu es un expert en création de QCM complexes pour la préparation aux concours. Réponds en JSON valide uniquement, sans markdown. Chaque question doit avoir EXACTEMENT 4 options distinctes (A,B,C,D) et une seule réponse correcte." },
          { role: "user", content: prompt },
        ],
        thinking: { type: "disabled" },
      });
      const response = completion?.choices?.[0]?.message?.content ?? "";
      return parse(response);
    } catch (e) {
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
    }
  }
  return [];
}

async function main() {
  const bankKey = process.argv[2];
  const subject = process.argv[3];
  const count = parseInt(process.argv[4] || "30");
  if (!bankKey || !subject) { console.error("Usage: bun run scripts/gen-complex-bank.ts <bankKey> <subject> <count>"); process.exit(1); }

  const filePath = `${BANKS_DIR}/${bankKey}.json`;
  let bank: any;
  if (fs.existsSync(filePath)) {
    bank = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    console.log(`${bankKey}: ${bank.questions.length} existing`);
  } else {
    bank = { bankKey, title: subject, description: subject, category: "", questions: [] };
  }

  const zai = await ZAI.create();
  const allNew: Question[] = [];
  const batches = Math.ceil(count / 20);
  for (let b = 0; b < batches; b++) {
    const batchCount = Math.min(20, count - b * 20);
    const prompt = `Génère ${batchCount} questions QCM complexes sur: ${subject}\n\nEXIGENCES:\n- Questions de niveau concours/universitaire\n- 4 options A, B, C, D distinctes\n- Une seule réponse correcte\n- Explication concise\n\nFormat JSON STRICT:\n{"questions":[{"question":"...","optionA":"...","optionB":"...","optionC":"...","optionD":"...","correctAnswer":"A","explanation":"..."}]}`;
    console.log(`  Batch ${b + 1}/${batches}...`);
    const qs = await genBatch(zai, prompt);
    console.log(`    -> ${qs.length} valid`);
    allNew.push(...qs);
  }

  const merged = dedupe([...bank.questions, ...allNew]);
  const added = merged.length - bank.questions.length;
  bank.questions = merged;
  fs.writeFileSync(filePath, JSON.stringify(bank, null, 2));
  console.log(`✓ ${bankKey}: ${bank.questions.length} total (+${added})`);
}

main().catch(e => { console.error(e); process.exit(1); });
