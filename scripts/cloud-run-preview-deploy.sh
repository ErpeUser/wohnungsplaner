#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?}" "${COMMIT_SHA:?}" "${BUILD_ID:?}" "${_REGION:?}" "${_SERVICE:?}" "${_REGISTRY:?}" "${_RUNTIME_ACCOUNT:?}"
[[ "${BRANCH_NAME:-}" == main ]]
[[ "$COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]
registry="${_REGION}-docker.pkg.dev"
image="$registry/$PROJECT_ID/$_REGISTRY/${_IMAGE_NAME:-$_SERVICE}"
tag="$image:$COMMIT_SHA-$BUILD_ID"
digest="$(gcloud artifacts docker images describe "$tag" --project "$PROJECT_ID" --format='value(image_summary.digest)')"
[[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]]
gcloud run deploy "$_SERVICE" --project "$PROJECT_ID" --region "$_REGION" \
  --image "$image@$digest" --service-account "$_RUNTIME_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --port 8080 --update-env-vars "HOST=0.0.0.0,CODEX_SOURCE_COMMIT=$COMMIT_SHA" \
  --cpu 1 --memory 1Gi --cpu-throttling --no-cpu-boost \
  --min 0 --max 1 --min-instances 0 --max-instances 1 --concurrency 40 --timeout 60 \
  --labels "commit-sha=$COMMIT_SHA,channel=preview" --quiet
url="$(gcloud run services describe "$_SERVICE" --project "$PROJECT_ID" --region "$_REGION" --format='value(status.url)')"
[[ "$url" =~ ^https://[a-z0-9-]+(\.[a-z0-9-]+)*\.run\.app$ ]]
status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$url/")"
[[ "$status" == 200 ]]
curl --fail --silent --show-error "$url/" --output /tmp/preview.html
grep --quiet 'Raumplaner' /tmp/preview.html
printf 'Preview deployed: %s\n' "$url"
