/**
 * Mini-framework de test sans dépendance externe (pas de Jest).
 *
 * API :
 *   - test(name, fn)               enregistre un test synchrone
 *   - testAsync(name, fn)          enregistre un test asynchrone
 *   - expect(actual)               chaînable avec les matchers ci-dessous
 *
 * Matchers disponibles :
 *   - toBe(expected)               égalité stricte (===)
 *   - toEqual(expected)            égalité profonde (JSON)
 *   - toBeTruthy()                 booléen vrai
 *   - toBeFalsy()                  booléen faux
 *   - toBeNull()                   === null
 *   - toBeGreaterThan(n)           > n
 *   - toBeLessThan(n)              < n
 *   - toBeGreaterThanOrEqual(n)   >= n
 *   - toBeLessThanOrEqual(n)      <= n
 *   - toContain(value)             tableau contient value
 *   - toThrow(fn?)                 appel sous-jacent lève une erreur
 *
 * Exécution : `runAll()` exécute tous les tests enregistrés et renvoie
 * un résumé. Si au moins un test échoue, le processus sort avec code 1.
 */

type TestFn = () => void | Promise<void>;

interface TestCase {
  name: string;
  fn: TestFn;
  async: boolean;
}

const tests: TestCase[] = [];

export function test(name: string, fn: TestFn): void {
  tests.push({ name, fn, async: false });
}

export function testAsync(name: string, fn: TestFn): void {
  tests.push({ name, fn, async: true });
}

class Expectation<T> {
  constructor(private actual: T) {}

  toBe(expected: T): void {
    if (this.actual !== expected) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} to be ${JSON.stringify(expected)}`
      );
    }
  }

  toEqual(expected: unknown): void {
    const a = JSON.stringify(this.actual);
    const b = JSON.stringify(expected);
    if (a !== b) {
      throw new Error(`Expected ${a} to equal ${b}`);
    }
  }

  toBeTruthy(): void {
    if (!this.actual) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} to be truthy`);
    }
  }

  toBeFalsy(): void {
    if (this.actual) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} to be falsy`);
    }
  }

  toBeNull(): void {
    if (this.actual !== null) {
      throw new Error(`Expected ${JSON.stringify(this.actual)} to be null`);
    }
  }

  toBeGreaterThan(n: number): void {
    if (typeof this.actual !== "number" || this.actual <= n) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} to be greater than ${n}`
      );
    }
  }

  toBeLessThan(n: number): void {
    if (typeof this.actual !== "number" || this.actual >= n) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} to be less than ${n}`
      );
    }
  }

  toBeGreaterThanOrEqual(n: number): void {
    if (typeof this.actual !== "number" || this.actual < n) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} to be >= ${n}`
      );
    }
  }

  toBeLessThanOrEqual(n: number): void {
    if (typeof this.actual !== "number" || this.actual > n) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} to be <= ${n}`
      );
    }
  }

  toContain(value: unknown): void {
    if (
      !Array.isArray(this.actual) &&
      typeof this.actual !== "string"
    ) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} to be an array or string`
      );
    }
    if (!(this.actual as unknown[]).includes(value)) {
      throw new Error(
        `Expected ${JSON.stringify(this.actual)} to contain ${JSON.stringify(value)}`
      );
    }
  }

  toThrow(matcher?: RegExp): void {
    if (typeof this.actual !== "function") {
      throw new Error("toThrow expects a function");
    }
    let threw = false;
    let err: unknown = null;
    try {
      (this.actual as () => void)();
    } catch (e) {
      threw = true;
      err = e;
    }
    if (!threw) {
      throw new Error("Expected function to throw");
    }
    if (matcher && err instanceof Error) {
      if (!matcher.test(err.message)) {
        throw new Error(
          `Expected thrown error message "${err.message}" to match ${matcher}`
        );
      }
    }
  }
}

export function expect<T>(actual: T): Expectation<T> {
  return new Expectation(actual);
}

export interface TestRunResult {
  total: number;
  passed: number;
  failed: number;
  failures: { name: string; error: string }[];
}

export async function runAll(): Promise<TestRunResult> {
  let passed = 0;
  let failed = 0;
  const failures: { name: string; error: string }[] = [];

  for (const tc of tests) {
    try {
      await tc.fn();
      passed++;
      console.log(`  \u2713 ${tc.name}`);
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      failures.push({ name: tc.name, error: msg });
      console.log(`  \u2717 ${tc.name}`);
      console.log(`      \u2192 ${msg}`);
    }
  }

  const total = tests.length;
  console.log("");
  console.log(
    `R\u00e9sultats : ${passed}/${total} r\u00e9ussis, ${failed} \u00e9chou\u00e9s`
  );

  if (failed > 0) {
    console.log("\nD\u00e9tail des \u00e9checs :");
    for (const f of failures) {
      console.log(`  - ${f.name}`);
      console.log(`      ${f.error}`);
    }
  }

  // Reset tests pour permettre un re-run dans le m\u00eame processus
  tests.length = 0;

  return { total, passed, failed, failures };
}

// Helper pour grouper les tests
export function describe(groupName: string, fn: () => void): void {
  console.log(`\n${groupName}`);
  fn();
}
