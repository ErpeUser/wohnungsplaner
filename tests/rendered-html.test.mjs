import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test, { after } from "node:test";
import { unstable_dev } from "wrangler";

const projectRoot = new URL("../", import.meta.url);
let workerPromise;

async function getWorker() {
  workerPromise ??= unstable_dev("dist/server/index.js", {
    config: "dist/server/wrangler.json",
    local: true,
    logLevel: "none",
    experimental: {
      disableExperimentalWarning: true,
      disableDevRegistry: true,
      testMode: true,
      watch: false,
    },
  });
  return workerPromise;
}

after(async () => {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.stop();
  }
});

async function render() {
  const worker = await getWorker();
  return worker.fetch("http://localhost/", { headers: { accept: "text/html" } });
}

test("server-renders the apartment overview while retaining the protected previous room", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  assert.match(html, /<title>Raumplaner · Wohnung<\/title>/i);
  assert.match(html, /Gesamtwohnung/);
  assert.match(source, /Vorige Version · wiederhergestellt/);
  assert.match(source, /Tisch 129 × 55 cm an der oberen Wand, Blickrichtung Tür/);
  assert.match(source, /Liegefläche 120 × 200 · außen 142 × 220/);
  assert.match(source, /Vorhänge · 3 gestaffelte Wandboards/);
  assert.doesNotMatch(html, /Dekoriert · Botanical Cocoon|Dekoration neu laden/);
});

test("offers only the restored room and corrected ground-state actions", async () => {
  const html = await (await render()).text();
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  assert.match(html, /Vorige Version wiederherstellen/);
  assert.match(html, /Bett \+ Deko entfernen/);
  assert.doesNotMatch(html, /Dekoration neu laden/);
  assert.match(source, /createSavedPreDecorSnapshot/);
  assert.match(source, /createBaseFurniture/);
  assert.doesNotMatch(source, /createDecoratedFurniture/);
  assert.match(source, /wohnung-plan-v13-image-studies-only/);
});

