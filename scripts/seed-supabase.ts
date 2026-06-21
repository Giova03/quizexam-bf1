import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as fs from 'fs'
import * as path from 'path'

const db = new PrismaClient()

interface SeedQuestion {
  question: string; optionA: string; optionB: string; optionC: string; optionD: string
  correctAnswer: string; correctAnswer2?: string; explanation: string; level?: string
}
interface SeedBank {
  bankKey: string; title: string; description: string; category: string
  subcategory?: string; icon: string; color: string; level?: string
  questions: SeedQuestion[]
}

const BANKS_DIR = '/home/z/my-project/scripts/generated/banks'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const EXAM_DEFS = [
  { title: "Concours Administratif (50Q)", description: "Culture, histoire, géo, français.", durationMin: 60,
    distribution: [{bankKey:"culture-bf",count:14},{bankKey:"histoire",count:10},{bankKey:"geographie",count:10},{bankKey:"francais",count:9},{bankKey:"psycho-logique",count:7}] },
  { title: "Tests Psychotechniques (50Q)", description: "Logique et vocabulaire.", durationMin: 50,
    distribution: [{bankKey:"psycho-logique",count:25},{bankKey:"psycho-vocabulaire",count:25}] },
  { title: "Culture Générale & Économie (50Q)", description: "Culture BF, économie, géo.", durationMin: 60,
    distribution: [{bankKey:"culture-bf",count:15},{bankKey:"economie",count:15},{bankKey:"geographie",count:12},{bankKey:"histoire",count:8}] },
  { title: "Sciences & SVT (50Q)", description: "SVT, physique-chimie, médecine.", durationMin: 60,
    distribution: [{bankKey:"svt-lycee",count:13},{bankKey:"physique-chimie-lycee",count:13},{bankKey:"analyse-biomedicale",count:12},{bankKey:"soins-infirmiers",count:12}] },
  { title: "Informatique & Réseaux (50Q)", description: "Algo, Python, BDD, réseau, sécurité.", durationMin: 60,
    distribution: [{bankKey:"info-algorithmique",count:10},{bankKey:"info-python",count:10},{bankKey:"info-bdd",count:10},{bankKey:"reseau-telecom",count:10},{bankKey:"securite-informatique",count:10}] },
  { title: "Mathématiques (50Q)", description: "Collège, lycée, analyse, proba.", durationMin: 60,
    distribution: [{bankKey:"math-college",count:12},{bankKey:"math-lycee",count:13},{bankKey:"math-analyse",count:8},{bankKey:"math-proba-stats",count:9},{bankKey:"statistique",count:8}] },
  { title: "Droit & Justice (50Q)", description: "Droit civil, public, pénal, travail, international.", durationMin: 60,
    distribution: [{bankKey:"droit-civil",count:12},{bankKey:"droit-public",count:10},{bankKey:"droit-penal",count:10},{bankKey:"droit-travail",count:10},{bankKey:"droit-international",count:8}] },
  { title: "Médecine & Santé (50Q)", description: "Analyses, imagerie, soins, maintenance.", durationMin: 60,
    distribution: [{bankKey:"analyse-biomedicale",count:12},{bankKey:"imagerie-medicale",count:10},{bankKey:"soins-infirmiers",count:10},{bankKey:"maintenance-biomedicale",count:8},{bankKey:"svt-lycee",count:10}] },
  { title: "Psychotechnique Avancée (40Q)", description: "Logique, formes, jeux.", durationMin: 40,
    distribution: [{bankKey:"psycho-logique",count:12},{bankKey:"psycho-vocabulaire",count:10},{bankKey:"psycho-formes",count:10},{bankKey:"psycho-jeux",count:8}] },
  { title: "Express Toutes Matières (25Q)", description: "Toutes matières.", durationMin: 30,
    distribution: [{bankKey:"culture-bf",count:5},{bankKey:"histoire",count:3},{bankKey:"francais",count:3},{bankKey:"geographie",count:3},{bankKey:"math-lycee",count:3},{bankKey:"svt-lycee",count:3},{bankKey:"economie",count:2},{bankKey:"psycho-jeux",count:3}] },
]

async function main() {
  console.log('Connected to Supabase!')
  
  // Create admin
  const adminEmail = 'giobamos03@gmail.com'
  const existing = await db.user.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    const hash = await bcrypt.hash('Giov@12342005', 10)
    await db.user.create({ data: { email: adminEmail, name: 'Administrateur', passwordHash: hash, role: 'ADMIN' } })
    console.log('✓ Admin created')
  } else {
    console.log('✓ Admin already exists')
  }

  // Clean data (preserve users)
  await db.sessionAnswer.deleteMany()
  await db.quizSession.deleteMany()
  await db.examQuestion.deleteMany()
  await db.exam.deleteMany()
  await db.question.deleteMany()
  await db.questionBank.deleteMany()
  await db.document.deleteMany()
  console.log('✓ Cleaned old data')

  // Read banks
  const files = fs.readdirSync(BANKS_DIR).filter(f => f.endsWith('.json') && f !== 'summary.json')
  const banks: SeedBank[] = []
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(BANKS_DIR, file), 'utf-8')
      const bank = JSON.parse(raw) as SeedBank
      if (bank.questions && bank.questions.length > 0) banks.push(bank)
    } catch (e) { console.error(`Failed: ${file}`) }
  }
  console.log(`✓ Read ${banks.length} banks`)

  // Create banks and questions
  const bankIdMap = new Map<string, string>()
  let totalQ = 0
  for (const sb of banks) {
    const bank = await db.questionBank.create({
      data: {
        title: sb.title, description: sb.description, category: sb.category,
        subcategory: sb.subcategory || '', icon: sb.icon, color: sb.color, level: sb.level || 'TOUS',
        questions: {
          create: sb.questions.map((q, i) => ({
            order: i, question: q.question, optionA: q.optionA, optionB: q.optionB,
            optionC: q.optionC, optionD: q.optionD, correctAnswer: q.correctAnswer,
            correctAnswer2: q.correctAnswer2 || null, explanation: q.explanation, level: q.level || sb.level || 'TOUS'
          }))
        }
      }
    })
    bankIdMap.set(sb.bankKey, bank.id)
    totalQ += sb.questions.length
  }
  console.log(`✓ Created ${banks.length} banks, ${totalQ} questions`)

  // Create exams
  let examCount = 0
  for (const ed of EXAM_DEFS) {
    const selected: {questionId: string; order: number}[] = []
    let order = 0
    for (const d of ed.distribution) {
      const bid = bankIdMap.get(d.bankKey)
      if (!bid) continue
      const qs = await db.question.findMany({ where: { bankId: bid }, select: { id: true } })
      const sampled = shuffle(qs).slice(0, d.count)
      for (const q of sampled) selected.push({ questionId: q.id, order: order++ })
    }
    if (selected.length === 0) continue
    await db.exam.create({
      data: { title: ed.title, description: ed.description, durationMin: ed.durationMin,
        examQuestions: { create: selected.map(s => ({ questionId: s.questionId, order: s.order })) }
      }
    })
    examCount++
  }
  console.log(`✓ Created ${examCount} exams`)
  console.log(`\nDONE! ${banks.length} banks, ${totalQ} questions, ${examCount} exams`)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
