/**
 * Get Bank Use Case — application layer.
 *
 * GET /api/banks/[id] business logic: load one bank with all of its
 * questions (ordered by `order`) through the repository, which also handles
 * the legacy raw-SQL media backfill (imageUrl / audioUrl).
 */

import { findBankWithQuestions } from "@/server/infrastructure/repositories/bank-repository";

export type GetBankResult =
  | { kind: "ok"; bank: NonNullable<Awaited<ReturnType<typeof findBankWithQuestions>>> }
  | { kind: "not_found" };

export async function getBank(id: string): Promise<GetBankResult> {
  const bank = await findBankWithQuestions(id);
  if (!bank) return { kind: "not_found" };
  return { kind: "ok", bank };
}
