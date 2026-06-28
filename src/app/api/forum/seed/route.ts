import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/forum/seed
 *
 * Admin-only endpoint that initialises the forum with default topics across
 * every major subject taught on the platform. Each topic is created by the
 * calling admin user (so it has a valid authorId) and contains a welcoming
 * message explaining the topic's purpose.
 *
 * The endpoint is idempotent: if a topic with the exact same title already
 * exists, it is skipped (not duplicated). The response reports how many new
 * topics were created vs. how many already existed.
 */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

interface SeedTopic {
  title: string;
  category: string;
  content: string;
}

const SEED_TOPICS: SeedTopic[] = [
  {
    title: "Discussion Culture Générale",
    category: "general",
    content:
      "Bienvenue dans l'espace de discussion dédié à la culture générale ! 🌍\n\n" +
      "Ce sujet est ouvert à toutes les questions liées à l'actualité, l'histoire, la géographie, " +
      "la politique, l'économie et la culture du Burkina Faso et du monde.\n\n" +
      "N'hésitez pas à :\n" +
      "- Partager une actualité intéressante\n" +
      "- Poser une question sur un fait marquant\n" +
      "- Proposer des fiches de révision\n" +
      "- Échanger sur les thèmes fréquents des concours\n\n" +
      "Bonne discussion et bonnes révisions ! 🎓",
  },
  {
    title: "Aide en Droit",
    category: "question",
    content:
      "Besoin d'aide en droit ? ⚖️\n\n" +
      "Ce sujet rassemble les questions et entraide autour du droit (constitutionnel, " +
      "administratif, civil, pénal, international, etc.).\n\n" +
      "Vous pouvez :\n" +
      "- Demander une clarification sur une notion juridique\n" +
      "- Partager une jurisprudence importante\n" +
      "- Échanger des fiches de résumé\n" +
      "- Poser des questions sur les textes fondamentaux du Burkina Faso\n\n" +
      "Ensemble, devenons incollables en droit ! 📚",
  },
  {
    title: "Sciences et SVT",
    category: "question",
    content:
      "Espace d'entraide pour les sciences et la SVT 🔬\n\n" +
      "Discutez ici de biologie, géologie, physique-chimie et plus encore. " +
      "Que ce soit pour comprendre la génétique, les écosystèmes, la chimie organique " +
      "ou les phénomènes géologiques, vous êtes au bon endroit !\n\n" +
      "- Posez vos questions de cours\n" +
      "- Partagez des schémas et explications\n" +
      "- Entraidez-vous sur les exercices difficiles\n\n" +
      "Bonne révision scientifique ! 🧪",
  },
  {
    title: "Littérature et Langues",
    category: "question",
    content:
      "Bienvenue dans le salon Littérature & Langues 📖\n\n" +
      "Ce sujet est dédié à la littérature africaine, française et mondiale, ainsi qu'à " +
      "l'apprentissage des langues (français, anglais, langues nationales).\n\n" +
      "Échangeons sur :\n" +
      "- Les œuvres au programme des concours\n" +
      "- Les auteurs majeurs (Birago Diop, Cheikh Hamidou Kane, Senghor, etc.)\n" +
      "- La grammaire et l'orthographe\n" +
      "- Les techniques de dissertation et de commentaire\n\n" +
      "Bonne lecture et bons échanges ! ✍️",
  },
  {
    title: "Sciences Économiques",
    category: "general",
    content:
      "Forum des Sciences Économiques et Sociales 📊\n\n" +
      "Un espace pour discuter d'économie, de développement durable, de sociologie et " +
      "de gestion. Partagez vos analyses, demandez des clarifications sur des concepts " +
      "comme le PIB, l'inflation, la balance commerciale, etc.\n\n" +
      "Au programme :\n" +
      "- Économie générale et monétaire\n" +
      "- Développement durable et politiques publiques\n" +
      "- Sociologie et anthropologie\n" +
      "- Actualité économique du Burkina Faso et de l'AES\n\n" +
      "Bonne discussion ! 💹",
  },
  {
    title: "Tests Psychotechniques",
    category: "question",
    content:
      "Entraînement aux tests psychotechniques 🧠\n\n" +
      "Ce sujet regroupe toutes les questions relatives aux tests psychotechniques :\n" +
      "- Suites numériques et logiques\n" +
      "- Vocabulaire et orthographe\n" +
      "- Résolution de problèmes\n" +
      "- Tests d'attention et de concentration\n\n" +
      "Partagez vos astuces, vos méthodes de résolution rapide, et n'hésitez pas à " +
      "proposer des exercices d'entraînement aux autres membres !\n\n" +
      "Ensemble, progressons en logique ! 🔢",
  },
  {
    title: "Conseils de révision",
    category: "methode",
    content:
      "Conseils de révision et méthodologie 📝\n\n" +
      "Comment bien organiser ses révisions ? Quelles techniques utiliser pour mémoriser " +
      "efficacement ? Comment gérer son stress le jour J ?\n\n" +
      "Dans ce sujet, partagez vos meilleurs conseils :\n" +
      "- Planning et organisation du temps\n" +
      "- Techniques de mémorisation (flashcards, répétition espacée...)\n" +
      "- Gestion du stress et du sommeil\n" +
      "- Stratégies le jour de l'examen\n\n" +
      "Vos retours d'expérience sont précieux pour les autres candidats ! 💡",
  },
  {
    title: "Annonces et actualités",
    category: "general",
    content:
      "Annonces et actualités de la plateforme 📢\n\n" +
      "Ce sujet est destiné aux annonces officielles : nouveautés de la plateforme, " +
      "ouverture de nouveaux examens blancs, mises à jour des banques de questions, " +
      "et actualités importantes concernant les concours du Burkina Faso.\n\n" +
      "Les administrateurs publieront ici les informations importantes. " +
      "Vous pouvez également commenter pour poser des questions sur ces annonces.\n\n" +
      "Restez informés ! 🔔",
  },
];

export async function POST() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé (admin requis)" }, { status: 403 });
  }

  const adminId = (session.user as { id?: string }).id;
  if (!adminId) {
    return NextResponse.json(
      { error: "Session admin invalide (id manquant)" },
      { status: 401 }
    );
  }

  try {
    // Fetch existing topic titles in a single query to make the idempotency
    // check O(1) per topic instead of O(N) DB roundtrips.
    const existingTitles = new Set(
      (
        await db.forumTopic.findMany({
          where: { title: { in: SEED_TOPICS.map((t) => t.title) } },
          select: { title: true },
        })
      ).map((t) => t.title)
    );

    const created: string[] = [];
    const skipped: string[] = [];

    for (const seed of SEED_TOPICS) {
      if (existingTitles.has(seed.title)) {
        skipped.push(seed.title);
        continue;
      }
      await db.forumTopic.create({
        data: {
          title: seed.title,
          content: seed.content,
          category: seed.category,
          authorId: adminId,
        },
      });
      created.push(seed.title);
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      createdTitles: created,
      skippedTitles: skipped,
      message:
        created.length > 0
          ? `${created.length} sujet(s) créé(s)${skipped.length > 0 ? `, ${skipped.length} déjà existant(s)` : ""}`
          : "Tous les sujets par défaut existent déjà",
    });
  } catch (error) {
    console.error("Forum seed error:", error);
    return NextResponse.json(
      {
        error: "Échec de l'initialisation du forum",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
