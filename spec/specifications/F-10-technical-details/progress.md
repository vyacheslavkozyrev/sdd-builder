# Progress — Technical details step (F-10)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-20 | re-specified after the 2026-11-19 reset: 25 criteria, 24 `[auto]`, 1 `[device]` (AC-025); approved by the user; rule ids that the schema refuses show a message (owner decision 2026-11-20) |
| UX       | ✅ Complete | 2026-11-17 | Approved by the user; six screens in `spec/design/features/F-10-technical-details/`. Open for the owner before Verify: inner scroll of the rule list, block height at three or more blocks, clipped 100-character name, red confirm button, `section` text class |
| Plan     | ✅ Complete | 2026-11-20 | re-planned after the reset: 7 tasks (T001 to T007); Approved by the user |
| Build    | 🔄 In Progress |  | 5 of 7 tasks committed |
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
| T001 | Technical text rules as pure functions: limits, rule id, letter-or-digit test, duplicate flags, 60-block limit | 0 blockers, 0 warnings, 1 suggestion fixed (negative test for path-safe rule ids, AC-014) | task check passed: api 57, web 198, core 1017 |
| T002 | Wizard values for step 2: stack, architecture, rule list; add, remove and update reducer actions; no trim; restart clears. Tests of App and Wizard updated to the new shape (outside the listed files, needed by the typecheck) | 0 blockers, 1 warning fixed (AC-020 round trip through step 4 not tested), 1 suggestion fixed (JSX formatting in Wizard.test.tsx) | task check passed: api 57, web 215, core 1017 |
| T003 | Technical details step, stack and architecture: five single-line stack fields (language required), architecture multi-line with its limit and no counter, blank-language note | 0 blockers, 1 warning fixed (misleading test name on blank language), 1 suggestion fixed (header AC range); 2 suggestions deferred | task check passed: api 57, web 245, core 1017 |
| T004 | Technical details step, rule list: name (100 limit), file line or no-id message, duplicate message, description (1,000 limit), Remove with confirmation, Add disabled at 60 with its reason; DOM click tests for the removal flow added after the owner's decision (see Amendment 1) | Review rounds 1 and 2: 0 blockers; 1 warning (no click test of the removal flow) resolved by the DOM test library; suggestions fixed: dead NAME_HELP removed, accessible names for the name fields and Remove buttons (with a test) | task check passed: api 57, web 287, core 1017 |
| T005 | Wiring: step 2 shows the technical card (stack and architecture left, rule list right, one card with a divider as drawn); steps 1, 3 and 4 unchanged; App dispatches add, remove and update; New project clears. Wizard.tsx and TechnicalStep.tsx (card moved out of the step, outside the listed files, so the approved one-card layout holds) | 0 blockers, 2 warnings fixed (weak assertions on the step 2 body), 3 suggestions fixed | task check passed: api 57, web 303, core 1017 |
| T006 | `ui.md` §2 Step 2 and §6: the 100-character limit on stack fields and rule names, the no-id message in place of the file name, the reason beside a disabled Add at 60 | 0 blockers, 0 warnings, 0 suggestions | task check passed: api 57, web 303, core 1017 |
| T001 (2026-11-20) | Technical text rules as pure functions: limits, rule id, id problem messages in order (no letter or digit, start with a letter, longer than 60), duplicate flags among valid ids, `canAddRule` | 0 blockers, 0 warnings, 1 suggestion fixed (test name for the AC-015 to AC-017 order), 1 suggestion deferred (`ruleFileLine`, used by T004) | task check passed: api 45, web 346, core 1208 |
| T002 (2026-11-20) | Wizard values for step 2: stack, architecture and rule list in the reducer; add, remove and update rule actions; Next, Prev and restart keep or clear them; a rule update on a non-block index is a programmer error | 0 blockers, 2 warnings fixed (blank-description test checks the step moves; invalid-index negative test), 2 suggestions fixed (one shared test helper in wizardValues.ts; AC-022 asserts stack and architecture) | task check passed: api 45, web 370, core 1208 |
| T003 (2026-11-20) | Technical details step, stack and architecture fields: five single-line stack fields (language required), the architecture multi-line field with its 5,000 limit and help line, no storage or console call. Committed as one commit over the size guard (Amendment 2) | 0 blockers, 1 warning fixed (AC-006 test now types two characters past 4,999), 2 suggestions deferred | task check passed: api 45, web 403, core 1208 |
| T005 (2026-11-20) | Rule list: heading, Add rule block (disabled at 60 with its reason), blocks in order, empty list on a new project, Remove with a confirmation (Cancel keeps, Remove deletes), the list as its own scroll region; the stack and the rule list in one card with a divider. One commit over the size guard (Amendment 4) | 0 blockers, 1 warning fixed (id-to-number duplicate logic moved from the view into `technical.ts` as `duplicateRuleNumbers`, replacing the unused `duplicateRuleFlags`), 2 suggestions fixed (AC-025 test no longer claims a page-layout result; a stale comment on the remove button shape), 2 suggestions deferred | task check passed: api 45, web 458, core 1208 |
| T004 (2026-11-20) | Rule block, one block: name (100 limit), file line or the id message, duplicate note, description (1,000 limit, blank allowed), remove control. Committed as one commit over the size guard (Amendment 3) | 0 blockers, 4 warnings fixed (primary outline on remove, shared field and warning shapes, AC-015 test checks the typed value), 1 suggestion fixed (one test render helper), 3 suggestions deferred | task check passed: api 45, web 438, core 1208 |
| T005 (2026-11-20) | Rule list: heading, Add rule block with its 60-block reason, rule blocks in order, empty state, Remove with confirmation, scroll region, shown beside the stack fields. Committed as one commit over the size guard (Amendment 4) | 0 blockers, 1 warning fixed (duplicate function moved to technical.ts), 2 suggestions fixed (AC-025 test name, header comment), 2 suggestions deferred | task check passed: api 45, web 458, core 1208 |
---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T003 `source/apps/web/test/TechnicalStep.test.tsx` `fieldsOf`: calls the component as a plain function to read the element tree. Fragile if the step ever uses a hook. Not changed: the workspace has no React test renderer and the plan adds no library.
- T003 `source/apps/web/src/wizard/TechnicalStep.tsx` `STACK_HELP_LIMIT`: says "characters", the limit is code points. Not changed: the wording is copied from the approved screen 01 and 02 text.
- T003 `source/apps/web/src/wizard/TechnicalStep.tsx` stack `onChange`: the stack fields are cut with `NAME_LIMIT` from `project.ts` (100). The value is right and `technical.ts` documents the reuse; a separate stack-limit constant would read more clearly. Not changed: naming only, no behaviour.
- T003 `source/apps/web/src/wizard/TechnicalStep.tsx` stack help lines: not linked to the stack fields with `aria-describedby` (only the architecture field is). No criterion asks for it. Not changed: outside the T003 criteria.
- T001 `source/apps/web/src/wizard/technical.ts` `ruleFileLine`: exported with its test before any caller exists. Not removed: T004 renders the file line with it, and the path format stays in one place (AC-014). Owner may move it into T004 if preferred.
- T004 `source/apps/web/src/wizard/RuleBlocks.tsx`, name field: the help line "Up to 100 characters; text past the limit is cut." is not rendered on a block. Screen 06 shows it at the limit; screen 01 does not. The unused constant was removed in review. Owner to decide before Verify whether the line shows on every block (the same as open point 3 of the UX screens).
- T004 `source/apps/web/src/wizard/RuleBlock.tsx`, no-id message: the block shows "Needs a letter or digit." (AC-015 wording, also used for the other two id messages); approved screen 06 shows "Name needs a letter or digit. No file name is written." Not changed: the stories wording is kept as Amendment 3 directs. Owner to confirm the wording or pick screen 06's before Verify.
- T004 `source/apps/web/src/wizard/RuleBlock.tsx`, description field: `multiline` with two rows (about 60 px) because AC-020 requires a multi-line field with Enter; screens 01 to 06 draw a 40 px field, so a block is taller than the 224 px on the screens. Not changed: the stories govern the behaviour; block height is already open point 2 of the UX screens.
- T005 `source/apps/web/src/wizard/RuleList.tsx` rule blocks `key={index}`: a block has no stable id in the model, and the blocks hold no state of their own (controlled fields), so an index key is correct here. Not changed: no id exists to key on.
- T005 `source/apps/web/src/wizard/RuleList.tsx` scroll hint: screen 05 draws "59 more rule blocks below. Scroll to see them."; the list has no such line. Not added: no criterion asks for it, the screens say the wording is a placeholder, and the owner has the inner-scroll point open for Verify.
- T004 `source/apps/web/src/wizard/RuleBlock.tsx`, description help line: screen 06 shows "Up to 1,000 characters; text past the limit is cut." under Description, screen 03 does not, and the block does not render it. Same open point as the name help line above. Not changed: owner decides the help lines for all blocks at once.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

