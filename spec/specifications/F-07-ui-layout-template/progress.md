# Progress — UI layout template (F-07)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-17 | 14 criteria: 12 `[auto]`, 2 `[device]`; approved by the user |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user as they are: open points kept (New project starts over at once; scrollbar strip kept as an illustration) | Screens (SVG) approved by the user before Plan and Build; ➖ Not needed when the feature has no user interface |
| Plan     | ✅ Complete | 2026-11-17 | Approved by the user (6 tasks; Emotion 11.14.0 (react) and 11.14.1 (styled) approved as Material UI peers) |
| Build    | 🔄 In Progress | 2026-11-17 | 4 of 6 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Material UI 9.5.0 and Emotion pins (react 11.14.0, styled 11.14.1); lockfile committed separately in 82acfa7; Emotion recorded in architecture §5 | 0 blockers, 2 warnings fixed (plan T001 pins, Emotion peer wording) | task check passed: api 57, web 3, core 1017 |
| T002 | Frame sizing as a pure style function (width, 1024 px minimum, full-height, no hidden overflow) | 0 blockers, 0 warnings, 2 suggestions fixed (minWidth tied to the exported constant; determinism test relabelled) | task check passed: api 57, web 9, core 1017 |
| T003 | Header: wordmark left, New project right, no other control | 0 blockers, 1 warning fixed (New project filled on a white bar, as screen 01), 1 suggestion deferred | task check passed: api 57, web 17, core 1017 |
| T004 | Footer: the not-saved note, no button or link, Material UI | 0 blockers, 1 warning fixed (border-box so the bar is 48 px), 1 suggestion fixed (FOOTER_NOTE no longer exported); 1 suggestion deferred | task check passed: api 57, web 22, core 1017 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `source/apps/web/test/Header.test.tsx` (AC-001 order test): checks that the wordmark precedes the button in the markup, not the left and right regions. The left/right split is the flex spacer in `Header.tsx`; the server-rendered markup cannot prove the layout, so it needs a visual check against screen 01 at Verify.
- `source/apps/web/src/layout/Footer.tsx` (48 px height, 12 px note): the `caption` variant is 12 px in the default theme (checked in `@mui/material` createTypography) and the height is set inline. Server-rendered markup carries no emotion CSS, so no test asserts them; check against screen 02 at Verify.

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
