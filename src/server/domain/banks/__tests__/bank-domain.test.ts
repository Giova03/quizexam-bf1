import { describe, it, expect } from "vitest";
import {
  BANK_EDUCATION_LEVELS,
  resolveLevelFilter,
  levelFilterCacheKey,
} from "../bank-domain";

describe("BANK_EDUCATION_LEVELS", () => {
  it("contient le joker TOUS et les niveaux du BF", () => {
    expect(BANK_EDUCATION_LEVELS).toEqual([
      "TOUS",
      "BEPC",
      "BAC",
      "LICENCE",
      "CONCOURS",
    ]);
  });
});

describe("resolveLevelFilter", () => {
  it("paramètre absent → aucun filtre", () => {
    expect(resolveLevelFilter(null)).toEqual({ kind: "all" });
    expect(resolveLevelFilter(undefined)).toEqual({ kind: "all" });
    expect(resolveLevelFilter("")).toEqual({ kind: "all" });
  });

  it("TOUS (joker) → aucun filtre", () => {
    expect(resolveLevelFilter("TOUS")).toEqual({ kind: "all" });
    expect(resolveLevelFilter("tous")).toEqual({ kind: "all" });
  });

  it("valeur invalide → aucun filtre (comportement legacy : jamais de 400)", () => {
    expect(resolveLevelFilter("CEPE")).toEqual({ kind: "all" });
    expect(resolveLevelFilter("'; DROP TABLE --")).toEqual({ kind: "all" });
  });

  it("niveau valide → filtre niveau+joker, insensible à la casse/espaces", () => {
    expect(resolveLevelFilter("BAC")).toEqual({
      kind: "level_or_wildcard",
      level: "BAC",
    });
    expect(resolveLevelFilter("  bac  ")).toEqual({
      kind: "level_or_wildcard",
      level: "BAC",
    });
    expect(resolveLevelFilter("Licence")).toEqual({
      kind: "level_or_wildcard",
      level: "LICENCE",
    });
  });
});

describe("levelFilterCacheKey", () => {
  it("retourne ALL ou le niveau, stable pour le cache", () => {
    expect(levelFilterCacheKey({ kind: "all" })).toBe("ALL");
    expect(levelFilterCacheKey({ kind: "level_or_wildcard", level: "BAC" })).toBe(
      "BAC"
    );
  });
});
