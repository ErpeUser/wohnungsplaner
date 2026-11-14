# Cloud Run: geprüfte Container aus GitHub

`Quality` prüft denselben Commit mit Typecheck, Lint, Produktionsbuild,
Planner-/UI-/Servertests, Asset- und Referenzprüfung, Dependency-Audit und
Playwright in Chromium. Browserbericht, Screenshots und Ergebnisse aus
`artifacts/visual/latest/` werden auch bei Fehlern als GitHub-Artefakt hochgeladen
(7 Tage Aufbewahrung). Danach baut und startet der Workflow das Containerimage
und prüft HTML, ein öffentliches Asset und die Sperre privater Referenzen.

Nur ein erfolgreicher **Push auf main** kann deployen. Pull Requests und manuell
gestartete Läufe deployen nie. Das getestete Image wird als kurzlebiges Artefakt
(1 Tag) an den Deployjob übergeben, nach Artifact Registry gepusht und anhand
seines unveränderlichen SHA256-Digests ausgerollt. Es gibt keinen zweiten
Cloud-Build- oder Source-Deploy-Pfad. Die Cloud-Authentifizierung erfolgt erst
nach den Tests über GitHub OIDC / Workload Identity Federation, ohne JSON-Key.

## Aktueller Freischaltpunkt

Die Dateien allein aktivieren kein Hosting. Ohne `CLOUD_RUN_ENABLED=true` und
sämtliche unten genannten Repository-Variablen wird der Deployjob übersprungen.
Ein aktives Google-Cloud-Projekt mit verknüpftem, geöffnetem Billing-Konto,
Artifact Registry, Dienstkonten und Workload Identity Provider ist erforderlich.
Ein zur Löschung vorgemerktes Projekt oder geschlossenes Billing-Konto reicht
nicht aus. Ein erfolgreicher lokaler Test ist kein Nachweis eines Cloud-Deploys.
Außerdem muss GitHub Actions für das Repository ausführbar sein. Wenn GitHub
einen Lauf bereits vor dem Start wegen Zahlungen oder Ausgabenlimits ablehnt,
muss die Kontoinhaberin oder der Kontoinhaber dies in GitHub unter
**Settings → Billing and licensing** klären. Google-Billing behebt das nicht.
Die Option `full_gallery` beim manuellen Workflowstart erzeugt zusätzlich volle
Modellaufnahmen; dieser Lauf dient nur zur Prüfung.

## Einmalige Einrichtung

Die folgenden Befehle sind für **Bash / Google Cloud Shell** geschrieben. Ein
Projektadministrator führt sie bewusst im gewünschten Projekt aus. Sie erstellen
Ressourcen und Berechtigungen; bei bestehender Infrastruktur deren IDs einsetzen
und die entsprechenden Erstellbefehle auslassen. Billing muss vorher aktiv sein.
`gh` muss für `ErpeUser/wohnungsplaner` angemeldet sein (alternativ die Variablen
in GitHub unter Settings → Secrets and variables → Actions → Variables setzen).

