/**
 * List Banks Use Case — application layer.
 *
 * GET /api/banks business logic:
 * 1. Resolve the `?level=` filter through the BANK DOMAIN
 *    (`resolveLevelFilter` — "TOUS" wildcard, invalid values → no filter).
 * 2. Serve from the in-memory cache when warm (same cache keys as the
 *    legacy route), otherwise load through the repository and cache.
 *
 * The cache is an infrastructure detail owned here so the route stays thin;
 * the repository stays deterministic and the domain stays pure.
 */

import {
  resolveLevelFilter,
  levelFilterCacheKey,
} from "@/server/domain/banks/bank-domain";
import {
  cacheGet,
  cacheSet,
  CACHE_KEYS,
} from "@/lib/cache";
import { findBanksForFilter, type BankWithCount } from "@/server/infrastructure/repositories/bank-repository";

export type ListBanksResult = { kind: "ok"; banks: BankWithCount[] };

export async function listBanks(rawLevel: string | null): Promise<ListBanksResult> {
  const filter = resolveLevelFilter(rawLevel);

  // Cache key includes the level so different filters don't shadow each
  // other (identical keys to the legacy route).
  const cacheKey = `${CACHE_KEYS.banksList}:level=${levelFilterCacheKey(filter)}`;

  const cached = cacheGet<BankWithCount[]>(cacheKey);
  if (cached) return { kind: "ok", banks: cached };

  const banks = await findBanksForFilter(filter);
  cacheSet(cacheKey, banks);
  return { kind: "ok", banks };
}
