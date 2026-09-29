import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // P3: single runner — the legacy lib/ suite (src/lib/__tests__) now runs
    // under vitest too (converted from the dependency-free harness; the
    // runner scripts/run-tests.ts was removed). The localStorage shim these
    // tests need lives in vitest.setup.ts.
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**"],
    // Guard: fail the run when a test file is silently skipped.
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
