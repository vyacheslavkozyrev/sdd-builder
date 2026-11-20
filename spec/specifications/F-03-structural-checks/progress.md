# Progress — Structural checks (F-03)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-19 | 7 stories, 37 criteria, all [auto]; re-specified for the flow model (decisions 38, 39) and approved by the user. Builder marks and analyzer share the rules (owner, 2026-11-19) |
| UX       | ➖ Not needed |  | No user interface (F-02 to F-06) |
| Plan     | ✅ Complete | 2026-11-19 | Approved by the user; 10 tasks (T001 to T010); AC-019 decided as a blocker (see Amendments) |
| Build    | 🔄 In Progress | 2026-11-19 | 1 of 10 tasks committed |
| Verify   | ⏳ Pending |  | reset 2026-11-19: to be re-specified from the final schema and architecture |

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

---

## Test Results

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

### Decisions taken during Specify and Plan (2026-11-19, re-specification)

- **Rules run in the builder and the analyzer (owner, 2026-11-19):** each rule has one implementation, used by the F-11 marks and the analyzer (`features.md` F-03).
- **Return without a round limit is a blocker (owner, 2026-11-19):** AC-019 changed from a warning to a blocker, as F-02 AC-061 already refuses it. `architecture.md` §12 and `features.md` F-03 drop the retry warning (T010).
- **Reuse of F-02 cross-checks (plan, 2026-11-19, approved):** the analysis calls the F-02 functions in `check/`; the stories' Out of Scope wording was corrected to match. The parser's behaviour is unchanged except a guard against a partial model (T006).
- **Earlier build records:** the Task Log and Test Results below are from the 2026-11-16 build, whose code was removed in `58ef413`. The 2026-11-19 build reuses the IDs T001 to T010 for new tasks; its rows are kept separately under Task Log for this build.

### Decisions taken during Specify (2026-11-16)

- **Disabled items:** the owner decided that blocks and flows have no enabled property at all. Recorded as `architecture.md` §6 decision 34; §12 and §3 updated; the switch-off footer removed from `ui.md` §3.4 and `features.md` F-12.
- **Iteration-source warning:** not in F-03. Decision 29 supersedes it, although decision 10 still lists it.
- **Pipeline start:** read as the Start of the first flow, because the model has no pipeline-level blocks (decisions 30 and 33).
