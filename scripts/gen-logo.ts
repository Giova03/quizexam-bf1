import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

const PROMPT = "Ultra modern minimalist logo for an education quiz platform called QuizExam BF, abstract geometric design combining a graduation cap silhouette with a checkmark and book pages, vibrant emerald green and teal gradient with subtle gold accent, clean flat vector style, pure white background, professional tech brand identity, centered square composition, crisp edges, no text, high quality";

async function main() {
  const zai = await ZAI.create();
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Attempt ${attempt}...`);
      const response = await zai.images.generations.create({
        prompt: PROMPT,
        size: '1024x1024',
      });
      const b64 = response.data[0].base64;
      const buffer = Buffer.from(b64, 'base64');
      fs.writeFileSync('./public/logo-quizexam.png', buffer);
      console.log(`✓ Logo saved (${buffer.length} bytes)`);
      return;
    } catch (e) {
      console.error(`Attempt ${attempt} failed:`, (e as Error).message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
    }
  }
  process.exit(1);
}
main();
