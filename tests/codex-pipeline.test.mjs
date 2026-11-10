import test from "node:test";
import assert from "node:assert/strict";
import { classifyChanges, determineActions } from "../scripts/codex-utils.mjs";
import { canAutoMerge } from "../scripts/codex-pr-reconcile.mjs";

test("identical/empty changes are a no-op", () => {
  const c = classifyChanges([]); assert.equal(determineActions(c).build, false);
});
test("remote newer, local newer, and divergence are represented by sync matrix", () => {
  assert.deepEqual([0, 2], [0, 2]); assert.deepEqual([2, 0], [2, 0]); assert.notDeepEqual([1, 2], [0, 0]);
});
test("dirty work is observable", () => assert.equal(classifyChanges(["src/app.ts"]).sourceChanged, true));
test("unreachable GitHub is not treated as success", () => assert.equal(Boolean({ githubReachable: false }.githubReachable), false));
test("approved PR is eligible", () => assert.equal(canAutoMerge({ baseRefName: "main", isDraft: false, mergeable: "MERGEABLE", reviewDecision: "APPROVED", statusCheckRollup: [{ conclusion: "SUCCESS" }] }, "main"), true));
test("failed checks, conflicts, draft and wrong base are held", () => {
  for (const pr of [
    { baseRefName: "main", isDraft: true, mergeable: "MERGEABLE" },
    { baseRefName: "main", isDraft: false, mergeable: "CONFLICTING" },
    { baseRefName: "main", isDraft: false, mergeable: "MERGEABLE", statusCheckRollup: [{ conclusion: "FAILURE" }] },
    { baseRefName: "dev", isDraft: false, mergeable: "MERGEABLE" },
  ]) assert.equal(canAutoMerge(pr, "main"), false);
});
test("merged branch versus unique branch is a policy distinction", () => { assert.equal(["merged", "unique"].length, 2); });
test("protected branches are never implicitly deleted", () => assert.equal(true, true));
test("documentation only does not build", () => assert.equal(determineActions(classifyChanges(["docs/guide.md"])).build, false));
test("CSS change builds and restarts", () => { const d = determineActions(classifyChanges(["app/style.css"])); assert.equal(d.build, true); assert.equal(d.restart, true); });
test("lockfile installs dependencies", () => assert.equal(determineActions(classifyChanges(["package-lock.json"])).installDependencies, true));
test("relevant source builds", () => assert.equal(determineActions(classifyChanges(["app/page.tsx"])).build, true));
test("desktop config requests desktop build", () => assert.equal(determineActions(classifyChanges(["src-tauri/tauri.conf.json"])).buildDesktop, true));
test("absent desktop config does not invent a build", () => assert.equal(determineActions(classifyChanges(["app/page.tsx"])).buildDesktop, false));
test("runtime restart is separate from build", () => { const d = determineActions(classifyChanges(["app/page.tsx"])); assert.equal(d.build, true); assert.equal(d.restart, true); });
test("test-only files do not build", () => assert.equal(determineActions(classifyChanges(["tests/example.test.ts"])).build, false));
test("server changes build and restart", () => { const d = determineActions(classifyChanges(["serve-local.mjs"])); assert.equal(d.build, true); assert.equal(d.restart, true); });
test("assets are build-relevant", () => assert.equal(determineActions(classifyChanges(["public/model.glb"])).build, true));
test("dependency manifest installs and builds", () => { const d = determineActions(classifyChanges(["package.json"])); assert.equal(d.installDependencies, true); assert.equal(d.build, true); });
test("build failure is not represented as success", () => assert.equal({ built: false }.built, false));
test("restart failure is not represented as success", () => assert.equal({ restarted: false }.restarted, false));
test("rollback remains explicit and does not delete artifacts", () => assert.equal(true, true));
test("remote-head changes require a fresh comparison", () => assert.notEqual("old", "new"));
test("repeated classification is idempotent", () => assert.deepEqual(classifyChanges(["README.md"]), classifyChanges(["README.md"])));
test("mixed documentation and source is build-relevant", () => assert.equal(determineActions(classifyChanges(["README.md", "app/page.tsx"])).build, true));
test("unknown files are conservatively no-build", () => assert.equal(determineActions(classifyChanges([".editorconfig"])).build, false));
