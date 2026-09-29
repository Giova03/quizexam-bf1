#!/usr/bin/env node
/**
 * Réinitialisation du mot de passe admin — QuizExam BF.
 *
 * Usage :
 *   DATABASE_URL="postgresql://postgres:MotDePasse@db.xxxx.supabase.co:5432/postgres" \
 *     node scripts/reset-admin-password.cjs
 *
 * Options :
 *   --email <email>     Compte cible (défaut : ADMIN_EMAIL ou giobamos03@gmail.com)
 *   --password <mdp>    Nouveau mot de passe (défaut : QuizExam@2026-BF)
 *
 * Le compte est créé s'il n'existe pas, promu ADMIN, et son hash bcrypt est
 * remplacé. Aucun autre champ n'est touché (sessions, XP, banques… intacts).
 */

const bcrypt = require("bcryptjs");

const DEFAULT_EMAIL = process.env.ADMIN_EMAIL || "giobamos03@gmail.com";
const DEFAULT_PASSWORD = "QuizExam@2026-BF";

function parseArgs(argv) {
  const out = { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--email") out.email = argv[++i];
    else if (argv[i] === "--password") out.password = argv[++i];
  }
  return out;
}

// Chargement minimal d'un .env local (sans dépendance) si DATABASE_URL absente.
function loadDotEnv() {
  if (process.env.DATABASE_URL) return;
  try {
    const fs = require("node:fs");
    const path = require("node:path");
    const envPath = path.join(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?\s*$/);
      if (m) {
        process.env.DATABASE_URL = m[1].trim();
        console.log("DATABASE_URL chargée depuis .env");
        return;
      }
    }
  } catch {
    /* ignore */
  }
}

async function main() {
  const { email, password } = parseArgs(process.argv);
  loadDotEnv();

  if (!process.env.DATABASE_URL) {
    console.error(
      "✗ DATABASE_URL manquante.\n" +
        "  Exécutez :\n" +
        '  DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@db.VOTRE_REF.supabase.co:5432/postgres" ' +
        "node scripts/reset-admin-password.cjs\n" +
        "  (Supabase Dashboard → Project Settings → Database → Connection string → URI)",
    );
    process.exit(1);
  }

  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient();

  try {
    const hash = await bcrypt.hash(password, 10);
    const cleanEmail = email.trim().toLowerCase();

    const existing = await db.user.findUnique({ where: { email: cleanEmail } });

    if (existing) {
      await db.user.update({
        where: { id: existing.id },
        data: { passwordHash: hash, role: "ADMIN" },
      });
      console.log("✓ Mot de passe réinitialisé + rôle ADMIN confirmé.");
      console.log(`  Email     : ${cleanEmail}`);
      console.log(`  Nouveau mdp : ${password}`);
      console.log("  (sessions, XP, banques et données du compte : intactes)");
    } else {
      // Création : le referralCode a un default Prisma (cuid), les autres
      // champs ont des défauts côté schéma.
      await db.user.create({
        data: {
          email: cleanEmail,
          name: "Administrateur",
          passwordHash: hash,
          role: "ADMIN",
        },
      });
      console.log("✓ Compte admin créé.");
      console.log(`  Email     : ${cleanEmail}`);
      console.log(`  Nouveau mdp : ${password}`);
    }
    console.log("\n→ Connectez-vous sur le site avec cet email et ce mot de passe.");
  } catch (err) {
    console.error("✗ Échec :", err.message);
    if (/does not exist in the current database/i.test(err.message)) {
      console.error(
        "\n  La base n'est pas à jour (colonnes manquantes). Exécutez d'abord :\n" +
          "    npx prisma db push\n" +
          "  ou collez prisma/manual-migration-2026-09.sql dans Supabase → SQL Editor.",
      );
    }
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
