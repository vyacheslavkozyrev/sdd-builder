# Progress — UI layout template (F-07)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-20 | 14 criteria: 12 `[auto]`, 2 `[device]`; re-specified after the 2026-11-19 reset; approved by the user |
| UX       | ✅ Complete | 2026-11-20 | Restyled left-panel screens (2026-11-18) approved by the user 2026-11-20; open points 1 and 2 kept; AC-001 and the stories amended to the left panel and re-approved the same day (supersedes the header approval of 2026-11-17) |
| Plan     | ✅ Complete | 2026-11-20 | Approved by the user; re-planned after the removal of the previous build (`58ef413`): 5 tasks, all `[Web]` |
| Build    | ✅ Complete | 2026-11-20 | 5 of 5 tasks committed |
| Verify   | 🔄 In Progress | 2026-11-20 | verify run pending |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Frame sizing as a pure style function (width 100%, 1024 px minimum, full-height, no hidden overflow) | 0 blockers, 1 warning fixed (AC-010 tests checked absent keys only; now an exact key set), 1 suggestion fixed (casts removed) | task check passed: api 45, web 9, core 1208 |
| T002 | Left panel: wordmark above New project (MUI button calling onNewProject once); markup tests in LeftPanel.test.tsx, the jsdom click test in LeftPanel.click.test.tsx | 0 blockers, 0 warnings, 2 suggestions fixed (test clarity); 1 suggestion deferred (logo square) | task check passed: api 45, web 19, core 1208 |
| T003 | Footer: the not-saved note in Material UI, no button or link; 24 px gap above the note owned by the footer | 0 blockers, 2 warnings fixed (top padding so the footer owns the 24 px gap; AC-005 control check case-insensitive) | task check passed: api 45, web 26, core 1208 |
| T004 | Frame: left panel, centre area with the children (white card, 12 px radius, 1 px #DDE7EE border, soft shadow), footer, in that order, styled by frameStyle | 0 blockers, 2 warnings fixed (card radius, border and shadow added to match the approved screen; AC-007 negative test made non-duplicate) | task check passed: api 45, web 35, core 1208 |
| T005 | Application root: App renders the frame with an empty centre and a no-op onNewProject (wizard in F-08); main.tsx mounts App, hello-world placeholder removed | 0 blockers, 0 warnings, 0 suggestions | task check passed: api 45, web 40, core 1208 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T002 `source/apps/web/src/layout/LeftPanel.tsx:23-29` (SUGGESTION): the approved screen 01 draws a 24 × 24 logo square before the wordmark (screens.md, left panel, y 24–48). The plan and AC-001 specify the text wordmark only and no logo asset is defined, so it is not added. Owner to decide whether the logo is in scope.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

Not yet run. The checklist is `spec/specifications/F-07-ui-layout-template/checklist.md` (AC-011 at 1280 × 800, AC-012 at 1024 px).

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
