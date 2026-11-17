# Progress — Project scaffolding (F-01)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-16 | 13 criteria, all `[auto]`; approved by the user |
| UX       | ➖ Not needed | 2026-11-16 | No user interface: build tooling only |
| Plan     | ✅ Complete | 2026-11-16 | Approved by the user |
| Build    | ✅ Complete | 2026-11-16 | 6 of 6 tasks committed |
| Verify   | ✅ Complete | 2026-11-16 | 13 of 13 criteria covered by passing `[auto]` tests; no `[device]` criteria |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Workspace and compiler settings; placeholders and smoke tests in all three packages | 0 blockers; 2 warnings and 2 suggestions fixed; 1 suggestion deferred | task check passed: core 14, api 1, web 1 |
| T002 | NodeNext import rule: in-memory compile, missing `.js` gives TS2834 | 1 warning (undeclared `typescript`) fixed by the user-approved devDependency `typescript` 5.9.3 in core; 1 suggestion deferred | task check passed: core 16, api 1, web 1 |
| T005 | Task check script: exit and output behaviour tested with a fake `npm`; missing-test message without F-02 wording | 0 blockers, 0 warnings; 2 suggestions fixed | task check passed: 20 tests across four test files |
| T006 | Setup docs: CLAUDE.md no longer says task check fails until F-02 | 0 blockers, 0 warnings, 0 suggestions | task check passed: 20 tests across four test files |
| T004 | No DOM or browser test library in web; failing Vitest run exits non-zero | 0 blockers; 2 warnings and 1 suggestion fixed (exit status pinned to 1; browser-mode packages forbidden) | task check passed: 20 tests across four test files |
| T003 | Vitest script check: every package `test` script is `vitest run`; root runs the workspaces | 0 blockers, 0 warnings; 1 suggestion fixed (type guard instead of cast) | task check passed: 20 tests across four test files |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `source/packages/core/test/workspace.test.ts` (imports, T001): resolved. The user approved `"typescript": "5.9.3"` in core's `devDependencies` (T002 build, with the lockfile sync).
- `source/packages/core/test/nodenext.test.ts` (imports, T002): resolved by the same change (user approved).
- `source/packages/core/test/nodenext.test.ts` (`parsedOptions`, SUGGESTION): re-reads and parses `tsconfig.json` on every call; a few milliseconds per case, not worth a cache. Not changed.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

Verify run 2026-11-16 on `main`, clean tree, all six tasks committed. `source/scripts/task-check.sh` exits 0 and prints `task check passed`.

Totals: core 20 tests (4 files), api 6 (3 files), web 3 (2 files). 29 of 29 passed, 0 failed.

| Criterion | Tag | Covering tests | Result |
|---|---|---|---|
| AC-001 | auto | core `workspace.test.ts`: resolves the workspace set to exactly the three packages | pass |
| AC-002 | auto | core `workspace.test.ts`: each package tsconfig extends the base and resolves strict options (×3) | pass |
| AC-003 | auto | core `workspace.test.ts`: NodeNext module and moduleResolution (×3); typecheck reports no errors (×3); typecheck script configured | pass |
| AC-004 | auto | core `nodenext.test.ts`: diagnostic for a relative import without `.js`; accepts the `.js` form | pass |
| AC-005 | auto | core `workspace.test.ts`: core lists no api/web dependency; core imports neither app | pass |
| AC-006 | auto | core `scripts.test.ts`: each package `test` script is `vitest run` (×3); root test runs the workspaces | pass |
| AC-007 | auto | `smoke.test.ts` in core, api and web (each named `F-01 AC-007`) | pass |
| AC-008 | auto | web `deps.test.ts`: no jsdom, Testing Library or Playwright; negative case reads real dependency sections | pass |
| AC-009 | auto | api `vitest-exit.test.ts`: failing fixture in a temp dir gives exit status 1 | pass |
| AC-010 | auto | api `task-check.test.ts`: typecheck, then tests, pass line, exit 0 | pass |
| AC-011 | auto | api `task-check.test.ts`: failing typecheck exits non-zero, tests not run | pass |
| AC-012 | auto | api `task-check.test.ts`: failing test exits non-zero and prints its output | pass |
| AC-013 | auto | api `task-check.test.ts`: missing root test script exits non-zero, names it, no pass line | pass |

Gaps: none. Failures: none.

Scope check (`spec/documents/features.md` F-01): npm workspaces (AC-001, AC-005), TypeScript strict with NodeNext (AC-002, AC-003, AC-004), Vitest in each package (AC-006, AC-007, AC-008, AC-009), task check script (AC-010 to AC-013). Fully covered.

Manual checklist: none. F-01 has no `[device]` criteria; `checklist.md` records this.

---

## Amendments

### Amendment 1 — 2026-11-16
**Changed**: `plan.md`: the smoke tests for `packages/core`, `apps/api` and `apps/web` (AC-007) move from T003 into T001; T003 keeps only the script check (AC-006), with the AC-007 row of the coverage check now pointing to T001.
**Reason**: T001 ran `task-check.sh`, which runs `npm test` in every workspace. Vitest exits 1 on a package with no test files, so the check could not pass at T001 while `apps/api` and `apps/web` had none. Adding `--passWithNoTests` was rejected: it would let a package pass with zero tests, which AC-007 forbids.
**Impact**: T001 re-runs from the start (no commits yet; the earlier partial work in the tree is kept and extended). T003 is smaller. No criterion or scope change.

### Amendment 2 — 2026-11-17 (AC-008, F-10 T004)
**Changed**: `stories.md` AC-008 and `source/apps/web/test/deps.test.ts`: the rule is no browser test library, and no DOM test library except the three approved pins (`jsdom`, `@testing-library/react`, `@testing-library/dom`) in `architecture.md` §5.
**Reason**: the owner approved a DOM test library for the rule list's click tests (F-10 T004, option A), because the removal flow cannot be tested without one.
**Impact**: `deps.test.ts` has the new rule, with a positive and a negative case. No other F-01 criterion changes.
