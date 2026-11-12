# GitHub synchronization

The pipeline uses the configured `origin` remote and discovers its default branch from `origin/HEAD`, then `gh repo view` and finally the current branch. `git fetch origin --prune` is the only automatic remote update. It compares `HEAD...origin/<default>` and handles equal, fast-forward, local-ahead, dirty, and diverged states explicitly.

No force push, hard reset, blind merge, or deletion of unique commits is performed. A dirty tree is preserved and blocks a remote update when it would be unsafe. PR reconciliation inspects all open PRs through `gh`; auto-merge is requested only for a non-draft PR targeting the default branch with mergeable status, required approval, and successful checks. GitHub branch protection remains authoritative.

On a non-dry run, the synchronizer also writes a recoverable `.local/codex-uncommitted.patch` snapshot (plus an untracked-file list) before reporting a dirty-tree block.

Without authenticated `gh`, the pipeline records `githubReachable: false` and does not claim PR or merge success. Re-run after authentication. `.local/codex-sync-report.json` contains the last observed evidence and any blocked action.

## ChatGPT Web ↔ Codex handoff

The connected GitHub app is the working handoff when the local `gh` binary is
not authenticated. Codex reads the remote `main` SHA, creates a short-lived
branch from that exact SHA, uploads only the changed repository blobs, creates
one commit and opens a pull request. The PR head SHA and CI/mergeability are
checked again before a merge. This is an explicit commit/PR handoff; there is
no unverified real-time filesystem synchronization between ChatGPT Web and a
local Codex process.

The local workspace remains the source for tests and screenshots. The remote
branch is the source for review and merge. Private reference folders and
runtime logs are never added to the handoff tree.
