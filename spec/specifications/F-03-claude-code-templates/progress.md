# Progress — Claude Code templates (F-03)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-11 | Stories approved by the user; 29 criteria, all `[auto]`. |
| Plan     | ✅ Complete | 2026-11-11 | Approved by the user before any code is written. Approved as written, including T001. |
| Build    | 🔄 In Progress | 2026-11-11 | 16 of 17 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

**Current Task:** None.

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Optional `description` on `Workflow` and `StepDefinition`; no validation beyond the type | 0 blockers, 0 warnings, 1 suggestion fixed (test name), 1 deferred (tsconfig covers src only) | 18 files, 100 passed |
| T002 | Catalog rule tag `typescript.md` → `code.md` on Implement and Code review; F-02 tests updated | 0 blockers, 0 warnings, 1 suggestion fixed (model.ts doc example); deferred: project files still name typescript.md | 18 files, 101 passed |
| T003 | Script steps render `script.md` to `scripts/<id>.sh`; base checks-script template removed from generation | 0 blockers, 0 warnings, 0 suggestions | 18 files, 103 passed |
| T004 | Base layouts: `CLAUDE.md` and `process.md` (Process diagram section) | 0 blockers, 1 warning fixed (README placeholder row), 1 suggestion fixed (test body offset) | 19 files, 106 passed |
| T005 | Spec-template layouts, byte-identical to the F-00 template | 0 blockers, 0 warnings, 1 suggestion fixed (constants moved up) | 19 files, 108 passed |
| T006 | Workflow layout with the five workflow placeholders, each in its section; no catalog step id as fixed text | 0 blockers, 2 warnings fixed (negative cases added), 0 suggestions fixed; 1 deferred (placeholder list repeated) | 20 files, 114 passed |
| T007 | Command layouts for define-feature, refine, plan, commit, release | 0 blockers, 2 warnings fixed (exactly-one-layout check; tautological assertion removed), 1 suggestion fixed (release default case) | 21 files, 117 passed |
| T008 | Agent layouts for implement, code-review, verify (frontmatter name, description, tools) | 0 blockers, 1 warning fixed (amendment wording), 2 suggestions fixed | 21 files, 120 passed |
| T009 | Script layouts for unit-tests and e2e-tests (sections only, no commands) | 0 blockers, 2 warnings fixed (e2e exit and no-suite wording), 1 suggestion fixed (Checks names items) | 21 files, 123 passed |
| T010 | Rule layouts general, qa and code; `{{codeRules}}` and `{{testRules}}` each once in code.md | 0 blockers, 1 warning fixed (code-sample check widened), 0 suggestions | 22 files, 126 passed |
| T011 | `planGeneration`: layout, block description and rule tags per output file, in file-list order | 0 blockers, 2 warnings fixed (blank description falls back to summary; error-path test), 1 suggestion fixed (fixture rationale) | 23 files, 132 passed |
| T012 | Tests for input refusals and selection (AC-018, AC-019, AC-020); no source change | 0 blockers, 3 warnings fixed (required-step refusal, positive controls, exact problems), 2 suggestions fixed; 1 deferred (duplicate AC-016 test) | 23 files, 136 passed |
| T013 | `checkReply`: unsafe paths, missing and extra files in one pass, leftover markers, unknown reply types never throw | 0 blockers, 1 warning fixed (public surface narrowed), 2 suggestions fixed | 24 files, 147 passed |
| T014 | `checkReply` part 2: required `##` headings for Markdown entries; SDDBuilder path findings; findings sorted by path then message | 0 blockers, 3 warnings fixed (heading substring, `###`, layout trim tests), 1 suggestion fixed (Finding.path doc). AC-026 expected order updated to the sorted order | 24 files, 152 passed |
| T015 | Template scans: no scripts or shebangs, banned words, placeholders in the README table, workflow layout uses only workflow placeholders | 0 blockers, 6 warnings fixed (marker, BOM, case, README coverage, dead import), 4 suggestions fixed | 25 files, 162 passed |
| T016 | README layout table: every source exists; skill row exempt (no catalog skill step) by decision; parser reads only the Claude Code table | 0 blockers, 3 warnings fixed (per-step check, strict parser, table scope), 4 suggestions fixed | 26 files, 174 passed |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `.claude/agents/review.md`, `.claude/agents/implement.md`, `CLAUDE.md` name `.claude/rules/typescript.md` (T002 review): project files, not catalog data. Left for a repository-wide rename decision.
- `spec/documents/building-blocks.md` and three mockups under `design/mockups/` show `typescript.md` as an example tag (T002 review): documentation and mockups, outside the task.
- `packages/core/tsconfig.json` (T001 review): `include` covers only `src`, so the test files are not type-checked by `npm run typecheck`. The type-level parts of `packages/core/test/model.test.ts` are therefore not enforced by tsc. The runtime assertions still fail if the field is removed. Deferred: changing the tsconfig affects the whole workspace and is outside T001.
- `.claude/agents/review.md:35`, `.claude/agents/implement.md:32`, `CLAUDE.md:58` (T002 review): still name `.claude/rules/typescript.md` as the rule file for the agents. Project files, not catalog data; the task forbids changing them. Deferred: align them with the rule file layout in a later task.
- `spec/documents/building-blocks.md:48`, `design/mockups/01-builder.svg:135`, `design/mockups/04-custom-block.svg:68`, `design/mockups/05-generate.svg:45` (T002 review): show `typescript.md` as an example tag. Documentation and mockups, not catalog data; not changed in this task. Deferred: update in T017 (documents) or with the mockups.
- `spec/documents/building-blocks.md:46,97`, `design/mockups/05-generate.svg:47` (T003 review): show `task-check.sh` as an example script or as generated output. The base no longer generates it (the script step writes `scripts/unit-tests.sh`). Documentation and mockups, outside the code change. Deferred: update in T017 (documents) or with the mockups.
- `packages/core/test/templates-workflow.test.ts` `WORKFLOW_PLACEHOLDERS` (T006 review): repeats the five workflow placeholders from `templates/README.md` instead of parsing that file. The list matches the README today. Deferred: reading it from the README would tie the test to a Markdown table format; revisit if the placeholder list changes.
- `packages/core/test/plan.test.ts` "F-03 AC-016 refuses an invalid configuration with the same error as generate" (T012 review): duplicates the AC-019 test now in the file, outside the T012 change. Left in place; remove when the T011 tests are next touched.

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
