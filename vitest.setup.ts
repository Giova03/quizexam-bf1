/**
 * vitest.setup.ts — global setup for the vitest suite.
 *
 * Replaces the localStorage shim that used to live in the legacy runner
 * (scripts/run-tests.ts, removed in P3). Zustand's `persist` middleware
 * (favorites / prefs / quests / spaced-repetition stores) captures
 * `localStorage` at module-load time; on Node it is undefined, which makes
 * persist log a noisy "[zustand persist middleware]" warning on every state
 * change. Installing a minimal in-memory shim up-front keeps output clean.
 */

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

if (typeof globalThis.localStorage === "undefined") {
  (globalThis as { localStorage?: Storage }).localStorage =
    new MemStorage() as unknown as Storage;
}
