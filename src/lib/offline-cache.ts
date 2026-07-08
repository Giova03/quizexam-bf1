"use client";

/**
 * Offline data manager for QuizExam BF
 * Pre-caches bank data in localStorage so users can browse and read questions offline.
 */

const CACHE_PREFIX = "quizexam-offline-";
const BANKS_CACHE_KEY = `${CACHE_PREFIX}banks`;
const CACHE_TIMESTAMP_KEY = `${CACHE_PREFIX}timestamp`;

interface CachedBank {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  icon: string;
  color: string;
  level: string;
  _count: { questions: number };
  questions?: any[];
}

/**
 * Pre-cache the list of banks (metadata only) for offline browsing.
 */
export async function precacheBanksList(): Promise<void> {
  try {
    const res = await fetch("/api/banks");
    if (res.ok) {
      const banks = await res.json();
      if (Array.isArray(banks)) {
        localStorage.setItem(BANKS_CACHE_KEY, JSON.stringify(banks));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().toISOString());
      }
    }
  } catch {
    // Silent fail - will use existing cache
  }
}

/**
 * Pre-cache a specific bank's full questions for offline access.
 */
export async function precacheBankQuestions(bankId: string): Promise<void> {
  try {
    const res = await fetch(`/api/banks/${bankId}`);
    if (res.ok) {
      const bank = await res.json();
      if (bank && bank.questions) {
        localStorage.setItem(
          `${CACHE_PREFIX}bank-${bankId}`,
          JSON.stringify(bank)
        );
      }
    }
  } catch {
    // Silent fail
  }
}

/**
 * Get cached banks list for offline browsing.
 */
export function getCachedBanksList(): CachedBank[] {
  try {
    const data = localStorage.getItem(BANKS_CACHE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return [];
}

/**
 * Get a cached bank with its questions for offline access.
 */
export function getCachedBank(bankId: string): CachedBank | null {
  try {
    const data = localStorage.getItem(`${CACHE_PREFIX}bank-${bankId}`);
    if (data) return JSON.parse(data);
  } catch {}
  return null;
}

/**
 * Get the last cache timestamp.
 */
export function getCacheTimestamp(): string | null {
  try {
    return localStorage.getItem(CACHE_TIMESTAMP_KEY);
  } catch {
    return null;
  }
}

/**
 * Check if we have any cached data.
 */
export function hasOfflineData(): boolean {
  return getCachedBanksList().length > 0;
}

/**
 * Clear all offline cache.
 */
export function clearOfflineCache(): void {
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith(CACHE_PREFIX)
  );
  keys.forEach((k) => localStorage.removeItem(k));
}