```bash
set -euo pipefail
PROJECT_ID='HIER-AKTIVES-PROJEKT-EINTRAGEN'
REGION='europe-west1'
REPO='ErpeUser/wohnungsplaner'
REGISTRY='wohnungsplaner'
SERVICE='wohnungsplaner'
POOL='github-wohnungsplaner'
PROVIDER='quality-main'
DEPLOY_ACCOUNT='github-wohnungsplaner'
RUNTIME_ACCOUNT='wohnungsplaner-runtime'

gcloud projects describe "$PROJECT_ID" --format='value(lifecycleState)'
gcloud billing projects describe "$PROJECT_ID"
# Erst fortfahren, wenn ACTIVE und billingEnabled: true bestätigt sind.
gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  --project="$PROJECT_ID"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
REPO_ID="$(gh api "repos/$REPO" --jq '.id')"
OWNER_ID="$(gh api "repos/$REPO" --jq '.owner.id')"
DEPLOY_SA="${DEPLOY_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA="${RUNTIME_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud artifacts repositories create "$REGISTRY" --project="$PROJECT_ID" \
  --location="$REGION" --repository-format=docker
gcloud iam service-accounts create "$DEPLOY_ACCOUNT" --project="$PROJECT_ID"
gcloud iam service-accounts create "$RUNTIME_ACCOUNT" --project="$PROJECT_ID"

# Deploykonto: Cloud Run erstellen/aktualisieren, keine IAM-Policies verändern.
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEPLOY_SA" --role=roles/run.developer --condition=None
# Registry-Schreibrecht nur für dieses Repository.
gcloud artifacts repositories add-iam-policy-binding "$REGISTRY" \
  --project="$PROJECT_ID" --location="$REGION" \
  --member="serviceAccount:$DEPLOY_SA" --role=roles/artifactregistry.writer
# Das Deploykonto darf nur das dedizierte Laufzeitkonto verwenden.
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --project="$PROJECT_ID" --member="serviceAccount:$DEPLOY_SA" \
  --role=roles/iam.serviceAccountUser
# Das Laufzeitkonto selbst erhält keine Projektrollen.

gcloud iam workload-identity-pools create "$POOL" --project="$PROJECT_ID" \
  --location=global --display-name='Wohnungsplaner GitHub'
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
  --project="$PROJECT_ID" --location=global --workload-identity-pool="$POOL" \
  --issuer-uri='https://token.actions.githubusercontent.com' \
  --attribute-mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository_owner_id=assertion.repository_owner_id,attribute.ref=assertion.ref,attribute.workflow_ref=assertion.workflow_ref,attribute.event_name=assertion.event_name' \
  --attribute-condition="assertion.repository_id == '$REPO_ID' && assertion.repository_owner_id == '$OWNER_ID' && assertion.ref == 'refs/heads/main' && assertion.event_name == 'push' && assertion.workflow_ref == '$REPO/.github/workflows/quality.yml@refs/heads/main'"

gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" \
  --project="$PROJECT_ID" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository_id/$REPO_ID"

WIF_PROVIDER="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER"
gh variable set GCP_PROJECT_ID --repo "$REPO" --body "$PROJECT_ID"
gh variable set GCP_REGION --repo "$REPO" --body "$REGION"
gh variable set GCP_ARTIFACT_REPOSITORY --repo "$REPO" --body "$REGISTRY"
gh variable set CLOUD_RUN_SERVICE --repo "$REPO" --body "$SERVICE"
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo "$REPO" --body "$WIF_PROVIDER"
gh variable set GCP_DEPLOY_SERVICE_ACCOUNT --repo "$REPO" --body "$DEPLOY_SA"
gh variable set GCP_RUNTIME_SERVICE_ACCOUNT --repo "$REPO" --body "$RUNTIME_SA"
# Als letzten Schritt einschalten; der nächste erfolgreiche main-Push deployt.
gh variable set CLOUD_RUN_ENABLED --repo "$REPO" --body true
```

Die WIF-Bedingung verwendet unveränderliche GitHub-Repository-/Eigentümer-IDs
und beschränkt Tokens auf Pushes auf main aus genau dieser Workflowdatei. Die
Vertrauensgrenze bleibt ein Schreibrecht auf main: Branchschutz und Reviews in
GitHub passend einrichten. Keine Cloud-Schlüssel im Repository ablegen.
Für Registry in einem anderen Projekt sind zusätzliche Pull-Berechtigungen für
den Cloud-Run-Service-Agent erforderlich; obige Einrichtung nutzt ein Projekt.

| Repository-Variable | Inhalt |
| --- | --- |
| `CLOUD_RUN_ENABLED` | exakt `true`, sonst kein Deploy |
| `GCP_PROJECT_ID` | aktives Google-Cloud-Projekt |
| `GCP_REGION` | z. B. `europe-west1` |
| `GCP_ARTIFACT_REPOSITORY` | Repositoryname, z. B. `wohnungsplaner` |
| `CLOUD_RUN_SERVICE` | Name des Cloud-Run-Dienstes |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | vollständiger Provider-Ressourcenname |
| `GCP_DEPLOY_SERVICE_ACCOUNT` | E-Mail des Deploykontos |
| `GCP_RUNTIME_SERVICE_ACCOUNT` | E-Mail des unprivilegierten Laufzeitkontos |

## Kosten und Zugriff

Der Dienst nutzt anfragebasierte CPU-Abrechnung, 1 vCPU, 1 GiB RAM,
Mindestinstanzen **0**, maximal **1** Instanz und Parallelität 40. Ohne Anfragen
kann er auf null skalieren; der erste Aufruf kann dadurch langsamer sein.
Die maximale Instanzzahl begrenzt Kapazität, ist jedoch kein Euro-Kostenlimit.
Artifact Registry, ausgehender Traffic und Logging können separat kosten.
Alte Images regelmäßig über eine bewusst konfigurierte Registry-Cleanup-Policy
entfernen; die eintägige GitHub-Artefaktfrist löscht keine Registry-Images.

