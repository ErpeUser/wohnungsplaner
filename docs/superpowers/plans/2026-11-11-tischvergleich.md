# Implementierungsplan: Vier maßgetreue Tischmodelle im Wohnungsplan

> **Ausführung:** Für die Implementierung wird `superpowers:executing-plans` verwendet. Alle Produktionsänderungen entstehen testgetrieben: Test zuerst, beobachteter Fehlschlag, kleinste Implementierung, anschließend Suite.

**Spec:** `docs/superpowers/specs/2026-11-11-tischvergleich-design.md`

## Ziel

Die bestehende V3-Planung erhält einen dauerhaft speicherbaren Tischvergleich für die Wohnküche. Vier Quellen werden als anwählbare Modelle geführt. Jedes Modell enthält die belegten Größenstände und eine maßstäbliche Platzierung im selben Essbereich mit vier vorhandenen Kaleo-Stühlen. Ein Modellwechsel ersetzt die ausgewählte Tischgeometrie atomar, bewahrt Position, Drehung und Gruppe und wird über die bestehende Persistenz gespeichert.

## Globale Regeln

- Maße werden intern in Metern und in der Oberfläche in Zentimetern angezeigt.
- Die Quellen und der Crawl-Stand werden versioniert in `docs/table-sources.json` gespeichert; Laufzeitdaten kommen aus einer typgesicherten Tabelle.
- Unbekannte Maße werden nicht erfunden. Der blockierte Temu-Link bleibt sichtbar, aber nicht anwählbar.
- Bestehende V3-IDs und Migrationen bleiben rückwärtskompatibel.
- Keine neue Abhängigkeit und keine externe Bildkopie: Bilder werden als Quellen-URLs mit Alttext eingebunden.
- Neue Interaktion erhält Tastaturbedienung, sichtbaren Fokus und `aria-selected`/`aria-controls`.

## Task 1 — Crawled source manifest and table model data

**Files:** `docs/table-sources.json`, `scripts/crawl-table-sources.mjs`, `app/planner/tables/table-models.ts`, `tests/planner-table-comparison.test.ts`

1. Schreibe den Test zuerst. Prüfe vier Einträge, Quellen-URLs, den jeweiligen Varianten-Satz, Meter-Konvertierung, Quellenstatus und dass das unbekannte Temu-Modell keine Geometrie zum Anwenden anbietet.
2. Lass den Test rot laufen, weil das Modul noch fehlt.
3. Ergänze die normalisierten Daten:
   - AliExpress: rund 100 × 100 cm, ausgezogen oval 140 × 100 cm, Höhe 75 cm als `estimated`.
   - Temu `606997911062061`: rund 120 × 120 × 75,5 cm, ausgezogen oval 160 × 120 × 75,5 cm.
   - Kaufland `567080013`: oval 120 × 80 × 75,5 cm, ausgezogen oval 160 × 80 × 75,5 cm.
   - Temu `609726356120319`: blockierte Quelle, keine Maße/Variante.
4. `crawl-table-sources.mjs` schreibt ein JSON-Manifestschema mit `capturedAt`, Quellstatus, Redirect/Spiegel-Hinweisen und Bild-URLs. Der wiederholbare `--fetch`-Lauf prüft die vier Quellen direkt mit Redirect-Following und einem kurzen Timeout; `--check` validiert das gespeicherte Evidenzschema ohne Netzwerkzugriff. Die initiale Recherche wurde mit dem Firecrawl-Connector durchgeführt und als statische Evidenz im Manifest abgelegt.
5. Führe den Test erneut aus und committe `feat: add crawled table comparison data`.

**Expected:** `node --import tsx --test tests/planner-table-comparison.test.ts` ist grün; die Daten enthalten keine erfundenen Varianten für die blockierte Quelle.

## Task 2 — Atomic catalog switch command

**Files:** `app/planner/domain/commands.ts`, `app/planner/catalog/catalog.ts`, `tests/planner-table-command.test.ts`

1. Schreibe Tests für `setPlacementProduct`: gültiger Wechsel ändert Katalog-ID, Maße, Material und Quellenmetadaten; Gruppe, Position und Drehung bleiben erhalten; unbekannte Katalog-ID, ungültige Maße, eingebautes Element und harte Kollision werden abgelehnt.
2. Lass die Tests rot laufen.
3. Füge die drei belegten Produkt-Katalogeinträge mit den Daten aus `table-models.ts` hinzu. Der bestehende Bozan-Eintrag bleibt verfügbar. Das unbekannte Modell wird nicht als platzierbares Katalogobjekt registriert.
4. Erweitere den Command-Uniontyp um `setPlacementProduct` und validiere über denselben `inspectPlacement`-Pfad wie Größenänderungen. Der Gruppenbericht ignoriert die übrigen Mitglieder derselben Essgruppe, damit Stühle nicht als Selbstkollision blockieren; Wände, Couch und Durchgänge bleiben aktiv. Das Material muss im gewählten Tisch-Katalogeintrag liegen; Position, Rotation, Raum-, Gruppen- und Bodenflags bleiben unverändert. Aktualisiere `metadata.source`, `metadata.confidence`, `metadata.notes` und `materialVariants` atomar.
5. Führe den Command-Test und danach `npm run test:planner` aus. Commit `feat: atomically switch dining table products`.

