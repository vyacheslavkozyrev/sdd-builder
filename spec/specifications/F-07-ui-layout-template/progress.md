# Progress — UI layout template (F-07)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-20 | 14 criteria: 12 `[auto]`, 2 `[device]`; re-specified after the 2026-11-19 reset; approved by the user |
| UX       | ✅ Complete | 2026-11-20 | Restyled left-panel screens (2026-11-18) approved by the user 2026-11-20; open points 1 and 2 kept; AC-001 and the stories amended to the left panel and re-approved the same day (supersedes the header approval of 2026-11-17) |
| Plan     | ✅ Complete | 2026-11-20 | Approved by the user; re-planned after the removal of the previous build (`58ef413`): 5 tasks, all `[Web]` |
| Build    | ✅ Complete | 2026-11-20 | 5 of 5 tasks committed |
| Verify   | ✅ Complete | 2026-11-20 | 14 of 14 criteria: 12 `[auto]` passing; 2 `[device]` (AC-011, AC-012) passed by the user |

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

Run 2026-11-20 (verify mode, branch `main`, clean tree before the run, all 5 tasks committed, Current Task None).

`source/scripts/task-check.sh`: exit 0. Typecheck passed in all workspaces. Tests: api 45 passed (6 files), web 40 passed (8 files), core 1208 passed (57 files). 0 failed.

| Criterion | Tag | Covering tests (`F-07 AC-###`) | Result |
| --------- | --- | ------------------------------ | ------ |
| AC-001 | auto | `LeftPanel.test.tsx` (wordmark, New project, wordmark above button) | Covered, pass |
| AC-002 | auto | `LeftPanel.click.test.tsx` (handler called once on click; not on render) | Covered, pass |
| AC-003 | auto | `LeftPanel.test.tsx` (exactly one button; no Demo, Prev, Next, link, input or select) | Covered, pass |
| AC-004 | auto | `Footer.test.tsx` (not saved; lost on refresh) | Covered, pass |
| AC-005 | auto | `Footer.test.tsx` (no button, no link, no save/download control) | Covered, pass |
| AC-006 | auto | `AppFrame.test.tsx` (panel, centre, footer order) | Covered, pass |
| AC-007 | auto | `AppFrame.test.tsx` (children in centre; empty centre still renders panel and footer) | Covered, pass |
| AC-008 | auto | `App.test.tsx` (root renders frame, panel and footer; empty centre) | Covered, pass |
| AC-009 | auto | `frameStyle.test.ts` (width 100%, min width 1024 px, min height 100vh) | Covered, pass |
| AC-010 | auto | `frameStyle.test.ts` (exact key set: no overflow hiding, no max width) | Covered, pass |
| AC-011 | device | Checklist (1280 × 800) | Passed by the user 2026-11-20 (no scroll at 1280 × 800 after the body-margin fix in `App.tsx`, the footer gaps at 12 px) |
| AC-012 | device | Checklist (1024 px, narrower scrolls) | Passed by the user 2026-11-20 |
| AC-013 | auto | `LeftPanel.test.tsx` (Mui panel; MuiButton-root) | Covered, pass |
| AC-014 | auto | `Footer.test.tsx` (Mui footer and Mui typography) | Covered, pass |

Gaps: none for the automated criteria (12 of 12 have at least one passing test naming them).

Scope (`features.md` F-07): left panel with wordmark and New project (AC-001 to AC-003), footer note (AC-004, AC-005), centre area (AC-006, AC-007), every screen uses the frame (AC-006, AC-008), Material UI (AC-013, AC-014), desktop 1280 × 800 and 1024 px minimum (AC-009 to AC-012). Covered.

Note for the owner: `features.md` line 32 and line 75 still say "header (logo, New project)" and "logo"; the approved design is a left panel with a text wordmark. The scope is covered by the criteria, but the feature list wording is stale.

Manual checklist: `spec/specifications/F-07-ui-layout-template/checklist.md` (AC-011 at 1280 × 800, AC-012 at 1024 px). Status: both passed by the user on 2026-11-20 after the body-margin fix (`ad37880`).

Risk for the device run (not a test gap): no CSS reset exists in `source/apps/web` (no `CssBaseline`, no `margin: 0` on body). The browser default body margin of 8 px applies, so a frame with `minHeight: 100vh` may scroll vertically by about 16 px at 1280 × 800, and at 1024 px the frame's `minWidth: 1024px` may scroll horizontally by about 16 px. This is from reading the code, not from a browser run. If the user reports a fail on AC-011 or AC-012, this is the first cause to check.

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
