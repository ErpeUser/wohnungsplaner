#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?}" "${COMMIT_SHA:?}" "${BUILD_ID:?}" "${_REGION:?}" "${_SERVICE:?}" "${_REGISTRY:?}" "${_RUNTIME_ACCOUNT:?}"
: "${_CONNECTION:?}" "${_REPOSITORY:?}"
[[ "${BRANCH_NAME:-}" == main ]]
[[ "$COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]

registry="${_REGION}-docker.pkg.dev"
image="$registry/$PROJECT_ID/$_REGISTRY/$_SERVICE"
tag="$image:$COMMIT_SHA-$BUILD_ID"
DOCKER_BUILDKIT=0 docker build --platform linux/amd64 --tag "$tag" .
container="planner-smoke-$BUILD_ID"
docker run --detach --name "$container" --network=cloudbuild "$tag"
trap 'docker logs "$container"; docker rm --force "$container"' EXIT
base="http://$container:8080"
curl --fail --silent --show-error --retry 20 --retry-all-errors --retry-delay 1 "$base/" --output /tmp/planner.html
grep --quiet 'Raumplaner' /tmp/planner.html
curl --fail --silent --show-error "$base/planner-assets/textures/wood/oak.svg" --output /dev/null
test "$(curl --silent --output /dev/null --write-out '%{http_code}' "$base/dev/models")" = 404
test "$(curl --silent --output /dev/null --write-out '%{http_code}' "$base/planner-assets/reference/wohnungsplan.png")" = 404
docker exec "$container" sh -c 'test -z "$(find /app -type f \( -path "*/private-reference/*" -o -path "*/planner-assets/reference/*" \) -print -quit)"'

scope=(--project "$PROJECT_ID" --region "$_REGION")
existing="$(gcloud run services list "${scope[@]}" --filter="metadata.name=$_SERVICE" --format='value(metadata.name)')"
if [[ -n "$existing" ]]; then
  invoker_disabled="$(gcloud run services describe "$_SERVICE" "${scope[@]}" --format="value(metadata.annotations['run.googleapis.com/invoker-iam-disabled'])")"
  [[ "$invoker_disabled" != "true" ]]
  policy="$(gcloud run services get-iam-policy "$_SERVICE" "${scope[@]}" --flatten=bindings[].members --format='value(bindings.members)')"
  if grep -Eqx 'allUsers|allAuthenticatedUsers' <<< "$policy"; then
    echo "Refusing to deploy to an anonymous service" >&2
    exit 1
  fi
fi

gcloud auth configure-docker "$registry" --quiet

# Read only this repository, and never attach the token to the checkout or logs.
repo_resource="projects/$PROJECT_ID/locations/$_REGION/connections/$_CONNECTION/repositories/$_REPOSITORY"
access_token="$(gcloud auth print-access-token)"
repository_token="$(curl --fail --silent --show-error -X POST \
  -H "Authorization: Bearer $access_token" \
  "https://cloudbuild.googleapis.com/v2/$repo_resource:accessReadToken" |
  sed -nE 's/.*"token"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p')"
git_auth="$(printf 'x-access-token:%s' "$repository_token" | base64 -w0)"
unset access_token repository_token
current_main() {
  GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraHeader GIT_CONFIG_VALUE_0="Authorization: Basic $git_auth" \
    GIT_TERMINAL_PROMPT=0 git ls-remote --exit-code https://github.com/ErpeUser/wohnungsplaner.git refs/heads/main | cut -f1
}
head="$(current_main)"
if [[ "$head" != "$COMMIT_SHA" ]]; then
  echo "A newer main commit is available; skipping this deployment."
  exit 0
fi
docker push "$tag" | tee /tmp/wohnungsplaner-image-push.log
hash="$(sed -nE 's/.*digest: (sha256:[[:xdigit:]]{64}) size:.*/\1/p' /tmp/wohnungsplaner-image-push.log | tail -n 1)"
[[ "$hash" =~ ^sha256:[[:xdigit:]]{64}$ ]]
digest="$image@$hash"
head="$(current_main)"
unset git_auth
if [[ "$head" != "$COMMIT_SHA" ]]; then
  echo "Main advanced during image upload; skipping this deployment."
  exit 0
fi
gcloud run deploy "$_SERVICE" "${scope[@]}" \
  --image "$digest" --service-account "$_RUNTIME_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --port 8080 --update-env-vars "HOST=0.0.0.0,CODEX_SOURCE_COMMIT=$COMMIT_SHA" \
  --cpu 1 --memory 1Gi --cpu-throttling --no-cpu-boost \
  --min 0 --max 1 --min-instances 0 --max-instances 1 --concurrency 40 --timeout 60 \
  --labels "commit-sha=$COMMIT_SHA" --quiet
url="$(gcloud run services describe "$_SERVICE" --project "$PROJECT_ID" --region "$_REGION" --format='value(status.url)')"
[[ "$url" =~ ^https://[a-z0-9-]+(\.[a-z0-9-]+)*\.run\.app$ ]]
status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$url/")"
[[ "$status" == 401 || "$status" == 403 ]]
token="$(gcloud auth print-identity-token --audiences="$url")"
curl --fail --silent --show-error --retry 3 --retry-delay 2 \
  -H "Authorization: Bearer $token" "$url/" --output /tmp/cloud-planner.html
grep --quiet 'Raumplaner' /tmp/cloud-planner.html
curl --fail --silent --show-error -H "Authorization: Bearer $token" "$url/__codex/health" |
  grep --quiet "\"sourceCommit\":\"$COMMIT_SHA\""
printf 'Deployed %s to private endpoint %s\n' "$COMMIT_SHA" "$url"
