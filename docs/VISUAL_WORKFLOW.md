# Sichtbare Änderungen prüfen

## Schneller Arbeitskreislauf

1. `npm run codex:pipeline -- --mode=check --dry-run` prüft Branch und Remote.
2. `npm run dev:review` startet die Arbeitsvorschau auf `http://127.0.0.1:3001`.
3. Browser öffnen, Code ändern, automatische Aktualisierung abwarten, Screenshot ansehen und nachbessern. Für normale React-/Material-/CSS-Änderungen ist kein Produktionsbuild erforderlich. Abhängigkeiten und Serverkonfiguration können einen Neustart benötigen.
4. Eine gezielte Modellaufnahme oder GUI-Prüfung ausführen. Erst vor Integration alle Prüfungen ausführen.

Der laufende Produktionsadapter (`npm start`) liest `dist`, nicht die aktuellen Quelldateien. Deshalb benötigt diese Startart nach Quelländerungen einen Build und Neustart. Ein Entwicklungsserver und die veröffentlichte Website erfüllen unterschiedliche Zwecke.

## Befehle

| Befehl | Ergebnis |
| --- | --- |
| `npm run dev:review` | Live-Arbeitsvorschau auf Port 3001 |
| `npm run test:browser` | Reale Chromium-GUI-Abläufe mit Screenshots und Fehleraufzeichnung |
| `npm run visual:models -- --live --model chair-kaleo-chenille-beige --view side` | Gezielte Aufnahme vom laufenden Entwicklungsserver ohne Build oder Neustart |
| `npm run visual:models -- --model chair-kaleo-chenille-beige` | Vier feste Perspektiven dieses Modells |
| `npm run visual:models -- --model chair-kaleo-chenille-beige --view side` | Eine gezielte Modellansicht |
| `npm run visual:models` | Alle registrierten Möbel und getrennten Einbaumodelle aus vier Perspektiven |
| `npm run visual:check` | GUI und vollständige Modellgalerie zusammen |
| `npm run validate` | Typecheck, Lint, Assets, Planner-/UI-/Cutover- und Referenzprüfungen |

Ohne `--live` bauen die Browserbefehle selbst und starten einen separaten Produktions-Testserver auf Port 3100. Nach einem bereits erfolgreichen Build kann `VISUAL_SKIP_BUILD=1` gesetzt werden. `--live` ist nur für Modellaufnahmen verfügbar und nutzt gezielt den schon gestarteten Entwicklungsserver auf Port 3001. Die Tests arbeiten mit isolierten Browserkontexten und überschreiben keine Einrichtung im persönlichen Browser. Ihr Testserver schreibt keine PID-Datei des normalen Servers.

Die freie Browserprüfung funktioniert mit Chrome DevTools MCP, wenn ein unterstützter Chrome installiert ist. Fehlt Chrome, kann der bereits installierte Playwright-Chromium-Browser die lokale Vorschau prüfen und Screenshots erzeugen. Ein Offline-Browser ist kein Grund, die visuelle Kontrolle zu überspringen.

## Modellgalerie

`/dev/models?model=<Katalog-ID>&view=front` zeigt den bestehenden Renderer mit fester Kamera und Beleuchtung. Weitere Ansichten: `side`, `back`, `perspective`. Material- und Größenvarianten sind über beschriftete Auswahlfelder steuerbar. IDs der Einbaumodelle beginnen mit `builtin:`.

Die Galerie speichert keinen Wohnungszustand. Sie erzeugt eine isolierte Szene mit genau einem registrierten Modell; die Originaldaten werden nicht verändert. Referenzen stammen aus dem zugehörigen `models/products/.../Auszug/Bilder` oder `models/fixed/.../Auszug/Bilder`. Fehlende Bilder werden ausdrücklich angezeigt. Ein Crawl kann auch unpassende Händlerbilder enthalten; ihre fachliche Zuordnung muss beim Vergleich überprüft werden.

Die Galerie und ihre Referenzroute sind nur im Entwicklungsmodus oder bei explizitem `PLANNER_REVIEW_ENABLED=1` aktiv. Der Cloud-Container aktiviert dies nicht und enthält keine `models`-Referenzordner. Die Route akzeptiert ausschließlich registrierte IDs und Rasterbilder mit passender Dateisignatur, keine HTML-/JSON-Exporte oder beliebigen Dateipfade.

## Aufnahmen und Nachweise

Jeder Browserlauf ersetzt ausschließlich `artifacts/visual/latest`. Ergebnisse liegen unter `gui`, `models`, `test-results` und `report`. Das Verzeichnis ist absichtlich nicht in Git. Browserläufe nacheinander starten und während eines Produktions-Browserlaufs keinen zweiten Build ausführen, weil er die gerade geladenen Dateien in `dist` ersetzt. Für einen gemeinsamen abschließenden Bericht `visual:check` ausführen.

`report/index.html` enthält benannte Aufnahmen und Ergebnisse. `report/results.json` ordnet Szenarien dem Git-Commit und dem Dirty-Status der Arbeitskopie zu. Bei Fehlern bleiben Playwright-Traces erhalten. Der GitHub-Workflow lädt die Ergebnisse auch nach Testfehlern als Artefakt pro Lauf/Commit hoch. Über `Run workflow` mit `full_gallery` kann man zusätzlich die vollständigen Modellaufnahmen anstoßen. Ein Agent benötigt Zugriff, um diese Artefakte herunterladen und öffnen zu können.

`data-render-ready=true` wird nach mehreren tatsächlich gerenderten WebGL-Frames und abgeschlossenen Ladeprozessen gesetzt. Bei Kontextverlust oder Ladefehlern gilt die Aufnahme nicht als bestanden. Die Browsertests prüfen zusätzlich, dass das Canvas sichtbare Pixelvariation enthält. Das erkennt leere Ansichten, beweist aber weder korrekte Geometrie noch realistische Produktoptik.

## Abschluss eines KI-Auftrags

- Passende Screenshots öffnen und beschreiben, was tatsächlich kontrolliert wurde.
- Funktionstests und visuelle Einschätzung getrennt berichten.
- Noch nicht abgedeckte Funktionen in `tests/browser/COVERAGE.md` offen führen.
- Nach sichtbaren Änderungen vor Integration `npm run build`, `npm run validate`, `npm run visual:check` ausführen.
- GitHub `Quality` und Cloud Run beziehen sich auf einen konkreten Commit. Eine alte lokale Webseite ist kein Beweis für den neuen Stand.
- Keine ungeprüfte automatische Baseline-Aktualisierung. Diese erste Fassung erzeugt Nachweise und semantische Funktionstests, keine pauschale Pixel-Freigabe.

## Cloud

Siehe [CLOUD_RUN.md](CLOUD_RUN.md). Google Cloud Build verarbeitet Änderungen an `main` direkt aus dem GitHub-Repository. Erst nach den Prüfungen wird der neue Stand privat auf Cloud Run veröffentlicht. Die Live-Vorschau bleibt für die sofortige Kontrolle erhalten.
