#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const manifestPath = resolve(process.cwd(), "docs/chair-sources.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const urls = manifest.sources.map((source) => source.url);

if (process.argv.includes("--check")) {
  for (const source of manifest.sources) {
    if (!source.id || !source.url || !source.status) throw new Error(`Ungültiger Quelleneintrag: ${source.id ?? "ohne ID"}`);
    if (!Array.isArray(source.dimensions) || source.dimensions.length === 0) throw new Error(`Stuhlquelle ohne Maße: ${source.id}`);
    if (!Array.isArray(source.imageUrls) || source.imageUrls.length === 0) throw new Error(`Stuhlquelle ohne Bildbeleg: ${source.id}`);
  }
  console.log(`chair sources valid: ${manifest.sources.length}`);
  process.exit(0);
}

if (process.argv.includes("--fetch")) {
  const timeoutMs = Number(process.env.CRAWL_TIMEOUT_MS ?? 12_000);
  const results = await Promise.all(urls.map(async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": "wohnungsplaner-source-audit/1.0" } });
      return { url, status: response.status, finalUrl: response.url, contentType: response.headers.get("content-type") };
    } catch (error) {
      return { url, status: "error", error: error instanceof Error ? error.message : String(error) };
    } finally {
      clearTimeout(timeout);
    }
  }));
  const next = { ...manifest, lastFetch: new Date().toISOString(), fetchResults: results };
  await writeFile(manifestPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}

console.log(`${manifest.sources.length} normalized chair sources available`);
console.log(urls.join("\n"));
