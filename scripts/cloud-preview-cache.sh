#!/usr/bin/env bash
set -euo pipefail

# Linux-only Cloud Build cache. Archives never enter the runtime container.
# Bump this version when changing the build toolchain or cache format.
toolchain="v1-node22.22.2-bookworm-slim-linux-x64-npm12.1.0"
state=".local/preview-cache"

keys() {
  dependency_key="$(
    { printf '%s\n' "$toolchain"; sha256sum package.json package-lock.json; } |
      sha256sum | cut -d ' ' -f 1
  )"
  build_key="$(
    {
      printf '%s\n' "$dependency_key"
      for directory in app worker; do
        if [[ -d "$directory" ]]; then
          find "$directory" -type f -print0 | LC_ALL=C sort -z | xargs -0 -r sha256sum
        fi
      done
      for file in vite.config.ts next.config.ts postcss.config.mjs tsconfig.json \
        sync-client-assets.mjs public/planner-assets/manifest.json; do
        if [[ -f "$file" ]]; then sha256sum "$file"; fi
      done
      # Vinext embeds the public-file inventory; contents of runtime assets are
      # refreshed separately. Imported JSON above is a compilation input.
      if [[ -d public ]]; then find public -type f | LC_ALL=C sort; fi
      sha256sum < "$0"
    } | sha256sum | cut -d ' ' -f 1
  )"
  printf 'DEPENDENCY_KEY=%s\nBUILD_KEY=%s\n' "$dependency_key" "$build_key"
}

restore() {
  mkdir -p "$state"
  rm -f "$state/build-hit" "$state/dependencies-hit" "$state/build-new" "$state/dependencies-new"
  keys > "$state/keys.env"
  source "$state/keys.env"
  prefix="gs://$_CACHE_BUCKET/v1"
  rm -rf "$state/unpack"
  mkdir -p "$state/unpack"
  if gcloud storage cp "$prefix/builds/$BUILD_KEY.tgz" "$state/build.tgz" --quiet &&
    tar -xzf "$state/build.tgz" -C "$state/unpack" &&
    [[ -f "$state/unpack/dist/server/index.js" && -d "$state/unpack/dist/client/_next" ]]; then
    rm -rf dist
    mv "$state/unpack/dist" dist
    touch "$state/build-hit"
    echo "PREVIEW_CACHE compiled=hit dependencies=not-needed"
    return
  fi
  echo "PREVIEW_CACHE compiled=miss"
  rm -rf "$state/unpack"
  mkdir -p "$state/unpack"
  if gcloud storage cp "$prefix/dependencies/$DEPENDENCY_KEY.tgz" "$state/dependencies.tgz" --quiet &&
    tar -xzf "$state/dependencies.tgz" -C "$state/unpack" &&
    [[ -f "$state/unpack/node_modules/.package-lock.json" ]]; then
    rm -rf node_modules
    mv "$state/unpack/node_modules" node_modules
    touch "$state/dependencies-hit"
    echo "PREVIEW_CACHE dependencies=hit"
  else
    echo "PREVIEW_CACHE dependencies=miss"
  fi
  rm -rf "$state/unpack"
}

build() {
  if [[ -f "$state/build-hit" ]]; then
    echo "PREVIEW_BUILD install=skipped compile=skipped"
    cp -a public/. dist/client/
    node sync-client-assets.mjs
    return
  fi
  if [[ -f "$state/dependencies-hit" ]]; then
    echo "PREVIEW_BUILD install=skipped compile=required"
  else
    npx --yes npm@12.1.0 ci --ignore-scripts --no-audit --no-fund
    touch "$state/dependencies-new"
    echo "PREVIEW_BUILD install=fresh compile=required"
  fi
  npm run build
  touch "$state/build-new"
}

save() {
  source "$state/keys.env"
  prefix="gs://$_CACHE_BUCKET/v1"
  if [[ -f "$state/dependencies-new" ]]; then
    if tar -I 'gzip -1' -cf "$state/dependencies.tgz" node_modules &&
      gcloud storage cp "$state/dependencies.tgz" "$prefix/dependencies/$DEPENDENCY_KEY.tgz" --quiet; then
      echo "PREVIEW_CACHE dependencies=saved"
    else
      echo "PREVIEW_CACHE dependencies=save-failed; next run can rebuild" >&2
    fi
  fi
  if [[ -f "$state/build-new" ]]; then
    if tar --exclude='dist/client/planner-assets' --exclude='dist/server/planner-assets' \
      -I 'gzip -1' -cf "$state/build.tgz" dist &&
      gcloud storage cp "$state/build.tgz" "$prefix/builds/$BUILD_KEY.tgz" --quiet; then
      echo "PREVIEW_CACHE compiled=saved"
    else
      echo "PREVIEW_CACHE compiled=save-failed; next run can rebuild" >&2
    fi
  fi
}

case "$1" in
  keys) keys ;;
  restore) restore ;;
  build) build ;;
  save) save ;;
  *) echo "Usage: cloud-preview-cache.sh keys|restore|build|save" >&2; exit 2 ;;
esac
