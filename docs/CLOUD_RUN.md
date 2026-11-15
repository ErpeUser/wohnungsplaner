# Cloud Run mit Google Cloud Build

GitHub ist das private Quellarchiv. Google Cloud Build ist mit
`ErpeUser/wohnungsplaner` verbunden und startet bei jedem Push auf `main`.
GitHub Actions übernimmt die visuellen Browser- und WebGL-Prüfungen separat.

## Schnelle KI-Preview bei jedem main-Push

Der Trigger `wohnungsplaner-main` verwendet `cloudbuild.yaml`: Abhängigkeiten
installieren, Anwendung bauen, Image hochladen und Preview veröffentlichen.
Tests, Lint, Typecheck, Audit und Screenshot-Prüfungen blockieren diese Vorschau
nicht. Sie laufen separat; der Produktionskanal behält seine Prüfungen.
Für Änderungen an einzelnen Modellen oder Materialien ist lokal
`npm run dev:review` der schnellste Weg: Aktualisierung ohne Container-Build.

`_DEPLOY` steht in dieser Preview-Konfiguration standardmäßig auf `true`.
Für einen reinen Prüflauf ausdrücklich `_DEPLOY=false` übergeben: Dann
entfallen Image-Bau, Upload und Deploy. Die Docker-Schritte erhalten diesen
Wert explizit als Umgebungsvariable. Der Preview-Deploy erhält die vorhandene
Zugangsregel: öffentliche Preview direkt, private Dienste per IAM-Token.
Er ändert keine IAM-Bindings. Erfolg wird erst gemeldet, wenn die Seite
„Raumplaner“ liefert und `/__codex/health` den exakten gebauten Commit meldet.

Die Preview veröffentlicht auf dem Dienst `wohnungsplaner-preview`.
Die Preview-URL wird nach dem ersten erfolgreichen Lauf in der Cloud-Run-
Servicebeschreibung sichtbar. Auch diese Preview ist ein neu gebautes Containerimage;
Cloud Run lädt keine Quelldateien live.

## Vollständiger Produktionslauf

Die folgenden erweiterten Schritte gehören zu `cloudbuild-production.yaml`
und `scripts/cloud-run-release.sh`. Sie sind vom Preview-Trigger getrennt;
eine Veröffentlichung über das vorgesehene Tag-Muster `production-*` benötigt eine
ausdrückliche Freigabe.

1. Google lädt den exakten Commit, installiert den Lockfile-Stand und führt
   Produktionsbuild, `npm run validate` und Dependency-Audit aus.
2. Google prüft das Produktionsimage lokal im Build. Galerie und private
   Planquellen bleiben aus dem Dienst ausgeschlossen. Der Build veröffentlicht
   das geprüfte Image anhand seines Digests in Cloud Run.
3. Vor dem Deploy wird der aktuelle Stand von `main` kontrolliert. Nach dem
   Deploy muss die anonyme Anfrage abgewiesen werden und die authentifizierte
   Antwort den erwarteten Commit melden.

`npm run dev:review` bleibt für die sofortige KI-Vorschau auf dem PC. Cloud Run
zeigt den letzten erfolgreichen veröffentlichten Stand; er ist kein Editor.
Die getesteten Browserabläufe und Artefakte stehen in [VISUAL_CLOUD.md](VISUAL_CLOUD.md)
und [COVERAGE.md](../tests/browser/COVERAGE.md).

## Google-Konfiguration

- Projekt `example-project`. Alle `gcloud builds`-Abfragen
  müssen `--project=example-project --region=europe-west1`
  verwenden; die globale Build-Liste zeigt diese regionalen Läufe nicht.
- Region `europe-west1` (Belgien), Trigger `wohnungsplaner-main`, Quellfilter
  `^main$`, Build-Datei `cloudbuild.yaml`.
- Das separate Cloud-Build-Konto erhält Schreibrechte nur auf die betreffende
  Image-Registry und den privaten Berichtsspeicher, Leserechte an der
  Repository-Verbindung und die Entwicklerrolle für Cloud Run. Das
  Laufzeitkonto erhält keine Projektrollen. Es gibt keine JSON-Schlüssel.
- In GitHub unter **Settings → Applications → Installed GitHub Apps** nur
  `ErpeUser/wohnungsplaner` für die Cloud-Build-App auswählen. Beim erneuten
  Einrichten dient Googles [Verbindungsanleitung](https://docs.cloud.google.com/build/docs/automating-builds/github/connect-repo-github?generation=2nd-gen).
- Für den Produktionstrigger `_DEPLOY=true` setzen. Ohne diese explizite
  Deploy-Variable prüft der Build nur. Visuelle Modellaufnahmen und Reports
  werden über GitHub Actions erzeugt und als private Artefakte gespeichert.

Visual-Berichte nach Commit im GitHub-Actions-Lauf unter **Artifacts** als
`visual-cloud-<run-id>-<commit>` herunterladen. `report/index.html` zeigt die
Aufnahmen; Build-Protokolle stehen weiterhin in Cloud Logging.

Der Dienst verlangt Google-IAM-Authentifizierung. Zugang im Browser über den
lokalen authentifizierten Proxy:

```bash
gcloud run services proxy wohnungsplaner --project PROJEKT --region europe-west1 --port 3002
```

Danach im Browser `http://127.0.0.1:3002/` öffnen. Berechtigte Nutzer benötigen
`roles/run.invoker` am Dienst oder eine Rolle, die diese Berechtigung enthält.
Die Modellgalerie und lokale Planungsdaten bleiben in der jeweiligen
Browserumgebung; lokaler und Cloud-Ursprung teilen den Speicher nicht.

## Kosten und Betrieb

- **Cloud Build:** `E2_STANDARD_2` im Standardpool, maximal 2,5 Stunden pro
  Build. Google nennt für diese Konfiguration derzeit 2.500 Freiminuten pro
  Abrechnungskonto und Monat, danach 0,006 USD je Minute. Einzelaufnahmen
  besser lokal ausführen. [Cloud Build Preise](https://cloud.google.com/build/pricing)
- **Cloud Run:** anfragebasierte Abrechnung, 1 vCPU, 1 GiB, 0–1 Instanzen,
  kein CPU-Schub beim Start. Im Leerlauf skaliert der Dienst auf null.
  [Cloud Run Preise](https://cloud.google.com/run/pricing)
- **Speicher und Verkehr:** Image-Speicher, private Berichte und ausgehender
  Datenverkehr werden getrennt berechnet; die Instanzgrenze ist kein
  Budgetlimit. [Registry-Preise](https://cloud.google.com/artifact-registry/pricing)

Weitere Veröffentlichungen stoppen: den Cloud-Build-Trigger deaktivieren.
Das lässt den zuletzt erfolgreichen Dienst erreichbar. Zum Zurückrollen eine
zuvor geprüfte Cloud-Run-Revision auswählen und deren Digest kontrollieren.
