# Cloud Run mit Google Cloud Build

GitHub ist das private Quellarchiv. Google Cloud Build ist mit
`ErpeUser/wohnungsplaner` verbunden und startet bei jedem Push auf `main`.
GitHub Actions wird für diese Veröffentlichung nicht verwendet.

## Was bei einem Push passiert

1. Google lädt den exakten Commit, installiert den Lockfile-Stand und führt
   Produktionsbuild, `npm run validate` und Dependency-Audit aus.
2. Playwright prüft die wichtigsten Bedienabläufe. Google speichert den
   Browserbericht, Screenshots und gegebenenfalls Fehler-Traces privat pro
   Commit und Build-ID. Fehler verhindern die Veröffentlichung.
3. Google prüft das Produktionsimage lokal im Build. Galerie und private
   Planquellen bleiben aus dem Dienst ausgeschlossen. Der Build veröffentlicht
   das geprüfte Image anhand seines Digests in Cloud Run.
4. Vor dem Deploy wird der aktuelle Stand von `main` kontrolliert. Nach dem
   Deploy muss die anonyme Anfrage abgewiesen werden und die authentifizierte
   Antwort den erwarteten Commit melden.

`npm run dev:review` bleibt für die sofortige KI-Vorschau auf dem PC. Cloud Run
zeigt den letzten erfolgreichen veröffentlichten Stand; er ist kein Editor.
Die getesteten Browserabläufe stehen in [COVERAGE.md](../tests/browser/COVERAGE.md).

## Google-Konfiguration

- Region `europe-west1` (Belgien), Trigger `wohnungsplaner-main`, Quellfilter
  `^main$`, Build-Datei `cloudbuild.yaml`.
- Das separate Cloud-Build-Konto erhält Schreibrechte nur auf die betreffende
  Image-Registry und den privaten Berichtsspeicher, Leserechte an der
  Repository-Verbindung und die Entwicklerrolle für Cloud Run. Das
  Laufzeitkonto erhält keine Projektrollen. Es gibt keine JSON-Schlüssel.
- In GitHub unter **Settings → Applications → Installed GitHub Apps** nur
  `ErpeUser/wohnungsplaner` für die Cloud-Build-App auswählen. Beim erneuten
  Einrichten dient Googles [Verbindungsanleitung](https://docs.cloud.google.com/build/docs/automating-builds/github/connect-repo-github?generation=2nd-gen).
- Für den Produktionstrigger `_DEPLOY=true` und `_REPORT_BUCKET=<Name des
  privaten Buckets>` setzen. Ohne diese explizite Deploy-Variable prüft der
  Build nur. `_FULL_GALLERY=true` erfasst zusätzlich alle Modellansichten
  und ist für gezielte Prüfläufe gedacht.

Berichte nach Commit im privaten Bucket unter
`gs://<Bucket>/<Commit>/<Build-ID>/browser-report.tar.gz` herunterladen und
entpacken. `report/index.html` zeigt die Aufnahmen. Der Bucket entfernt die
Berichte nach sieben Tagen. Build-Protokolle stehen in Cloud Logging.

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

- **Cloud Build:** `E2_STANDARD_2` im Standardpool, maximal 90 Minuten pro
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
