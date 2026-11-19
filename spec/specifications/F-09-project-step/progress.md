# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ⏳ Pending |  | reset 2026-11-19: to be re-specified from the final schema and architecture |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user; screens in `spec/design/features/F-09-project-step/` on the F-08 frame. Open: name help line vs AC-016, limit note styling (kept as drawn) |
| Plan     | ⏳ Pending |  | reset 2026-11-19: to be re-specified from the final schema and architecture |
| Build    | ⏳ Pending |  | 0 tasks committed (reset) |
| Verify   | ⏳ Pending |  | reset 2026-11-19: to be re-specified from the final schema and architecture |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Project text rules as pure functions: 100 and 5,000 code-point limits, truncation that never splits an emoji, counter text, idea trim for the configuration | 0 blockers, 1 warning fixed (trim test could not fail; now idempotent), 1 suggestion fixed (paste-style name case) | task check passed: web 132, core 1017 |
| T002 | Wizard values for the project step: name and idea held as typed, cleared by New project; F-08 state tests updated; App test fixtures shape-only | 0 blockers, 0 warnings, 1 suggestion fixed (state.ts header cites F-09 criteria) | task check passed: api 57, web 142, core 1017 |
| T003 | Project step body: name and idea fields with limits on change, counter, help and limit notes, no storage call | 0 blockers, 1 warning fixed (runtime no-storage test added), 1 suggestion fixed (counter linked to the idea field) | task check passed: api 57, web 167, core 1017 |
| T004 | Wizard and app wiring: step 1 shows the project step, steps 2 to 4 the placeholder; values and update flow from App; Next never blocked by blank content; privacy scan covers App | 0 blockers, 2 warnings fixed (guard against vacuous Next tests; AC-009 table over empty and spaces-only), 1 suggestion fixed (stale header comment) | task check passed: api 57, web 180, core 1017 |
| T005 | `ui.md` §2 Step 1 and §6: name limit 100 code points (no counter), idea trimmed when the configuration is built | 0 blockers, 0 warnings, 0 suggestions (docs match `project.ts` and ProjectStep behaviour; no production code, no tests required) | task check passed: api 57, web 180, core 1017 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T003 `source/apps/web/test/ProjectStep.test.tsx` `fieldsOf`: calls `ProjectStep` as a plain function, which breaks if the component ever gains a hook. Not applied: the component is hook-free today and a render-based query would add a DOM dependency the other tests avoid.
- T003 name help line (`ProjectStep.tsx` `NAME_HELP`, `NAME_LIMIT_NOTE`): the text follows screen 01 as drawn (adds the 100-character limit to the approved F-05 line), while F-09 AC-016 still says "as the approved screen". Open owner decision, recorded in the Plan notes; to settle before Verify. Not a code defect.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

**Run 2026-11-17** (`source/scripts/task-check.sh` on `main`, clean tree, 8 F-09 commits): typecheck passed for api, web and core. Tests: api 57 passed, web 180 passed (F-09 filter: 67), core 1017 passed. No failures.

| Criterion | Tag | Covering tests | Result |
| --------- | --- | -------------- | ------ |
| AC-001 single-line name, Enter adds no line break | auto | web `ProjectStep.test.tsx` | pass |
| AC-002 name stored as typed | auto | web `state.test.ts` | pass |
| AC-003 name limit 100 code points | auto | web `project.test.ts`, `ProjectStep.test.tsx` | pass |
| AC-004 blank name does not block Next | auto | web `Wizard.test.tsx` | pass |
| AC-005 idea multi-line, Enter kept | auto | web `ProjectStep.test.tsx` | pass |
| AC-006 counter `N / 5,000` | auto | web `project.test.ts`, `ProjectStep.test.tsx` | pass |
| AC-007 typing past 5,000 dropped | auto | web `project.test.ts`, `ProjectStep.test.tsx` | pass |
| AC-008 paste past 5,000, emoji not split | auto | web `project.test.ts`, `ProjectStep.test.tsx` | pass |
| AC-009 blank idea does not block Next | auto | web `Wizard.test.tsx` | pass |
| AC-010 idea spaces kept while typing | auto | web `state.test.ts` | pass |
| AC-011 idea trimmed for the configuration | auto | web `project.test.ts` | pass |
| AC-012 step 1 fields, placeholder on 2 to 4 | auto | web `Wizard.test.tsx`, `ProjectStep.test.tsx`, `App.test.tsx` | pass |
| AC-013 values kept between steps | auto | web `state.test.ts`, `App.test.tsx`, `Wizard.test.tsx` | pass |
| AC-014 New project clears values | auto | web `state.test.ts`, `App.test.tsx` | pass |
| AC-015 no storage or console call | auto | web `ProjectStep.test.tsx`, `wizard-privacy.test.ts` | pass |
| AC-016 help text and layout at 1280 × 800 | device | `checklist.md` C-01 | pass (user, 2026-11-17) |

Gaps: none among `[auto]` criteria. Scope in `features.md` F-09 is covered by AC-001 to AC-009.

Documentation: `features.md` F-09 now states the 100-character name limit and the idea trim rule (same change as `ui.md` §2 and §6, T005). AC-016 was amended to the approved help text plus the name limit line, as the owner chose to keep the help line as drawn.

Manual checklist: 1 item (C-01, AC-016), pass by the user on 2026-11-17.

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
