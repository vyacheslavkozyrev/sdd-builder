# Progress — Visual builder: global map and workflow tabs (F-06)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-13 | Stories approved by the user as written; 36 criteria (34 `[auto]`, 2 `[device]`). Decisions: React Flow for the map; reference process as the start state; model gets `enabled` on conditions; step removal refused while a route points to it. |
| Plan     | ✅ Complete | 2026-11-13 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-13 | 13 of 14 tasks committed |
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
| T007 | Step edit state for a tab (pure): `addStep`, `moveStep`, `removeStep` (refused for a required step or while another route points at it), `setStepEnabled`. Size guard overridden by the user (one commit, 418 lines) | reviewed: 0 blockers, 0 warnings, 2 suggestions fixed (test line length, non-null assertion); required-step switch-off left open for the user | `scripts/task-check.sh` passed: typecheck, core 529 tests, web step-state 36 tests |
| T008 | Tab list and condition switches (pure): `tabsFor` in map order; `addTab` uses the addWorkflow rules; `setConditionEnabled` keeps round limits and refuses switching off a required gate | reviewed: 0 blockers, 4 warnings fixed (refusal tests assert unchanged input and messages), 0 suggestions fixed; 2 suggestions deferred | `scripts/task-check.sh` passed: typecheck, 37 files, 529 tests (web tab-state tests) |
| T009 | Inspector read model (pure): `stepInspector` gives produced files, a no-file text when there are none, and rule-set tags; returns copies | reviewed: 0 blockers, 0 warnings, 2 suggestions fixed (test names); 1 suggestion deferred (catalog `produces` values are not all file names) | `scripts/task-check.sh` passed: typecheck, 37 files, 529 tests (inspector 12 tests) |
| T010 | Global map view with React Flow (`@xyflow/react` 12.12.1, exact): add, remove and connect workflows through the tested state; edge text from the read model; layout kept in React memory. AC-019 device check pending | reviewed: 0 blockers, 3 warnings fixed (edge text moved to `map-view.ts`; position and selection kept across re-renders; removed workflow's layout dropped), 0 suggestions applied; 1 suggestion deferred | `scripts/task-check.sh` passed: typecheck, 37 files, 529 tests; `apps/web` build passed |
| T012 | Workflow tab view: tab bar and add tab (`tabsFor`, `addTab`); step list with catalog add, move, remove and enabled switch; gate and branch-route switches; required items' remove and switch-off disabled; `Builder` holds the state for map and tab | reviewed: 0 blockers, 1 warning fixed (required item that is off can be switched back on), 0 suggestions applied; 2 deferred | `scripts/task-check.sh` passed: typecheck, 37 files, 529 tests; `apps/web` build passed |
| T011 | Connection editor: sets the artifact label and gate of the selected connection through `setArtifact` and `setGate`; refusals shown and state kept | reviewed: 0 blockers, 0 warnings, 1 suggestion fixed (input shows the stored label); 2 suggestions deferred (gate list repeated in the view; refusal stays until next save) | `scripts/task-check.sh` passed: typecheck, 37 files, 529 tests; `apps/web` build passed |
| T013 | Tab diagram (React Flow, read-only) and inspector beside it; `tab-diagram-view` read model (sequence and enabled-route edges); inspector shows name, summary, produced files and tags from the read model. One commit, 544 lines (size guard overridden by the user). AC-036 device check pending | reviewed: 0 blockers, 2 warnings fixed (inspector from the read model; no raw-id fallback in the diagram), 0 suggestions applied; 1 suggestion deferred (selection kept after removal); test fixtures switched to catalog ids | `scripts/task-check.sh` passed: typecheck, 37 files, 529 tests; `apps/web` build passed |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- ~~T003 review, WARNING: `validate/map.ts` (orphan `afterStepId` check) and `validate/policy.ts` (`checkCondition` on every condition) read switched-off conditions.~~ Resolved by Amendment 1: both files are now in T003.
- T007 review, NOTE for the user (not a finding against the spec): `apps/web/src/builder/step-state.ts` `setStepEnabled` does not refuse a required step, so a required step can be switched off. AC-027 covers removal only; the implementer kept this and it is left for the user to decide. The T012 view now disables the switch-off control of a required step, so the UI does not offer it.
- T005 review, SUGGESTION: `apps/web/src/builder/map-state.ts` `removeWorkflow` and `removeConnection` return `MapState` while the other edits return `EditResult`; they cannot be refused (an unknown id throws), so the signatures stay as they are. Revisit if the UI needs a refusal message for removal.
- T008 review, SUGGESTION: `apps/web/src/builder/tab-state.ts` `refuse` duplicates the helper in `map-state.ts` and `step-state.ts`. Kept to match the sibling modules; extracting it would touch T005 and T007 files outside this task.
- T013 review, SUGGESTION: `apps/web/src/builder/TabView.tsx` keeps `selectedStepId` after the step is removed from the workflow, so re-adding the same step to the same tab selects it again. Clearing it needs a hook in `StepList` (T012 file); harmless, left for a later pass.
- T012 review, SUGGESTION: `apps/web/src/builder/StepList.tsx` `catalogEntry` returns undefined for a step id outside the catalog, so the name falls back to the raw id and `required` to false. `step-state.ts` `removeStep` calls `getCatalogStep`, which throws for such an id. The builder cannot create a custom step today, so the path is unreachable; `step-state.ts` is unchanged as instructed. Revisit when custom steps reach the builder.
- T012 review, NOTE for the user: `Builder` (`apps/web/src/builder/Builder.tsx`) is not rendered by `apps/web/src/App.tsx` yet, so the builder is not reachable in the app. Mounting it belongs to the wiring after T013.
- T009 review, SUGGESTION for the user: `apps/web/src/builder/inspector-view.ts` `files` and `producesText` show catalog `produces` values that are not file names (`code`, `tests`, `review notes`, `test results`, `commit`, `release notes`, see `packages/core/src/catalog.ts`). AC-033 says "files it produces, taken from its catalog", so the values are shown as the catalog gives them; a label or a catalog change is a decision for the user, left open for T013.
- T010 review, SUGGESTION: `apps/web/src/builder/MapView.tsx` `SCOPES` repeats the scope list that `packages/core/src/parse-config.ts` keeps private. Left in the view, as a list of select options; exporting it from core would touch a core file outside T010.
- T011 review, SUGGESTION: `apps/web/src/builder/ConnectionEditor.tsx` `GATE_OPTIONS` repeats the four gate types of `GATE_TYPES` in `map-state.ts`. Left as select options; exporting the list from map-state would touch a T005 file outside T011.
- T011 review, SUGGESTION: `apps/web/src/builder/ConnectionEditor.tsx` the refusal alert stays until the next save rather than clearing on each keystroke. Clearing it would add handlers to three inputs for little gain; no rule or criterion is affected.
- T008 review, SUGGESTION: `apps/web/test/builder-tab-state.test.ts` the reference non-required gate test (`criteria-covered`) sits under the AC-030 heading; it proves the negative side of AC-030. Relabelling is cosmetic and left as is.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment 1 — 2026-11-14
**Changed**: `plan.md` T003 file list and description: `packages/core/src/validate/map.ts` (orphan `afterStepId` check) and `packages/core/src/validate/policy.ts` (per-condition check) now skip disabled conditions; tests added in `validate-map.test.ts` and `validate-policy.test.ts`.
**Reason**: T003 review left a WARNING: both validators read switched-off conditions, while `building-blocks.md` §2 says a disabled condition is not checked. The user chose to amend the plan rather than accept the warning.
**Impact**: T003 only. It is re-implemented as a targeted fix on the staged change, then reviewed, checked and committed. No other task changes.
