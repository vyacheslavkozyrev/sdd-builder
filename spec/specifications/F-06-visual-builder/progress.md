# Progress — Visual builder: global map and workflow tabs (F-06)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-13 | Stories approved by the user as written; 36 criteria (34 `[auto]`, 2 `[device]`). Decisions: React Flow for the map; reference process as the start state; model gets `enabled` on conditions; step removal refused while a route points to it. |
| UX       | 🔄 In Progress | 2026-11-14 | Layout rework: the built layout is replaced. Global map screen (01) approved by the user on 2026-11-14. Workflow tab and other screens still to review (`design/features/F-06-visual-builder/`). Build reopens by amendment once all screens are approved |
| Plan     | ✅ Complete | 2026-11-13 | Approved by the user before any code is written |
| Build    | ✅ Complete | 2026-11-13 | 14 of 14 tasks committed (first layout; reworked after UX approval) |
| Verify   | 🔄 In Progress | 2026-11-14 | Matrix recorded: 34 `[auto]` covered, 0 gaps. AWAITING CONFIRMATION for AC-019 and AC-036 (`checklist.md`) |

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
| T014 | App wiring: Brief and Builder switch in `App`; the map state lives in `App` and feeds both views; `toProjectConfig` takes workflows and connections from that state (defaults only as the start state); AC-002 and AC-004 tests. Scope widened to validate, gate, progress and AnalysisPanel (they derive from the same configuration) | reviewed: 0 blockers, 0 warnings, 5 suggestions fixed (doc comments, long lines, one new AC-002 test); 2 suggestions and 3 notes deferred | `scripts/task-check.sh` passed: typecheck, 37 files, 529 tests; `apps/web` typecheck and build passed |
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
- ~~T012 review, NOTE for the user: `Builder` is not rendered by `App.tsx` yet.~~ Resolved by T014: `App` mounts the builder behind the Builder switch and owns its state.
- T014 review, SUGGESTION: `apps/web/src/brief/validate.ts`, `progress.ts`, `gate.ts` and `AnalysisPanel.tsx` each call `validateBrief` (which now also structural-checks the map) per render, so one render runs it three or four times. The map is small and the result is the same; computing it once in `BriefForm` and passing the problems down would change the `canAnalyze` and `progressEntries` signatures, left for a later pass.
- T014 review, SUGGESTION: `apps/web/src/App.tsx` the `.view-switch` nav has no CSS rule in `styles.css`, so the Brief and Builder buttons use browser defaults. Styling is outside T014's scope.
- T014 review, NOTE for the device check: the builder is mounted while hidden (`hidden` on its wrapper), so React Flow first measures at zero size. It should resize on show through its own observer; confirm on the AC-036 manual check and in the browser.
- T014 review, NOTE (AC-004 test strength): the reset on reload is `useState(startState)` in `App.tsx`. No test renders `App` (the web tests are view-model only per `qa.md`), so F-06 AC-004 is proved at the level of `startState()` returning a fresh copy after an edit. The wiring itself is checked by reading the code only.
- T014 review, NOTE for the spec owners: F-05 plan T003 and F-05 stories AC-018 describe `toProjectConfig` as copying core defaults. The code now reads the builder state, which starts as those defaults, so the F-05 criterion still holds for the start state. The approved F-05 text is not edited here.
- T009 review, SUGGESTION for the user: `apps/web/src/builder/inspector-view.ts` `files` and `producesText` show catalog `produces` values that are not file names (`code`, `tests`, `review notes`, `test results`, `commit`, `release notes`, see `packages/core/src/catalog.ts`). AC-033 says "files it produces, taken from its catalog", so the values are shown as the catalog gives them; a label or a catalog change is a decision for the user, left open for T013.
- T010 review, SUGGESTION: `apps/web/src/builder/MapView.tsx` `SCOPES` repeats the scope list that `packages/core/src/parse-config.ts` keeps private. Left in the view, as a list of select options; exporting it from core would touch a core file outside T010.
- T011 review, SUGGESTION: `apps/web/src/builder/ConnectionEditor.tsx` `GATE_OPTIONS` repeats the four gate types of `GATE_TYPES` in `map-state.ts`. Left as select options; exporting the list from map-state would touch a T005 file outside T011.
- T011 review, SUGGESTION: `apps/web/src/builder/ConnectionEditor.tsx` the refusal alert stays until the next save rather than clearing on each keystroke. Clearing it would add handlers to three inputs for little gain; no rule or criterion is affected.
- T008 review, SUGGESTION: `apps/web/test/builder-tab-state.test.ts` the reference non-required gate test (`criteria-covered`) sits under the AC-030 heading; it proves the negative side of AC-030. Relabelling is cosmetic and left as is.