**Verify run 2026-11-17, branch `main`, clean tree.** Type check passed for api, web and core. Tests: api 57 passed, web 303 passed (18 files), core 1017 passed (53 files); `source/scripts/task-check.sh` passed.

| Criterion | Tag | Covering tests (all passed) | Result |
| --- | --- | --- | --- |
| AC-001 | auto | TechnicalStep.test.tsx | covered |
| AC-002 | auto | TechnicalStep.test.tsx | covered |
| AC-003 | auto | TechnicalStep.test.tsx | covered |
| AC-004 | auto | technical.test.ts, TechnicalStep.test.tsx | covered |
| AC-005 | auto | TechnicalStep.test.tsx | covered |
| AC-006 | auto | technical.test.ts, TechnicalStep.test.tsx | covered |
| AC-007 | auto | state.test.ts (reducer: Next, Prev, no trim) | covered for the reducer; configuration-function half open until F-13, as the approved plan records |
| AC-008 | auto | state.test.ts, App.test.tsx, RuleBlocks.test.tsx, RuleBlocks.dom.test.tsx | covered |
| AC-009 | auto | state.test.ts, App.test.tsx, RuleBlocks.test.tsx, RuleBlocks.dom.test.tsx | covered |
| AC-010 | auto | state.test.ts, RuleBlocks.test.tsx, RuleBlocks.dom.test.tsx | covered |
| AC-011 | auto | RuleBlocks.test.tsx, RuleBlocks.dom.test.tsx | covered |
| AC-012 | auto | state.test.ts, technical.test.ts, RuleBlocks.test.tsx, RuleBlocks.dom.test.tsx | covered |
| AC-013 | auto | technical.test.ts, RuleBlocks.test.tsx | covered |
| AC-014 | auto | technical.test.ts, RuleBlocks.test.tsx | covered |
| AC-015 | auto | technical.test.ts, RuleBlocks.test.tsx | covered |
| AC-016 | auto | RuleBlocks.test.tsx | covered |
| AC-017 | auto | technical.test.ts, RuleBlocks.test.tsx | covered |
| AC-018 | auto | technical.test.ts, RuleBlocks.test.tsx | covered |
| AC-019 | auto | Wizard.test.tsx, App.test.tsx | covered |
| AC-020 | auto | state.test.ts, App.test.tsx | covered |
| AC-021 | auto | state.test.ts, App.test.tsx | covered |
| AC-022 | auto | TechnicalStep.test.tsx, RuleBlocks.test.tsx, wizard-privacy.test.ts | covered |
| AC-023 | device | `checklist.md` C-01 | awaiting the user's result |

