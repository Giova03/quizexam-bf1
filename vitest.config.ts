import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Legacy suite (src/lib/__tests__) runs through its own dependency-free
    // runner: `bun run scripts/run-tests.ts` (see CI). Excluded here to keep
    // one runner per file — migration to vitest is scheduled for P3.
    exclude: ["src/lib/__tests__/**", "**/node_modules/**"],
    // Guard: fail the run when a test file is silently skipped.
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
