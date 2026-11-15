# Progress — Generator core: pipeline, agents and rules to file tree (F-02)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-14 | Stories approved by the user: 7 stories, 34 criteria, all `[auto]` |
| UX       | ➖ Not needed | 2026-11-14 | No user interface: the feature is in `source/packages/core` only, and every criterion is `[auto]` on pure functions |
| Plan     | ✅ Complete | 2026-11-14 | Approved by the user |
| Build    | 🔄 In Progress | 2026-11-14 | 4 of 14 tasks committed (T002 split into T002a and T002b) |
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
| T001 | Rules in the model: `ProjectConfig.rules`, parsed with the id rule; default pipeline gets `rules: []` | 0 blockers, 0 warnings, 1 suggestion fixed | 1532 passed |
| T002a | Refusal collector and the Start and End checks; `generate` exported from the pipeline module | 0 blockers, 1 warning and 2 suggestions fixed | 825 passed |
| T002b | Connection and Condition wiring; disabled items and flows skipped; combined sort. Committed at 516 changed lines, over the 400-line guard, by the user's explicit decision | 0 blockers, 0 warnings, 1 suggestion fixed | 846 passed |
| T003 | Reachability from Start; back-route, disabled-route and End-terminal rules. Committed at 458 changed lines, over the 400-line guard, by the user's explicit decision | 0 blockers, 1 warning fixed | 872 passed |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 `source/packages/core/src/pipeline/parse.ts:116` duplicate rule id names only the second path, not the first. Kept: the block, flow and argument duplicate checks use the same convention (`parse-structure.ts`, `parse-scope.ts`), and the plan scopes rule uniqueness to rules only. Revisit if AC-008 is read as requiring every clashing path for rules too.
- T003 `source/packages/core/src/pipeline/generate/refusals-routes.ts` a stop route reaches every live End of its list, including a `done` End. Kept: only reachability is marked, so the only effect is that a `done` End is not reported as unreachable when a stop exists; the stories do not say which outcome a stop must end with.
- T003 `spec/specifications/F-02-generator-core/plan.md` (T003 line) names only `pipeline-generate-refusals-routes.test.ts`; the reachability tests are in `pipeline-generate-refusals-reach.test.ts`, with shared builders in `pipeline-routes-fixtures.ts`. Kept: a plan-text fix, left to the plan owner so the plan is not edited inside a build task.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment — 2026-11-14
**Changed**: `plan.md`: T002 split into T002a (collector, Start and End checks, export) and T002b (Connection and Condition wiring, disabled-item skipping). The staged T002 change of 447 lines is not committed; its files are reshaped by T002a and T002b.
**Reason**: the review of T002 hit the 400-line size guard: 447 changed lines, the test file alone 310 lines. The user approved the split.
**Impact**: T002a and T002b are implemented, reviewed, tested and committed in turn. The Start and End checks count Start and End blocks whether or not they are enabled, because AC-017 always selects them in an enabled flow; AC-014 covers the content of disabled blocks, not these blocks.

### Amendment — 2026-11-14 (second)
**Changed**: `plan.md`, T004: the Agent block gets a required `description` (model, parser, `default.json`), with the refusal of a missing or blank one. The file list is extended to match.
**Reason**: AC-029 and the stub text of AC-027 assume an Agent description, but the pipeline model had no such field and the parser refuses unknown keys. The user chose to add it to T004 rather than split.
**Impact**: T004 changes the model and the default pipeline data as well as the refusal. Each Agent block of `default.json` needs its description text (building-blocks.md §4).

### Amendment — 2026-11-14 (third)
**Changed**: `plan.md`, T004 split into T004a (the Agent description: model, parser, `default.json`, and the refusal of a missing one, AC-029) and T004b (names, required blocks, check rules, advice; AC-008, AC-009, AC-010, AC-011, AC-013).
**Reason**: the required-block rule (AC-010) makes earlier minimal fixtures refuse. The user chose to update those fixtures rather than narrow or move the rule. Together with the description change, that is more than the 400-line guard allows in one commit.
**Impact**: T004a runs before T004b. T004b updates the minimal fixtures of T002a, T002b and T003 to include the default pipeline's required blocks; their assertions stay as they are. The required-block check applies inside enabled flows only; the pipeline's own Start and End and the gates are always required.
