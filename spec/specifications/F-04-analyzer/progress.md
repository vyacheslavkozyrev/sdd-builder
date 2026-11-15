# Progress — Analyzer: structural checks and LLM review (F-04)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-14 | Stories approved by the user; 9 stories, 25 criteria, all `[auto]`. Decisions: flat analyzer rewired now and deleted in F-04; web app gap accepted until F-05; refusal checks of `pipeline/generate` reused as blockers; iteration source is an earlier artifact in pipeline order; caps kept on `/analyze` |
| UX       | ➖ Not needed |      | No user-facing criteria; the analyzer is pure logic and an HTTP route |
| Plan     | ✅ Complete | 2026-11-14 | Approved by the user before any code is written; 24 tasks, one commit each; decision 22 (root `pipeline` namespace) recorded in T001 |
| Build    | 🔄 In Progress | 2026-11-14 | 16 of 24 tasks committed |
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
- **Amendment 7 (2026-11-15), unknown key names in 400 problems.** The core parser names an unknown key in its problem path (F-01 AC-020 and AC-027). A 400 from `/analyze` may therefore name a key the client itself sent; the reader adds no other submitted text, and the server neither stores nor logs the body. AC-020 and the T011 line are updated to match; F-01 is unchanged. Owner choice (option 1), 2026-11-15.
- **Amendment 8 (2026-11-15), flat review prompt removal split out.** The flat `review/prompt.ts` is still imported by the flat `analyze.ts` until T013 rewires it. Its deletion is a separate task, T013a, so T013 stays under the size guard. Owner decision: none needed (plan split, as in F-03 T006a–c). Recorded 2026-11-15.
- **Amendment 9 (2026-11-15), route after analysis.** T013 could not keep the build green alone, because `/analyze` still passes a flat config. Option 2 of the owner: T013 adds `analyzePipeline` beside the flat `analyze` (tests in a new file); T014 switches the `/analyze` route to the pipeline reader, caps, skipped analysis and `analyzePipeline`; new T013b removes the flat `analyze` after T016. Every commit stays green. Owner choice (option 2), 2026-11-15.
- **Amendment 10 (2026-11-15), size exception for T014.** The route switch and every test that posts to `/analyze` must land in one commit to stay green (`analyze-route`, the `/analyze` cases of `limits-route` and `ceiling-route`, `privacy`, `privacy-limits`, `wiring`). The staged change is about 497 changed lines, over the 400-line guard by about 95. Owner choice (option A): T014 is accepted as one documented exception.
- **Open note for F-13 (2026-11-15).** The `/analyze` module cap no longer applies, since the pipeline caps are idea and rules only (AC-021). The module cap test moved to `/generate`, which keeps it until F-07. To be settled when F-13 is specified; no F-04 decision depends on it.

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
| T011 | Pipeline reader for `/analyze`: parse via core, 400 with `<path>: <reason>` problems; unknown key names allowed in problems (Amendment 7) | reviewed: 1 blocker resolved by Amendment 7, 1 suggestion fixed | task check passed (exit 0) |
| T012 | Review prompt over the pipeline config (new file review/pipeline-prompt.ts; flat prompt removed in T013) | reviewed: 0 blockers, 4 warnings fixed, 2 suggestions deferred | task check passed (exit 0) |
| T013 | Pipeline analysis `analyzePipeline` beside the flat `analyze` (Amendment 9): structural findings kept, review failures keep them, log line event and error name only | reviewed: 0 blockers, 0 warnings; 1 suggestion deferred (duplicate body, removed by T013b) | task check passed (exit 0) |
| T014 | `/analyze` on the pipeline model: pipeline reader, pipeline caps (422), skipped analysis at the ceiling, analyzePipeline; /generate unchanged (size exception, Amendment 10) | reviewed: 0 blockers, 2 warnings, 2 suggestions fixed | task check passed (exit 0) |
| T015 | Ceiling on `/analyze` returns skipped with no model call (AC-022 route); `/generate` still generates a flat config (AC-023) | reviewed: 0 blockers, 1 warning fixed | task check passed (exit 0) |
| T016 | Privacy and wiring tests on the pipeline model; route-level AC-018 test: no brief, rule, reply or message text in the log | reviewed: 0 blockers, 0 warnings; 2 suggestions deferred | task check passed (exit 0) |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T005 `pipeline-analyze-reachability.test.ts:204` (suggestion): the "disabled block gives no finding" test filters to blockers, so a warning from the disabled block would not fail it. Kept as the owner asked for the blocker filter; a subject-level assertion would need a path for the disabled block, which the test does not compute yet.

