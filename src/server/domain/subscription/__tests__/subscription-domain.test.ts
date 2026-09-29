import { describe, it, expect } from "vitest";
import {
  getTier,
  getLimits,
  canPerform,
  hasRemainingQuestions,
  remainingQuestions,
  SUBSCRIPTION_LIMITS,
} from "../subscription-domain";

describe("getTier", () => {
  it("un admin est toujours tier admin", () => {
    expect(getTier("ADMIN", "free")).toBe("admin");
    expect(getTier("SUPER_ADMIN", undefined)).toBe("admin");
  });

  it("un utilisateur premium est premium", () => {
    expect(getTier("VISITOR", "premium")).toBe("premium");
  });

  it("par défaut : free", () => {
    expect(getTier("VISITOR", "free")).toBe("free");
    expect(getTier(undefined, undefined)).toBe("free");
  });
});

describe("getLimits / SUBSCRIPTION_LIMITS", () => {
  it("free est limité à 50 questions/jour", () => {
    expect(SUBSCRIPTION_LIMITS.free.dailyQuestionLimit).toBe(50);
  });

  it("premium et admin sont illimités", () => {
    expect(SUBSCRIPTION_LIMITS.premium.dailyQuestionLimit).toBe(Infinity);
    expect(SUBSCRIPTION_LIMITS.admin.dailyQuestionLimit).toBe(Infinity);
  });

  it("les fonctionnalités premium sont verrouillées en free", () => {
    expect(SUBSCRIPTION_LIMITS.free.canUploadPdf).toBe(false);
    expect(SUBSCRIPTION_LIMITS.free.canUseAiTutor).toBe(false);
    expect(SUBSCRIPTION_LIMITS.free.canGetCertificates).toBe(false);
    expect(SUBSCRIPTION_LIMITS.free.canUseSpacedRepetition).toBe(false);
    expect(SUBSCRIPTION_LIMITS.free.canUseAdaptiveQuiz).toBe(false);
  });

  it("premium débloque tout", () => {
    const limits = SUBSCRIPTION_LIMITS.premium;
    expect(limits.canUploadPdf).toBe(true);
    expect(limits.canUseAiTutor).toBe(true);
    expect(limits.canGetCertificates).toBe(true);
    expect(limits.canViewAdvancedStats).toBe(true);
    expect(limits.canExportAnki).toBe(true);
  });

  it("getLimits renvoie les limites du tier demandé", () => {
    expect(getLimits("free")).toBe(SUBSCRIPTION_LIMITS.free);
    expect(getLimits("premium")).toBe(SUBSCRIPTION_LIMITS.premium);
  });
});

describe("canPerform", () => {
  it("refuse les actions verrouillées en free", () => {
    expect(canPerform("free", "canUploadPdf")).toBe(false);
    expect(canPerform("free", "canUseAiTutor")).toBe(false);
  });

  it("accepte les actions débloquées", () => {
    expect(canPerform("premium", "canUploadPdf")).toBe(true);
    expect(canPerform("admin", "canGetCertificates")).toBe(true);
  });

  it("les quotas numériques positifs sont autorisés", () => {
    // canUseOfflineBanks = 1 en free (> 0)
    expect(canPerform("free", "canUseOfflineBanks")).toBe(true);
  });
});

describe("daily quota", () => {
  it("hasRemainingQuestions", () => {
    expect(hasRemainingQuestions("free", 0)).toBe(true);
    expect(hasRemainingQuestions("free", 49)).toBe(true);
    expect(hasRemainingQuestions("free", 50)).toBe(false);
    expect(hasRemainingQuestions("free", 80)).toBe(false);
  });

  it("premium n'a jamais de limite", () => {
    expect(hasRemainingQuestions("premium", 10_000)).toBe(true);
    expect(remainingQuestions("premium", 10_000)).toBe(Infinity);
  });

  it("remainingQuestions décompte correctement", () => {
    expect(remainingQuestions("free", 0)).toBe(50);
    expect(remainingQuestions("free", 30)).toBe(20);
    expect(remainingQuestions("free", 60)).toBe(0); // jamais négatif
  });
});
