# Progress — Analyzer: structural checks and LLM review (F-04)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-14 | Stories approved by the user; 9 stories, 25 criteria, all `[auto]`. Decisions: flat analyzer rewired now and deleted in F-04; web app gap accepted until F-05; refusal checks of `pipeline/generate` reused as blockers; iteration source is an earlier artifact in pipeline order; caps kept on `/analyze` |
| UX       | ➖ Not needed |      | No user-facing criteria; the analyzer is pure logic and an HTTP route |
| Plan     | ✅ Complete | 2026-11-14 | Approved by the user before any code is written; 24 tasks, one commit each; decision 22 (root `pipeline` namespace) recorded in T001 |
| Build    | 🔄 In Progress | 2026-11-14 | 3 of 24 tasks committed |
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

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Decision 22 recorded in architecture §6 (namespace export, analysis location, flat removal in F-04) | reviewed: 0 blockers, 0 warnings, 0 suggestions | task check passed (exit 0) |
| T002 | Root `pipeline` namespace; `parsePipelineConfig` exported from pipeline; `configProblems` extracted from `refuseInvalidConfig` (no change of behaviour) | reviewed: 0 blockers, 1 warning, 3 suggestions fixed | task check passed (exit 0) |
| T003 | Refusal findings as blockers (path subject); `analyzeStructure` entry point with sort by severity, subject, message (paths in generator order) | reviewed: 0 blockers, 2 warnings, 2 suggestions fixed | task check passed (exit 0) |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

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
