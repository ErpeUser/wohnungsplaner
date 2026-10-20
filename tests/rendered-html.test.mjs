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

test("server-renders the fully decorated room planner", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Raumplaner · Wohnung<\/title>/i);
  assert.match(html, /Bett \+ Deko · aktiv/);
  assert.match(html, /Tisch Fensterwand · Spiegel 110 × 70/);
  assert.match(html, /Liegefläche 120 × 200 · außen 142 × 220/);
  assert.match(html, /81 cm bis Tisch · 84 cm vor offener Schranktür/);
  assert.match(html, /4 Paneele · 2 leichte Leinwände/);
  assert.match(html, /Westbild · Pflanze · Uhr/);
});

test("offers recoverable snapshot, corrected ground and decorated variants", async () => {
  const html = await (await render()).text();
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  assert.match(html, /Bett \+ Deko laden/);
  assert.match(html, /Bett \+ Deko entfernen/);
  assert.match(html, /Gesicherten Vorzustand laden/);
  assert.match(source, /createSavedPreDecorSnapshot/);
  assert.match(source, /createBaseFurniture/);
  assert.match(source, /createDecoratedFurniture/);
  assert.match(source, /wohnung-plan-v7/);
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

test("source keeps window controls and entrance clear", async () => {
  const html = await (await render()).text();
  assert.match(html, /Eingang links\/rechts wegen 20-\/6-cm-Restflächen/);
  assert.match(html, /Jalousie, Fensterbedienung und Lüftungsdeckel bleiben frei/);
  assert.doesNotMatch(html, /CARLO Wandboard|Studio Home Vorhangstange|Lorris Leinenoptik/);
});

test("private room media stay outside the public site", async () => {
  await Promise.all([
    access(new URL("public/reference-plan.png", projectRoot)),
    access(new URL("public/zimmer1-handplan.png", projectRoot)),
    access(new URL("public/zimmer1-plan-detail.png", projectRoot)),
  ]);
  for (const name of ["window", "entrance", "wardrobe", "free-wall", "desk"]) {
    await assert.rejects(access(new URL(`public/zimmer1-photo-${name}.jpg`, projectRoot)), (error) => error?.code === "ENOENT");
  }
  const html = await (await render()).text();
  assert.doesNotMatch(html, /zimmer1-photo-/);
});

test("all product references use official Austrian Action and Möbelix pages", async () => {
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  const purchaseBlock = source.slice(source.indexOf("const purchaseSuggestions"), source.indexOf("const createDefaultItemsByRoom"));
  assert.match(purchaseBlock, /https:\/\/www\.action\.com\/de-at\/p\//);
  assert.match(purchaseBlock, /https:\/\/www\.moebelix\.at\/p\//);
  assert.doesNotMatch(purchaseBlock, /amazon|temu/i);
});
