import { describe, it, expect } from "vitest";
import {
  canTransitionQuestion,
  calculateQuality,
  questionSimilarity,
  findDuplicate,
} from "../question-domain";

// ===== Question lifecycle =====

describe("canTransitionQuestion", () => {
  it("parcours de rédaction complet", () => {
    expect(canTransitionQuestion("DRAFT", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionQuestion("UNDER_REVIEW", "APPROVED")).toBe(true);
    expect(canTransitionQuestion("APPROVED", "PUBLISHED")).toBe(true);
  });

  it("rejet et retour à la rédaction", () => {
    expect(canTransitionQuestion("UNDER_REVIEW", "REJECTED")).toBe(true);
    expect(canTransitionQuestion("REJECTED", "DRAFT")).toBe(true);
  });

  it("signalement d'une question publiée", () => {
    expect(canTransitionQuestion("PUBLISHED", "REPORTED")).toBe(true);
    expect(canTransitionQuestion("REPORTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionQuestion("REPORTED", "CORRECTED")).toBe(true);
    expect(canTransitionQuestion("CORRECTED", "PUBLISHED")).toBe(true);
  });

  it("interdit les sauts de statut", () => {
    expect(canTransitionQuestion("DRAFT", "PUBLISHED")).toBe(false);
    expect(canTransitionQuestion("DRAFT", "APPROVED")).toBe(false);
    expect(canTransitionQuestion("PUBLISHED", "UNDER_REVIEW")).toBe(false);
    expect(canTransitionQuestion("ARCHIVED", "PUBLISHED")).toBe(false);
  });

  it("statuts terminaux", () => {
    expect(canTransitionQuestion("PUBLISHED", "ARCHIVED")).toBe(true);
    expect(canTransitionQuestion("ARCHIVED", "DRAFT")).toBe(true); // seul retour possible
  });
});

// ===== Quality scoring =====

describe("calculateQuality", () => {
  const goodQuestion = {
    question: "Quelle est la capitale du Burkina Faso ?",
    optionA: "Ouagadougou",
    optionB: "Bobo-Dioulasso",
    optionC: "Koudougou",
    optionD: "Banfora",
    correctAnswer: "A",
    explanation: "Ouagadougou est la capitale politique.",
    source: "Géographie BF — manuel 3e",
  };

  it("une bonne question atteint un score élevé", () => {
    const q = calculateQuality(goodQuestion);
    expect(q.overall).toBeGreaterThanOrEqual(90);
    expect(q.warnings).toHaveLength(0);
  });

  it("signale une question trop courte", () => {
    const q = calculateQuality({ ...goodQuestion, question: "Capitale ?" });
    expect(q.clarity).toBeLessThan(100);
    expect(q.warnings).toContain("Question trop courte");
  });

  it("signale les espaces multiples", () => {
    const q = calculateQuality({
      ...goodQuestion,
      question: "Quelle est  la capitale  du Burkina Faso ?",
    });
    expect(q.spelling).toBeLessThan(100);
    expect(q.warnings).toContain("Espaces multiples détectés");
  });

  it("signale les options dupliquées", () => {
    const q = calculateQuality({
      ...goodQuestion,
      optionB: "ouagadougou", // dupliqué (insensible à la casse)
      optionC: "Ouagadougou", // dupliqué
    });
    expect(q.uniqueAnswer).toBe(30);
    expect(q.warnings).toContain("Options dupliquées détectées");
  });

  it("signale l'absence de source", () => {
    const q = calculateQuality({ ...goodQuestion, source: undefined });
    expect(q.hasSource).toBe(50);
    expect(q.warnings).toContain("Aucune source spécifiée");
  });
});

// ===== Duplicate detection =====

describe("questionSimilarity", () => {
  it("textes identiques → 1", () => {
    expect(
      questionSimilarity(
        "Quelle est la capitale du Burkina Faso ?",
        "Quelle est la capitale du Burkina Faso ?",
      ),
    ).toBe(1);
  });

  it("textes sans rapport → 0", () => {
    expect(
      questionSimilarity(
        "Quelle est la capitale du Burkina Faso ?",
        "Calculez l'intégrale de la fonction exponentielle.",
      ),
    ).toBe(0);
  });

  it("textes proches → similarité partielle", () => {
    const sim = questionSimilarity(
      "Quelle est la capitale du Burkina Faso ?",
      "Quelle est la capitale économique du Burkina Faso ?",
    );
    expect(sim).toBeGreaterThan(0.3);
    expect(sim).toBeLessThan(1);
  });

  it("texte vide → 0", () => {
    expect(questionSimilarity("", "Quelque chose ?")).toBe(0);
  });
});

describe("findDuplicate", () => {
  const existing = [
    { id: "q1", question: "Quelle est la capitale du Burkina Faso ?" },
    { id: "q2", question: "Calculez la dérivée de x au carré." },
  ];

  it("détecte un quasi-duplicat au-dessus du seuil", () => {
    const match = findDuplicate(
      "Quelle est la capitale du Burkina Faso ?",
      existing,
      0.85,
    );
    expect(match).not.toBeNull();
    expect(match?.id).toBe("q1");
    expect(match?.similarity).toBeGreaterThanOrEqual(0.85);
  });

  it("ignore les questions différentes", () => {
    const match = findDuplicate(
      "Quel est le plus grand océan du monde ?",
      existing,
      0.85,
    );
    expect(match).toBeNull();
  });

  it("choisit le meilleur candidat", () => {
    const match = findDuplicate(
      "Quelle est la capitale du Burkina Faso ?",
      [
        ...existing,
        { id: "q3", question: "Quelle est la capitale du Burkina Faso?" },
      ],
      0.85,
    );
    expect(match?.id).toBe("q1"); // similarité maximale (texte identique)
  });
});
