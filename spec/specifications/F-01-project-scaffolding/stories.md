# User Stories — Project scaffolding (F-01)

Feature entry: `spec/documents/features.md` → F-01
Requirements owned by this feature: the four scope items of F-01 in `features.md`: (1) npm workspaces for `apps/api`, `apps/web` and `packages/core`; (2) TypeScript strict with NodeNext imports; (3) Vitest in each package; (4) the task check script `source/scripts/task-check.sh` that typechecks and runs every test. Technology: `architecture.md` §5.

## Out of Scope

- The domain model, the default pipeline data and the parser (F-02). F-01 adds no types beyond what the workspace needs to compile.
- Any HTTP route, Hono app, server start-up or LLM call in `source/apps/api` (F-03 and later).
- The Vite app shell, the React entry point and the wizard in `source/apps/web` (F-05 and later). F-01 only makes the workspace package compile and test.
- Removing or rebuilding the flat model files (`architecture.md` §10 and decision 19): F-01 removes no flat code.
- Continuous integration, lint rules, formatting tools and editor settings. These are not in the MVP scope.
- Runtime dependencies that a package does not use yet. Dependencies already listed in `package.json` stay; F-01 adds none.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-01 AC-003`).

### US-001: Workspace layout and compiler settings

**As a** developer
**I want to** install the three workspace packages in one step and have every package compiled under the same strict settings
**So that** a type error or a wrong import is caught before any feature code depends on it

**Requirements:** F-01 scope items 1 and 2

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The root `source/package.json` declares the npm workspaces `apps/*` and `packages/*`, and the workspace set resolves to exactly `@sddbuilder/api`, `@sddbuilder/web` and `@sddbuilder/core`.
- [ ] AC-002 `[auto]`: `source/tsconfig.base.json` enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `verbatimModuleSyntax`, and each package `tsconfig.json` extends it.
- [ ] AC-003 `[auto]`: Each package uses `module` and `moduleResolution` set to `NodeNext`, and the workspace `typecheck` script exits 0 when no source file has an error.
- [ ] AC-004 `[auto]`: A relative import without the `.js` extension in a package source file makes its `typecheck` fail (negative case: the NodeNext rule is enforced, not only declared).
- [ ] AC-005 `[auto]`: `@sddbuilder/core` lists no dependency on `@sddbuilder/api` or `@sddbuilder/web`, and neither app is imported by core (the dependency direction of `architecture.md` §1).

### US-002: Vitest in every package

**As a** developer
**I want to** run one test command and have every package's tests run under Vitest
**So that** each feature adds its tests in the same place and in the same way

**Requirements:** F-01 scope item 3

#### Acceptance Criteria

- [ ] AC-006 `[auto]`: Each of `packages/core`, `apps/api` and `apps/web` has a `test` script that runs `vitest run`, and the root `npm test` runs all three.
- [ ] AC-007 `[auto]`: Each package contains at least one passing Vitest test, named with the feature and criterion (`F-01 AC-006 ...`), so that `npm test` runs a real test in every package and does not pass on zero tests.
- [ ] AC-008 `[auto]`: `apps/web` has no DOM or browser test library in its dependencies (no jsdom, Testing Library or Playwright), as `architecture.md` §5 requires for the MVP.
- [ ] AC-009 `[auto]`: A failing test in any package makes `npm test` exit non-zero (negative case: a failure is never reported as a pass).

### US-003: One task check script

**As a** developer running the working process
**I want to** run `source/scripts/task-check.sh` after every task and get one pass or fail result
**So that** a task is never committed on a red build

**Requirements:** F-01 scope item 4

#### Acceptance Criteria

- [ ] AC-010 `[auto]`: With every package typechecking and every test passing, `source/scripts/task-check.sh` runs the typecheck, then the tests, prints `task check passed` and exits 0.
- [ ] AC-011 `[auto]`: When the typecheck fails, the script exits non-zero and does not run the tests (negative case: the first failure stops the run).
- [ ] AC-012 `[auto]`: When a test fails, the script exits non-zero and prints the failing test's output.
- [ ] AC-013 `[auto]`: When the root package has no `test` script, the script exits non-zero with a message naming the missing script; it never reports a pass for a check that did not run.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| F-01 scope 1: npm workspaces for `apps/api`, `apps/web`, `packages/core` | AC-001, AC-005 |
| F-01 scope 2: TypeScript strict with NodeNext imports | AC-002, AC-003, AC-004 |
| F-01 scope 3: Vitest in each package | AC-006, AC-007, AC-008, AC-009 |
| F-01 scope 4: task check script typechecks and runs every test | AC-010, AC-011, AC-012, AC-013 |
