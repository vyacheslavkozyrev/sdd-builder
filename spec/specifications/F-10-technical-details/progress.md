# Progress — Technical details step (F-10)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-17 | 23 criteria: 22 `[auto]`, 1 `[device]`; stack fields free text, 100-character limit on single-line fields and rule names (owner decisions); approved by the user |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user; six screens in `spec/design/features/F-10-technical-details/`. Open for the owner before Verify: inner scroll of the rule list, block height at three or more blocks, clipped 100-character name, red confirm button, `section` text class |
| Plan     | ✅ Complete | 2026-11-17 | Approved by the user (6 tasks; no new library; AC-007 configuration half checked when F-13 adds the configuration function) |
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
| T001 | Technical text rules as pure functions: limits, rule id, letter-or-digit test, duplicate flags, 60-block limit | 0 blockers, 0 warnings, 1 suggestion fixed (negative test for path-safe rule ids, AC-014) | task check passed: api 57, web 198, core 1017 |
| T002 | Wizard values for step 2: stack, architecture, rule list; add, remove and update reducer actions; no trim; restart clears. Tests of App and Wizard updated to the new shape (outside the listed files, needed by the typecheck) | 0 blockers, 1 warning fixed (AC-020 round trip through step 4 not tested), 1 suggestion fixed (JSX formatting in Wizard.test.tsx) | task check passed: api 57, web 215, core 1017 |
| T003 | Technical details step, stack and architecture: five single-line stack fields (language required), architecture multi-line with its limit and no counter, blank-language note | 0 blockers, 1 warning fixed (misleading test name on blank language), 1 suggestion fixed (header AC range); 2 suggestions deferred | task check passed: api 57, web 245, core 1017 |
| T004 | Technical details step, rule list: name (100 limit), file line or no-id message, duplicate message, description (1,000 limit), Remove with confirmation, Add disabled at 60 with its reason; DOM click tests for the removal flow added after the owner's decision (see Amendment 1) | Review rounds 1 and 2: 0 blockers; 1 warning (no click test of the removal flow) resolved by the DOM test library; suggestions fixed: dead NAME_HELP removed, accessible names for the name fields and Remove buttons (with a test) | task check passed: api 57, web 287, core 1017 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T003 `source/apps/web/test/TechnicalStep.test.tsx` `fieldsOf`: calls the component as a plain function to read the element tree. Fragile if the step ever uses a hook. Not changed: the workspace has no React test renderer and the plan adds no library.
- T003 `source/apps/web/src/wizard/TechnicalStep.tsx` `STACK_HELP_LIMIT`: says "characters", the limit is code points. Not changed: the wording is copied from the approved screen 01 and 02 text.
- T004 `source/apps/web/src/wizard/RuleBlocks.tsx`, name field: the help line "Up to 100 characters; text past the limit is cut." is not rendered on a block. Screen 06 shows it at the limit; screen 01 does not. The unused constant was removed in review. Owner to decide before Verify whether the line shows on every block (the same as open point 3 of the UX screens).

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

```
### Amendment 1 — 2026-11-17 (T004: DOM test library and size override)
**Changed**: `source/apps/web/package.json` and `source/package-lock.json`: dev dependencies `jsdom` 30.1.3, `@testing-library/react` 16.3.3 and `@testing-library/dom` 10.4.2 (exact pins; `@testing-library/dom` is the peer of `@testing-library/react`). New `source/apps/web/test/RuleBlocks.dom.test.tsx` (click tests for the removal flow and Add, enabled per file with `// @vitest-environment jsdom`). `spec/documents/architecture.md` §5 Tests row. `F-01` AC-008 and `deps.test.ts`: browser libraries stay forbidden; the three approved DOM pins are allowed (F-01 progress, Amendment 2).
**Reason**: the T004 review left one WARNING: no test could click Remove, then Confirm, so the removal wiring was untested. The owner chose option A (approve a DOM test library) over lifting the pending index into a helper.
**Impact**: none on tasks or on the remaining plan. Size: the T004 staged diff is 566 changed lines, over the 400-line guard (the code and tests are about 560 of them). The owner approved committing T004 as one commit (size rule overridden for this task, 2026-11-17). T004 is not split.
```
