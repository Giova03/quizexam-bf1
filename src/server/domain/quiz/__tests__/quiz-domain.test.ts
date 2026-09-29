import { describe, it, expect } from "vitest";
import {
  calculateScore,
  checkAnswer,
  calculatePercentage,
  isPassed,
  canTransition,
  deriveSessionStatus,
  canAcceptAnswer,
  transitionSession,
  shuffle,
  selectQuestions,
  applySm2,
  getDueCards,
  calculateXP,
  levelFromXP,
  xpToNextLevel,
  getMasteryLevel,
  type SessionAnswerEntity,
  type QuestionSnapshot,
  type SpacedCard,
} from "../quiz-domain";

function makeAnswer(partial: Partial<SessionAnswerEntity>): SessionAnswerEntity {
  return {
    id: partial.id ?? "a1",
    questionId: partial.questionId ?? "q1",
    userAnswer: partial.userAnswer ?? null,
    isCorrect: partial.isCorrect ?? null,
    answeredAt: partial.answeredAt ?? null,
  };
}

function makeQuestion(partial: Partial<QuestionSnapshot>): QuestionSnapshot {
  return {
    id: partial.id ?? "q1",
    question: partial.question ?? "Question ?",
    optionA: partial.optionA ?? "A",
    optionB: partial.optionB ?? "B",
    optionC: partial.optionC ?? "C",
    optionD: partial.optionD ?? "D",
    correctAnswer: partial.correctAnswer ?? "A",
    correctAnswer2: partial.correctAnswer2 ?? null,
    explanation: partial.explanation ?? "explication",
    difficulty: partial.difficulty ?? "medium",
  };
}

// ===== Scoring =====

describe("calculateScore", () => {
  it("compte uniquement les réponses correctement marquées", () => {
    const answers = [
      makeAnswer({ id: "1", isCorrect: true }),
      makeAnswer({ id: "2", isCorrect: false }),
      makeAnswer({ id: "3", isCorrect: true }),
      makeAnswer({ id: "4", isCorrect: null }), // non répondu
    ];
    expect(calculateScore(answers)).toBe(2);
  });

  it("retourne 0 pour une session vide", () => {
    expect(calculateScore([])).toBe(0);
  });
});

describe("checkAnswer", () => {
  it("valide la réponse unique", () => {
    expect(checkAnswer("A", { correctAnswer: "A", correctAnswer2: null })).toBe(true);
    expect(checkAnswer("B", { correctAnswer: "A", correctAnswer2: null })).toBe(false);
  });

  it("valide les questions à double réponse (correctAnswer2)", () => {
    expect(
      checkAnswer("C", { correctAnswer: "A", correctAnswer2: "C" }),
    ).toBe(true);
    expect(
      checkAnswer("D", { correctAnswer: "A", correctAnswer2: "C" }),
    ).toBe(false);
  });

  it("rejette une réponse quand correctAnswer2 est absent", () => {
    expect(checkAnswer("B", { correctAnswer: "A" })).toBe(false);
  });
});

describe("calculatePercentage / isPassed", () => {
  it("calcule le pourcentage arrondi", () => {
    expect(calculatePercentage(7, 10)).toBe(70);
    expect(calculatePercentage(1, 3)).toBe(33);
  });

  it("gère le total 0 sans division par zéro", () => {
    expect(calculatePercentage(0, 0)).toBe(0);
  });

  it("seuil de réussite à 50 %", () => {
    expect(isPassed(50)).toBe(true);
    expect(isPassed(49)).toBe(false);
    expect(isPassed(100)).toBe(true);
  });
});

// ===== State machine =====

