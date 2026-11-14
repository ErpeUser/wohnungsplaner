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
public="$(gcloud run services get-iam-policy "$_SERVICE" --project "$PROJECT_ID" --region "$_REGION" --flatten=bindings[].members --format='value(bindings.members)' 2>/dev/null || true)"
if grep -Eqx 'allUsers|allAuthenticatedUsers' <<< "$public"; then
  echo 'Refusing to deploy an anonymous preview service' >&2
  exit 1
fi
service_json="$(gcloud run services describe "$_SERVICE" --project "$PROJECT_ID" --region "$_REGION" --format=json 2>/dev/null || true)"
if [[ -n "$service_json" ]]; then
  python3 -c 'import json,sys; a=json.load(sys.stdin)["metadata"].get("annotations",{}); assert a.get("run.googleapis.com/invoker-iam-disabled") != "true", "Cloud Run must require IAM"' <<< "$service_json"
fi
gcloud run deploy "$_SERVICE" --project "$PROJECT_ID" --region "$_REGION" \
  --image "$image@$digest" --service-account "$_RUNTIME_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --port 8080 --update-env-vars "HOST=0.0.0.0,CODEX_SOURCE_COMMIT=$COMMIT_SHA" \
  --cpu 1 --memory 1Gi --cpu-throttling --no-cpu-boost \
  --min 0 --max 1 --min-instances 0 --max-instances 1 --concurrency 40 --timeout 60 \
  --labels "commit-sha=$COMMIT_SHA,channel=preview" --quiet
url="$(gcloud run services describe "$_SERVICE" --project "$PROJECT_ID" --region "$_REGION" --format='value(status.url)')"
[[ "$url" =~ ^https://[a-z0-9-]+(\.[a-z0-9-]+)*\.run\.app$ ]]
status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$url/")"
[[ "$status" == 401 || "$status" == 403 ]]
token="$(gcloud auth print-identity-token --audiences="$url")"
curl --fail --silent --show-error -H "Authorization: Bearer $token" "$url/" --output /tmp/preview.html
grep --quiet 'Raumplaner' /tmp/preview.html
printf 'Preview deployed: %s\n' "$url"
