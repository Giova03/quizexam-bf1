/**
 * Smoke E2E — read-only, database-free. Runs anywhere (local, CI, prod)
 * without risking any data mutation. The full critical path (signup →
 * quiz → result) lives in critical-path.spec.ts behind E2E_FULL=1.
 */

import { test, expect } from "@playwright/test";

test.describe("Smoke — accès public", () => {
  test("la page d'accueil se charge avec le titre QuizExam BF", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/QuizExam BF/i);

    // The app is a client-side SPA: the root shell must render.
    await expect(page.locator("body")).toBeVisible();
  });

  test("le healthcheck /api/health répond ok:true", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean; db: string; ts: string };
    expect(body.ok).toBe(true);
    expect(body.ts).toBeTruthy();
    // db peut être "up" ou "down" selon l'environnement — on log seulement.
    test.info().annotations.push({ type: "info", description: `db: ${body.db}` });
  });

  test("NextAuth expose le CSRF (serveur d'auth opérationnel)", async ({ request }) => {
    const res = await request.get("/api/auth/csrf");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { csrfToken: string };
    expect(body.csrfToken).toBeTruthy();
  });
});
