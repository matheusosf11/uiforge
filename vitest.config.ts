import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: [...configDefaults.exclude, "e2e/**", ".next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.*", "src/components/ui/**"],
      // CI floor (npm run test:coverage): a little under the current numbers
      // so a change that drops coverage noticeably fails the build. Raise it
      // as coverage grows; never lower it to make a change pass.
      thresholds: {
        statements: 79,
        branches: 80,
        functions: 79,
        lines: 81,
      },
    },
  },
});
