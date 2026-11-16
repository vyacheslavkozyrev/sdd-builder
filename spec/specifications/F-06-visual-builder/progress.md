# Progress — Visual builder: the Map tab, flow tabs, gates and checks, custom agents (F-06)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-15 | Stories approved by the user as written; 45 criteria (43 `[auto]`, 2 `[device]` — AC-005, AC-045). Decisions: Map offers Approval and Check only (Check = `checks` or `diff-size`; review is an Agent block); live structural marks use the core rules. Open for Plan: who builds the core rule module, F-06 or F-04; `features.md` still lists F-01 only as the dependency |
| UX       | ✅ Complete | 2026-11-15 | Approved by the user. 11 screens. Decisions from approval: one gate per connection (Add buttons disabled when the arrow has one); custom-agent edits apply as made (no Save button). Open for Plan: visual points V1 (marks red or amber), V2 (10 px hint text), V3 (toolbox shift on the Start refusal); Start/End panels not drawn; refused states for a repeated flow id, rule tag and agent name not drawn |
| Plan     | ✅ Complete | 2026-11-15 | Approved by the user before any code is written; 22 tasks. Prerequisite: T020 and T021 wait for F-05 T001 to T015 committed; review is removed as a check type (T002, T003) |
| Build    | 🔄 In Progress | 2026-11-15 | 4 of 22 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None.

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Decision records: `review` removed as a check type (building-blocks, features F-15 note); architecture §5 row, §6 decision 24, §9 checks row; features F-06 depends on F-01, F-04 | reviewed: 0 blockers, 0 warnings, 2 suggestions fixed; 1 deferred (idea.md and market-research.md still list review) | task check passed (exit 0), 1258 tests |
| T002 | Remove `review` from the check types: model, parser and generator list; the default's build review gate becomes `checks` so the default still parses (its description is T003) | reviewed: 0 blockers, 0 warnings, 1 suggestion fixed; 2 deferred (flat `FIXED_GATES` in catalog test, removed in T021; default description in T003) | task check passed (exit 0), 1257 tests |
| T003 | Condition description in core: required, non-blank on every Condition (parser and generator refuse a blank one); the pipeline command's check rule text carries it; default's build review gate is `checks` with its description (amendment 1) | reviewed: 0 blockers, 1 warning fixed (generator refuses a blank Condition description), 2 suggestions fixed; 1 deferred (line breaks in the description) | task check passed (exit 0), 1273 tests |
| T004 | Builder state and host contract: `builder/state.ts` starts from the default pipeline (or the host's initial config), reports each change through `onChange`; the default is exported from core; a scan test finds no network or storage call in the builder folder | reviewed: 0 blockers, 1 warning fixed (shared default object cloned), 1 suggestion fixed (scan covers subfolders) | task check passed (exit 0), 1273 core, 357 web, 480 api tests |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 review, SUGGESTION: `spec/documents/idea.md` lines 35, 48 and 80 still list `review` among the four check types. Not applied: `idea.md` is the pre-decision idea record (draft, 2026-11-14), and T001's file list does not include it. Same for `spec/documents/market-research.md` line 86.
- T002 review, SUGGESTION: `source/packages/core/test/catalog.test.ts:5` `FIXED_GATES` still lists `review`. Not applied: it tests the flat model (F-02 T003 catalog), which F-06 T021 removes; changing it now would touch code that is still in use.
- T002 review, SUGGESTION: `source/templates/pipeline/default.json:127` build review gate is set to `checks` in T002 (outside T002's file list, needed so the default still parses). The generated line now reads "Check checks, decided by agent". Not applied here: T003 owns the gate's description and its generated text.
- T003 review, SUGGESTION: `source/packages/core/src/pipeline/generate/rules-text.ts` `checkRule` writes the Condition's description into one numbered rule line, so a description with a line break splits the list in the command file. Not applied: the parser allows any non-blank text, and whether to refuse line breaks or to collapse them is a product choice that the stories do not settle. Decide before F-06 T008 (the web gate settings) so the builder can enforce the same rule.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment 1 — 2026-11-15
**Changed**: `plan.md` T003 widened to the core model, parser and generator (Condition description); `architecture.md` §6 decision 25 records the description as a required model field.
**Reason**: T003 found that the core Condition has no description field, so the default's review gate cannot carry one. The stories require a description on every Condition (AC-016), and `building-blocks.md` §3 lists it. Approved by the user on 2026-11-15.
**Impact**: T003 is larger (core model, parser, generator, default data and tests). Existing Condition fixtures in core tests gain the description. T008 (the web gate settings) is unchanged.

