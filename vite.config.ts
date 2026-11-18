import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createGeneratedResolver, tailwindCssAlias } from "./scripts/generated-vite-resolver.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const generated = path.resolve(root, "..", "Wohnungsplaner_Generated");
const modules = path.join(generated, "dependencies", "node_modules");
const importDependency = async (relative: string) =>
  import(pathToFileURL(path.join(modules, relative)).href);
const vinext = (await importDependency("vinext/dist/index.js")).default;
const { defineConfig } = await importDependency("vite/dist/node/index.js");

const slash = (value: string) => value.replaceAll("\\", "/");
const generatedResolver = createGeneratedResolver();
const watchIgnored = [
  "**/Wohnungsplaner_Generated/**", "**/artifacts/**", "**/.local/**",
  "**/dist/**", "**/.next/**", "**/.vinext/**",
];
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: [],
  r2_buckets: [],
};
const serverWatch = {
  ignored: watchIgnored,
  ...(isCodexSeatbeltSandbox ? { useFsEvents: false, usePolling: true } : {}),
};

export default defineConfig(async () => {
  const shared = {
    resolve: {
      tsconfigPaths: false,
      alias: [tailwindCssAlias],
    },
    server: { watch: serverWatch },
    cacheDir: slash(path.join(generated, "cache", "vite")),
  };
  if (process.env.PLANNER_REVIEW_DEV === "1") {
    return { ...shared, plugins: [vinext(), generatedResolver] };
  }

  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= path.join(generated, "cache", "wrangler", "logs");
  process.env.MINIFLARE_REGISTRY_PATH ??= path.join(generated, "cache", "wrangler", "registry");

  const { cloudflare } = await importDependency("@cloudflare/vite-plugin/dist/index.mjs");
  return {
    ...shared,
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
      generatedResolver,
    ],
  };
});
