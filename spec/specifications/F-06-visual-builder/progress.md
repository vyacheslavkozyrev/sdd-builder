# Progress — Visual builder: global map and workflow tabs (F-06)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-13 | Stories approved by the user as written; 36 criteria (34 `[auto]`, 2 `[device]`). Decisions: React Flow for the map; reference process as the start state; model gets `enabled` on conditions; step removal refused while a route points to it. |
| Plan     | ✅ Complete | 2026-11-13 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-13 | 6 of 14 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None.

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Record the F-06 decisions: React Flow row in `architecture.md` §5; disabled-condition rule in `building-blocks.md` §2 | reviewed: 0 blockers, 1 warning fixed (log entry moved to this table), 0 suggestions | `scripts/task-check.sh` passed: typecheck, 37 files, 492 tests (no code changed) |
| T002 | Condition gets a required `enabled` flag: model, parser (required boolean), catalog defaults on, `selectConditions` skips switched-off conditions; fixtures updated | reviewed: 0 blockers, 0 warnings, 1 suggestion fixed (fixture field order) | `scripts/task-check.sh` passed: typecheck, 37 files, 499 tests |
| T003 | Disabled conditions are left out of every check and output: routes, orphan `afterStepId`, policy, retries, reachability, review prompt (mermaid and rules text via `selectConditions`); amendment 1 added `validate/map.ts` and `validate/policy.ts` | reviewed: 0 blockers, 0 warnings, 2 suggestions fixed (over-long test lines); amendment 1 re-reviewed | `scripts/task-check.sh` passed: typecheck, core 516 tests, other packages green |
| T004 | `wouldCreateCycle(connections, from, to)` in `validate/map.ts`: self-links and cycle-closing connections refused; table-driven tests | reviewed: 0 blockers, 0 warnings, 1 suggestion fixed (test name) | `scripts/task-check.sh` passed: typecheck, 37 files, 529 tests |
| T005 | Builder map state (pure): start state from the reference process; add, remove and connect workflows; connection labels and gates; duplicate names, self-links, duplicates and cycles refused; AC-003 storage-free test. Core re-exports `wouldCreateCycle`. Size guard overridden by the user (one commit, 544 lines) | reviewed: 0 blockers, 4 warnings fixed (gate type refused at runtime; storage fakes trap every access; inputs proven unchanged; unknown scope refused), 0 suggestions fixed; 1 suggestion deferred | `scripts/task-check.sh` passed: typecheck, 37 files, 529 tests (web 44 in builder-map-state) |
| T006 | Map read model (pure): `mapNodes` gives name, scope, iteration source and counts of enabled steps, gates and branch routes; `mapEdges` gives artifact label and gate type, or none | reviewed: 0 blockers, 0 warnings, 1 suggestion fixed (label simplified) | `scripts/task-check.sh` passed: typecheck, core 529 tests, web map-view 21 tests |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- ~~T003 review, WARNING: `validate/map.ts` (orphan `afterStepId` check) and `validate/policy.ts` (`checkCondition` on every condition) read switched-off conditions.~~ Resolved by Amendment 1: both files are now in T003.
- T005 review, SUGGESTION: `apps/web/src/builder/map-state.ts` `removeWorkflow` and `removeConnection` return `MapState` while the other edits return `EditResult`; they cannot be refused (an unknown id throws), so the signatures stay as they are. Revisit if the UI needs a refusal message for removal.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment 1 — 2026-11-14
**Changed**: `plan.md` T003 file list and description: `packages/core/src/validate/map.ts` (orphan `afterStepId` check) and `packages/core/src/validate/policy.ts` (per-condition check) now skip disabled conditions; tests added in `validate-map.test.ts` and `validate-policy.test.ts`.
**Reason**: T003 review left a WARNING: both validators read switched-off conditions, while `building-blocks.md` §2 says a disabled condition is not checked. The user chose to amend the plan rather than accept the warning.
**Impact**: T003 only. It is re-implemented as a targeted fix on the staged change, then reviewed, checked and committed. No other task changes.