---

## Test Results

Verify run 2026-11-14 on `main`, working tree clean, all 14 tasks ticked and committed, Current Task None.

**Automated run:** `scripts/task-check.sh` exit code 0. Typecheck passed in all workspaces. Tests: `apps/api` 375 passed (21 files), `apps/web` 348 passed (14 files), `packages/core` 529 passed (37 files). Total 1252 passed, 0 failed.

**Criteria matrix** (34 `[auto]`, 2 `[device]`; test files are repo-relative, `F-06 AC-###` in each test name):

| Criterion | Tag | Covering test (file: test name) | Result |
|---|---|---|---|
| AC-001 | auto | `apps/web/test/builder-map-state.test.ts`: starts with the default workflows and connections of the reference process | covered |
| AC-002 | auto | `apps/web/test/brief-config.test.ts`: a configuration built from the start state equals the one built from the core defaults | covered |
| AC-003 | auto | `apps/web/test/builder-map-state.test.ts`: a full edit session never touches localStorage, sessionStorage or indexedDB | covered |
| AC-004 | auto | `apps/web/test/builder-map-state.test.ts`: a new session after edits starts again from the reference process; `apps/web/test/brief-config.test.ts`: a new session built after an edited session starts again from the reference process | covered (see note 1) |
| AC-005 | auto | `apps/web/test/builder-map-view.test.ts`: shows the name, scope and iteration source of each workflow; counts enabled steps, gates and branch routes | covered |
| AC-006 | auto | `apps/web/test/builder-map-view.test.ts`: a disabled step does not count its conditions | covered |
| AC-007 | auto | `apps/web/test/builder-map-view.test.ts`: shows the artifact label of a connection; shows no label for a connection without an artifact | covered |
| AC-008 | auto | `apps/web/test/builder-map-view.test.ts`: shows the gate type of a connection with a gate; shows no gate type for a connection without a gate | covered |
| AC-009 | auto | `apps/web/test/builder-map-state.test.ts`: a %s workflow iterates over %s with no steps or conditions (one case per scope) | covered |
| AC-010 | auto | `apps/web/test/builder-map-state.test.ts`: refuses %s with a message and leaves the state unchanged (empty, blank, duplicate) | covered |
| AC-011 | auto | `apps/web/test/builder-map-state.test.ts`: removes the workflow and every connection to and from it, and nothing else | covered |
| AC-012 | auto | `apps/web/test/builder-map-state.test.ts`: creates a connection from A to B with neither a label nor a gate | covered |
| AC-013 | auto | `apps/web/test/builder-map-state.test.ts`: refuses a connection from a workflow to itself; `packages/core/test/validate-map.test.ts`: refuses a self-link | covered |
| AC-014 | auto | `apps/web/test/builder-map-state.test.ts`: refuses C → A when A → B → C exists and leaves the state unchanged; `packages/core/test/validate-map.test.ts`: refuses a connection that closes a cycle | covered |
| AC-015 | auto | `apps/web/test/builder-map-state.test.ts`: refuses a second connection between the same two workflows in the same direction | covered |
| AC-016 | auto | `apps/web/test/builder-map-state.test.ts`: removes only the connection and leaves both workflows in place | covered |
| AC-017 | auto | `apps/web/test/builder-map-state.test.ts`: stores the artifact label trimmed; clears the label when it is empty or only spaces | covered |
| AC-018 | auto | `apps/web/test/builder-map-state.test.ts`: sets a approval/checks/review gate with no threshold; sets a diff-size gate with a whole-number threshold; refuses the diff-size threshold and the gate type not in the four | covered |
| AC-019 | device | Built in T010. No automated proof of layout or drag | AWAITING CONFIRMATION (checklist) |
| AC-020 | auto | `apps/web/test/builder-tab-state.test.ts`: gives exactly one tab per workflow, in map order; adding a tab creates a workflow with no steps and one more tab | covered |
| AC-021 | auto | `apps/web/test/builder-step-state.test.ts`: appends the added step at the end of the list, enabled | covered |
| AC-022 | auto | `apps/web/test/builder-step-state.test.ts`: refuses a step already in the list and does not change it | covered |
| AC-023 | auto | `apps/web/test/builder-step-state.test.ts`: moves %s %s by swapping with its neighbour; moving the first step up / last step down changes nothing | covered |
| AC-024 | auto | `apps/web/test/builder-step-state.test.ts`: a condition keeps its afterStepId when its step moves | covered |
| AC-025 | auto | `apps/web/test/builder-step-state.test.ts`: removes the step and the conditions placed after it, and keeps the others | covered |
| AC-026 | auto | `apps/web/test/builder-step-state.test.ts`: refuses while a fail route points to the step, naming the route; refuses while a pass route points to it; refuses while a switched-off condition routes to it | covered |
| AC-027 | auto | `apps/web/test/builder-step-state.test.ts`: refuses to remove the required step %s and leaves the state unchanged | covered |
| AC-028 | auto | `apps/web/test/builder-step-state.test.ts`: switching a step off keeps it in the list marked off; switching it on again restores it at the same position | covered |
| AC-029 | auto | `apps/web/test/builder-tab-state.test.ts`: switches a non-required gate off and sets enabled to false; switches a branch route off and back on. Also `packages/core/test/validate-routes.test.ts`, `mermaid.test.ts`, `rules-text.test.ts`, `analyze-retries.test.ts`, `analyze-reachability.test.ts`, `validate-map.test.ts`, `validate-policy.test.ts` and `apps/api/test/prompt.test.ts`: a switched-off condition is left out of checks and output | covered |
| AC-030 | auto | `apps/web/test/builder-tab-state.test.ts`: refuses to switch a required gate off and leaves the state unchanged | covered |
| AC-031 | auto | `apps/web/test/builder-tab-state.test.ts`: keeps the round limit when a branch route is switched off; restores the same round limit when switched on again | covered |
| AC-032 | auto | `packages/core/test/parse-config.test.ts`: accepts a condition switched on and one switched off; refuses a condition without enabled, with a string, number or null enabled; `packages/core/test/select.test.ts`: selectConditions leaves out a switched-off condition | covered |
| AC-033 | auto | `apps/web/test/builder-inspector-view.test.ts`: lists the produced files of a catalog step; of a custom step | covered |
| AC-034 | auto | `apps/web/test/builder-inspector-view.test.ts`: lists the rule-set tags of a catalog step; shows no tags for a step with no tags | covered |
| AC-035 | auto | `apps/web/test/builder-inspector-view.test.ts`: gives the no-file text, not an empty text, when produces is empty | covered |
| AC-036 | device | Read model tests exist in `apps/web/test/builder-tab-diagram-view.test.ts` (diagram order, edges, labels). They do not prove readability or that the inspector sits beside the diagram | AWAITING CONFIRMATION (checklist) |