Kosten vor Freischaltung im gewählten Projekt prüfen. Für Warnungen Budgets
konfigurieren; einen tatsächlich durchgesetzten Cloud-Run-Spend-Cap separat
prüfen, einschließlich Verzögerung und nicht erfasster Dienste. Ein Budgetalarm
allein beendet keine Nutzung. Es wird kein kostenfreier Dauerbetrieb zugesagt.

Cloud Run prüft standardmäßig IAM und ein neuer Dienst bleibt privat.
Hat ein bestehender Dienst die Prüfung ausgeschaltet oder
`allUsers` bzw. `allAuthenticatedUsers` in seiner IAM-Policy, bricht der Workflow
vor der Aktualisierung ab. Der abschließende HTTPS-Test prüft sowohl die
Ablehnung anonymer Anfragen als auch den authentifizierten Zugriff. Das Deploykonto
kann IAM-Policies nicht verändern. Eine bloße Service-URL funktioniert deshalb
nicht wie eine öffentliche Website im Browser. Angemeldete, berechtigte Nutzer
können einen lokalen authentifizierten Proxy starten:

```bash
gcloud run services proxy wohnungsplaner --project PROJEKT --region europe-west1 --port 3002
# Anschließend im Browser: http://127.0.0.1:3002
```

Dafür gezielt `roles/run.invoker` für die
gewünschten Nutzer am Dienst vergeben; weder die Pipeline noch das Laufzeitkonto
erhalten dadurch einen öffentlichen Zugang.

## Lokal prüfen und Betrieb

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run build
docker build --platform linux/amd64 --tag wohnungsplaner:local .
docker run --rm --publish 127.0.0.1:8080:8080 wohnungsplaner:local
# In einem zweiten Terminal:
curl --fail http://127.0.0.1:8080/
```

Docker benötigt eine laufende Linux-Engine. Das Image enthält nur den geprüften
Build, öffentliche Assets, `package.json` und den Node-Adapter, keine
`node_modules`, privaten Quelldateien, Browserberichte oder OIDC-Credentials.
Der Adapter startet als unprivilegierter Nutzer, bindet im Container
`HOST=0.0.0.0` und respektiert Cloud Runs `PORT` (Standard im Image: 8080).
Ohne `HOST` bleibt ein lokaler `npm start` auf `127.0.0.1`.
Testserver setzen `PLANNER_WRITE_PID=0`, damit sie die PID-Datei eines laufenden
Benutzerservers weder überschreiben noch beim Beenden entfernen.
`PLANNER_PID_FILE` erlaubt alternativ eine eigene PID-Datei; ein relativer Pfad
wird gegen das Projektverzeichnis aufgelöst. Beim Beenden löscht der Adapter
nur eine selbst geschriebene Datei, deren Inhalt noch seine eigene PID ist.
Die temporäre
Cloudflare-Node-Brücke und PID-Datei benötigen beschreibbare Imageverzeichnisse;
es gibt keinen persistenten Serverspeicher. Planungsdaten bleiben wie bisher
im Browser gespeichert.

Ein Deployfehler beendet den Job als Fehler; die Actions-Zusammenfassung enthält
den Digest und die Service-URL nur nach erfolgreichem `gcloud run deploy`.
Zurückrollen erfolgt bewusst auf eine zuvor geprüfte Cloud-Run-Revision, z. B.
`gcloud run services update-traffic SERVICE --project PROJEKT --region REGION
--to-revisions REVISION=100`. Vorher Revision und Image-Digest überprüfen.
Abschalten weiterer Deploys: `CLOUD_RUN_ENABLED=false`; das löscht weder den
laufenden Dienst noch gespeicherte Images.

## Primärquellen

- [Cloud Run Containervertrag](https://docs.cloud.google.com/run/docs/container-contract)
- [gcloud run deploy und Abrechnungs-/Skalierungsoptionen](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy)
- [Workload Identity Federation für GitHub](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines#github-actions)
- [Google GitHub Actions Auth](https://github.com/google-github-actions/auth)
- [Cloud Run IAM-Zugriff](https://docs.cloud.google.com/run/docs/securing/managing-access)
- [Cloud Run Preise](https://cloud.google.com/run/pricing)
- [Cloud Run Spend-Caps](https://docs.cloud.google.com/billing/docs/how-to/budgets-spend-caps)
