# Implementation Plan — Project scaffolding (F-01)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

## Tasks

- [x] T001 [Build] Workspace and compiler settings: `src/index.ts` placeholders in `source/packages/core`, `source/apps/api` and `source/apps/web` (each `export {};`, so typecheck has an input); `source/packages/core/test/workspace.test.ts` checks the root workspace set, the resolved strict options and NodeNext settings of all three tsconfigs (via the `typescript` API), and that core's manifest names no app; `source/packages/core/test/smoke.test.ts`, `source/apps/api/test/smoke.test.ts` and `source/apps/web/test/smoke.test.ts` each import their `src/index.js` and pass (added by Amendment 1 so that no package runs `vitest` with zero test files) — covers AC-001, AC-002, AC-003, AC-005, AC-007
- [x] T002 [Build] NodeNext import rule: `source/packages/core/test/nodenext.test.ts` compiles, in memory with the `typescript` API, a file with a relative import lacking `.js` and expects a diagnostic; a file with the `.js` form expects none — covers AC-004
- [x] T003 [Build] Vitest script check: `source/packages/core/test/scripts.test.ts` asserts that every package's `test` script is `vitest run` and that the root `test` script runs the workspaces — covers AC-006 (the smoke tests for AC-007 moved to T001, Amendment 1)
- [ ] T004 [Build] No DOM or browser test library in `apps/web`: `source/apps/web/test/deps.test.ts` reads its manifest and asserts no jsdom, Testing Library or Playwright entry — covers AC-008; `source/apps/api/test/vitest-exit.test.ts` runs the Vitest binary on a failing fixture in a temporary directory (node_modules symlinked from the source tree) and expects a non-zero exit — covers AC-009
- [ ] T005 [Build] Task check script: `source/scripts/task-check.sh` drops the "added with F-02" wording from its missing-test message so that it names the missing `test` script only; `source/apps/api/test/task-check.test.ts` copies the script into a temporary package and runs it with a fake `npm` (which logs its calls, fails on demand and delegates `npm pkg` to the real npm) — covers AC-010, AC-011, AC-012, AC-013
- [ ] T006 [Docs] Setup: the `source/scripts/task-check.sh` line in `CLAUDE.md` (Setup section) no longer says it fails until F-02 — covers AC-010 (documentation of the check)

## Rationale

- **T001 first.** The repository has the manifests and tsconfigs but no `src/` or `test/` folders, so `npm run typecheck` fails today ("No inputs were found"). The placeholders give every package a real input; they hold no logic, and F-02 replaces the core placeholder. The shape checks use the `typescript` API on the resolved configs, so `extends` is tested, not just read.
- **T002 before the Vitest tasks.** The NodeNext negative case is independent of Vitest and uses an in-memory compile, so it needs no file system and no network.
- **T001 gives each package a real passing test.** Vitest exits 1 on a package with no test files, so the smoke tests must exist before the task check runs (AC-007, Amendment 1). T003 only checks the scripts.
- **T004 splits the two negative cases.** The web manifest check is a plain read. The failing-test case needs a real Vitest run in a temporary directory; the fixture is removed after the test and the test does not depend on any other test's state.
- **T005 covers the script's own branches** with a fake `npm`, so the tests do not run the real typecheck or test suite inside a test. The task-check tests sit in `apps/api/test` because the script is repository tooling, not core logic; `packages/core` stays free of child processes. If the reviewer prefers another home, the task can move it without changing the criteria.
- **T006 last.** The documentation follows the behaviour it describes (`general.md`: update the document in the same task as the behaviour change, and this one is the last behaviour change).
- **No new libraries.** `typescript`, `vitest` and `@types/node` are already in the manifests and are named in `architecture.md` §5 or are the test runner. No runtime dependency is added (Out of Scope).

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Docs]` | Documentation changes required by the feature |

## Coverage check

| Criterion | Task |
|---|---|
| AC-001 | T001 |
| AC-002 | T001 |
| AC-003 | T001 |
| AC-004 | T002 |
| AC-005 | T001 |
| AC-006 | T003 |
| AC-007 | T001 |
| AC-008 | T004 |
| AC-009 | T004 |
| AC-010 | T005, T006 |
| AC-011 | T005 |
| AC-012 | T005 |
| AC-013 | T005 |
