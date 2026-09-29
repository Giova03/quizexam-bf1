import { describe, it, expect } from "vitest";
import {
  questionViewForActor,
  type QuestionRow,
} from "../question-view";

function makeRow(partial: Partial<QuestionRow> = {}): QuestionRow {
  return {
    id: partial.id ?? "q1",
    question: partial.question ?? "Capitale du Burkina Faso ?",
    optionA: partial.optionA ?? "Ouagadougou",
    optionB: partial.optionB ?? "Bobo-Dioulasso",
    optionC: partial.optionC ?? "Koudougou",
    optionD: partial.optionD ?? "Banfora",
    correctAnswer: partial.correctAnswer ?? "A",
    correctAnswer2: partial.correctAnswer2 ?? null,
    explanation: partial.explanation ?? "Ouagadougou est la capitale.",
    difficulty: partial.difficulty ?? "easy",
  };
}

describe("questionViewForActor", () => {
  it("le staff voit la question complète (réponse + explication)", () => {
    const row = makeRow();
    const view = questionViewForActor(row, true);
    expect(view).toEqual(row);
    expect("correctAnswer" in view).toBe(true);
    expect("explanation" in view).toBe(true);
  });

  it("l'élève ne voit NI correctAnswer, NI correctAnswer2, NI explanation", () => {
    const view = questionViewForActor(makeRow(), false);
    expect("correctAnswer" in view).toBe(false);
    expect("correctAnswer2" in view).toBe(false);
    expect("explanation" in view).toBe(false);
  });

  it("l'élève voit toujours l'énoncé, les options et la difficulté", () => {
    const view = questionViewForActor(makeRow(), false);
    expect(view).toMatchObject({
      id: "q1",
      question: "Capitale du Burkina Faso ?",
      optionA: "Ouagadougou",
      optionB: "Bobo-Dioulasso",
      optionC: "Koudougou",
      optionD: "Banfora",
      difficulty: "easy",
    });
  });

  it("ne mute pas la ligne source (immuabilité)", () => {
    const row = makeRow();
    questionViewForActor(row, false);
    expect(row.correctAnswer).toBe("A");
    expect(row.explanation).not.toBe("");
  });

  it("JSON.stringify omet les clés masquées (contrat client identique au legacy)", () => {
    const json = JSON.parse(JSON.stringify(questionViewForActor(makeRow(), false)));
    expect(Object.keys(json).sort()).toEqual(
      [
        "difficulty",
        "id",
        "optionA",
        "optionB",
        "optionC",
        "optionD",
        "question",
      ].sort()
    );
  });
});
