import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const db = new PrismaClient()

interface SeedQuestion {
  question: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  explanation: string
  difficulty?: string
}

interface SeedBank {
  bankKey: string
  title: string
  description: string
  category: string
  icon: string
  color: string
  questions: SeedQuestion[]
}

const BANKS_DIR = path.join(process.cwd(), 'scripts', 'generated', 'banks')

async function main() {
  console.log('Starting seed...')
  
  // Wipe existing data
  await db.sessionAnswer.deleteMany()
  await db.quizSession.deleteMany()
  await db.examQuestion.deleteMany()
  await db.exam.deleteMany()
  await db.question.deleteMany()
  await db.questionBank.deleteMany()
  await db.document.deleteMany()
  console.log('Wiped existing data')
  
  // Read bank files
  const files = fs.readdirSync(BANKS_DIR).filter(f => f.endsWith('.json') && f !== 'summary.json')
  console.log(`Found ${files.length} bank files`)
  
  let totalQuestions = 0
  let banksCreated = 0
  
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(BANKS_DIR, file), 'utf-8')
      const bank = JSON.parse(raw) as SeedBank
      if (!bank.questions || bank.questions.length === 0) continue
      
      const created = await db.questionBank.create({
        data: {
          title: bank.title,
          description: bank.description,
          category: bank.category,
          icon: bank.icon || 'BookOpen',
          color: bank.color || 'emerald',
          questions: {
            create: bank.questions.map((q, idx) => ({
              order: idx,
              question: q.question,
              optionA: q.optionA,
              optionB: q.optionB,
              optionC: q.optionC,
              optionD: q.optionD,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              difficulty: q.difficulty || 'medium',
            })),
          },
        },
      })
      
      totalQuestions += bank.questions.length
      banksCreated++
      console.log(`  ${bank.title}: ${bank.questions.length} questions`)
    } catch (e) {
      console.error(`  Error with ${file}:`, e)
    }
  }
  
  console.log(`\nSeed complete: ${banksCreated} banks, ${totalQuestions} questions`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
