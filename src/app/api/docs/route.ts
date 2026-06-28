import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/docs
<<<<<<< Updated upstream
 *
 * Returns API documentation as JSON — lists all public endpoints with
 * their HTTP methods, descriptions, and example request/response shapes.
 * Consumed by the in-app API Docs view (api-docs-view.tsx) and can also
 * be used by external integrators as a discovery endpoint.
 */
export async function GET() {
  return NextResponse.json({
    name: "QuizExam BF Public API",
    version: "1.0.0",
    baseUrl: "/api",
    authentication:
      "Most endpoints require a NextAuth session cookie. Public endpoints (/api/public/*) are open but rate-limited per IP.",
    rateLimit: {
      public: "30 requests / minute / IP",
      window: "60 seconds",
      enforcedBy: "in-memory counter (resets on server restart)",
    },
    apiKey: {
      note: "Mock API key for demo purposes. Pass as ?apiKey=QEBF-DEMO-KEY on public endpoints. Real authentication is via NextAuth session cookie on protected endpoints.",
      demoKey: "QEBF-DEMO-KEY",
    },
    endpoints: [
      {
        path: "/api/public/banks",
        method: "GET",
        auth: "none (rate-limited)",
        description:
          "Liste publique des banques de questions (métadonnées seulement, sans les réponses correctes).",
        params: [],
        example: {
          request: "GET /api/public/banks",
          response: {
            banks: [
              {
                id: "cmqoa8rqv0000l204kw1xqb2j",
                title: "Culture Générale — Burkina Faso",
                category: "Culture Générale",
                questionsCount: 24,
              },
            ],
            rateLimit: { limit: 30, remaining: 29, reset: 60 },
          },
        },
      },
      {
        path: "/api/public/questions",
        method: "GET",
        auth: "none (rate-limited)",
        description:
          "Liste publique des questions d'une banque. Les réponses correctes et les explications sont OMITTES pour éviter la triche.",
        params: [
          {
            name: "bankId",
            type: "string",
            required: true,
            description: "ID de la banque (récupérable via /api/public/banks).",
          },
        ],
        example: {
          request: "GET /api/public/questions?bankId=cmqoa8rqv0000l204kw1xqb2j",
          response: {
            questions: [
              {
                id: "q1",
                question: "Qui est le président du Faso ?",
                options: { A: "...", B: "...", C: "...", D: "..." },
              },
            ],
            rateLimit: { limit: 30, remaining: 28, reset: 60 },
          },
        },
      },
      {
        path: "/api/banks",
        method: "GET",
        auth: "session",
        description:
          "Liste authentifiée des banques avec compte de questions et icône/couleur.",
      },
      {
        path: "/api/questions",
        method: "GET",
        auth: "session",
        description:
          "Liste authentifiée des questions d'une banque, AVEC les bonnes réponses et explications.",
        params: [
          { name: "bankId", type: "string", required: true },
        ],
      },
      {
        path: "/api/sessions",
        method: "GET",
        auth: "session",
        description: "Sessions du user courant avec réponses détaillées.",
      },
      {
        path: "/api/sessions",
        method: "POST",
        auth: "session",
        description:
          "Crée une nouvelle session (bank ou exam) avec snapshot des questions. Soumis au quota freemium (50 questions/jour pour les free users).",
        body: {
          title: "string",
          mode: "'immediate' | 'final'",
          sourceType: "'bank' | 'exam'",
          sourceId: "string",
          difficulty: "'easy' | 'medium' | 'hard' | 'all' (optionnel)",
          questionIds: "string[] (optionnel, surcharge la sélection)",
        },
      },
      {
        path: "/api/subscription",
        method: "GET",
        auth: "session",
        description:
          "Renvoie le tier d'abonnement, le quota quotidien restant, et les features autorisées.",
      },
      {
        path: "/api/subscription",
        method: "POST",
        auth: "session",
        description:
          "Mock upgrade — passe le user en Premium (aucun paiement réel). Body: { tier: 'premium' | 'free' }.",
      },
      {
        path: "/api/ai-tutor",
        method: "POST",
        auth: "session + Premium",
        description:
          "Tuteur IA personnalisé. Analyse les zones de faiblesse et répond en français. Premium-only.",
        body: { question: "string", userHistory: "SessionAnswer[] (optionnel)" },
      },
      {
        path: "/api/certificate",
        method: "GET",
        auth: "session + Premium",
        description:
          "Génère les données d'un certificat de réussite pour une session terminée. Premium-only, score minimum 80%.",
        params: [{ name: "sessionId", type: "string", required: true }],
      },
      {
        path: "/api/certificate",
        method: "POST",
        auth: "session + Premium",
        description:
          "Génère et 'émet' un certificat (mock — pas de store séparé). Body: { sessionId: string }.",
      },
      {
        path: "/api/me/stats",
        method: "GET",
        auth: "session",
        description: "Statistiques personnelles + comparaison à la moyenne globale.",
      },
      {
        path: "/api/me",
        method: "GET",
        auth: "session",
        description: "Profil de l'utilisateur courant.",
      },
      {
        path: "/api/docs",
        method: "GET",
        auth: "none",
        description: "Cette documentation.",
      },
    ],
=======
 * Public API documentation for the QuizExam BF platform.
 */
export async function GET() {
  return NextResponse.json({
    name: "QuizExam BF API",
    version: "1.0.0",
    description:
      "API publique de la plateforme QuizExam BF — banques de questions et QCM pour la préparation aux concours du Burkina Faso.",
    baseUrl: "/api",
    authentication: {
      type: "NextAuth JWT (cookie)",
      note: "La plupart des routes requièrent une authentification. Les routes /api/public/* sont publiques et limitées en débit.",
    },
    rateLimit: {
      public: "60 requêtes / minute par IP",
      authenticated: "Illimité (sauf indication contraire)",
    },
    endpoints: {
      public: [
        {
          method: "GET",
          path: "/api/public/banks",
          description:
            "Liste publique des banques de questions (sans les questions détaillées).",
          params: [
            { name: "category", type: "string", required: false },
            { name: "limit", type: "number", required: false, default: 50 },
          ],
          rateLimited: true,
        },
        {
          method: "GET",
          path: "/api/public/questions",
          description:
            "Liste publique des questions d'une banque (sans la bonne réponse ni l'explication).",
          params: [
            { name: "bankId", type: "string", required: true },
            { name: "limit", type: "number", required: false, default: 20 },
          ],
          rateLimited: true,
        },
        {
          method: "GET",
          path: "/api/docs",
          description: "Cette documentation.",
        },
      ],
      auth: [
        {
          method: "GET",
          path: "/api/banks",
          description: "Liste complète des banques avec questions.",
        },
        {
          method: "GET",
          path: "/api/banks/[id]",
          description: "Détail d'une banque et de ses questions.",
        },
        {
          method: "GET | POST",
          path: "/api/sessions",
          description:
            "Sessions de l'utilisateur connecté. POST crée une nouvelle session (limité à 50 Q/jour en gratuit).",
        },
        {
          method: "GET | PATCH",
          path: "/api/profile/[userId]",
          description: "Profil public d'un utilisateur (PATCH: own profile only).",
        },
        {
          method: "GET | POST",
          path: "/api/referral",
          description: "Code de parrainage + statistiques.",
        },
        {
          method: "GET | POST",
          path: "/api/subscription",
          description: "Abonnement freemium (free/premium).",
        },
        {
          method: "GET | POST",
          path: "/api/certificate",
          description: "Certificats délivrés (score >= 80%).",
        },
        {
          method: "POST",
          path: "/api/ai-tutor",
          description: "Analyse IA des erreurs récentes.",
        },
        {
          method: "GET",
          path: "/api/export/anki?bankId=...",
          description: "Export CSV compatible Anki (Front;Back;Tags avec BOM).",
        },
      ],
    },
    schemas: {
      Bank: {
        id: "string (cuid)",
        title: "string",
        description: "string",
        category: "string",
        icon: "string (Lucide icon name)",
        color: "string (emerald|violet|amber|sky|rose|cyan|teal)",
        questionsCount: "number",
      },
      Question: {
        id: "string (cuid)",
        question: "string",
        options: "string[4] (A, B, C, D)",
        correctAnswer: "'A' | 'B' | 'C' | 'D' (omis sur la route publique)",
        explanation: "string (omis sur la route publique)",
        difficulty: "'easy' | 'medium' | 'hard'",
      },
    },
    examples: {
      listBanks: "curl /api/public/banks?category=Droit",
      getQuestions: "curl /api/public/questions?bankId=abc123&limit=10",
    },
    contact: {
      creator: "BAMOGO Pingdwendé Giovanni",
      email: "giobamos03@gmail.com",
    },
>>>>>>> Stashed changes
  });
}
