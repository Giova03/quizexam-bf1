/**
 * Bank Domain — education-level filter policy.
 *
 * Pure logic for the banks-list level filter. No Prisma, no Next, no React.
 *
 * The "TOUS" wildcard means "applies to every level" — banks tagged TOUS are
 * always returned regardless of the filter (so a bank tagged TOUS shows up
 * under BEPC, BAC, LICENCE and CONCOURS filters alike).
 */

/** Education levels supported by the platform. "TOUS" is the wildcard. */
export const BANK_EDUCATION_LEVELS = [
  "TOUS",
  "BEPC",
  "BAC",
  "LICENCE",
  "CONCOURS",
] as const;

export type BankEducationLevel = (typeof BANK_EDUCATION_LEVELS)[number];

const VALID_LEVELS = new Set<string>(BANK_EDUCATION_LEVELS);

/** Result of resolving the raw `?level=` query param. */
export type LevelFilter =
  | { kind: "all" }
  | { kind: "level_or_wildcard"; level: Exclude<BankEducationLevel, "TOUS"> };

/**
 * Resolve the raw `?level=` query param into a canonical filter:
 * - missing / invalid / "TOUS" → no filter (all banks);
 * - otherwise → banks whose `educationLevel` is the requested level OR
 *   the "TOUS" wildcard.
 *
 * Invalid values are silently treated as "no filter" (legacy behavior of
 * GET /api/banks — the route never 400'd on a bad level).
 */
export function resolveLevelFilter(
  rawLevel: string | null | undefined,
): LevelFilter {
  const level = rawLevel?.toUpperCase().trim() ?? "";

  if (!level || level === "TOUS" || !VALID_LEVELS.has(level)) {
    return { kind: "all" };
  }

  return {
    kind: "level_or_wildcard",
    level: level as Exclude<BankEducationLevel, "TOUS">,
  };
}

/** Human-safe cache-key fragment for a resolved filter. */
export function levelFilterCacheKey(filter: LevelFilter): string {
  return filter.kind === "all" ? "ALL" : filter.level;
}
