# Progress — Project scaffolding (F-01)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-16 | 13 criteria, all `[auto]`; approved by the user |
| UX       | ➖ Not needed | 2026-11-16 | No user interface: build tooling only |
| Plan     | ✅ Complete | 2026-11-16 | Approved by the user |
| Build    | 🔄 In Progress | 2026-11-16 | 2 of 6 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

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

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `source/packages/core/test/workspace.test.ts` (imports, T001): resolved. The user approved `"typescript": "5.9.3"` in core's `devDependencies` (T002 build, with the lockfile sync).
- `source/packages/core/test/nodenext.test.ts` (imports, T002): resolved by the same change (user approved).
- `source/packages/core/test/nodenext.test.ts` (`parsedOptions`, SUGGESTION): re-reads and parses `tsconfig.json` on every call; a few milliseconds per case, not worth a cache. Not changed.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment 1 — 2026-11-16
**Changed**: `plan.md`: the smoke tests for `packages/core`, `apps/api` and `apps/web` (AC-007) move from T003 into T001; T003 keeps only the script check (AC-006), with the AC-007 row of the coverage check now pointing to T001.
**Reason**: T001 ran `task-check.sh`, which runs `npm test` in every workspace. Vitest exits 1 on a package with no test files, so the check could not pass at T001 while `apps/api` and `apps/web` had none. Adding `--passWithNoTests` was rejected: it would let a package pass with zero tests, which AC-007 forbids.
**Impact**: T001 re-runs from the start (no commits yet; the earlier partial work in the tree is kept and extended). T003 is smaller. No criterion or scope change.
