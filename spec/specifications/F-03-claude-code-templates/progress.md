# Progress — Claude Code templates (F-03)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-11 | Stories approved by the user; 29 criteria, all `[auto]`. |
| Plan     | ✅ Complete | 2026-11-11 | Approved by the user before any code is written. Approved as written, including T001. |
| Build    | ✅ Complete | 2026-11-12 | 17 of 17 tasks committed |
| Verify   | ✅ Complete | 2026-11-12 | 29 of 29 criteria covered by named passing tests; no device criteria |

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
| T017 | Docs: generation input and reply check in architecture §3; block description field in building-blocks | 0 blockers, 3 warnings fixed (retry wording, SDDBuilder words, LLM at generation), 3 suggestions fixed. The CLAUDE.md warning was stale: line 31 already allows `/generate` (commit 8257be9) | 26 files, 174 passed |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `.claude/agents/review.md`, `.claude/agents/implement.md`, `CLAUDE.md` name `.claude/rules/typescript.md` (T002 review): project files, not catalog data. Left for a repository-wide rename decision.
- `spec/documents/building-blocks.md` and three mockups under `design/mockups/` show `typescript.md` as an example tag (T002 review): documentation and mockups, outside the task.
- `spec/documents/building-blocks.md:46,97` (T017 review, carried from T003): `task-check.sh` appears as an example script in the block table and the example Implement workflow. These are illustrations of user-designed blocks, not a claim about generated output (the "Generated as" column is correct), so T017 left them. Deferred: revisit with the mockups.
- `CLAUDE.md` (T017 review, WARNING, unresolved): "The LLM is called only from `apps/api`, only in `/analyze`, never in generation." conflicts with `spec/documents/architecture.md` §6 decision 7 (recorded and confirmed 2026-11-11: the LLM writes the final framework at `/generate`) and with §2 and §3 step 5. T017 documents the architecture decision and did not change `CLAUDE.md`. Deferred: the owner must decide which statement is current and update `CLAUDE.md` or the decision.
- `packages/core/tsconfig.json` (T001 review): `include` covers only `src`, so the test files are not type-checked by `npm run typecheck`. The type-level parts of `packages/core/test/model.test.ts` are therefore not enforced by tsc. The runtime assertions still fail if the field is removed. Deferred: changing the tsconfig affects the whole workspace and is outside T001.
- `.claude/agents/review.md:35`, `.claude/agents/implement.md:32`, `CLAUDE.md:58` (T002 review): still name `.claude/rules/typescript.md` as the rule file for the agents. Project files, not catalog data; the task forbids changing them. Deferred: align them with the rule file layout in a later task.
- `spec/documents/building-blocks.md:48`, `design/mockups/01-builder.svg:135`, `design/mockups/04-custom-block.svg:68`, `design/mockups/05-generate.svg:45` (T002 review): show `typescript.md` as an example tag. Documentation and mockups, not catalog data; not changed in this task. Deferred: update in T017 (documents) or with the mockups.
- `spec/documents/building-blocks.md:46,97`, `design/mockups/05-generate.svg:47` (T003 review): show `task-check.sh` as an example script or as generated output. The base no longer generates it (the script step writes `scripts/unit-tests.sh`). Documentation and mockups, outside the code change. Deferred: update in T017 (documents) or with the mockups.
- `packages/core/test/templates-workflow.test.ts` `WORKFLOW_PLACEHOLDERS` (T006 review): repeats the five workflow placeholders from `templates/README.md` instead of parsing that file. The list matches the README today. Deferred: reading it from the README would tie the test to a Markdown table format; revisit if the placeholder list changes.
- `packages/core/test/plan.test.ts` "F-03 AC-016 refuses an invalid configuration with the same error as generate" (T012 review): duplicates the AC-019 test now in the file, outside the T012 change. Left in place; remove when the T011 tests are next touched.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

Verify run: `scripts/task-check.sh` passed (typecheck clean; 26 files, 174 tests passed, 0 failed, 0 skipped). Every criterion is `[auto]`, so there is no manual checklist. Test names are prefixed `F-03 AC-###` in `packages/core/test/`.

