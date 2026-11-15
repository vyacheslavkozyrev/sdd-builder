# Progress — Generator core: pipeline, agents and rules to file tree (F-02)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-14 | Stories approved by the user: 7 stories, 34 criteria, all `[auto]` |
| UX       | ➖ Not needed | 2026-11-14 | No user interface: the feature is in `source/packages/core` only, and every criterion is `[auto]` on pure functions |
| Plan     | ✅ Complete | 2026-11-14 | Approved by the user |
| Build    | ✅ Complete | 2026-11-14 | 17 of 17 tasks committed (T014 added by verify) (T002 split into T002a and T002b; T004 split into T004a, T004b1 and T004b2) |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None.

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Rules in the model: `ProjectConfig.rules`, parsed with the id rule; default pipeline gets `rules: []` | 0 blockers, 0 warnings, 1 suggestion fixed | 1532 passed |
| T002a | Refusal collector and the Start and End checks; `generate` exported from the pipeline module | 0 blockers, 1 warning and 2 suggestions fixed | 825 passed |
| T002b | Connection and Condition wiring; disabled items and flows skipped; combined sort. Committed at 516 changed lines, over the 400-line guard, by the user's explicit decision | 0 blockers, 0 warnings, 1 suggestion fixed | 846 passed |
| T003 | Reachability from Start; back-route, disabled-route and End-terminal rules. Committed at 458 changed lines, over the 400-line guard, by the user's explicit decision | 0 blockers, 1 warning fixed | 872 passed |
| T004a | Agent `description`: required in the model, parser and `default.json`; refused when missing or blank in enabled flows | 0 blockers, 1 warning and 1 suggestion fixed | 887 passed |
| T004b1 | Names, ids and check rules; disabled blocks and flows not checked for ids and names (AC-014). Committed at 514 changed lines, over the 400-line guard, by the user's explicit decision | 1 blocker, 1 warning and 1 suggestion fixed | 927 passed (staged state) |
| T004b2 | Required blocks in enabled flows, the pipeline's Start and End, and the five gates; fixtures and one approved expectation updated | 0 blockers, 1 warning and 1 suggestion fixed | 936 passed |
| T005 | Selection and order of enabled flows and blocks; disabled items produce nothing; gates and Start and End selected | 0 blockers, 1 warning and 1 suggestion fixed | 948 passed |
| T006 | Template renderer: values, `{{#enabled:<id>}}` sections, errors naming the file and the placeholder. Committed at 440 changed lines, over the 400-line guard, by the user's explicit decision | 0 blockers, 3 warnings and 1 suggestion fixed | 978 passed |
| T007 | Base files: `CLAUDE.md`, `process.md` (text list, no Mermaid) and the spec template, sorted; `ListableTemplateSource`. The two template blockers are deferred to F-03 by the user's decision | 2 blockers deferred to F-03 (user decision), 1 suggestion fixed | 988 passed |
| T008 | Flow command files: one per enabled child flow, numbered steps in order; no disabled block or flow named | 1 blocker fixed (a Connection named a disabled block), 0 warnings | 1003 passed |
| T009 | Pipeline command (arguments, flows and gates in order, back-route rules with limit or "no limit set", decider or threshold) | 0 blockers, 1 warning and 3 suggestions fixed | 1026 passed |
| T010 | Agent files (name path, description as stub) and rule files (title and text) from the config; file-safe names and ids checked | 0 blockers, 1 warning and 1 suggestion fixed | 1041 passed |
| T011 | Sorted, deterministic file list in code-unit order (user's decision); `generate` wires all parts; duplicate paths refused; earlier assertions now check acceptance through a helper | 0 blockers; 1 open sort decision (resolved: code-unit); fixes applied in two rounds | 1054 passed |
| T014 | Test labels for verify: AC-031 determinism and AC-030 duplicate-path tests relabelled; the two-Start cases moved to AC-002. Labels only, no expected value changed | 0 blockers (label review), 1 formatting fix | 1059 passed |
| T013 | Templates README for the pipeline model: placeholders, section rules, files written by the generator; the shipped-template gap stated and deferred to F-03 | 0 blockers, 3 warnings and 3 suggestions fixed | 1059 passed |
| T012 | Purity scan renamed to AC-033 and tightened (side-effect imports, `require`, `window`); fake-source run for generate (AC-034) | 0 blockers, 2 warnings and 1 suggestion fixed, 1 suggestion deferred | 1059 passed |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 `source/packages/core/src/pipeline/parse.ts:116` duplicate rule id names only the second path, not the first. Kept: the block, flow and argument duplicate checks use the same convention (`parse-structure.ts`, `parse-scope.ts`), and the plan scopes rule uniqueness to rules only. Revisit if AC-008 is read as requiring every clashing path for rules too.
- T004b1 `source/packages/core/src/pipeline/generate/refusals-names.ts` `CHECK_TYPES` repeats the `CheckType` union of `model.ts` as a runtime list. Kept: `model.ts` holds types only, and a shared constant would have to move there. Revisit when a second consumer needs the list.
- T004b1 `source/packages/core/src/pipeline/ids.ts` `ID_PATTERN` has no length cap, so a very long block or agent id gives a very long file name. Kept: outside the T004b1 change, and the stories set no limit. Ask the user whether a cap belongs in the id rule.
- T003 `source/packages/core/src/pipeline/generate/refusals-routes.ts` a stop route reaches every live End of its list, including a `done` End. Kept: only reachability is marked, so the only effect is that a `done` End is not reported as unreachable when a stop exists; the stories do not say which outcome a stop must end with.
- T004b2 `source/packages/core/src/pipeline/generate/refusals-names.ts` the import of `defaultProjectConfig` makes the required gate list follow `default.json` at load time. Kept: the gates of the default pipeline are the data that defines them (architecture.md decision 8), and the list is not a second copy to keep in step.
- T003 `spec/specifications/F-02-generator-core/plan.md` (T003 line) names only `pipeline-generate-refusals-routes.test.ts`; the reachability tests are in `pipeline-generate-refusals-reach.test.ts`, with shared builders in `pipeline-routes-fixtures.ts`. Kept: a plan-text fix, left to the plan owner so the plan is not edited inside a build task.
- T007 BLOCKER (unresolved) `source/templates/base/CLAUDE.md` holds `{{modules}}`, `{{codeRules}}` and `{{testRules}}`, which the pipeline `ProjectConfig` does not carry (it has `rules`), so `renderBaseFiles` fails on the shipped template (confirmed by a probe, since removed). Not applied: it needs a decision (map `rules` to the codeRules/testRules lists and drop modules, or change the layout, which the F-03 tests lock). Ask the user.
- T007 BLOCKER (unresolved) `source/templates/base/process.md` holds `{{process.diagram}}`, which no value fills before F-18 (`templates/README.md`: "not rendered before F-18"), so `renderBaseFiles` fails on the shipped template. Not applied: filling it with the text list satisfies AC-022 but contradicts the README's Mermaid definition of that slot. Ask the user which fill to use. Any key for it must be built from `${PROCESS_NAME}.diagram`, because the F-01 purity scan forbids the literal `process.` in `src/pipeline`.
- T007 plan note: the file list omits `source/packages/core/src/template-source.ts`. The change is additive (`ListableTemplateSource`, used to list the spec template folder, AC-018) and widens no consumer's type. Amend the T007 line of plan.md to include it.
- T014 `source/packages/core/test/pipeline-generate-refusals-shape.test.ts` (the empty-child-flow test) is labelled AC-001 but its missing-End expectation belongs to AC-002. Kept: outside the T014 rows; relabel when the flat-model labels are cleaned up.
- T008 `source/packages/core/src/pipeline/generate/refusals-shape.ts` `connectionProblems` takes the flow's own ids, disabled blocks included, so an enabled Connection may join a disabled block without a refusal. The T008 step no longer names that block (AC-026 holds for the output), but whether such a config must be refused is a spec decision outside T008. Ask the user.
- T009 `source/packages/core/src/pipeline/generate/pipeline-command.ts` `ruleLines` names a back route's target without checking it is enabled. Kept: `generate` refuses an enabled back route into a disabled block first (`refusals-routes.ts`), so the rule never names a disabled item on the generate path; a direct call with such a config is outside the contract.
- T010 `source/packages/core/src/pipeline/generate/refusals-names.ts` `generate` has no rule-id check, so a code-built config with a rule id outside the id rule reaches `renderAgentAndRuleFiles`, which now throws a plain Error (`agent-rule-files.ts` guard). JSON input is refused earlier by `parse.ts` (rule ids follow the id rule). Kept: outside T010. Fix in the refusal task (or T011) by adding rule ids to `nameProblems`, so the user gets an `InvalidConfigError` path.
- T008 `source/packages/core/src/pipeline/generate/refusals-names.ts` `agentNameEntries` checks the file-safety of disabled agents too, against the AC-014 comment that says disabled blocks are not checked. Over-strict, not a safety hole. Outside T008; fix in the refusal task that owns it.
- T011 WARNING (resolved) `source/packages/core/src/pipeline/generate/generate.ts` `sortedFileList` orders files with `comparePaths` (digit runs compare by value, so `step2.md` < `step10.md` and `a2.md` < `a.md`). Neither `stories.md` (AC-030) nor `plan.md` (T011) names an order, the package's existing file sort `finishFileList` (`file-list.ts`) is plain code-unit, and the T011 test `pipeline-generate-file-list.test.ts` asserts `[...paths].sort()` (code-unit) for the generated list. Resolved: code-unit order chosen by the user. `sortedFileList` now uses `compareText`; `comparePaths` stays for the problem lists (AC-012).
- T011 suggestion `source/packages/core/src/pipeline/generate/generate.ts` `sortedFileList` repeats the duplicate check of `finishFileList` (`file-list.ts`) and throws `GenerationError` where `finishFileList` throws `InvalidConfigError`. Kept: `finishFileList` also normalizes content, which is AC-033 behaviour outside T011. Revisit when the file-list paths are unified.
- T012 suggestion `source/packages/core/test/pipeline-generate-pure.test.ts` the AC-034 test is named "without network or file access" but asserts only the fetch stub; no runtime file access is caught. Kept: `generate` imports no fs module (the AC-033 scan proves it statically), and the core never reaches the file system, so a runtime fs guard would be vacuous.

---

## Test Results

Run on 2026-11-14 at `main`, clean tree: `source/scripts/task-check.sh` passed (typecheck, then 62 files and 1059 tests, all passing).

Criteria matrix (only passing tests whose names carry the criterion id; counts are tests per file):

| Criterion | Covering passing tests | Status |
| --- | --- | --- |
| AC-001 | pipeline-generate-refusals-shape (7) | covered |
| AC-002 | pipeline-generate-refusals-shape (5) | covered; its two-Start cases are labelled AC-001 |
| AC-003 | pipeline-generate-refusals-wiring (8) | covered |
| AC-004 | pipeline-generate-refusals-wiring (5) | covered |
| AC-005 | pipeline-generate-refusals-reach (10) | covered |
| AC-006 | pipeline-generate-refusals-routes (10) | covered |
| AC-007 | pipeline-generate-refusals-routes (3) | covered |
| AC-008 | pipeline-generate-refusals-names (14), pipeline-rules (9) | covered |
| AC-009 | pipeline-generate-refusals-names (4) | covered |
| AC-010 | pipeline-generate-refusals-names (9) | covered |
| AC-011 | pipeline-generate-refusals-names (15) | covered |
| AC-012 | pipeline-generate-refusals-shape (4), pipeline-generate-refusals-wiring-skip (2) | covered |
| AC-013 | pipeline-generate-refusals-names (2) | covered |
| AC-014 | pipeline-generate-refusals-names (6), pipeline-generate-refusals-routes (3), pipeline-generate-refusals-wiring-skip (6) | covered |
| AC-015 | pipeline-generate-select (12) | covered |
| AC-016 | pipeline-generate-select (12) | covered |
| AC-017 | pipeline-generate-select (12) | covered |
| AC-018 | pipeline-generate-base (5) | covered |
| AC-019 | pipeline-generate-render (17) | covered |
| AC-020 | pipeline-generate-render (23) | covered |
| AC-021 | pipeline-generate-base (2), pipeline-generate-render (3) | covered |
| AC-022 | pipeline-generate-base (3) | covered |
| AC-023 | pipeline-generate-flow-commands (11) | covered |
| AC-024 | pipeline-generate-pipeline-command (11) | covered |
| AC-025 | pipeline-generate-pipeline-command (12) | covered |
| AC-026 | pipeline-generate-flow-commands (4) | covered |
| AC-027 | pipeline-generate-agent-rule-files (9) | covered |
| AC-028 | pipeline-generate-agent-rule-files (8), pipeline-rules (16) | covered |
| AC-029 | pipeline-agent-description (15) | covered |
| AC-030 | pipeline-generate-file-list (5) | covered for the sort; the duplicate-path clause is labelled AC-031 |
| AC-031 | none named for it: the two-run determinism tests are labelled AC-032 and AC-034; the AC-031 labels sit on the duplicate-path tests | GAP (label) |
| AC-032 | pipeline-generate-file-list (4: no ISO timestamp, no random value or clock) | covered |
| AC-033 | purity (2) | covered |
| AC-034 | pipeline-generate-pure (5) | covered |

**Gaps:** AC-031 (determinism of generating twice) has no test named for it. The proof exists in `pipeline-generate-file-list.test.ts` under the AC-032 label and in `pipeline-generate-pure.test.ts` under AC-034. The AC-031 label sits on the duplicate-path tests, which prove the AC-030 clause. Fix: relabel these tests; no test was added or changed in this run.

**Stale labels:** test files written for the superseded F-02 spec (the workflow and step model, decision 19 flat generator) still carry `F-02 AC-0xx` labels whose text is not the current criterion. These do not count as coverage: `validate-ids`, `validate-map`, `validate-routes`, `validate-policy`, `catalog`, `errors`, `generate`, `select`, `rules-text`, `step-files`, `file-list`, `workflow-command`, `conditionals`, `placeholders`, `mermaid`. Mermaid is F-18 scope. The labels should be renamed or the files retired when F-07 removes the flat generator.

**Totals:** 34 of 34 criteria have a passing test that carries the id and proves its text, except AC-031 (gap). No test names a criterion outside AC-001 to AC-034.

**Manual checklist:** none. All 34 criteria are `[auto]`, so no `checklist.md` is needed.

---

## Amendments

### Amendment — 2026-11-14
**Changed**: `plan.md`: T002 split into T002a (collector, Start and End checks, export) and T002b (Connection and Condition wiring, disabled-item skipping). The staged T002 change of 447 lines is not committed; its files are reshaped by T002a and T002b.
**Reason**: the review of T002 hit the 400-line size guard: 447 changed lines, the test file alone 310 lines. The user approved the split.
**Impact**: T002a and T002b are implemented, reviewed, tested and committed in turn. The Start and End checks count Start and End blocks whether or not they are enabled, because AC-017 always selects them in an enabled flow; AC-014 covers the content of disabled blocks, not these blocks.

### Amendment — 2026-11-14 (second)
**Changed**: `plan.md`, T004: the Agent block gets a required `description` (model, parser, `default.json`), with the refusal of a missing or blank one. The file list is extended to match.
**Reason**: AC-029 and the stub text of AC-027 assume an Agent description, but the pipeline model had no such field and the parser refuses unknown keys. The user chose to add it to T004 rather than split.
**Impact**: T004 changes the model and the default pipeline data as well as the refusal. Each Agent block of `default.json` needs its description text (building-blocks.md §4).

### Amendment — 2026-11-14 (third)
**Changed**: `plan.md`, T004 split into T004a (the Agent description: model, parser, `default.json`, and the refusal of a missing one, AC-029) and T004b (names, required blocks, check rules, advice; AC-008, AC-009, AC-010, AC-011, AC-013).
**Reason**: the required-block rule (AC-010) makes earlier minimal fixtures refuse. The user chose to update those fixtures rather than narrow or move the rule. Together with the description change, that is more than the 400-line guard allows in one commit.
**Impact**: T004a runs before T004b. T004b updates the minimal fixtures of T002a, T002b and T003 to include the default pipeline's required blocks; their assertions stay as they are. The required-block check applies inside enabled flows only; the pipeline's own Start and End and the gates are always required.

### Amendment — 2026-11-14 (fifth)
**Changed**: `plan.md`, T007 file list: adds `source/packages/core/src/template-source.ts` (additive `ListableTemplateSource`, which lists the spec template folder; `TemplateSource` is unchanged). The user chose to defer the two template blockers (`{{modules}}`, `{{codeRules}}`, `{{testRules}}` in `CLAUDE.md`; `{{process.diagram}}` in `process.md`) to F-03.
**Reason**: the spec template files must be listed from the source (AC-018), and the shipped base templates cannot render from the pipeline config until F-03 rewrites them.
**Impact**: F-03 must rewrite `source/templates/base/CLAUDE.md` (rules replace the code and test rule placeholders, modules are dropped) and `source/templates/base/process.md` (a list placeholder, not the Mermaid diagram). F-02 stays a pure engine tested on fixtures; `renderBaseFiles` fails on the shipped templates until F-03 lands.

### Amendment — 2026-11-14 (fourth)
**Changed**: `plan.md`, T004b split into T004b1 (names, ids, check rules; AC-008, AC-009, AC-011, AC-013) and T004b2 (required blocks and the fixture updates; AC-010). T004b2 also changes one expected value of the T003 test "refuses a flow that follows a gate that stops": the five required gates after the unreachable flow b are also reported as unreachable. The user approved this change.
**Reason**: the T004b change is about 720 changed lines, over the 400-line guard, and it changes an earlier assertion.
**Impact**: T004b1 runs first and is committed on its own. T004b2 follows, with the fixture updates and the expected change. The T004b agent's fixture decisions stand: a disabled Start or End counts as present when no enabled one of its kind exists, and the AC-002 fixture gains an enabled End beside the disabled one (expected value unchanged).

### Amendment — 2026-11-14 (sixth)
**Changed**: `plan.md`, a new task T014 at the end of the task list: test labels for verify. The determinism test of the file list carries F-02 AC-031; the duplicate-path tests keep F-02 AC-030; the two-Start cases of `pipeline-generate-refusals-shape.test.ts` carry F-02 AC-002.
**Reason**: verify found no test labelled F-02 AC-031 (generating twice gives the same paths, order and content). The other two labels are wrong. No behaviour changes.
**Impact**: T014 is built, reviewed, tested and committed, then verify runs again. Stale labels from the superseded flat-model tests (for example in `validate-*`, `catalog`, `generate`, `select`, `mermaid`) still carry F-02 AC-0xx labels that mean something else. They are not counted as coverage; they are renamed or removed when F-07 removes the flat generator, and this is recorded as a finding for the user.
