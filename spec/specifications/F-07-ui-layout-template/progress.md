# Progress — UI layout template (F-07)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-20 | 14 criteria: 12 `[auto]`, 2 `[device]`; re-specified after the 2026-11-19 reset; approved by the user |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user as they are: open points kept (New project starts over at once; scrollbar strip kept as an illustration) | Screens (SVG) approved by the user before Plan and Build; ➖ Not needed when the feature has no user interface |
| Plan     | ⏳ Pending |  | reset 2026-11-19: to be re-specified from the final schema and architecture |
| Build    | ⏳ Pending |  | 0 tasks committed (reset) |
| Verify   | ⏳ Pending |  | reset 2026-11-19: to be re-specified from the final schema and architecture |

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
| T005 | Frame: header, centre area with the children, footer, in that order, styled by frameStyle | 0 blockers, 1 warning fixed (style of the outer element tested against frameStyle), 1 suggestion fixed | task check passed: api 57, web 30, core 1017 |
| T006 | Application root renders the frame with a centre placeholder; main.tsx mounts it | 0 blockers, 1 warning fixed (wordmark test also asserts the header), 1 suggestion fixed; 1 suggestion deferred (New project is a no-op until F-08) | task check passed: api 57, web 32, core 1017 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `source/apps/web/test/Header.test.tsx` (AC-001 order test): checks that the wordmark precedes the button in the markup, not the left and right regions. The left/right split is the flex spacer in `Header.tsx`; the server-rendered markup cannot prove the layout, so it needs a visual check against screen 01 at Verify.
- `source/apps/web/src/layout/Footer.tsx` (48 px height, 12 px note): the `caption` variant is 12 px in the default theme (checked in `@mui/material` createTypography) and the height is set inline. Server-rendered markup carries no emotion CSS, so no test asserts them; check against screen 02 at Verify.
- `source/apps/web/src/App.tsx` (`onNewProject={() => undefined}`): the New project button does nothing until the wizard is wired in F-08. This is the T006 placeholder scope (plan: no wizard), so it is kept; F-08 replaces it.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

Verify run on 2026-11-17 on `main`, clean tree, all six tasks committed. `source/scripts/task-check.sh` passed: typecheck clean in api, web and core; tests api 57, web 32, core 1017 (1106 total), 0 failing.

| Criterion | Tag | Covering tests (names contain the criterion) | Result |
|---|---|---|---|
| AC-001 | auto | `Header.test.tsx` AC-001 (wordmark before New project; filled button) | Covered. Test proves text and order only; left and right placement is confirmed on screen 01 in the checklist (AC-011 step 3) |
| AC-002 | auto | `Header.test.tsx` AC-002 (×2: called once on click; not called before click) | Covered |
| AC-003 | auto | `Header.test.tsx` AC-003 (×2: no Demo control; exactly one button) | Covered |
| AC-004 | auto | `Footer.test.tsx` AC-004 | Covered |
| AC-005 | auto | `Footer.test.tsx` AC-005 (×3: no button, no link or anchor, no control role) | Covered |
| AC-006 | auto | `AppFrame.test.tsx` AC-006 (×2: header, centre, footer order) | Covered |
| AC-007 | auto | `AppFrame.test.tsx` AC-007 (×3: children in centre; children outside header and footer; empty centre) | Covered |
| AC-008 | auto | `App.test.tsx` AC-008 (×3: wordmark, footer note, frame as outer element) | Covered |
| AC-009 | auto | `frameStyle.test.ts` AC-009 (×3); `AppFrame.test.tsx` AC-009 | Covered |
| AC-010 | auto | `frameStyle.test.ts` AC-010 (×2: no hidden overflow; no narrow max width) | Covered |
| AC-011 | device | Manual checklist | Pending: `checklist.md` |
| AC-012 | device | Manual checklist | Pending: `checklist.md` |
| AC-013 | auto | `Header.test.tsx` AC-013 (×2: MuiAppBar-root; MuiButton-root) | Covered |
| AC-014 | auto | `Footer.test.tsx` AC-014 | Covered |

Gaps among `[auto]` criteria: none. Scope in `features.md` (F-07: header with logo and New project, footer note, centre area, Material UI, desktop 1280 × 800, every screen uses the layout) is covered by AC-001 to AC-014 as in the Requirement Coverage table.

Manual checklist: `spec/specifications/F-07-ui-layout-template/checklist.md` (AC-011 at 1280 × 800, AC-012 at 1024 px). Outcome: awaiting the user's results.

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
