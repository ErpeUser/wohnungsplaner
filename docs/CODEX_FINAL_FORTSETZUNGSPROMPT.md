# Ausführbarer Codex-Fortsetzungsprompt

Diesen Prompt im Repository 'ErpeUser/wohnungsplaner' auf 'main' ausführen.
Jeden Schritt erst nach erfolgreicher Prüfung des vorherigen Schritts ausführen.
Keine erfundenen APIs, URLs, API-Schlüssel, Produktquellen oder Produktionsorigins
eintragen.

## 0. Arbeitsregeln

- Änderungen nur auf main und nur als Fast-Forward mit erwarteter HEAD-SHA.
- Kein Force-Push.
- Keine erfundenen Vision-, Storage-, Produkt- oder Deployment-Verträge.
- Binärdaten niemals inline in PlannerDocumentV3 speichern.
- Nur assetId -> freigegebene URL referenzieren, sobald ein echter Storage-Vertrag existiert.
- Unsichere Maßdaten immer mit confidence, source und editierbarer Warnung speichern.
- Bestehende PlannerCommands für add/move/resize/rotate/register/remove wiederverwenden.
- Nach jedem Teilauftrag fokussierte Tests ausführen.

## 1. Remote- und Arbeitsbaumprüfung

~~~bash
git status --short
git branch --show-current
git log --oneline -5
git fetch origin --prune
git ls-remote --heads origin
gh pr list --state all --limit 100
~~~

Falls kein Shell-Credential verfügbar ist, die autorisierte GitHub-Schnittstelle verwenden
und dokumentieren. Vor Änderungen Default-Branch, aktuellen HEAD, Branches, PRs und
Parent-Commit aus der GitHub-API lesen.

## 2. Baseline

~~~bash
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run lint
npm run build
npm run test:planner
npm run test:ui -- --maxWorkers=1
npm run test:cutover
npm run assets:check
npm audit --json
npm outdated --json
~~~

Ein lokaler Asset-Manifestfehler darf nur als Binärmaterialisierungsproblem bezeichnet
werden, wenn Dateiname, Byte-Länge und SHA genannt werden und die Remote-Binärdatei
nachweislich nicht verändert wurde.

## 3. Lokalen Asset-Import fertigstellen

Dateien:
- app/planner/workspace/catalog-panel.tsx
- app/planner/workspace/planner-workspace.tsx
- app/planner/store/planner-store.ts
- app/planner/catalog/asset-import.ts
- app/planner/domain/commands.ts
- app/planner/domain/schema.ts
- app/planner/domain/types.ts
- tests/planner-asset-import.test.ts
- tests/planner-commands.test.ts
- tests/planner-persistence.test.ts
- tests/planner-workspace.test.tsx

Umsetzen:
1. Datei-Input mit accept für GLB, PNG, JPEG, SVG und WEBP und 5-MB-Preflight.
2. Name, Kategorie, Breite, Tiefe, Höhe, Material-ID, Lizenz, Quelle und Confidence
   vor registerAsset erfassen.
3. preparePlannerAsset(metadata, bytes, { filename, mediaType }) aufrufen.
4. Nur über dispatch({ type: 'registerAsset', asset }) registrieren.
5. Im aktiven Raum einen editierbaren Platzhalter über addPlacement erzeugen.
6. Vor Platzierung Raumgrenze und hard-Collision prüfen.
7. Ohne freigegebenen Storage-Vertrag niemals eine URL vortäuschen.
8. Lokalen Status 'nur lokal registriert' sichtbar halten.

Fokustest:
~~~bash
npm run test:ui -- --maxWorkers=1 tests/planner-workspace.test.tsx
node --import tsx --test tests/planner-asset-import.test.ts tests/planner-commands.test.ts tests/planner-persistence.test.ts
~~~

## 4. Externe Asset-Grenze und 3D-Platzhalter

Dateien:
- app/planner/scene-3d/scene-model.ts
- app/planner/scene-3d/furniture.tsx
- app/planner/scene-3d/planner-3d.tsx
- app/planner/workspace/inspector-panel.tsx
- app/planner/domain/types.ts

Einen vertragsfreien lokalen Resolver implementieren:

~~~ts
export type PlannerAssetResolution =
  | { kind: 'placeholder'; asset: PlannerAssetRecord; reason: string }
  | { kind: 'remote'; asset: PlannerAssetRecord; url: string };

export function resolvePlannerAsset(
  document: PlannerDocumentV3,
  assetId: string,
): PlannerAssetResolution {
  const asset = document.assets?.find((candidate) => candidate.assetId === assetId);
  if (!asset) throw new Error('Unbekanntes Asset: ' + assetId);
  if (!asset.assetUrl) {
    return { kind: 'placeholder', asset, reason: 'Keine freigegebene Storage-URL' };
  }
  return { kind: 'remote', asset, url: asset.assetUrl };
}
~~~

