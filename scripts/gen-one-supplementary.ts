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
    if (Array.isArray(p)) return p;
    if (p && Array.isArray(p.questions)) return p.questions;
  } catch {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      const p = JSON.parse(m[0]);
      if (p && Array.isArray(p.questions)) return p.questions;
    } catch {}
  }
  return [];
}

const bankKey = process.argv[2];
const prompt = process.argv[3];

if (!bankKey || !prompt) {
  console.error("Usage: bun run scripts/gen-one-supplementary.ts <bankKey> <prompt>");
  process.exit(1);
}

async function main() {
  const filePath = `${BANKS_DIR}/${bankKey}.json`;
  if (!fs.existsSync(filePath)) {
    console.error(`Bank not found: ${filePath}`);
    process.exit(1);
  }
  const bank = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`${bankKey}: ${bank.questions.length} existing`);

  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: "Tu es expert en QCM vérifiés et actualisés (juin 2025). Réponds en JSON valide uniquement, sans markdown." },
      { role: "user", content: prompt },
    ],
    thinking: { type: "disabled" },
  });
  const response = completion?.choices?.[0]?.message?.content ?? "";
  const newQs = parse(response);
  console.log(`Generated: ${newQs.length} valid questions`);

  const seen = new Set(bank.questions.map((q: Question) => q.question.toLowerCase()));
  let added = 0;
  for (const q of newQs) {
    if (!seen.has(q.question.toLowerCase()) && q.correctAnswer && ["A","B","C","D"].includes(q.correctAnswer)) {
      bank.questions.push(q);
      seen.add(q.question.toLowerCase());
      added++;
    }
  }
  fs.writeFileSync(filePath, JSON.stringify(bank, null, 2));
  console.log(`✓ ${bankKey}: ${bank.questions.length} total (+${added})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
