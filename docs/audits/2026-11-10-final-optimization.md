# Finaloptimierung – 2026-11-10

## Verifizierter GitHub-Zustand

- Repository: `ErpeUser/wohnungsplaner` (privat), Default-Branch `main`.
- `main` ist der einzige Branch; offene/geschlossene PR-Abfrage liefert keine PRs.
- Remote-HEAD: `8eff5009476c516844c00366b41682c6f2b67e6e`.
- Der frühere Referenzstand `0a8a4416243aece82a02190e635f8fc7053b4525` ist Vorfahr von `main`; `main` ist vier Commits voraus und nicht zurück.
- Es gibt keine integrierbaren Nebenbranches und nichts, das gefahrlos gelöscht werden könnte.

## Priorisierte Restpunkte mit Umsetzung

| Priorität | Problem | Umsetzung / Pfad | Testnachweis |
| --- | --- | --- | --- |
| P0 | Import akzeptiert zu große, unbekannte oder MIME-fremde Dateien; WebP fällt auf `application/octet-stream`. | Strikte 5-MB-Grenze, erlaubte Erweiterungen, MIME-/Signatur-Konsistenz, sichere SVG-Prüfung und `confidence`/`source` in `app/planner/catalog/asset-import.ts`. | Unit-Tests für Limit, WebP, MIME-Mismatch, unbekannte Endung, Signatur und Metadaten. |
| P0 | Prepared Assets werden nicht im Dokument persistiert und sind nicht über Commands referenzierbar. | `PlannerAssetRecord`, `assets`-Register, Schema-/Migration-Default und `registerAsset`/`removeAsset` in `app/planner/domain/types.ts`, `schema.ts`, `commands.ts`. | Schema-/Command-/Reload-Tests. |
| P1 | Globale Walk-/Editor-Tastatur und globaler Pointer-Lock reagieren in fremden Controls/Canvas-Instanzen. | Form-Control-Guard, konkrete Canvas-Ref und Pointer-Lock auf `app/planner/scene-3d/camera-controller.tsx`; Canvas-Scoped Keyboard in `use-plan-interactions.ts`. | Typecheck, bestehende UI-Suite, gezielte Regressionstests. |
| P1 | Drawer-Fokus wird nicht initialisiert, nicht getrappt und beim Shopping-Drawer falsch zurückgegeben. | Gemeinsame Dialog-Fokuslogik in `planner-workspace.tsx`, `inert`-Hintergrund, Escape/Backdrop/Fokus-Rückgabe. | UI-Tests und manuelle A11y-Prüfung. |
| P1 | Raumfläche kann von der Wandgeometrie abweichen; Herkunft ist in Szenen nicht sichtbar. | Polygonflächenprüfung mit Toleranz in `domain/schema.ts`, Asset-/Objekt-Provenienz bleibt editierbar und wird im Register geführt. | Schema-Regressionstest. |
| P2 | Große Szenen verwenden lineare Kandidatensuche; vollständigere Spatial-Indizes sind ein Folgeauftrag. | In dieser Runde keine riskante Komplettumschreibung ohne Benchmark-Harness; Problem bleibt dokumentiert. | Bestehende Tests bleiben maßgeblich. |
| Blockiert | Reale Produkt-/HDR-Dateien, Vision-API und freigegebener Storage-Vertrag fehlen. | Keine erfundenen URLs oder Schlüssel; `docs/OFFENE_UMSETZUNG.md` beschreibt die benötigten Verträge. | Blockade explizit dokumentiert. |

## Ansätze und Entscheidung

1. **GitHub-API-only**: Änderungen direkt als Blobs/Tree/Commit; geeignet für den privaten Connector und ohne Shell-Credentials.
2. **Lokaler Vollcheckout**: beste Testbarkeit, aber Shell-Credentials für das private Repository fehlen.
3. **Hybrid (gewählt)**: lokaler rekonstruierter Textbestand für Typecheck/Tests, danach verifizierter GitHub-Connector-Commit auf `main`. So bleiben Tests reproduzierbar und Push-Regeln werden eingehalten.

## Nicht als fertig behauptet

Reale Produktbilder, lizenzierte GLB-Modelle, HDR-Beleuchtung, Vision-Analyse, Storage-Worker und Firecrawl/Context7-Verträge sind in diesem Repository/Connector nicht vorhanden. Diese Punkte bleiben als präzise Anschlussaufträge in `docs/OFFENE_UMSETZUNG.md` dokumentiert.
