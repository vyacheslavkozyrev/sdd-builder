# Progress — Project step (F-09)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-20 | re-specified after the 2026-11-19 reset: 17 criteria, 16 `[auto]`, 1 `[device]`; approved by the user as written |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user; screens in `spec/design/features/F-09-project-step/` on the F-08 frame. Name help line resolved 2026-11-20 (screen 01 as drawn; AC-016 `[auto]`, AC-017 `[device]`). Limit note styling kept as drawn |
| Plan     | ✅ Complete | 2026-11-20 | Approved by the user; re-planned after the reset: 4 tasks, all `[Web]`, on the current F-08 wizard (F-02 to F-13 code removed in `58ef413`) |
| Build    | ✅ Complete | 2026-11-20 | 4 of 4 tasks committed |
| Verify   | ⏳ Pending |  | runs after all tasks are committed |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

---

## Task Log

_Restarted after the 2026-11-19 reset. The rows of the earlier build (T001 to T005 of 2026-11-17) are in git history at `59a9be3`, `spec/specifications/F-09-project-step/progress.md`._

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Project text rules as pure functions: name 100 and idea 5,000 code-point limits, truncation that never splits a surrogate pair, counter text `N / 5,000`, `ideaForConfig` trim | 0 blockers, 1 warning fixed (AC-011 no-mutation test could not fail; removed), 2 suggestions fixed (lone-surrogate check made real; AC-003 table-driven) | task check passed: api 45, web 223, core 1208 |
| T002 | Wizard values for the project step: `name` and `idea` held as typed in the reducer, a `setValues` action merges them, Next and Prev keep them, restart clears them | 0 blockers, 0 warnings, 1 suggestion fixed (empty-patch edge test added) | task check passed: api 45, web 239, core 1208 |
| T003 | Project step body: name `TextField` (required, help line, no counter), idea multi-line field with `N / 5,000` counter and help lines, limit notes, `getProjectStepStyles` getter, palette `error` and `warning` added to `theme.ts` | 0 blockers, 3 warnings fixed (AC-001 negative case could not fail; AC-015 spies missed `getItem`, `removeItem`, `clear`, `indexedDB` and `info`/`debug`; AC-017 sizes not tied to the rendered textarea rows), 2 suggestions fixed (dead `label` style key removed; `IDEA_ROWS` defined once and imported). Size 566 lines approved by the owner for one commit | task check passed: api 45, web 274, core 1208 |
| T004 | Wizard wiring: `StepBody` shows `ProjectStep` on step 1 and the placeholder on steps 2 to 4; `App` holds values in the reducer; Next never blocked by blank name or idea; privacy scan covers the project step | 0 blockers, 1 warning fixed (blank-value tests did not change the field, so the empty case never reached the reducer), 0 suggestions fixed | task check passed: api 45, web 295, core 1208 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 `source/apps/web/test/project.test.ts` AC-011: the "stored value is not changed" clause cannot be shown by a test of a pure function on an immutable string. Not applied: the guarantee belongs to the wizard value the step holds, so it is tested at the state or step level (T002, T003).
- T004 `source/apps/web/test/wizard-privacy.test.ts` F-09 AC-015 block: the new `it.each` only checks that the four named files are in the scanned list. The scan itself is the existing per-file loop, which already covers `ProjectStep.tsx`, so this is a presence guard, not an extra scan. Kept as written.
- T004 `source/apps/web/test/StepBody.test.tsx` AC-012: steps 2 to 4 are a table, and step 1 is a separate test with the same meaning. Both are asserted, so the table is not split further. Not applied.
- T003 open owner decision, resolved 2026-11-20: the name limit note (AC-017, screen 03) stays plain amber text as drawn; the idea limit note keeps its box. Recorded in the Amendments below and in `screens.md`.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome. Filled at Verify, after all tasks are committed._

**Verify run 2026-11-20 (on `main`, clean tree, all 4 tasks committed).** `source/scripts/task-check.sh`: typecheck passed (api, web, core); tests passed: api 45/45 (6 files), web 295/295 (19 files), core 1208/1208 (57 files); total 1548 passed, 0 failed.

| Criterion | Tag | Covering tests (`F-09 AC-###` names) | Result |
| --- | --- | --- | --- |
| AC-001 | auto | `ProjectStep.test.tsx` AC-001 (input element; line break removed) | pass |
| AC-002 | auto | `state.test.ts` AC-002 (name comes back unchanged, table) | pass |
| AC-003 | auto | `project.test.ts` AC-003 (100 limit, paste, emoji); `ProjectStep.test.tsx` AC-003 (typing, paste, no counter) | pass |
| AC-004 | auto | `App.test.tsx` AC-004 (Next with blank name) | pass |
| AC-005 | auto | `ProjectStep.test.tsx` AC-005 (textarea; line break kept) | pass |
| AC-006 | auto | `project.test.ts` AC-006 (counter text); `ProjectStep.test.tsx` AC-006 (counter display) | pass |
| AC-007 | auto | `project.test.ts` AC-007; `ProjectStep.test.tsx` AC-007 | pass |
| AC-008 | auto | `project.test.ts` AC-008 (paste, emoji dropped whole); `ProjectStep.test.tsx` AC-008 | pass |
| AC-009 | auto | `App.test.tsx` AC-009 (Next with blank idea) | pass |
| AC-010 | auto | `state.test.ts` AC-010 (trailing space kept; no trim on Next and Prev) | pass |
| AC-011 | auto | `project.test.ts` AC-011 (trim table; idempotent) | pass |
| AC-012 | auto | `StepBody.test.tsx` AC-012; `App.test.tsx` AC-012; `ProjectStep.test.tsx` AC-012 | pass |
| AC-013 | auto | `state.test.ts` AC-013; `App.test.tsx` AC-013 | pass |
| AC-014 | auto | `state.test.ts` AC-014; `App.test.tsx` AC-014 | pass |
| AC-015 | auto | `ProjectStep.test.tsx` AC-015; `App.test.tsx` AC-015; `wizard-privacy.test.ts` AC-015 | pass |
| AC-016 | auto | `ProjectStep.test.tsx` AC-016 (name line and three idea lines compared with the constants) | pass (criterion amended 2026-11-20 to three idea lines) |
| AC-017 | device | Auto tests named AC-017 cover only the limit notes and sizes (`ProjectStep.test.tsx`). The layout at 1280 × 800 and the notes as seen in Chrome are in the checklist, C-01 | pending manual check |

Scope in `features.md` F-09 (name single-line, stored as typed, required but not blocking; idea multi-line, 5,000 code points, counter, paste limit; name 100 limit; idea trim) is covered by AC-001 to AC-011.

**Gaps (resolved 2026-11-20)**

1. AC-016 wording: resolved by the owner. AC-016 is amended to the three idea help lines of screen 01; the build and test already match.
2. Name limit note on screen 03: resolved by the owner. Plain amber text as drawn; `screens.md` amended to say so.
3. `screens.md` open point 1: resolved (screen 01 as drawn).

**Manual checklist:** `spec/specifications/F-09-project-step/checklist.md`, C-01 (AC-017), pending the user's run.

---

## Amendments

```
### Amendment — 2026-11-20 (before Verify)
**Changed**: `stories.md` AC-016 (idea help lines: three lines, as screen 01); `screens.md` open points 1 and 2 (name note plain text, idea note keeps its box); `checklist.md` (owner decisions noted, no open points).
**Reason**: owner decisions of 2026-11-20. Screen 01 and the build already show three idea help lines and a plain name limit note.
**Impact**: none on code; the AC-016 test already asserts three lines. Verify re-runs only the manual checklist (C-01).
```