- T009 `pipeline-analyze-order.test.ts` (WARNING, unresolved): AC-003 names `info` as the third severity rank, but no check emits `info` and `compareFindings` is not exported, so the `info` rank cannot be tested through `analyzeStructure`. Needs a production change (an info finding or an exported comparator), which this test-only task does not allow.

- T011 `source/packages/core/src/pipeline/parse-util.ts:44` (BLOCKER, resolved by Amendment 7: AC-020 allows the client's own unknown key name): `checkKeys` puts an unknown key's name into the problem path (for example `{"SUBMITTED": 1}` gives `SUBMITTED: is not a known key`), so `/analyze` returns submitted text in the 400 body, against the T011 line "never a submitted value". F-01 AC-020 and AC-027 require the unknown key's path, so the fix contradicts F-01 and is not applied. Options for the owner: (a) the reader hides the last segment of such problems; (b) F-01 AC-020 and AC-027 change to an object path with the reason `has a field the config does not define` (the flat core's wording), and about 20 core test assertions update with it.

- T012 `source/apps/api/src/review/pipeline-prompt.ts` (suggestion): the prompt omits the process-level parts a review may need, namely the pipeline's enabled connections and gates between flows, the Start arguments, the routes and `threshold` of conditions, and the agent and flow `ruleTags`. AC-013 names only the brief, enabled flows with their enabled blocks and descriptions, and rule text, so adding them is a scope change for the owner.

- T013 `source/apps/api/src/analyze.ts` `analyzePipeline` (suggestion): its body repeats the flat `analyze` line for line. The flat function must stay untouched until T013b (Amendment 9), so a shared helper would still leave the copy in place. Removed with the flat `analyze` in T013b.

- T012 `plan.md` T012 line (suggestion): it names the test file `source/apps/api/test/prompt.test.ts`, which is the flat test that stays until T013. The staged test is `source/apps/api/test/pipeline-prompt.test.ts`; correct the T012 line when T013 removes the flat files.

- T014 `source/apps/api/src/analyze.ts` flat `analyze` (suggestion): after the route switch nothing in `source/apps/` calls the flat `analyze` except its own tests. It is removed in T013b (Amendment 9), so it stays for now.

- T016 `source/apps/api/test/privacy.test.ts` new AC-018 test (suggestion): the table case "analyze with a review model that fails with the brief in its message" checks the same log line for the same failure. The named AC-018 test is kept because T016 requires a route-level AC-018 test; removing the table case would weaken the F-07 AC-024 sweep, so both stay.

- T016 `spec/specifications/F-04-analyzer/stories.md` AC-018 wording (suggestion): the story says the failed-call log line carries "the event and the error name only", but the line also carries `route=/analyze`, as decision 12 allows for refusals. The implementation and the new test follow decision 12. Owner to confirm whether AC-018 should name the route too; no code change until then.

- T014 `source/apps/api/test/pipeline-config.ts` (suggestion): it parses `templates/pipeline/default.json` itself. Core already parses the same file in `source/packages/core/src/pipeline/default.ts` (`defaultProjectConfig`), but `pipeline/index.ts` does not export it. Exporting it is a core surface change outside T014; the helper is test-only and correct as it stands.

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
