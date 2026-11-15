# Cloud Run preview cache

Goal: reuse installed Linux dependencies and compiled output across main pushes,
keeping the same Cloud Run URL and exact live-commit verification.

Architecture: private Cloud Storage archives keyed by package files, pinned Node/
npm versions and compiler inputs. Use a slim Node image. Source edits reuse
dependencies; existing external asset edits also reuse compiled output. Refresh
public files before packaging. New public paths invalidate compilation because
Vinext embeds the public-file inventory. Renderer code still needs compilation.

Rejected: mutable public development checkout and branch-name-only cache keys.
Constraints: main only, direct pushes, no preview test gates, production unchanged,
cache miss/corruption falls back to a fresh build.

- [ ] Exercise keys and cold/warm/corrupt behavior using isolated fixture files.
- [ ] Wire restore/build/save; save caches parallel to packaging. Create a
      private regional bucket with object access for the build service account.
- [ ] Deploy cold, then a warm source edit and its rollback. Measure and verify
      cache hits, visible header, exact live commit. Remove test text.
