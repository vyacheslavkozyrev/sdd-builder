# Progress — Generator core (F-04)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-19 | 6 stories, 36 criteria, all [auto]; re-specified from the final schema (`pipeline-schema.md`) and approved by the user |
| UX       | ➖ Not needed |  | No user interface (F-02 to F-06) |
| Plan     | ✅ Complete | 2026-11-19 | Approved by the user; 13 tasks (T001 to T013); all 36 criteria covered |
| Build    | ⏳ Pending |  | 0 of 13 tasks committed |
| Verify   | ⏳ Pending |  | Not run; criteria AC-001 to AC-036 are all `[auto]` |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |

_The earlier task log of this feature (before the 2026-11-19 reset to the flow model) was removed; its code is no longer in the tree. It remains in git history before commit `3b601aa`._

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `source/templates/README.md` still says "enabled" in the command, agent and rule rows (lines 59–61 and 75–77). Decision 34 removed the enabled property, so the wording is stale. To be fixed with the template placeholder work (F-05) or in T013 of this feature, whichever comes first.

- Open decision for the user: no `ProjectConfig` field carries `projectName`, `idea` or `stack` as a template value source (`Pipeline` has `name` only), while `source/templates/README.md` lines 17–20 still promise these values for base layouts. The T003 templates input and the base layouts (F-05) need a decision: give the base layouts a value source (for example `Pipeline.name`, or a new config field), or drop the rows. Not decided here; it is a model and template decision.

---

## Test Results

Not run yet for this feature's new build (reset 2026-11-19).

---

## Amendments

None.