**Gaps:** none. All 34 `[auto]` criteria have at least one named test that passed in this run.

**Notes for the caller:**
1. AC-004 (reload): the tests prove that `startState()` returns the reference process after an edited session. The reset on reload is `useState(startState)` in `apps/web/src/App.tsx`, which no test renders (`qa.md` keeps web tests to view-model logic). The reload behaviour is confirmed only by the supporting check for AC-004 in `checklist.md` (not a device criterion).
2. AC-036: its automated tests are for the diagram's read model only, so the criterion stays `[device]`.
3. Scope in `features.md` F-06 (map add/remove/connect, scope and counts, labels and gates, cycles, tabs, add/remove/reorder/switch, required steps, inspector, session-only state) is covered by the criteria above. Requirement R-01 to R-10 coverage matches `stories.md`.
4. Open notes from the build (`## Deferred Findings`, T007 and T014) are not criteria: the switch-off of a required step in `setStepEnabled` is not refused, and the builder is mounted hidden before it is shown (checked in `checklist.md`, AC-019 step 10).

**Manual checklist:** `spec/specifications/F-06-visual-builder/checklist.md`. Status: 0 of 2 `[device]` entries recorded. AWAITING CONFIRMATION.

---

## Amendments

### Amendment 1 — 2026-11-14
**Changed**: `plan.md` T003 file list and description: `packages/core/src/validate/map.ts` (orphan `afterStepId` check) and `packages/core/src/validate/policy.ts` (per-condition check) now skip disabled conditions; tests added in `validate-map.test.ts` and `validate-policy.test.ts`.
**Reason**: T003 review left a WARNING: both validators read switched-off conditions, while `building-blocks.md` §2 says a disabled condition is not checked. The user chose to amend the plan rather than accept the warning.
**Impact**: T003 only. It is re-implemented as a targeted fix on the staged change, then reviewed, checked and committed. No other task changes.
