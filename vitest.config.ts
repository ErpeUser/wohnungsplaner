import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    testTimeout: 15000,
    include: ["tests/**/*.test.tsx"],
    setupFiles: ["./tests/setup.ts"],
  },
});
