# Wohnungsplaner Modernisierung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die nach dem letzten Quellen-Commit belegten Planner-Fehler beheben und die Referenz-/Runtime-Grenzen so härten, dass Sofa, Teppich, Stühle und Tische realistisch, portabel und regressionssicher bleiben.

**Architecture:** Die bestehende Next/Vinext-, Zustand-, Zod- und React-Three-Fiber-Struktur bleibt unverändert. Domain-Migrationen bleiben die einzige Quelle für gespeicherte Dokumentänderungen; Katalog- und Manifestdaten werden um explizite Provenienz-/Validierungsregeln ergänzt. Neue Produkt-GLBs werden nicht erfunden: nicht lizenzierte oder nicht maßhaltige Quellen bleiben parametrische Fallbacks.

**Tech Stack:** TypeScript, React 19, Zustand, Zod, Vitest/Node test runner, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-13-wohnungsplaner-modernisierung-design.md`

## Global Constraints

- Node.js >=22.13.0 und bestehende Lockfile-Version beibehalten.
- Keine neue Runtime-Dependency ohne nachgewiesenen Nutzen.
- Stabile Placement-IDs, Positionen, Rotationen, Gruppen und Nutzermetadaten bei Migrationen erhalten.
- Private Quellen und absolute Browser-Temp-Pfade bleiben außerhalb von `public/planner-assets` und Runtime-Manifests.
- Vor jeder Veröffentlichung: Typecheck, Lint, Asset-Checks, Planner-/UI-/Cutover-Tests und Build über GitHub Actions.

## Review Focus

- Ein bewusst verschobenes Wohnzimmer-Sofa darf beim Hydrate nicht wieder auf den Teppich zentriert werden; Regression in Task 1.
- Ein bewusst gelöschter vierter Esszimmerstuhl darf nicht durch jede Workspace-Render-Runde zurückkehren; Regression in Task 1.
- Esszimmerstühle dürfen weiterhin untereinander kollidieren; Regression in Task 1.
- Mehrfaches Asset-Registrieren darf keine Placement-ID überschreiben; Regression in Task 2.
- Referenzdateien mit `C:\\Users\\*\\Temp\\browser-use`, JavaScript-Inhalt unter `.jpg/.avif` oder 403-only Quellen dürfen keinen grünen Asset-Check erzeugen; Tests in Task 3.

### Task 1: Migrationen und Möbelkollisionen korrigieren

**Files:**
- Modify: `app/planner/store/persistence.ts`
- Modify: `app/planner/plan-2d/use-plan-interactions.ts`
- Test: `tests/planner-persistence.test.ts`
- Test: `tests/planner-commands.test.ts` oder vorhandener Interaktions-Test

**Interfaces:**
- `upgradeLivingSofaRugGroup(document: PlannerDocumentV3): PlannerDocumentV3` verschiebt nur erkannte Legacy-Signaturen.
- `ensureCurrentDiningGroupFourChairs(document: PlannerDocumentV3): PlannerDocumentV3` ergänzt nur erkannte alte Drei-Stuhl-Saves und respektiert explizite Löschungen.
- Kollisionsfilter ignoriert den Tisch und das aktuell bewegte Objekt, nicht alle anderen Stühle.

- [ ] Step 1: Failing tests für verschobenes Sofa, gelöschten Stuhl und Stuhl-gegen-Stuhl-Kollision schreiben.
- [ ] Step 2: Betroffene Tests einzeln ausführen und erwartungsgemäß rot sehen.
- [ ] Step 3: Legacy-Erkennung in `persistence.ts` einschränken, Nutzerpositionen erhalten und Kollisionen minimal korrigieren.
- [ ] Step 4: Betroffene Tests grün ausführen.
- [ ] Step 5: Commit `fix: preserve customized furniture migrations`.

### Task 2: Katalog- und Vergleichsregistries synchronisieren

**Files:**
- Modify: `app/planner/chairs/chair-models.ts`
- Modify: `app/planner/catalog/catalog.ts`
- Modify: `tests/planner-chair-comparison.test.ts`
- Modify: `tests/planner-product-realism.test.ts`

**Interfaces:**
- `CHAIR_MODELS` enthält die im Katalog vorhandene Kaleo-Variante mit den belegten Maßen 63 × 64 × 87 cm, Sitzhöhe 50 cm und Quelle.
- `PHOTO_FIRST_IDS` enthält `dining-table-temu-609726-110-150`.

- [ ] Step 1: Regressionstests für Kaleo in der Vergleichsregistry und das foto-first Tischprofil ergänzen.
- [ ] Step 2: Tests rot sehen.
- [ ] Step 3: Registry-/Set-Änderung mit vorhandenen Katalogdaten implementieren.
- [ ] Step 4: Chair-/Table-/Product-Realism-Tests grün ausführen.
- [ ] Step 5: Commit `fix: synchronize product comparison registries`.

### Task 3: Referenz- und Manifest-Härtung

**Files:**
- Create: `scripts/check-reference-exports.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/quality.yml`
- Modify: `app/planner/catalog/asset-manifest.ts` (nur wenn runtime validation im bestehenden Muster ergänzt werden kann)
- Test: `tests/reference-exports.test.mjs` oder Script-Selftest

**Interfaces:**
- Der Check scannt `models/**/Auszug` und meldet absolute Windows-Temp-Pfade, Browser-JS in Bildendungen und nicht dokumentierte Runtime-Pfade.
- Echte `jpg/png/webp/avif`-Dateien werden über Magic Bytes geprüft; Text-/HTML-/JSON-Dateien bleiben als Referenz erlaubt.
- `npm run assets:check` bleibt für `public/planner-assets`; der neue Check ergänzt ihn für Referenz-Exports.

- [ ] Step 1: Failing fixture/Test für die drei Artefaktklassen schreiben.
- [ ] Step 2: Test rot sehen.
- [ ] Step 3: Validator implementieren und als `reference:check` in Package und Quality-Workflow verdrahten.
- [ ] Step 4: Gegen den aktuellen Repository-Bestand ausführen; nur bestätigte Fehler beheben oder explizit als Referenzfehler kennzeichnen.
- [ ] Step 5: Commit `ci: validate reference export hygiene`.

### Task 4: Portabilität und UX-Vertrag

**Files:**
- Delete: `.codex-temp/WohnungsplanerLauncher.cs`
- Delete: `.codex-temp/WohnungsplanerServerLauncher.cs`
- Modify: `app/planner/workspace/planner-workspace-base.tsx`
- Test: `tests/planner-workspace.test.tsx`

- [ ] Step 1: Test/Static assertion für nicht-modalen Drawer ohne Focus-Trap und ohne hartcodierte Launcher vorbereiten.
- [ ] Step 2: Test rot sehen.
- [ ] Step 3: Focus-Trap entfernen, initialen Fokus/Escape-Rücksprung erhalten und Launcher-Artefakte löschen.
- [ ] Step 4: UI-Test und statische Suche grün ausführen.
- [ ] Step 5: Commit `chore: remove non-portable launcher artifacts`.

### Task 5: Gesamtverifikation und Remote-Review

- [ ] GitHub-Diff und Commit-Reihenfolge prüfen.
- [ ] Quality- und Codex-Workflows für den neuen Head prüfen; bei Runner-/Actions-Fehlern Ursache dokumentieren.
- [ ] Bestehende rote Checks nicht verschweigen und nur nach frischer Evidenz Erfolg melden.