| Criterion | Covering tests (file: test name) | Result |
| --------- | -------------------------------- | ------ |
| AC-001 | templates-base: "F-03 AC-001 the base CLAUDE.md and process.md layouts exist and are non-empty Markdown"; "F-03 AC-001 the spec-template layouts exist and are non-empty Markdown" | Pass |
| AC-002 | templates-base: "F-03 AC-002 the base CLAUDE.md has Overview, Layout, Working rules, Commands and agents, Rules, in that order" | Pass |
| AC-003 | templates-base: "F-03 AC-003 the process.md layout has a Process diagram section that holds the diagram placeholder" | Pass |
| AC-004 | templates-base: "F-03 AC-004 each spec-template layout is byte-identical to the F-00 template" | Pass |
| AC-005 | templates-workflow: "F-03 AC-005 the workflow layout has the sections Purpose, Steps, Rules and Scope" | Pass |
| AC-006 | templates-workflow: "F-03 AC-006 the workflow layout uses only the five workflow placeholders" (+ 3 negative/section tests); templates-scan: "F-03 AC-006 the workflow layout uses only the workflow placeholders of templates/README.md" | Pass |
| AC-007 | templates-workflow: "F-03 AC-007 the workflow layout names no catalog step id as fixed text" (+ negative test) | Pass |
| AC-008 | templates-steps: "F-03 AC-008 every command step in the catalog has a command layout", "F-03 AC-008 agent steps have an agent layout", "F-03 AC-008 script steps have a script layout"; step-files: "F-03 AC-008 a script step is rendered from its script.md layout to scripts/<id>.sh" | Pass |
| AC-009 | templates-steps: "F-03 AC-009 command layouts have the sections Purpose, Inputs, Outputs, Rules and Checks in order", "F-03 AC-009 agent layouts have the sections ...", "F-03 AC-009 script layouts have the sections ...", "F-03 AC-009 the Checks section of a script layout names what the script verifies and contains no command" | Pass |
| AC-010 | templates-steps: "F-03 AC-010 command layouts have a frontmatter description", "F-03 AC-010 agent layouts have frontmatter name, description and tools" | Pass |
| AC-011 | templates-scan: "F-03 AC-011 no file under templates/ is a script: ..." (+ 2 negative/scan tests); generate: "F-03 AC-011 the base files include no script, so scripts/task-check.sh is never read from a template" | Pass |
| AC-012 | templates-scan: "F-03 AC-012 no file under templates/ contains a banned word (whole word, case-sensitive)" (+ 2 scan tests) | Pass |
| AC-013 | templates-rules: "F-03 AC-013 the rule layouts exist with their sections" | Pass |
| AC-014 | templates-rules: "F-03 AC-014 code.md holds the codeRules and testRules placeholders, each once", "F-03 AC-014 no rule layout contains a code sample ..." | Pass |
| AC-015 | catalog: "F-03 AC-015 Implement and Code review carry code.md, and no catalog step carries typescript.md" | Pass |
| AC-016 | plan: "F-03 AC-016 one entry per output file, in the file-list order, with path, layout, description and ruleTags" (+ 4 description and workflow-description tests) | Pass |
| AC-017 | plan: "F-03 AC-017 the same config gives the same plan (generate it twice and compare)" | Pass |
| AC-018 | plan: "F-03 AC-018 a disabled step has no entry, and a required step always has one"; "F-03 AC-018 a required step cannot be disabled, so the planner never omits it" | Pass |
| AC-019 | plan: "F-03 AC-019 an invalid configuration throws InvalidConfigError naming the problem, and returns no plan" | Pass |
| AC-020 | plan: "F-03 AC-020 an enabled step with no layout in the templates fails with an error that names the step id" | Pass |
| AC-021 | reply-check: "F-03 AC-021 returns no findings for a reply with exactly the planned files and no marker" | Pass |
| AC-022 | reply-check: "F-03 AC-022 reports a missing planned file and an extra reply file in one pass" | Pass |
| AC-023 | reply-check: "F-03 AC-023 names the file and the leftover marker when a placeholder remains"; "F-03 AC-023 names the file for a leftover step marker and a closing brace marker" | Pass |
| AC-024 | reply-check: "F-03 AC-024 a Markdown file missing a required layout heading is a finding naming the heading"; "F-03 AC-024 only ## headings are required ..."; "F-03 AC-024 a shell output is not checked for headings" | Pass |
| AC-025 | reply-check: "F-03 AC-025 a reply that mentions an SDDBuilder path is a finding" | Pass |
| AC-026 | reply-check: "F-03 AC-026 reports each unsafe path and ignores that file"; "F-03 AC-026 does not report an ignored unsafe file as missing or extra" | Pass |
| AC-027 | reply-check: "F-03 AC-027 returns findings for an empty reply without throwing" and 4 more non-throwing negative tests (object, array, null, non-string value) | Pass |
| AC-028 | reply-check: "F-03 AC-028 findings are sorted by path then message, and the same reply gives the same findings" | Pass |
| AC-029 | templates-readme: "F-03 AC-029 every source in the Claude Code layout table exists under templates/, or is a scripts/ output from a script.md layout" (+ 11 table-parser and row tests) | Pass |

**Gaps:** none. All 29 criteria have at least one passing covering test.

**Manual checklist:** none. All criteria are `[auto]`, so `checklist.md` was not written.

**Scope (features.md F-03):** covered by AC-001 to AC-029 (base layouts, workflow command, step layouts by kind, rule layouts, generation input, reply check, README). Note: the feature text lists "skills", but the catalog has no skill step, so no `skill.md` layout exists; the README skill row is exempt by design (T016, stories design decisions).

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
