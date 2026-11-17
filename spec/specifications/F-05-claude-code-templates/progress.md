# Progress — Claude Code templates (F-05)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-17 | 7 stories, 35 criteria, all `[auto]`; approved by the user. Mermaid diagram in `process.md` included (features.md scope); AC-008 keeps Start and End as steps, as F-04 renders them; AC-010, AC-021, AC-023 and AC-028 amended 2026-11-17: Start and End kept as steps; no project name, idea or stack in F-05 (F-09, F-21 add them); a pipeline gate has no fail route in the model |
| UX       | ➖ Not needed | 2026-11-17 | No user interface: templates and a pure generator in `source/packages/core` (the stories have no user-facing criterion) |
| Plan     | ✅ Complete | 2026-11-17 | 13 tasks, all 35 criteria covered; approved by the user |
| Build    | 🔄 In Progress | 2026-11-17 | 1 of 13 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Decision 36 recorded; §3 step 3 and §10 use 3 name F-05 for the Mermaid view; decision 19 note corrected | 0 blockers, 1 warning fixed, 2 suggestions deferred | task check passed: core 739 of 739 (37 files), api 6 of 6, web 3 of 3 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 `spec/documents/architecture.md:32` and `:97`: name F-18 for presentation mode and process diagrams; `features.md` places presentation mode at F-23. Not the Mermaid view, so outside T001; a numbering sweep of §2 and §5 is for a docs task.
- T001 `source/templates/README.md:21`, `:37`, `:73`: the status says the renderer reads `#enabled:<id>` sections (`render.ts` does not), and two rows name F-18 for the Mermaid view. Already in T013's scope (plan line for T013); fixed there.

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
