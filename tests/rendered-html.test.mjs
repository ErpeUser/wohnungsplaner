import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the restored previous room version", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Raumplaner · Wohnung<\/title>/i);
  assert.match(html, /Vorige Version · wiederhergestellt/);
  assert.match(html, /Tisch 129 × 55 cm an der oberen Wand, Blickrichtung Tür/);
  assert.match(html, /Liegefläche 120 × 200 · außen 142 × 220/);
  assert.match(html, /7 cm bis Tisch · 84 cm vor offener Schranktür/);
  assert.match(html, /Vorige Version neu laden/);
  assert.match(html, /Vorhänge und gestaffelte Wandboards neben dem Tisch/);
});

test("offers the restored version and a separate ground reset", async () => {
  const html = await (await render()).text();
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  assert.match(html, /Vorige Version neu laden/);
  assert.match(html, /Bett \+ Deko entfernen/);
  assert.doesNotMatch(html, />Bett \+ Deko laden</);
  assert.match(source, /createSavedPreDecorSnapshot/);
  assert.match(source, /createBaseFurniture/);
  assert.match(source, /createDecoratedFurniture/);
  assert.match(source, /wohnung-plan-v8-restored/);
});

test("shows four wall views, placement ledger and verified product list", async () => {
  const html = await (await render()).text();
  assert.match(html, /Fensterwand, obere Wand, Schrank\/Eingang und linke Wand/);
  assert.match(html, /Platzierungsprotokoll · Variante Bett \+ Deko/);
  assert.match(html, /Verifizierte Produktliste/);
  assert.match(html, /Wandpaneele aus Holz/);
  assert.match(html, /Aufladbare LED-Wandlampe/);
  assert.match(html, /Artgeist Leinwandbild Geometry/);
  assert.match(html, /Kunstpflanze Miscanthusgras/);
  assert.match(html, /Wanduhr Beige/);
  assert.doesNotMatch(html, /Amazon|Temu/);
});

test("print view includes one measured model, four wall views and product table", async () => {
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  const styles = await readFile(new URL("app/globals.css", projectRoot), "utf8");
  assert.match(source, /2D-Gesamtplan \+ 4 Wandansichten/);
  assert.match(source, /Automatische 3D-Wandansichten/);
  assert.match(source, /print-products-sheet/);
  assert.match(source, /loading="eager"/);
  assert.match(source, /await Promise\.all\(wallImages\.map\([\s\S]*?image\.decode\(\)/);
  assert.match(styles.slice(styles.indexOf("@media print")), /\.print-products-sheet\s*\{[^}]*break-before:\s*page/);
});

test("restored version contains the previous curtains and desk-side decoration", async () => {
  const html = await (await render()).text();
  assert.match(html, /Fensterbedienung, Lüftungsdeckel und Flügelschwenk nochmals vermessen/);
  assert.match(html, /Vorhänge sowie die gestaffelte Wandgestaltung neben dem Tisch/);
  const source = await readFile(new URL("app/room-model.ts", projectRoot), "utf8");
  assert.match(source, /CARLO Wandboard/);
  assert.match(source, /Studio Home Vorhangstange/);
  assert.match(source, /Lorris Leinenoptik/);
});

test("private room media stay outside the public site", async () => {
  for (const path of [
    "public/reference-plan.png",
    "public/zimmer1-handplan.png",
    "public/zimmer1-plan-detail.png",
    ...["window", "entrance", "wardrobe", "free-wall", "desk"].map((name) => `public/zimmer1-photo-${name}.jpg`),
  ]) {
    await assert.rejects(access(new URL(path, projectRoot)), (error) => error?.code === "ENOENT");
  }
  const html = await (await render()).text();
  assert.doesNotMatch(html, /reference-plan|handplan|plan-detail|zimmer1-photo-/);
});

test("all product references use official Austrian Action and Möbelix pages", async () => {
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  const purchaseBlock = source.slice(source.indexOf("const purchaseSuggestions"), source.indexOf("const createDefaultItemsByRoom"));
  assert.match(purchaseBlock, /https:\/\/www\.action\.com\/de-at\/p\//);
  assert.match(purchaseBlock, /https:\/\/www\.moebelix\.at\/p\//);
  assert.doesNotMatch(purchaseBlock, /amazon|temu/i);
});