**Expected:** Der neue Command liefert entweder eine vollständige neue Platzierung oder unveränderte Dokumentdaten mit Fehler; keine halben Updates.

## Task 3 — Four-chair dining group and persistence

**Files:** `app/planner/domain/apartment-v3.ts`, `app/planner/store/persistence.ts`, `app/planner/plan-2d/furniture-layer.tsx`, `tests/planner-bozan-table.test.ts`, `tests/planner-persistence.test.ts`

1. Erweitere die bestehenden Tests zuerst auf vier Kaleo-Platzierungen und den vierten Stuhl auf der couchabgewandten Südseite mit genügend Abstand zur Couch. Prüfe weiterhin Gruppe, Größen und harte Kollisionsfreiheit.
2. Lass die Tests rot laufen.
3. Ergänze `living-kaleo-chair-north` (bestehende IDs bleiben unverändert), nehme die ID in aktuelle/visuelle Migrationslisten auf und erweitere die Legacy-Reparatur so, dass fehlende vierte Stühle ergänzt werden, ohne gültige Nutzerpositionen zu überschreiben. Die Wohnungsmodell-Rebase bewahrt aktive Vergleichs-Katalog-IDs und setzt sie nicht auf Bozan zurück.
4. Ergänze ein generisches, parametrisierbares Tischsymbol für die drei neuen Katalog-IDs: Kreis/oval nach Breite/Tiefe, Mittelnaht für Auszug, Beine/Sockel und Maßlabel aus der aktuellen Platzierung. Die 2D-Abbildung verwendet dieselbe Geometrie wie die Daten.
5. Führe die Bozan- und Persistenztests sowie `npm run test:planner` aus. Commit `feat: preserve four-chair dining group across table variants`.

**Expected:** Ein alter gespeicherter Plan mit drei Stühlen wird sicher auf vier ergänzt; ein bereits gültiger Plan wird nicht verschoben oder dupliziert.

## Task 4 — Accessible comparison tabs and source links

**Files:** `app/planner/workspace/table-comparison-panel.tsx`, `app/planner/workspace/planner-workspace-base.tsx`, `app/planner/workspace/planner-workspace.css`, `tests/planner-workspace.test.tsx`

1. Schreibe UI-Tests für sichtbare Modell-Tabs, `aria-selected`, Varianten-Tabs, Maßanzeige, Bild-Alttext, Quellenlink, disabled blockierte Quelle und einen erfolgreichen Wechsel über den Command.
2. Lass die Tests rot laufen.
3. Baue das Panel als native Disclosure mit `role=tablist`, `role=tab`, `aria-controls` und sichtbarem Fokus. Zeige pro Modell Quellenstatus, belegte Varianten, Bilder und die aktuelle Maßeinheit. Die vierte Quelle bleibt als deaktivierter Tab mit verständlicher Begründung sichtbar.
4. Integriere das Panel neben die bestehende Canvas-Metazeile. Die Aktion „Im Grundriss anwenden“ dispatcht `setPlacementProduct`, selektiert den Tisch und lässt den vorhandenen Autosave greifen. Fehler erscheinen als Alert.
5. Ergänze tokenbasierte Styles für kompakte Tabs, Maßchips, Quelle und disabled state; keine festen Farben außerhalb der bestehenden Design Tokens.
6. Führe den UI-Test und `npm run test:ui` aus. Commit `feat: add accessible table comparison controls`.

**Expected:** Ein Nutzer kann ausschließlich per Tastatur von Modell zu Modell und Variante zu Variante wechseln; die unbekannte Quelle ist auffindbar, aber nicht versehentlich platzierbar.

## Task 5 — Full verification and delivery

1. Lies `AGENTS.md` erneut und führe `npm run codex:preflight` aus. Wenn der lokale Snapshot keine GitHub-Remote/CI-Verbindung besitzt, dokumentiere die konkrete Einschränkung und führe die lokalen Ersatzprüfungen aus.
2. Führe frisch aus: `npm run typecheck`, `npm run lint`, `npm run assets:check`, `npm run test:planner`, `npm run test:ui`, `npm run test:cutover`, `npm run build`.
3. Erzeuge eine kurze Review-Liste gegen Spec/UX-CONTRACT und prüfe den Diff auf URLs, Quellenstatus, deutsche Texte, Accessibility und keine Geheimnisse.
4. Commit `chore: verify table comparison delivery`.
5. Übertrage die geänderten Dateien über die autorisierte GitHub-Schnittstelle auf einen Feature-Branch, eröffne einen PR, prüfe Status/Checks und merge ihn nach erfolgreicher Prüfung.

**Expected:** Alle lokal ausführbaren Gates sind grün; die PR enthält die Source-Manifeste und die umschaltbare, maßstäbliche Tischgruppe.

## Review focus

- Kann eine ungültige oder unbekannte Variante den Tisch ohne Maße ersetzen?
- Wird beim Hydratisieren ein vierter Stuhl doppelt angelegt oder eine gültige Nutzerposition überschrieben?
- Bleiben 2D-Plan, 3D-Modell, Export und Autosave nach dem Wechsel konsistent?
- Sind externe Bild-/Quellen-URLs sichtbar, aber ohne ungesicherte HTML-Einbettung?
