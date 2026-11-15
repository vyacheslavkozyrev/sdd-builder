# Progress — Analyzer: structural checks and LLM review (F-04)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-14 | Stories approved by the user; 9 stories, 25 criteria, all `[auto]`. Decisions: flat analyzer rewired now and deleted in F-04; web app gap accepted until F-05; refusal checks of `pipeline/generate` reused as blockers; iteration source is an earlier artifact in pipeline order; caps kept on `/analyze` |
| UX       | ➖ Not needed |      | No user-facing criteria; the analyzer is pure logic and an HTTP route |
| Plan     | ✅ Complete | 2026-11-14 | Approved by the user before any code is written; 24 tasks, one commit each; decision 22 (root `pipeline` namespace) recorded in T001 |
| Build    | 🔄 In Progress | 2026-11-14 | 10 of 24 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None.

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Amendments

- **Amendment 1 (2026-11-14), T004 narrowed to option A.** Reachability is already reported by the generator's refusals (`pipeline/generate/refusals-routes.ts`) and reaches `analyzeStructure` through `configProblems`. Adding `reachability.ts` would report each orphan twice. T004 now adds only the AC-006 and AC-007 tests; no new check module. Owner choice, 2026-11-14.
- **Amendment 2 (2026-11-15), AC-006 row dropped.** The row "an enabled block reached only through a disabled one" cannot hold: the walk treats a disabled block as transparent (F-02 AC-005, `pipeline-generate-refusals-reach.test.ts`), so the block after it is reached through the live blocks before it. AC-006 keeps the orphan block and orphan flow rows. `stories.md` AC-006 and the T004 line are updated to match. Owner choice (option 1), 2026-11-15.
- **Amendment 3 (2026-11-15), iteration source of the first flow.** AC-009 said the default gives no iteration-source warning, but the default's first flow agent (`specify-agent`, scope `feature`) has no earlier artifact; the pipeline Start's `feature-id` argument is its iteration source (`building-blocks.md` §3). AC-009 and the T006 line now count the pipeline Start's declared arguments as an iteration source for agents in the first flow. Owner choice (option 1), 2026-11-15.
- **Amendment 4 (2026-11-15), empty rules on the default.** The default pipeline has an empty `rules` list, so AC-012's warning applies to it. `briefFindings(defaultProjectConfig)` yields exactly one finding, the `rules` warning, and no blocker. The T007 line and its test expectation are updated to match; AC-012 is unchanged. Owner choice (option 1), 2026-11-15.
- **Amendment 5 (2026-11-15), AC-001 and AC-003 wording.** AC-001: the default gives no blocker; its only warnings are the six retry warnings and the `rules` warning. AC-003: block and flow path subjects compare by numeric path order (as the generator's problem list does), other text in code-unit order. The code is unchanged. Owner choice (option A for both), 2026-11-15.
- **Amendment 6 (2026-11-15), AC-003 and the `info` rank.** No check emits `info` yet, so the rank cannot be tested through the analysis without exporting the comparison. AC-003 now says so and places `info` after `warning`; the rank stays in the code. Recorded as Deferred Findings for T009. Owner choice (option 1), 2026-11-15.

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Decision 22 recorded in architecture §6 (namespace export, analysis location, flat removal in F-04) | reviewed: 0 blockers, 0 warnings, 0 suggestions | task check passed (exit 0) |
| T002 | Root `pipeline` namespace; `parsePipelineConfig` exported from pipeline; `configProblems` extracted from `refuseInvalidConfig` (no change of behaviour) | reviewed: 0 blockers, 1 warning, 3 suggestions fixed | task check passed (exit 0) |
| T003 | Refusal findings as blockers (path subject); `analyzeStructure` entry point with sort by severity, subject, message (paths in generator order) | reviewed: 0 blockers, 2 warnings, 2 suggestions fixed | task check passed (exit 0) |
| T004 | Reachability tests on `analyzeStructure` (AC-006 orphan block and orphan flow; AC-007 disabled parts silent); no check module (Amendments 1 and 2) | reviewed: 0 blockers, 0 warnings, 3 suggestions fixed | task check passed (exit 0) |
| T005 | Retry warnings on Conditions with a back route and no round limit (flow and pipeline gate); default pipeline gives six warnings, accepted by the owner, template unchanged | reviewed: 0 blockers, 0 warnings, 2 suggestions fixed (1 deferred) | task check passed (exit 0) |
| T006 | Iteration sources for task and feature agents: an earlier produced artifact, or the first flow's Start arguments (Amendment 3) | reviewed: 0 blockers, 0 warnings, 6 suggestions fixed | task check passed (exit 0) |
| T007 | Brief checks: blank name, idea or stack.language (blocker); blank optional stack field and empty rules list (warning); default brief gives the rules warning only (Amendment 4) | reviewed: 0 blockers, 0 warnings, 3 suggestions fixed | task check passed (exit 0) |
| T008 | Review reply check on the pipeline side: array or failed; entries kept with known severity and text; model blocker kept as warning; drops counted | reviewed: 0 blockers, 0 warnings, 2 suggestions fixed | task check passed (exit 0) |
| T009 | Stable output: sort order table, same list and no mutation, default pipeline (AC-001 per Amendment 5); info rank deferred (Amendment 6) | reviewed: 0 blockers, 0 warnings after fixes; 1 warning deferred (info rank), 1 suggestion fixed | task check passed (exit 0) |
| T010 | Pipeline input caps (idea 8,000, rules 60) and skipped analysis (structural findings, review skipped) | reviewed: 0 blockers, 0 warnings, 2 suggestions fixed | task check passed (exit 0) |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T005 `pipeline-analyze-reachability.test.ts:204` (suggestion): the "disabled block gives no finding" test filters to blockers, so a warning from the disabled block would not fail it. Kept as the owner asked for the blocker filter; a subject-level assertion would need a path for the disabled block, which the test does not compute yet.

- T009 `pipeline-analyze-order.test.ts` (WARNING, unresolved): AC-003 names `info` as the third severity rank, but no check emits `info` and `compareFindings` is not exported, so the `info` rank cannot be tested through `analyzeStructure`. Needs a production change (an info finding or an exported comparator), which this test-only task does not allow.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