describe("session state machine", () => {
  it("autorise les transitions valides", () => {
    expect(canTransition("created", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "completed")).toBe(true);
    expect(canTransition("in_progress", "abandoned")).toBe(true);
  });

  it("interdit les transitions invalides", () => {
    expect(canTransition("created", "completed")).toBe(false);
    expect(canTransition("completed", "in_progress")).toBe(false);
    expect(canTransition("abandoned", "in_progress")).toBe(false);
    expect(canTransition("completed", "abandoned")).toBe(false);
  });

  it("transitionSession lève sur une transition invalide", () => {
    expect(() =>
      transitionSession({ status: "completed" }, "in_progress"),
    ).toThrow(/Transition invalide/);
    expect(transitionSession({ status: "created" }, "in_progress")).toBe("in_progress");
  });
});

// ===== Question selection =====

describe("shuffle", () => {
  it("est déterministe avec une graine", () => {
    const a = shuffle([1, 2, 3, 4, 5, 6], 42);
    const b = shuffle([1, 2, 3, 4, 5, 6], 42);
    expect(a).toEqual(b);
  });

  it("conserve tous les éléments (simple permutation)", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const output = shuffle(input, 7);
    expect([...output].sort((x, y) => x - y)).toEqual(input);
  });

  it("ne mute pas l'entrée", () => {
    const input = [1, 2, 3];
    shuffle(input, 1);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe("selectQuestions", () => {
  const pool = [
    makeQuestion({ id: "1", difficulty: "easy" }),
    makeQuestion({ id: "2", difficulty: "hard" }),
    makeQuestion({ id: "3", difficulty: "medium" }),
    makeQuestion({ id: "4", difficulty: "easy" }),
  ];

  it("filtre par difficulté quand le pool filtré suffit", () => {
    const picked = selectQuestions(pool, 2, "easy");
    expect(picked).toHaveLength(2);
    expect(picked.every((q) => q.difficulty === "easy")).toBe(true);
  });

  it("replie sur tout le pool si la difficulté filtrée est insuffisante", () => {
    // 2 easy seulement, on en demande 3 → fallback documenté : piocher
    // count questions dans tout le pool (difficultés mélangées).
    const picked = selectQuestions(pool, 3, "easy");
    expect(picked).toHaveLength(3);
    // Pool = 2 easy + 1 medium + 1 hard → 3 questions piochées contiennent
    // forcément au moins une non-easy (principe des tiroirs).
    expect(picked.some((q) => q.difficulty !== "easy")).toBe(true);
  });

  it("limite au nombre demandé", () => {
    expect(selectQuestions(pool, 2)).toHaveLength(2);
    expect(selectQuestions(pool, 99)).toHaveLength(4);
  });
});

// ===== SM-2 =====

function makeCard(partial: Partial<SpacedCard> = {}): SpacedCard {
  return {
    questionId: "q1",
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: new Date(),
    lastReview: null,
    ...partial,
  };
}

describe("applySm2 (spaced repetition)", () => {
  it("premier succès : intervalle de 1 jour", () => {
    const card = applySm2(makeCard(), 5);
    expect(card.interval).toBe(1);
    expect(card.repetitions).toBe(1);
  });

  it("deuxième succès : intervalle de 6 jours", () => {
    const card = applySm2(makeCard({ repetitions: 1, interval: 1 }), 4);
    expect(card.interval).toBe(6);
    expect(card.repetitions).toBe(2);
  });

  it("succès suivants : intervalle multiplié par l'ease", () => {
    const card = applySm2(makeCard({ repetitions: 2, interval: 6, ease: 2.6 }), 5);
    // ease passe de 2.6 à 2.7 ; intervalle = round(6 * 2.7) = 16
    expect(card.ease).toBeCloseTo(2.7);
    expect(card.interval).toBe(16);
  });

  it("échec (quality < 3) : réinitialisation", () => {
    const card = applySm2(makeCard({ repetitions: 5, interval: 30 }), 2);
    expect(card.interval).toBe(1);
    expect(card.repetitions).toBe(0);
  });

  it("l'ease ne descend jamais sous 1.3", () => {
    let card = makeCard();
    for (let i = 0; i < 10; i++) {
      card = applySm2(card, 0);
    }
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("planifie la prochaine révision dans le futur", () => {
    const before = new Date();
    const card = applySm2(makeCard(), 5);
    expect(card.nextReview.getTime()).toBeGreaterThan(before.getTime());
    expect(card.lastReview).not.toBeNull();
  });
});

describe("getDueCards", () => {
  it("ne retourne que les cartes échues", () => {
    const past = new Date(Date.now() - 86_400_000);
    const future = new Date(Date.now() + 86_400_000);
    const due = getDueCards([
      makeCard({ questionId: "past", nextReview: past }),
      makeCard({ questionId: "future", nextReview: future }),
    ]);
    expect(due).toHaveLength(1);
    expect(due[0].questionId).toBe("past");
  });
});

// ===== XP & Gamification =====

describe("calculateXP", () => {
  it("10 XP par bonne réponse", () => {
    expect(calculateXP(3, 10)).toBe(30);
  });

  it("bonus +50 pour un sans-faute", () => {
    expect(calculateXP(10, 10)).toBe(150);
  });

  it("double XP pour le défi quotidien", () => {
    expect(calculateXP(3, 10, true)).toBe(60);
    expect(calculateXP(10, 10, true)).toBe(300);
  });

  it("pas de bonus sur session vide", () => {
    expect(calculateXP(0, 0)).toBe(0);
  });
});

describe("levels", () => {
  it("niveau 1 au départ", () => {
    expect(levelFromXP(0)).toBe(1);
    expect(levelFromXP(99)).toBe(1);
  });

  it("un niveau tous les 100 XP", () => {
    expect(levelFromXP(100)).toBe(2);
    expect(levelFromXP(250)).toBe(3);
  });

  it("XP restant jusqu'au niveau suivant", () => {
    expect(xpToNextLevel(0)).toBe(100);
    expect(xpToNextLevel(120)).toBe(80);
    expect(xpToNextLevel(199)).toBe(1);
  });
});

// ===== Mastery =====

describe("getMasteryLevel", () => {
  it("découverte quand aucune révision", () => {
    expect(getMasteryLevel(0.9, 0)).toBe("discovery");
  });

  it("apprentissage sous 30 % de réussite", () => {
    expect(getMasteryLevel(0.29, 5)).toBe("learning");
  });

  it("en cours entre 30 % et 60 %", () => {
    expect(getMasteryLevel(0.5, 5)).toBe("in_progress");
  });

  it("maîtrisé entre 60 % et 85 %", () => {
    expect(getMasteryLevel(0.7, 5)).toBe("mastered");
  });

  it("maintenance au-delà de 85 %", () => {
    expect(getMasteryLevel(0.95, 5)).toBe("maintenance");
  });
});

// ===== P3 : dérivation d'état + règle stricte de réponse =====

describe("deriveSessionStatus", () => {
  it("completedAt renseigné → completed", () => {
    expect(deriveSessionStatus(new Date("2026-09-30T10:00:00Z"))).toBe("completed");
  });

  it("completedAt null → in_progress", () => {
    expect(deriveSessionStatus(null)).toBe("in_progress");
  });
});

describe("canAcceptAnswer (P3 state machine stricte)", () => {
  it("accepte une réponse sur session ouverte", () => {
    expect(canAcceptAnswer("created")).toBe(true);
    expect(canAcceptAnswer("in_progress")).toBe(true);
  });

  it("refuse une réponse sur session figée", () => {
    expect(canAcceptAnswer("completed")).toBe(false);
    expect(canAcceptAnswer("abandoned")).toBe(false);
  });

  it("règle bout-en-bout : une session terminée n'accepte plus de réponses", () => {
    const completedAt = new Date();
    expect(canAcceptAnswer(deriveSessionStatus(completedAt))).toBe(false);
    expect(canAcceptAnswer(deriveSessionStatus(null))).toBe(true);
  });
});
