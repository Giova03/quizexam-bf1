/**
 * Critical-path E2E (P7) — signup → login → quiz session → answers →
 * completion. Mirrors the platform's core promise: a student signs up,
 * starts a quiz from a bank, answers questions and gets a scored result.
 *
 * ⚠️  THESE TESTS WRITE TO THE DATABASE. They are SKIPPED unless:
 *      E2E_FULL=1
 *    Run them ONLY against a disposable/dev database (local Postgres or a
 *    dev Supabase branch), NEVER against production.
 *
 * Prerequisites (E2E_FULL=1):
 * - DATABASE_URL points to a dev DB
 * - at least one bank with questions exists (seed)
 *
 * Uses the API directly for setup speed (signup, login via NextAuth
 * credentials flow) and asserts the returned state — the smoke suite
 * covers the pure-UI layer.
 */

import { test, expect } from "@playwright/test";

const FULL = process.env.E2E_FULL === "1";
test.skip(FULL === false, "Écrit en DB — lancer avec E2E_FULL=1 contre une DB de dev uniquement.");

const UNIQUE_SUFFIX = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

interface SignupResponse {
  success?: boolean;
  user?: { id: string; email: string; name: string; role: string };
  error?: string;
}

test.describe("Parcours critique : signup → quiz → résultat", () => {
  let userEmail: string;
  let userPassword: string;

  test.beforeAll(async ({ request }) => {
    const suffix = UNIQUE_SUFFIX();
    userEmail = `e2e-${suffix}@quizexam-test.bf`;
    userPassword = `E2ePass-${suffix}`;

    const res = await request.post("/api/auth/signup", {
      data: { email: userEmail, name: `E2E ${suffix}`, password: userPassword },
    });
    const body = (await res.json()) as SignupResponse;
    if (!res.ok() && !/existe/i.test(body.error ?? "")) {
      throw new Error(`Signup E2E impossible: ${body.error ?? res.status()}`);
    }
  });

  test("signup → authentification → session de quiz → réponses → résultat", async ({ request }) => {
    // 1. Login via the NextAuth credentials flow (form-encoded + CSRF).
    const csrfRes = await request.get("/api/auth/csrf");
    expect(csrfRes.status()).toBe(200);
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

    const loginRes = await request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken,
        email: userEmail,
        password: userPassword,
        json: "true",
      },
    });
    expect([200, 302]).toContain(loginRes.status());

    // 2. Authenticated endpoint works → session cookie is valid.
    const subRes = await request.get("/api/subscription");
    expect(subRes.status()).toBe(200);
    const sub = (await subRes.json()) as { tier: string };
    expect(["free", "premium", "admin"]).toContain(sub.tier);

    // 3. Find a bank with questions (seeded dev DB).
    const banksRes = await request.get("/api/banks");
    expect(banksRes.status()).toBe(200);
    const banks = (await banksRes.json()) as Array<{
      id: string;
      questionCount?: number;
      count?: number;
    }>;
    const bankWithQuestions = banks.find(
      (b) => (b.questionCount ?? b.count ?? 0) > 0,
    );
    test.skip(
      !bankWithQuestions,
      "Aucune banque avec questions dans la DB de dev — seed d'abord.",
    );

    // 4. Start a quiz session from that bank.
    const sessionRes = await request.post("/api/sessions", {
      data: {
        sourceType: "bank",
        sourceId: bankWithQuestions!.id,
        count: 2,
        difficulty: "all",
      },
    });
    expect(sessionRes.status()).toBe(200);
    const session = (await sessionRes.json()) as {
      id: string;
      answers?: Array<{ id: string; questionId: string }>;
    };
    expect(session.id).toBeTruthy();

    // 5. Answer every question (pick option A — validity is what matters).
    const answers = session.answers ?? [];
    expect(answers.length).toBeGreaterThan(0);
    for (const answer of answers) {
      const patchRes = await request.patch(
        `/api/sessions/${session.id}/answers/${answer.id}`,
        { data: { userAnswer: "A" } },
      );
      expect(patchRes.status()).toBe(200);
    }

    // 6. Complete the session → scored result.
    const completeRes = await request.post(`/api/sessions/${session.id}/complete`);
    expect(completeRes.status()).toBe(200);
    const completed = (await completeRes.json()) as {
      completedAt?: string | null;
      score?: number;
    };
    expect(completed.completedAt).toBeTruthy();

    // 7. Strict state machine (P3): answering on a COMPLETED session → 409.
    const lateRes = await request.patch(
      `/api/sessions/${session.id}/answers/${answers[0].id}`,
      { data: { userAnswer: "B" } },
    );
    expect(lateRes.status()).toBe(409);
  });
});