Bei placeholder ein parametric cabinet/box-Modell mit normalizedSize, pivot und
floorOffset rendern und source/confidence sichtbar kennzeichnen. Erst nach Vorlage
eines echten Storage-Vertrags useGLTF(url) oder einen Bildloader anschließen.

Tests:
~~~bash
node --import tsx --test tests/planner-commands.test.ts tests/planner-persistence.test.ts
npm run test:ui -- --maxWorkers=1 tests/planner-3d.test.tsx
~~~

## 5. Vollständige Bedienbarkeit

Dateien:
- app/planner/workspace/planner-workspace.tsx
- app/planner/workspace/catalog-panel.tsx
- app/planner/workspace/inspector-panel.tsx
- app/planner/workspace/details-drawer.tsx
- app/planner/workspace/shopping-list-drawer.tsx
- app/planner/plan-2d/use-plan-interactions.ts

Implementieren:
- initialer Fokus für jeden Dialog/Drawer
- zyklischer Tab-/Shift-Tab-Trap
- inert für den Hintergrund
- Escape, Backdrop und Fokus-Rückgabe zum echten Trigger
- Pfeile: 1 cm; Shift-Pfeile: 10 cm
- [ und ]: 5 Grad; Shift-[ und Shift-]: 45 Grad
- Resize und Touch-Pointer-Capture über dieselben PlannerCommands
- Undo/Redo für jede Transformationsart

Jede Transformation muss denselben Collision- und Room-Boundary-Validator wie die
Mausbedienung verwenden.

Test:
~~~bash
npm run test:ui -- --maxWorkers=1 tests/planner-workspace.test.tsx tests/planner-furniture.test.tsx
~~~

## 6. Gemeinsame 2D-/SVG-/3D-Szene

Dateien:
- app/planner/plan-2d/plan-scene.ts
- app/planner/plan-2d/plan-canvas.tsx
- app/planner/plan-2d/architecture-layer.tsx
- app/planner/scene-3d/scene-model.ts
- app/planner/domain/snapping.ts

Jedes Objekt enthält source, confidence, notes und placeholder. 2D, SVG-Fallback und
3D lesen dieselbe Geometrie. Estimated, legacy und placeholder werden gestrichelt und
sichtbar gekennzeichnet. Diagonale Guides entstehen nur bei echter Diagonalgeometrie.

Für 1000+ Objekte einen Spatial Index oder Sweep-and-Prune einführen. Bestehende
Collision-Semantik darf sich nicht ändern.

Test:
~~~bash
npm run test:ui -- --maxWorkers=1 tests/planner-2d.test.tsx
node --import tsx --test tests/planner-furniture.test.tsx
~~~

## 7. Lokalen Server und Security-Gate

Dateien:
- serve-local.mjs
- next.config.*
- Header-Konfiguration
- vorhandene Worker-/Bildoptimierungsroute
- app/planner/scene-3d/*

Lokal umsetzen und testen:
- GET/HEAD-Allowlist
- 414 bei überlangen URLs
- 413 für zu große statische Assets
- Security-Header
- CSP nur mit tatsächlich verwendeten self/blob/worker/ws-Pfaden
- Request-Limit mit 429 und Retry-After
- Pfadnormalisierung ohne ..
- konsistente Fehlerheader

Produktionsorigins erst nach Bundle-/Deployment-Inventar in next.config.* eintragen.
Keine pauschale connect-src *- oder worker-src *-Freigabe.

Test:
~~~bash
node --check serve-local.mjs
npm run build
npm run test:cutover
~~~

## 8. Abhängigkeiten kontrolliert aktualisieren

Dateien:
- package.json
- package-lock.json
- vitest.config.ts

Zuerst isoliert testen:
- next + eslint-config-next
- three + @types/three
- vitest + testing-library
- konva + postprocessing
- vinext + vite + Cloudflare/Wrangler

TypeScript 7, ESLint 10, Node-Typen 26 und große Wrangler-/Vinext-Sprünge erst
nach grüner Kompatibilitätsmatrix übernehmen.

Nach jeder Gruppe:
~~~bash
npm install
npm run typecheck
npm run lint
npm run build
npm run test:planner
npm run test:ui -- --maxWorkers=1
npm run test:cutover
npm audit --json
~~~

## 9. Finale Abnahme und Push

~~~bash
npm run typecheck
npm run lint
npm run build
npm run test:planner
npm run test:ui -- --maxWorkers=1
npm run test:cutover
npm run assets:check
~~~

Bei einem Binärfehler niemals den Manifest-Hash blind ändern. Vor dem Push erneut
Remote-HEAD, Default-Branch, PRs und Branches lesen. Dann nur Fast-Forward mit
erwarteter Parent-SHA ausführen.

Der Abschlussbericht muss enthalten:
- finaler Commit
- Default-Branch
- Branch-/PR-Liste
- jedes Testkommando mit Exit-Code und Zählung
- erledigte, teilweise erledigte und blockierte Tickets
- jede externe Blockade mit fehlendem Vertrag
- nächste Datei, Signatur, Test und Akzeptanzkriterium

