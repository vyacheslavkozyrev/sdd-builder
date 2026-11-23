# Progress — Workflow builder (F-12)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-23 | 9 stories, 53 criteria: 50 `[auto]`, 3 `[device]`; approved by the user with the readings under "Open for approval" as written. Decisions taken in the questions: Condition blocks in F-12; no Move up or Move down (order from the arrows); arrows drawn by dragging between points, as on the Pipeline tab; a flow keeps its Start and at least one End |
| UX       | ⏳ Pending  | | The existing `spec/design/features/F-12-workflow-builder/` screens are the 2026-11-19 draft, not approved and not reviewed. They are redrawn in UX to match these stories (Move buttons and the Link icon are not in the stories) |
| Plan     | ⏳ Pending  | | Approved by the user before any code is written |
| Build    | ⏳ Pending  | | 0 of N tasks committed |
| Verify   | ⏳ Pending  | | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Open for approval

These points come from documents that disagree. The stories follow the reading shown; the user confirms or changes it at approval.

1. **End count.** `pipeline-schema.md` §3 says a flow has exactly one End; the stories (AC-038, AC-043) allow one or more, as the owner chose in the Specify question. The parser rule must match the answer; if the user keeps "exactly one", AC-038 and AC-043 change.
2. **Start and End deletion.** The stories keep one Start (its Delete control is disabled, AC-042) and at least one End (AC-043). The owner's option text said "Start can be deleted"; the stories follow the label "Keep one Start, one or more End".
3. **Reads and Writes.** Their labels are the outcome artifacts of the flows of the pipeline (AC-026). `pipeline-schema.md` §6 does not say which flow's artifacts.
4. **Documents to update in the plan.** `features.md` (F-12 scope line), `ui.md` §3.3 and §4 (Condition, no Move buttons, Agent reads and writes and rule tags) and `pipeline-schema.md` §6 are out of date with these stories. A docs task in the plan updates them, not the Specify commit.

---

## Current Task

_None. While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |

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
