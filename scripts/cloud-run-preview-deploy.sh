#!/usr/bin/env bash
set -euo pipefail

if [[ "${_DEPLOY:-false}" != true ]]; then
  printf 'Preview deployment is disabled; set _DEPLOY=true to enable it.\n'
  exit 0
fi

: "${PROJECT_ID:?}" "${COMMIT_SHA:?}" "${BUILD_ID:?}" "${_REGION:?}" "${_SERVICE:?}" "${_REGISTRY:?}" "${_RUNTIME_ACCOUNT:?}"
[[ "${BRANCH_NAME:-}" == main ]]
[[ "$COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]
scope=(--project "$PROJECT_ID" --region "$_REGION")
existing="$(gcloud run services list "${scope[@]}" --filter="metadata.name=$_SERVICE" --format='value(metadata.name)')"
if [[ -n "$existing" ]]; then
  service_json="$(gcloud run services describe "$_SERVICE" "${scope[@]}" --format=json)"
  python3 -c 'import json, sys; a = json.load(sys.stdin)["metadata"].get("annotations", {}); assert a.get("run.googleapis.com/invoker-iam-disabled") != "true", "Cloud Run must require IAM"' <<< "$service_json"
  policy="$(gcloud run services get-iam-policy "$_SERVICE" "${scope[@]}" --flatten=bindings[].members --format='value(bindings.members)')"
  if grep -Eqx 'allUsers|allAuthenticatedUsers' <<< "$policy"; then
    echo "Refusing to deploy to an anonymous service" >&2
    exit 1
  fi
fi

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
[[ "$status" == 401 || "$status" == 403 ]]
token="$(gcloud auth print-identity-token --audiences="$url")"
preview_html="$(mktemp)"
trap 'rm -f "$preview_html"' EXIT
curl --fail --silent --show-error -H "Authorization: Bearer $token" "$url/" --output "$preview_html"
unset token
grep --quiet 'Raumplaner' "$preview_html"
printf 'Preview deployed to private endpoint: %s\n' "$url"
