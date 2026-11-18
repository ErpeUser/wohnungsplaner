import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createGeneratedResolver, tailwindCssAlias } from "./scripts/generated-vite-resolver.mjs";

const root=path.dirname(fileURLToPath(import.meta.url));
const generated=path.resolve(root,"..","Wohnungsplaner_Generated");
const cliPath=path.join(generated,"dependencies","node_modules","vitest","dist","config.js");
const { defineConfig }=await import(pathToFileURL(cliPath).href);

export default defineConfig({
  plugins:[createGeneratedResolver()],
  resolve:{tsconfigPaths:false,alias:[tailwindCssAlias]},
  cacheDir:path.join(generated,"cache","vitest"),
  test:{
    environment:"jsdom",
    testTimeout:15000,
    maxWorkers:1,
    include:["tests/**/*.test.tsx"],
    setupFiles:["./tests/setup.ts"],
    coverage:{
      provider:"v8",
      reportsDirectory:path.join(generated,"reports","coverage"),
      include:["app/planner/**/*.{ts,tsx}"],
      exclude:["**/*.test.*","**/*.spec.*","**/*.d.ts"],
      reporter:["text-summary","json-summary","html"],
    },
  },
});