test("shows exactly the four requested image-study subjects", async () => {
  const html = await (await render()).text();
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  assert.match(source, /Eingang beidseitig, Bettwand und PC-Tischwand/);
  for (const label of ["Eingang · linke Seite", "Eingang · rechte Seite", "Wand hinter dem Bett", "Wand hinter dem PC-Tisch"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /nur als Inspiration und sind ausdrücklich nicht maßhaltig/);
  assert.match(source, /Keine Bildidee wurde als Dekoobjekt in 2D oder 3D übernommen/);
  assert.doesNotMatch(html, /Platzierungsprotokoll|Botanical Cocoon|Akustikpaneel · Fensterseite/);
});

test("3D view exposes the two-step entrance and right-side camera controls", async () => {
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  assert.match(source, /2 Schritte zur Tür/);
  assert.match(source, /Eingang rechts/);
  assert.match(source, /zimmer1EntranceCameraPose/);
  assert.match(source, /entranceCamera === "right"/);
});

test("all four generated study files are project-local and non-empty", async () => {
  for (const name of ["eingang-links.png", "eingang-rechts.png", "wand-hinter-bett.png", "wand-hinter-pc-tisch.png"]) {
    const file = new URL(`public/room-studies/${name}`, projectRoot);
    const info = await stat(file);
    assert.ok(info.size > 1_000_000, `${name} should contain a generated study image`);
  }
});

test("print view contains the measured plan plus the four image studies", async () => {
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  const styles = await readFile(new URL("app/globals.css", projectRoot), "utf8");
  assert.match(source, /2D-Gesamtplan \+ 4 Bildstudien/);
  assert.match(source, /function PrintImageStudies/);
  assert.match(source, /Eingang beidseitig, Bettwand und PC-Tischwand/);
  assert.match(source, /await Promise\.all\(wallImages\.map\([\s\S]*?image\.decode\(\)/);
  assert.match(styles.slice(styles.indexOf("@media print")), /\.print-elevations-sheet\s*\{[^}]*break-before:\s*page/);
});

test("restored version retains curtains and the three desk-side wall boards", async () => {
  const pageSource = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  assert.match(pageSource, /Vorhänge sowie die gestaffelte Wandgestaltung neben dem Tisch/);
  const source = await readFile(new URL("app/room-model.ts", projectRoot), "utf8");
  assert.match(source, /Gestaffeltes Wandboard · 60 cm/);
  assert.match(source, /Dunkle Vorhangstange · Bestand/);
  assert.match(source, /Beiger Vorhang · links/);
  assert.match(source, /ZIMMER1_DECORATED_PRESET: DesignFurniturePlacement\[\] = \[\]/);
});

test("private source media and shopping catalogs remain outside the site", async () => {
  for (const path of [
    "public/reference-plan.png",
    "public/zimmer1-handplan.png",
    "public/zimmer1-plan-detail.png",
    ...["window", "entrance", "wardrobe", "free-wall", "desk"].map((name) => `public/zimmer1-photo-${name}.jpg`),
  ]) {
    await assert.rejects(access(new URL(path, projectRoot)), (error) => error?.code === "ENOENT");
  }
  const html = await (await render()).text();
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  assert.doesNotMatch(html, /reference-plan|handplan|plan-detail|zimmer1-photo-/);
  assert.doesNotMatch(source, /const purchaseSuggestions|const inspirationSources|amazon|temu/i);
});

test("complete apartment plan component contains every area and technical drawing layer", async () => {
  const source = await readFile(new URL("app/apartment-plan.tsx", projectRoot), "utf8").catch(() => "");
  assert.match(source, /export function ApartmentPlan/);
  for (const label of ["Wohnküche", "Zimmer 1", "Zimmer 2", "Vorraum", "Abstellraum", "Bad", "WC", "Loggia", "Balkon"]) {
    assert.match(source, new RegExp(label));
  }
  for (const area of ["21,82", "12,36", "10,15", "5,20", "2,00", "4,31", "1,42", "2,23", "3,80"]) {
    assert.match(source, new RegExp(area.replace(",", "[,]")));
  }
  assert.match(source, /showElectrical\s*&&/);
  assert.match(source, /apartment-electrical-layer/);
  assert.match(source, /Nord/);
  assert.match(source, /1 m/);
  assert.match(source, /apartment-floor-/);
  assert.match(source, /data-layer="sanitary"/);
  assert.match(source, /WET_ROOM_FIXTURES/);
  assert.match(source, /APARTMENT_DIMENSIONS/);
  assert.match(source, /<title(?:\s|>)/);
  assert.match(source, /<desc(?:\s|>)/);
  assert.match(source, /Badewanne/);
  assert.match(source, /Waschmaschine/);
  assert.match(source, /Wand-WC/);
});

test("gesamtwohnung renders the fixed L kitchen with sink hob and oven", async () => {
  const html = await (await render()).text();
  const source = await readFile(new URL("app/apartment-plan.tsx", projectRoot), "utf8");
  assert.match(source, /data-layer="kitchen"/);
  assert.match(source, /kitchenBaseFootprints/);
  assert.match(source, /Einbauspüle/);
  assert.match(source, /Elektrokochfeld/);
  assert.match(html, /Feste L-Küche/);
  assert.match(html, /Backofen/);
});

test("Wohnküche renders the photo-verified refrigerator hood and feature wall in 2D and 3D", async () => {
  const plan = await readFile(new URL("app/apartment-plan.tsx", projectRoot), "utf8");
  const three = await readFile(new URL("app/apartment-3d.tsx", projectRoot), "utf8");
  const page = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  assert.match(plan, /LIVING_FEATURE_LAYOUT/);
  assert.match(plan, /living-feature-wall-layer/);
  assert.match(plan, /kitchen-fridge-symbol/);
  assert.match(plan, /KITCHEN_FLOOR_ZONE/);
  assert.match(plan, /kitchen-floor-inset/);
  assert.match(three, /addLivingFeatureWall/);
  assert.match(three, /KITCHEN_FLOOR_ZONE/);
  assert.match(three, /element\.kind === "fridge"/);
  assert.match(three, /element\.kind === "hood"/);
  assert.match(page, /activeView === "wohnkueche"/);
  assert.match(page, /Fotoabgleich · Wohnküche/);
});

test("wohnkueche explains which kitchen details are plan scaled or estimated", async () => {
  const html = await (await render()).text();
  assert.match(html, /Lage \+ Stellfläche/);
  assert.match(html, /planmaßstäblich/);
  assert.match(html, /Materialien \+ Gerätefolge/);
  assert.match(html, /visuell belegt/);
  assert.match(html, /Fliesenfeld/);
  assert.match(html, /Fotoausdehnung geschätzt/);
  assert.match(html, /Einzelmodule \+ Montagehöhen/);
  assert.match(html, /geschätzt \/ offen/);
});

test("rendered HTML never exposes private kitchen source names or customer data", async () => {
  const html = await (await render()).text();
  for (const privateToken of ["BD19929", "Kaufvertrag", "HUSEJNOVIC", "LATIFA", "ABBASI", "HÖFFTGASSE"]) {
    assert.doesNotMatch(html, new RegExp(privateToken, "i"));
  }
});

test("navigation integrates the complete apartment tour and gives Bad and WC shared 2D and 3D views", async () => {
  const html = await (await render()).text();
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  for (const label of ["Gesamtwohnung", "Wohnküche", "Zimmer 2", "Bad", "WC", "Abstellraum", "Loggia", "Balkon"]) {
    assert.match(html, new RegExp(label));
  }
  assert.match(source, /import\s+\{\s*ApartmentPlan\s*\}\s+from\s+["']\.\/apartment-plan["']/);
  assert.match(source, /import\s+\{\s*ApartmentThreeView\s*\}\s+from\s+["']\.\/apartment-3d["']/);
  assert.match(source, /useState<PlannerViewId>\("gesamtwohnung"\)/);
  assert.match(source, /supports3d/);
  assert.match(source, /supportsSharedRoom3d/);
  assert.match(source, /isWetRoomView/);
  assert.match(source, /setView\("2d"\)/);
  assert.match(source, /<ApartmentPlan\s+showElectrical=\{showElectrical\}/);
  assert.match(source, /<ApartmentThreeView/);
  assert.match(source, /3D Rundgang/);
  assert.match(source, /wohnung-plan-v14-gesamtwohnung/);
  assert.match(html, /Vorige Version wiederherstellen/);
});

test("print report reuses the canonical apartment plan and documents its evidence", async () => {
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  const styles = await readFile(new URL("app/globals.css", projectRoot), "utf8");
  assert.match(source, /<ApartmentPlan\s+showElectrical=\{showElectrical\}\s+idPrefix="print-apartment"/);
  assert.match(source, /ApartmentPrintSheet\s+showElectrical=\{showElectrical\}\s+snapshot=\{apartmentSnapshot\}/);
  assert.match(source, /<ApartmentThreeView\s+itemsByRoom=\{itemsByRoom\}\s+doorStates=\{doorStates\}\s+captureOnly/);
  assert.match(source, /3D-Gesamtansicht/);
  assert.match(source, /Gesamtfläche<\/th><th>59,49 m²/);
  assert.match(source, /Planstand\s*23\.10\.2026/);
  assert.match(source, /Direkt belegt/);
  assert.match(source, /Maßstäblich abgeleitet/);
  assert.match(source, /Offen \/ vor Ort messen/);
  assert.match(source, /Maß- und Sanitärdetails/);
  assert.match(source, /print-detail-bath/);
  assert.match(source, /print-detail-wc/);
  assert.match(source, /conflict\.used[^\n]*conflict\.printed/);
  assert.match(source, /APARTMENT_MODEL\.spaces\.map/);
  assert.match(source, /<td>\{space\.name\}<\/td>/);
  const printStyles = styles.slice(styles.indexOf("@media print"));
  assert.match(printStyles, /\.print-apartment-sheet[\s\S]*?break-inside:\s*avoid/);
  assert.match(printStyles, /\.print-apartment-sheet[\s\S]*?max-height:/);
  assert.match(printStyles, /\.print-area-table[\s\S]*?page-break-inside:\s*avoid/);
});

test("individual base rooms use their canonical apartment floor material", async () => {
  const source = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  assert.match(source, /const floorKind = APARTMENT_MODEL\.spaces\.find/);
  assert.match(source, /floorKind === "parkett"/);
  assert.match(source, /floorKind === "feinsteinzeug"/);
  assert.match(source, /floorKind === "epoxidharz"/);
  assert.match(source, /floorKind === "balkon"/);
});

test("walkable apartment 3D view exposes keyboard, touch, reset and fallback controls", async () => {
  const source = await readFile(new URL("app/apartment-3d.tsx", projectRoot), "utf8").catch(() => "");
  assert.match(source, /export function ApartmentThreeView/);
  assert.match(source, /3D Rundgang/);
  assert.match(source, /WASD oder Pfeiltasten/);
  for (const label of ["Vorwärts", "Rückwärts", "Nach links", "Nach rechts", "Startposition", "Vollbild"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /3D-Ansicht konnte nicht gestartet werden/);
  assert.match(source, /isApartmentWalkable/);
  assert.match(source, /buildApartmentWallSpans/);
  assert.match(source, /KITCHEN_LAYOUT/);
  assert.match(source, /opening\.kind === "door"\)\.forEach\(\(opening\) => \{/);
  assert.match(source, /addDoorLeaf\(scene, opening/);
  assert.match(source, /addOverdoorVent\(scene, opening\)/);
  assert.match(source, /doorStates\[opening\.id\]/);
  assert.match(source, /yaw -= \(event\.clientX - previousPointer\.x\)/);
  assert.match(source, /document\.addEventListener\("visibilitychange", clearMovement\)/);
  assert.match(source, /window\.addEventListener\("blur", clearMovement\)/);
});

test("apartment 3D uses supported Three.js APIs and tolerates legacy item colors", async () => {
  const source = await readFile(new URL("app/apartment-3d.tsx", projectRoot), "utf8").catch(() => "");
  assert.match(source, /new THREE\.Timer\(\)/);
  assert.match(source, /THREE\.PCFShadowMap/);
  assert.doesNotMatch(source, /THREE\.PCFSoftShadowMap/);
  assert.match(source, /item\.color \|\| "#d8cbbb"/);
});
