# GitHub-only Visual Cloud Review

## Zweck und Ursache

ChatGPT Web hat keine automatische Verbindung zur lokalen Edge-Sitzung und keine für das Projekt nutzbare WebGL-Desktopumgebung. **Die echte GUI muss deshalb auf einem entfernten Runner gerendert werden.** Screenshots dürfen erst danach von ChatGPT überprüft werden. Ein GitHub-Commit, Dateipfad, DOM-Canvas oder grüner Test ist keine visuelle Modellabnahme.

PR #9 verwendete `npx playwright install --with-deps chromium`; der lokale Lauf endete bereits beim unvollständigen Browserarchiv. Ein alternativer System-Chromium-Start wurde durch eine Unix-Socket-Sandbox blockiert. Das ist zunächst ein **Startproblem**, kein Beleg für defekte Three.js-Modelle. Der neue Workflow startet unabhängig vom ChatGPT-Browser im x64-GitHub-Runner `ubuntu-24.04`, der Google Chrome und Edge enthält. `VISUAL_BROWSER_CHANNEL=chrome` verbindet Playwright mit dem bereits installierten System-Chrome; kein Chromium-Download und keine lokale Edge-Sitzung sind nötig.

Die Browserargumente `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` ermöglichen CPU-basiertes WebGL auf dem kontrollierten Test-Runner. Der Opt-in-Schalter ist nur für Testzwecke und vertrauenswürdige Projektinhalte vorgesehen. Der Probe-Lauf prüft WebGL2, `gl.readPixels`, Renderingversion und erstellt einen tatsächlichen PNG-Beleg. Die bestehenden Szenen-Tests prüfen zusätzlich `data-render-ready`, eindeutige Render-Keys und nichtleere Modellpixel. Beides muss erfolgreich sein.

## GitHub-Aufruf

Ein Push auf `qa/github-only-visual-*` startet automatisch `.github/workflows/visual-cloud.yml`, einschließlich Build, Privacy-Check, kompletter Browserprüfung und Artefakt-Upload **auch bei Testfehlern**. Es werden keine Cloud-Run-, Deployment- oder IAM-Aktionen ausgeführt.

Nach Aufnahme des Workflows in den GitHub-Standardbranch kann man zusätzlich über **GitHub > Actions > Visual Cloud Evidence > Run workflow** die Modi `all`, `gui` oder `models` wählen. GitHub stellt den manuellen `workflow_dispatch`-Start erst bereit, wenn die Workflowdatei im **Standardbranch** existiert; vorher dienen Branch-Pushes zum Test. Die aktuelle Code-Änderung ist absichtlich ein separater Review-Branch und kein Merge nach `main`.

## Artefakte und KI-Bildkontrolle

Nach einem Runner-Lauf: **Actions > Visual Cloud Evidence > entsprechender Run > Artifacts > visual-cloud-<run-id>-<commit>** herunterladen, ZIP entpacken. Alternativ:

```bash
gh run list -w visual-cloud.yml
gh run download <RUN_ID> --dir ./visual-evidence
```

Der komprimierte Inhalt enthält `report/index.html` (GUI-Index), `report/models.html` (alle Modellmanifeste, Varianten und Produktreferenzen), `report/manifest.json` (maschinenlesbare Zuordnung mit Commit), `report/webgl-probe.json` und `report/webgl-probe.png`, `gui/*.png`, `models/<gallery-id>/*.png`, `references/<modell-id>/*` und Playwright-Traces. Die Screenshots verwenden die tatsächliche Anwendung und den bestehenden `/dev/models`-Viewer.

Für ChatGPT mit verbundenem GitHub: Workflow-Run über GitHub lesen, Artefakt-ID aus dem Run abrufen, **GitHub-Artifact-ZIP herunterladen**, ZIP für die visuelle Bildverarbeitung bereitstellen, einzelne PNG-Dateien tatsächlich öffnen. Dafür sind GitHub-Actions-Leserechte auf dem **privaten** Repository erforderlich. Ein ChatGPT-Chat mit reinem GitHub-Textzugriff kann Bildpixel nicht aus einem Pfad ableiten. Gegebenenfalls die ZIP-Datei oder konkrete PNGs als Chat-Anhang hochladen. Produkt- und Referenzbilder aus dem privaten Repo **nicht öffentlich auf GitHub Pages veröffentlichen**.

Der JSON-Index ordnet Modell-ID, Galerie-ID, Variante, vier Kameras, Referenzdateien, URLs, Commit und technische Prüfergebnisse zu. Aliase und Festobjekte ohne Renderer stehen als `not-renderable`; bestehende Renderer mit fehlendem Bild als `missing`. Ein Lauf mit diesen Lücken darf nicht als vollständige Modellabdeckung ausgegeben werden. `fidelity: not-reviewed` bleibt bis zur gesonderten optischen Abnahme bestehen.

## Befehle lokal oder in anderen Agenten-Umgebungen

```bash
npm ci
# Nur lokal, falls kein Chrome/Edge vorhanden:
npx playwright install chromium
npm run test:browser
npm run visual:models
npm run visual:check
```

Auf einem GitHub-hosted Ubuntu-x64-Runner braucht es nach `npm ci` keinen Browserdownload:

```bash
VISUAL_BROWSER_CHANNEL=chrome npm run visual:check
# oder mit dem ebenfalls vorhandenen System-Edge:
VISUAL_BROWSER_CHANNEL=msedge npm run test:browser
```

Aufnahmen werden vollständig unter `artifacts/visual/latest/` neu erstellt; vorherige Läufe bleiben über GitHub Actions Artifacts nachvollziehbar. Bei einer geänderten Chrome-Version kann Rasterisierung abweichen; Bericht und Probe dokumentieren die konkrete Version. Für pixelstrenge Golden-Screenshot-Abnahmen bevorzugt man eine **versioniert eingefrorene** Runner-Umgebung und `toHaveScreenshot()` mit kuratierten Baselines. Baselines niemals automatisch aktualisieren, wenn eine Abweichung vorliegt.

## Abdeckungsgrenzen

Browser-Tests überprüfen alle 8 auswählbaren Räume in 2D und 3D, die vorhandenen GUI-Abläufe sowie einen isolierten JSON-Export-/Import-Roundtrip. Die Modellgalerie durchläuft jedes dort registrierte Modell und jede angebotene Größenvariante in vier Perspektiven. Das Manifest verzeichnet außerdem sämtliche `models/{products,fixed}/*/manifest.json` inklusive fehlender tatsächlicher Renderer. **Nicht automatisch freigegeben:** Produktbildtreue, jede Farbe, alle Drag-/Touch-Gesten, jede mögliche Kameraeinstellung, FPS und Hardware-GPU-Darstellung.

Alternativen: Offizielles Playwright-Docker-Image mit passenden Versionen (stabiler, aber großes Containerimage), Playwright MCP für Agenten mit eigener Browserlaufzeit, oder optionale Dienste wie Chromatic/Percy für reine UI-Snapshots. Keiner ersetzt echte Browser-/3D-Pixel für die geprüfte App. Ein vollständig browserloser Node/Blender-Render kann Geometrie plausibilisieren, prüft aber nicht dieselbe WebGL- und GUI-Implementierung.
