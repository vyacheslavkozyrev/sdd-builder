# Progress — Structural checks (F-03)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-19 | 7 stories, 37 criteria, all [auto]; re-specified for the flow model (decisions 38, 39) and approved by the user. Builder marks and analyzer share the rules (owner, 2026-11-19) |
| UX       | ➖ Not needed |  | No user interface (F-02 to F-06) |
| Plan     | ✅ Complete | 2026-11-19 | Approved by the user; 10 tasks (T001 to T010); AC-019 decided as a blocker (see Amendments) |
| Build    | ✅ Complete | 2026-11-19 | 10 of 10 tasks committed |
| Verify   | ✅ Complete | 2026-11-19 | 37 of 37 criteria have a passing test; no manual criteria; no gaps. Weak test tags and one wording question listed under Test Results |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

### 2026-11-19 build

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Finding type, rule modules in a fixed list, `analyzeStructure` entry in fixed order and the fixture (`analyze/finding.ts`, `analyze/index.ts`, `analyze-fixture.ts`) | 0 blockers; 1 warning fixed (config deep-frozen so a mutation fails); 2 suggestions fixed (line length); 1 suggestion deferred (rule-id strings belong to the rule tasks) | task check passed: core 642, api 6, web 4 |
| T002 | Start and End per flow: no Start, a Start after the first, no End, empty flow, pipeline with no flow (`analyze/start-end.ts`). Paths follow F-02 (`pipeline.flows.N...`, no `root.`); a third Start is also reported | 0 blockers, 0 warnings; 1 suggestion fixed (assertions moved out of the map helper) | task check passed: core 652, api 6, web 4 |
| T003 | Identity and required text: flow id file-safe and not `pipeline`, agent name file-safe, blank flow name or body, blank agent description (`analyze/text.ts`); `isFileSafeId` exported from `check/primitives.ts` | 0 blockers; 1 warning fixed (a test for a flow whose index is not 0); 2 suggestions fixed; 1 suggestion deferred (shared path helpers with T002) | task check passed: core 675, api 6, web 4 |
| T004 | Reused id and tag checks: `checkIdsUnique` and `checkRuleTags` from F-02, each problem a blocker at its path, with the position read from the path by explicit shapes; a path of an unknown shape throws (`analyze/reuse.ts`) | 0 blockers; 2 warnings fixed (position lookup made explicit; a test for each path shape); 2 suggestions fixed | task check passed: core 698, api 6, web 4 |
| T005 | Flow links and block links reused from F-02: flow `next` rules and loops, Start and Agent `next` rules; route problems left to T006 (`analyze/links.ts`). The wrong-kind `next` case of F-02 is kept as the same rule | 0 blockers; 2 warnings fixed (a self-loop test used a missing block; an Agent wrong-kind case added); 0 suggestions. The AC-014 test that checked a rule boundary was re-tagged to AC-016 in T006 | task check passed: core 723, api 6, web 4 |
| T007 | Block reachability from each flow's first Start along `next` and condition routes (`analyze/reach.ts`); a second Start in a flow is not reached from the first and gets its own blocker; the walk stays inside its flow. Two T006 test expectations changed by the new rule (AC-013 false route, AC-035 partial model) | 0 blockers; 1 warning fixed (a test that proves the walk stays in its flow); 2 suggestions fixed (line length); 1 suggestion deferred (block-path helper repeated across modules, as for T003) | task check passed: core 767, api 6, web 4 |
| T006 | Condition outputs (`analyze/outputs.ts`), route rules (`analyze/routes.ts`, `.true.to` and `.false.to` from `checkBlockLinks`), and the guard in `check/block-links.ts` for a missing route or `next`; AC-035 partial model (a condition with no routes, a Start with no `next`, a flow with no `next`, description or arguments). Committed as one change over the 400-line guard by owner decision (see Amendments) | 0 blockers; 1 warning fixed (AC-035 flow case added); 2 suggestions deferred (`start()` test helper sets then deletes a placeholder; the plan's "skipped" wording for a missing `next` is superseded: AC-035 requires the finding) | task check passed: core 752, api 6, web 4 |
| T008 | Flow reachability: the first flow is the first in pipeline order that no `next` names; flows reached along `next` by id; an unreached flow gets one `flow-reach` blocker and its blocks are not reported (`analyze/reach.ts`, `index.ts` registers `reachRules`) | 0 blockers; 1 warning fixed (a flow with a repeated id is tracked by id, so AC-025 reports it once); 1 suggestion deferred (`reachRule` and `reachRules` differ by one letter; renaming would edit the block tests) | task check passed: core 778, api 6, web 4 |
| T010 | Documentation: `architecture.md` §12 and §5 decision 10 record the analysis as built and the blocker for a return without a `roundLimit`; `features.md` F-03 scope drops the retry warning | 0 blockers; 3 warnings fixed (no caller in `source/apps` yet; a pipeline-level back route sentence that the model does not have; decision 10 still said warning); 3 suggestions fixed | task check passed: core 783, api 6, web 4 |
| T009 | Public surface and checks of the whole order: `analyzeStructure`, `Finding`, `Severity` exported from the pipeline index; the default pipeline gives no finding through the parser; a minimal valid pipeline gives none; document order across rules (`index.ts`, `namespace.test.ts`, `analyze-default.test.ts`, `analyze-order.test.ts`). The export-list tests of F-02 AC-089 moved from `purity.test.ts` to `namespace.test.ts`, as the plan names it | 0 blockers, 0 warnings, 0 suggestions; pre-flight blocker (plan names `namespace.test.ts`, the assertions were in `purity.test.ts`) resolved by the move | task check passed: core 783, api 6, web 4 |

### 2026-11-16 build (code removed in `58ef413`)

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T008 | Default pipeline gives two retry warnings and no blocker; `enabled` and `disabled` keys refused at parse; `analyzeStructure` and `Finding`/`Severity` types in the namespace; multi-rule document order (`analyze-default.test.ts`, `disabled.test.ts`, `analyze-order.test.ts`, `namespace.test.ts`) | 0 blockers; 1 warning fixed (a tautological order test removed); 1 suggestion fixed (type assertions for the exported types) | task check passed: core 545, api 6, web 3 |
| T007 | Reachability: flows reached from the first flow through flow Connections; blocks reached from the first Start through Connections and Check routes (`analyze/reach.ts`) | 0 blockers, 3 warnings fixed (three test names said 'no finding' while carrying a reachability blocker); 0 suggestions. Five existing test files outside the plan got their expected findings updated for the new rule; a warnings-only fixture route changed from stop to build-end so its End is reached | task check passed: core 530, api 6, web 3 |
| T006 | Check routes and retries: a route to the Check itself refused; a back route with no `roundLimit` is a warning (`analyze/routes.ts`); T005's AC-014 cases given `roundLimit: 2` so only the loop rule is tested | 0 blockers, 0 warnings; 1 suggestion fixed (duplicate AC-017 case removed) | task check passed: core 511, api 6, web 3 |
| T005 | Loops among Connections: depth-first search over block Connections per flow and flow Connections of the pipeline; one blocker at the closing Connection; Check routes not in the graph (`analyze/cycles.ts`) | 0 blockers, 0 warnings; 1 suggestion fixed (iterative search, no recursion per block) | task check passed: core 496, api 6, web 3 |
| T004 | Flow links and rule tags: a flow's `connectedTo` must name a flow of the pipeline; rule tags on the pipeline, flows and agents must name a rule (`analyze/references.ts`) | 0 blockers, 0 warnings; 2 suggestions fixed (shared position type; a test title made exact) | task check passed: core 481, api 6, web 3 |
| T003 | Block and route references: a block's `connectedTo` and a Check's true and false routes must name a block of their own flow, or stop (`analyze/references.ts`); T002's AC-004 test isolated so only the End rule fires | 0 blockers, 0 warnings; 1 suggestion fixed (id sets built once per call) | task check passed: core 466, api 6, web 3 |
| T002 | Flow rules: one Start per flow (second Start refused), at least one End, empty flow gets both, pipeline with no flow refused (`analyze/start-end.ts`) | 0 blockers; 1 warning fixed (empty-flow test now checks which finding is the Start and which the End); 0 suggestions | task check passed: core 456, api 6, web 3 |
| T001 | Finding type (`Severity`, `Finding`, `LocatedFinding`), `analyzeStructure` with the fixed sort (flow, block, rule, path) and the fixture `analyze-fixture.ts` | 0 blockers; 2 warnings fixed (AC-026 test could not fail, config now frozen; AC-027 test name overstated); 3 suggestions fixed | task check passed: core 449, api 6, web 3 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 `source/packages/core/src/pipeline/analyze/finding.ts` (plan line T001 names "the rule-id strings"): no rule id is defined yet, since no rule module exists before T002. Each rule task defines its own id string where it is used; a constant list now would be dead code.
- T003 `source/packages/core/src/pipeline/analyze/text.ts` (`flowPath` and `blockPath` repeat the helpers in `analyze/start-end.ts`): moving them to a shared `analyze/paths.ts` edits the T002 module and adds a file the plan does not name; deferred to a later task that touches both.
- T006 `source/packages/core/src/pipeline/check/block-links.ts` (plan T006 says a missing `next` is "skipped"): the guard reports it as a finding instead, which is intended, since AC-035 says each gap gives its finding (the Start `next` finding comes from `analyze/links.ts`). The plan wording is approved and is not edited here; amend it with the next plan change.
- T007 `source/packages/core/src/pipeline/analyze/reach.ts` (`blockPath` repeats the helpers in `analyze/outputs.ts`, `analyze/start-end.ts` and `analyze/text.ts`): the same duplication as the T003 entry; one shared helper is a change to four modules, deferred to the task that moves them.
- T008 `source/packages/core/src/pipeline/analyze/reach.ts` (`reachRule` and `reachRules` differ by one letter): the test file imports `reachRule` for the block-level cases, which T008 must leave unchanged apart from the import; a rename would edit those tests. Deferred to the task that next touches the block rule.
- T006 `source/packages/core/test/pipeline/analyze-routes.test.ts` (`start()` helper sets `next: id` and deletes it when absent): test-only helper, the default is never used; reworking it is not worth the churn.

---

## Test Results

### 2026-11-19 verify

Verify run on 2026-11-19, branch `main`, clean tree, all 10 tasks (T001 to T010) committed, Current Task None.

**Task check:** `source/scripts/task-check.sh` exit 0. Core 783 passed (33 files), api 6 passed (3 files), web 4 passed (2 files). Total 793 passed, 0 failed. A verbose core run gives the same 783 passed, of which 146 lines carry an `F-03 AC-` name.

**Totals:** 37 criteria, 37 `[auto]`, 0 `[device]`. Gaps: none. Failures: none.

"Passing tests" counts the passing test cases whose full name (including its describe titles) carries the criterion ID. Every named test is in `source/packages/core/test/pipeline/`.

| Criterion | Tag | Covering tests (file) | Passing tests | Result |
|---|---|---|---|---|
| AC-001 | auto | analyze-start-end.test.ts | 1 | pass |
| AC-002 | auto | analyze-start-end.test.ts | 2 | pass |
| AC-003 | auto | analyze-start-end.test.ts | 2 | pass |
| AC-004 | auto | analyze-start-end.test.ts | 2 | pass |
| AC-005 | auto | analyze-start-end.test.ts | 1 | pass |
| AC-006 | auto | analyze-start-end.test.ts | 2 | pass |
| AC-007 | auto | analyze-links.test.ts | 14 | pass |
| AC-008 | auto | analyze-links.test.ts | 1 | pass |
| AC-009 | auto | analyze-links.test.ts | 1 | pass |
| AC-010 | auto | analyze-links.test.ts | 3 | pass |
| AC-011 | auto | analyze-links.test.ts | 5 | pass |
| AC-012 | auto | analyze-links.test.ts | 11 | pass |
| AC-013 | auto | analyze-routes.test.ts | 2 | pass |
| AC-014 | auto | analyze-links.test.ts | 8 | pass |
| AC-015 | auto | analyze-routes.test.ts | 4 | pass |
| AC-016 | auto | analyze-links.test.ts, analyze-routes.test.ts | 21 | pass |
| AC-017 | auto | analyze-routes.test.ts | 8 | pass |
| AC-018 | auto | analyze-routes.test.ts | 2 | pass |
| AC-019 | auto | analyze-routes.test.ts | 2 | pass |
| AC-020 | auto | analyze-routes.test.ts | 4 | pass |
| AC-021 | auto | analyze-reach.test.ts | 15 | pass |
| AC-022 | auto | analyze-reach.test.ts | 3 | pass |
| AC-023 | auto | analyze-reach.test.ts | 11 | pass |
| AC-024 | auto | analyze-reach.test.ts | 5 | pass |
| AC-025 | auto | analyze-names.test.ts | 23 | pass |
| AC-026 | auto | analyze-text.test.ts, analyze-names.test.ts | 14 | pass |
| AC-027 | auto | analyze-text.test.ts, analyze-names.test.ts | 8 | pass |
| AC-028 | auto | analyze-text.test.ts | 6 | pass |
| AC-029 | auto | analyze-text.test.ts | 2 | pass |
| AC-030 | auto | analyze-names.test.ts | 9 | pass |
| AC-031 | auto | analyze-default.test.ts | 1 | pass |
| AC-032 | auto | analyze-order.test.ts, analyze.test.ts | 4 | pass |
| AC-033 | auto | analyze.test.ts | 2 | pass |
| AC-034 | auto | analyze.test.ts | 1 | pass |
| AC-035 | auto | analyze-routes.test.ts | 3 | pass |
| AC-036 | auto | analyze-default.test.ts | 1 | pass |
| AC-037 | auto | namespace.test.ts | 1 | pass |

**Tests that do not prove the criterion they carry** (no gap, since each criterion has a passing test that does prove it; the tags should be corrected by the owner or in a later change):

- `analyze-names.test.ts`, the tests tagged `F-03 AC-026` at the argument clashes ("a pipeline argument that clashes with a rule id", "a flow argument that clashes with a flow id", "an argument row of an agent that clashes with a block id") check where F-02's reused id findings are placed. They do not test the file-safe or `pipeline` rule of AC-026; that is proven in `analyze-text.test.ts`. The test "F-03 AC-025 a repeated rule id is placed at pipeline level" is tagged AC-025, which is about repeated flow ids.
- `analyze-links.test.ts`, "F-03 AC-014 a start next that names the end of its own flow" and "an agent next that names the start of its own flow" test the F-02 kind rule, which AC-014 does not name (AC-014 covers a block of another flow, or no block). AC-014 is proven by the other-flow and no-block cases.
- `analyze-links.test.ts`, "F-03 AC-007 every finding of this rule is a blocker with a message" checks the severity and message property of AC-034, not AC-007.
- `analyze-reach.test.ts`, "F-03 AC-023 a second flow with the id of a reached flow is not reported again" is a negative case of duplicate ids; it belongs to AC-025.
- Wording question on AC-035: the criterion says each gap in its list "gives its finding". The test "F-03 AC-035 a flow with no next, no description and no arguments ... gives no finding" expects no finding, which matches AC-010 and AC-028 for a one-flow pipeline. The owner should confirm that AC-035 means "gives the finding its own criterion names", and clarify the wording in `stories.md` if so.

**Scope check (`features.md` F-03, as amended):** each scope item has a covering criterion. One start and one end per flow: AC-001 to AC-006. Connections join blocks of one flow: AC-014, AC-016. Connections join flows of the pipeline, one target and one incoming: AC-007 to AC-009. A flow is connected: AC-010. No loops among flows or blocks: AC-011, AC-012. A retry with a round limit is not a loop: AC-013. Both outputs of every check wired: AC-015. Back routes only to earlier agents: AC-017 to AC-020. Reachability of blocks and flows: AC-021 to AC-024. Unique file-safe names: AC-025 to AC-027. A flow requires a name and a body: AC-028. The retry warning is no longer in the scope; AC-019 is the blocker that replaces it.

**Manual checklist:** not needed, since no criterion is `[device]`. No `checklist.md` was written.

### History: verify run on 2026-11-16

Verify run on 2026-11-16, branch `main`, clean tree, all 8 tasks committed, Current Task None.

**Task check:** `source/scripts/task-check.sh` exit 0. Core 545 passed (26 files), api 6 passed (3 files), web 3 passed (2 files). Total 554 passed, 0 failed. The pipeline folder (F-02 and F-03 tests) alone gives 525 passed in a verbose run.

**Totals:** 30 criteria, 30 `[auto]`, 0 `[device]`. Gaps: none. Failures: none.

"Passing runs" counts the passing test cases whose full name carries the criterion ID. A describe block titled with a range (for example `F-03 AC-001 to AC-005`) also counts toward each ID it names.

| Criterion | Tag | Covering tests (file) | Passing runs | Result |
|---|---|---|---|---|
| AC-001 | auto | start-end.test.ts | 7 | pass |
| AC-002 | auto | start-end.test.ts | 1 | pass |
| AC-003 | auto | start-end.test.ts | 2 | pass |
| AC-004 | auto | start-end.test.ts | 2 | pass |
| AC-005 | auto | start-end.test.ts | 1 | pass |
| AC-006 | auto | references.test.ts | 10 | pass |
| AC-007 | auto | references.test.ts | 2 | pass |
| AC-008 | auto | references-flows-tags.test.ts | 15 | pass |
| AC-009 | auto | references.test.ts | 4 | pass |
| AC-010 | auto | references.test.ts | 2 | pass |
| AC-011 | auto | references-flows-tags.test.ts | 9 | pass |
| AC-012 | auto | cycles.test.ts | 15 | pass |
| AC-013 | auto | cycles.test.ts | 5 | pass |
| AC-014 | auto | cycles.test.ts | 2 | pass |
| AC-015 | auto | routes.test.ts | 14 | pass |
| AC-016 | auto | routes.test.ts | 2 | pass |
| AC-017 | auto | routes.test.ts | 3 | pass |
| AC-018 | auto | routes.test.ts | 5 | pass |
| AC-019 | auto | reach.test.ts | 19 | pass |
| AC-020 | auto | reach.test.ts | 3 | pass |
| AC-021 | auto | reach.test.ts | 1 | pass |
| AC-022 | auto | reach.test.ts | 2 | pass |
| AC-023 | auto | reach.test.ts | 3 | pass |
| AC-024 | auto | analyze-default.test.ts | 3 | pass |
| AC-025 | auto | analyze.test.ts, analyze-order.test.ts | 5 | pass |
| AC-026 | auto | analyze.test.ts | 3 | pass |
| AC-027 | auto | analyze.test.ts | 2 | pass |
| AC-028 | auto | disabled.test.ts | 8 | pass |
| AC-029 | auto | namespace.test.ts | 3 | pass |
| AC-030 | auto | analyze.test.ts | 2 | pass |

**Scope check (`features.md` F-03):** each scope item has a covering criterion. One start and one end per flow: AC-001 to AC-004. Connections join one flow or the pipeline's flows: AC-006 to AC-008. No cycles: AC-012, AC-013. Both outputs of every Check wired: AC-009, AC-010. Reachability: AC-019 to AC-023. Back routes only to earlier blocks: AC-015 to AC-017. Retry with no limit warns: AC-018. Unique file-safe names: F-02 AC-010 (file-safe name and duplicate agent names, `block-agent-check.test.ts`) and F-02 AC-022 (unique ids, `ids.test.ts`), refused at parse and not repeated here, as the stories say.

**Manual checklist:** not needed, since no criterion is `[device]`. No `checklist.md` was written.

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```

### Amendment — 2026-11-19 (size guard, T006)
**Changed**: none to the plan's task list. T006 is committed as one change.
**Reason**: the staged change was 407 changed lines, over the 400-line guard, because the route rules and their tests were added in the same task as the condition outputs. The owner chose to commit it as one change rather than split it into T006 and T006a.
**Impact**: none on later tasks. The override is recorded here so the history shows the guard was waived for T006 only.

### Decisions taken during Specify and Plan (2026-11-19, re-specification)

- **Rules run in the builder and the analyzer (owner, 2026-11-19):** each rule has one implementation, used by the F-11 marks and the analyzer (`features.md` F-03).
- **Return without a round limit is a blocker (owner, 2026-11-19):** AC-019 changed from a warning to a blocker, as F-02 AC-061 already refuses it. `architecture.md` §12 and `features.md` F-03 drop the retry warning (T010).
- **Reuse of F-02 cross-checks (plan, 2026-11-19, approved):** the analysis calls the F-02 functions in `check/`; the stories' Out of Scope wording was corrected to match. The parser's behaviour is unchanged except a guard against a partial model (T006).
- **Earlier build records:** the Task Log and Test Results below are from the 2026-11-16 build, whose code was removed in `58ef413`. The 2026-11-19 build reuses the IDs T001 to T010 for new tasks; its rows are kept separately under Task Log for this build.

### Decisions taken during Specify (2026-11-16)

- **Disabled items:** the owner decided that blocks and flows have no enabled property at all. Recorded as `architecture.md` §6 decision 34; §12 and §3 updated; the switch-off footer removed from `ui.md` §3.4 and `features.md` F-12.
- **Iteration-source warning:** not in F-03. Decision 29 supersedes it, although decision 10 still lists it.
- **Pipeline start:** read as the Start of the first flow, because the model has no pipeline-level blocks (decisions 30 and 33).
