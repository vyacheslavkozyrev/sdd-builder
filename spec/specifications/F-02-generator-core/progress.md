# Progress — Generator core: pipeline, agents and rules to file tree (F-02)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-14 | Stories approved by the user: 7 stories, 34 criteria, all `[auto]` |
| UX       | ➖ Not needed | 2026-11-14 | No user interface: the feature is in `source/packages/core` only, and every criterion is `[auto]` on pure functions |
| Plan     | ✅ Complete | 2026-11-14 | Approved by the user |
| Build    | 🔄 In Progress | 2026-11-14 | 1 of 13 tasks committed |
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

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 `source/packages/core/src/pipeline/parse.ts:116` duplicate rule id names only the second path, not the first. Kept: the block, flow and argument duplicate checks use the same convention (`parse-structure.ts`, `parse-scope.ts`), and the plan scopes rule uniqueness to rules only. Revisit if AC-008 is read as requiring every clashing path for rules too.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment — 2026-11-14
**Changed**: `plan.md`: T002 split into T002a (collector, Start and End checks, export) and T002b (Connection and Condition wiring, disabled-item skipping). The staged T002 change of 447 lines is not committed; its files are reshaped by T002a and T002b.
**Reason**: the review of T002 hit the 400-line size guard: 447 changed lines, the test file alone 310 lines. The user approved the split.
**Impact**: T002a and T002b are implemented, reviewed, tested and committed in turn. The Start and End checks count Start and End blocks whether or not they are enabled, because AC-017 always selects them in an enabled flow; AC-014 covers the content of disabled blocks, not these blocks.