**Scope (`features.md` F-10):** each part of the scope (language required, four optional stack fields, architecture at most 5,000, rule name and description limits, file name per block, at most 60 blocks, duplicate ids flagged, list starts empty) is covered by at least one criterion above.

**Gaps:** none blocking. AC-007 is partly open by design (approved plan): the configuration-function half waits for F-13.

**Manual checklist:** `spec/specifications/F-10-technical-details/checklist.md`, one item (C-01, AC-023), result pending. The owner's open layout points (inner scroll, block height at three blocks, clipped name) and the rule-name help line decision are recorded there.

---

## Amendments

### Amendment 4 — 2026-11-20 (T005: size guard overridden by the user)
**Changed**: T005 is committed as one commit (about 677 changed lines, over the 400-line guard). Not split into T005a and T005b.
**Reason**: the size guard stopped T005; the user chose to keep T005 as one commit ("proceed with 1 commit").
**Impact**: none on the remaining tasks.

### Amendment 3 — 2026-11-20 (T004: size guard overridden by the user)
**Changed**: T004 is committed as one commit (5 staged files, 518 changed lines, over the 400-line guard). Not split into T004a and T004b.
**Reason**: the size guard stopped T004; the user chose to keep T004 as one commit ("proceed with 1 commit"). The message wording stays as the approved stories state it (AC-015 to AC-017: "Needs a letter or digit.", and the stories wording for the other two messages); the difference from screen 06 is recorded as an open point for the owner.
**Impact**: none on the remaining tasks.

### Amendment 2 — 2026-11-20 (T003: size guard overridden by the user)
**Changed**: T003 is committed as one commit (8 staged files, 487 changed lines, over the 400-line guard). Not split into T003a, T003b and T003c.
**Reason**: the size guard stopped the T003 review; the user chose to keep T003 as one commit (2026-11-20, "proceed with 1 commit").
**Impact**: none on the remaining tasks; the review of T003 runs on the full staged change.

```
### Amendment 1 — 2026-11-17 (T004: DOM test library and size override)
**Changed**: `source/apps/web/package.json` and `source/package-lock.json`: dev dependencies `jsdom` 30.1.3, `@testing-library/react` 16.3.3 and `@testing-library/dom` 10.4.2 (exact pins; `@testing-library/dom` is the peer of `@testing-library/react`). New `source/apps/web/test/RuleBlocks.dom.test.tsx` (click tests for the removal flow and Add, enabled per file with `// @vitest-environment jsdom`). `spec/documents/architecture.md` §5 Tests row. `F-01` AC-008 and `deps.test.ts`: browser libraries stay forbidden; the three approved DOM pins are allowed (F-01 progress, Amendment 2).
**Reason**: the T004 review left one WARNING: no test could click Remove, then Confirm, so the removal wiring was untested. The owner chose option A (approve a DOM test library) over lifting the pending index into a helper.
**Impact**: none on tasks or on the remaining plan. Size: the T004 staged diff is 566 changed lines, over the 400-line guard (the code and tests are about 560 of them). The owner approved committing T004 as one commit (size rule overridden for this task, 2026-11-17). T004 is not split.
```
