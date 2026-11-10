import test from "node:test";
import assert from "node:assert/strict";
import { classifyChanges, determineActions } from "../scripts/codex-utils.mjs";
import { canAutoMerge } from "../scripts/codex-pr-reconcile.mjs";

const approvedGreenPr = {
  baseRefName: "main",
  isDraft: false,
  mergeable: "MERGEABLE",
  reviewDecision: "APPROVED",
  statusCheckRollup: [{ context: "quality", conclusion: "SUCCESS" }],
};

test("identical/empty changes are a no-op", () => {
  const c = classifyChanges([]);
  assert.equal(determineActions(c).build, false);
  assert.equal(determineActions(c).restart, false);
});

test("source classification is deterministic for repeated input", () => {
  const files = ["README.md", "app/page.tsx", "package-lock.json"];
  assert.deepEqual(classifyChanges(files), classifyChanges(files));
});

test("source changes are observed as build-relevant", () => {
  assert.equal(classifyChanges(["app/app.ts"]).sourceChanged, true);
});

test("approved mergeable PR with at least one successful check is eligible", () => {
  assert.equal(canAutoMerge(approvedGreenPr, "main"), true);
});

test("missing review approval is held", () => {
  assert.equal(canAutoMerge({ ...approvedGreenPr, reviewDecision: undefined }, "main"), false);
  assert.equal(canAutoMerge({ ...approvedGreenPr, reviewDecision: "CHANGES_REQUESTED" }, "main"), false);
});

test("missing or empty status checks are held", () => {
  assert.equal(canAutoMerge({ ...approvedGreenPr, statusCheckRollup: undefined }, "main"), false);
  assert.equal(canAutoMerge({ ...approvedGreenPr, statusCheckRollup: [] }, "main"), false);
});

test("missing check conclusion is held", () => {
  assert.equal(canAutoMerge({ ...approvedGreenPr, statusCheckRollup: [{ context: "quality" }] }, "main"), false);
});

test("failed, pending, conflicting, draft and wrong-base PRs are held", () => {
  for (const pr of [
    { ...approvedGreenPr, statusCheckRollup: [{ context: "quality", conclusion: "FAILURE" }] },
    { ...approvedGreenPr, statusCheckRollup: [{ context: "quality", conclusion: "PENDING" }] },
    { ...approvedGreenPr, mergeable: "CONFLICTING" },
    { ...approvedGreenPr, isDraft: true },
    { ...approvedGreenPr, baseRefName: "dev" },
  ]) {
    assert.equal(canAutoMerge(pr, "main"), false);
  }
});

test("documentation only does not build", () => {
  assert.equal(determineActions(classifyChanges(["docs/guide.md"])).build, false);
});

test("CSS change builds and restarts", () => {
  const decision = determineActions(classifyChanges(["app/style.css"]));
  assert.equal(decision.build, true);
  assert.equal(decision.restart, true);
});

test("lockfile installs dependencies", () => {
  assert.equal(determineActions(classifyChanges(["package-lock.json"])).installDependencies, true);
});

test("relevant source builds", () => {
  assert.equal(determineActions(classifyChanges(["app/page.tsx"])).build, true);
});

test("desktop config requests desktop build", () => {
  assert.equal(determineActions(classifyChanges(["src-tauri/tauri.conf.json"])).buildDesktop, true);
});

test("absent desktop config does not invent a build", () => {
  assert.equal(determineActions(classifyChanges(["app/page.tsx"])).buildDesktop, false);
});

test("runtime restart is separate from desktop packaging", () => {
  const decision = determineActions(classifyChanges(["app/page.tsx"]));
  assert.equal(decision.build, true);
  assert.equal(decision.restart, true);
  assert.equal(decision.buildDesktop, false);
});

test("test-only files do not build", () => {
  assert.equal(determineActions(classifyChanges(["tests/example.test.ts"])).build, false);
});

test("server changes build and restart", () => {
  const decision = determineActions(classifyChanges(["serve-local.mjs"]));
  assert.equal(decision.build, true);
  assert.equal(decision.restart, true);
});

test("assets are build-relevant", () => {
  assert.equal(determineActions(classifyChanges(["public/model.glb"])).build, true);
});

test("dependency manifest installs and builds", () => {
  const decision = determineActions(classifyChanges(["package.json"]));
  assert.equal(decision.installDependencies, true);
  assert.equal(decision.build, true);
});

test("repeated classification remains idempotent", () => {
  const first = determineActions(classifyChanges(["README.md"]));
  const second = determineActions(classifyChanges(["README.md"]));
  assert.deepEqual(second, first);
});

test("mixed documentation and source is build-relevant", () => {
  assert.equal(determineActions(classifyChanges(["README.md", "app/page.tsx"])).build, true);
});

test("unknown files are conservatively no-build", () => {
  assert.equal(determineActions(classifyChanges([".editorconfig"])).build, false);
});
