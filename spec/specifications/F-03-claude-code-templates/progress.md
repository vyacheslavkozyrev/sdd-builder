# Progress — Claude Code templates (F-03)

**Feature status: ✅ Complete (2026-11-14).** 8 stories, 31 criteria, all `[auto]` (AC-029 to AC-031 added by the 2026-11-14 amendment; US-008).

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-14 | Stories approved by the user: 7 stories, 28 criteria, all `[auto]`; amended to 8 stories and 31 criteria on 2026-11-14 (US-008) |
| UX       | ➖ Not needed | 2026-11-14 | No user interface: the feature is templates and pure functions in `source/packages/core`; every criterion is `[auto]` |
| Plan     | ✅ Complete | 2026-11-14 | Approved by the user: 13 tasks (plan.md) |
| Build    | ✅ Complete | 2026-11-14 | 16 of 16 tasks committed (plan amended: T006a, T006b and T006c added) |
| Verify   | ✅ Complete | 2026-11-14 | 31 of 31 criteria covered by passing tests; no `[device]` criteria, so no manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None.

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Correct the F-03 line in `features.md`: Mermaid to F-18, rules per entry (decision 20) | 0 blockers, 0 warnings, 0 suggestions | 1059 passed (62 files) |
| T002 | Base layouts as sections; flat base kept as a legacy copy (amendment, option A); pipeline base-file values; rule titles on one line. Committed at 469 changed lines, over the 400-line guard, by the user's explicit decision | 1 blocker (stray `</content>` lines removed), 1 warning (rule title line break) fixed | 1068 passed (63 files) |
| T003 | Command layouts (`claude-code/command.md`, `pipeline-command.md`) and list builders in `command-layouts.ts`; `describeStep` and `argumentLines` exported, per-block switch extracted with unchanged behaviour | 0 blockers, 2 warnings (layout wording, connection-end test) and 1 suggestion fixed; 1 suggestion deferred | 1085 passed (64 files) |
| T004 | Agent layout (`claude-code/agent.md`, headings Purpose, Inputs, Outputs, Rules, Checks) and rule layout (`claude-code/rule.md`); README placeholder rows; `ruleTags` contract says `none` when empty | 0 blockers, 2 warnings (weak heading-reader test renamed and given a `###` case; empty tags contract) fixed; 1 suggestion deferred (`REPO_ROOT` name) | 1094 passed (65 files) |
| T005 | `planGeneration` for base, pipeline and flow command entries (`pipeline/plan.ts`), exported from the pipeline module only; agent and rule entries left to T006 | 0 blockers, 3 warnings (weak tests: module list, flow and gate order, gate between flows) fixed; 1 deferred (plan-level throw test, moved to T007) | 1108 passed (66 files) |
| T006a | Rule-set tags in the model: optional `ruleTags` on Agent blocks and flows, parsed as non-empty strings (default `[]`); unknown tags refused in `generate` at their paths (decision 21) | 0 blockers, 0 warnings, 3 suggestions fixed | 1135 passed (67 files) |
| T006 | `planGeneration` for agent and rule entries: agents carry the block's description and tags; rules carry title and text; the AC-011 test now compares the full file list | 0 blockers, 0 warnings, 4 suggestions fixed | 1150 passed (68 files) |
| T006c | Required flow `description` in the model and parser (blank refused at the parser, as for Agents; enabled blank also refused in generate); six flow descriptions in `default.json`, texts as approved by the user on 2026-11-14 | 0 blockers, 1 warning (blank parser check) fixed | 1166 passed (69 files) |
| T006b | Flow command entries carry the flow's description and rule-set tags; the command layout gains a description line and a rule-set tags line (US-008) | 1 blocker (no tags line in the command layout), 3 warnings (README row, layout placeholder test, tags shown test) fixed | 1179 passed (70 files) |
| T007 | `planGeneration` error paths: refusal first (InvalidConfigError, every problem); one preflight naming every missing layout, base files included (AC-014 gap closed); unfilled placeholder throws with file and placeholder named. Refusal extracted to `refuseInvalidConfig` (generate unchanged) | 1 warning (AC-014 base-template gap; fixed by the user's choice), 1 warning (tests that could not fail) fixed; 1 suggestion deferred (double refusal pass) | 1196 passed (71 files) |
| T008 | `checkReply` for presence, paths and markers (`pipeline/reply-check.ts`), exported from the pipeline module only; typed `unknown`, a non-object reply gives a finding | 0 blockers, 0 warnings, 2 suggestions (test titles and an AC-018 input) fixed | 1228 passed (72 files) |
| T009 | `checkReply` for required `##` headings (from each planned layout) and references to SDDBuilder or its own paths. The API still uses the flat `checkReply` from the package root, so this does not change `/generate` | 0 blockers, 0 warnings, 0 suggestions (round 1 only) | 1259 passed (73 files) |
| T010 | `checkReply` for malformed replies (non-object, non-string values: a finding, no throw) and findings sorted by path then message, deterministic; three T009 expectations reordered to sorted order | 0 blockers, 0 warnings, 5 suggestions fixed (test titles, comments); 1 suggestion deferred (long comment lines) | 1285 passed (74 files) |
| T011 | Stack-neutral checks over `base/` and `claude-code/`: no shell fence, no stack tool name (AC-024); every placeholder listed in the README (AC-025). Test only, no layout changed | 0 blockers, 3 warnings (non-Markdown files skipped; README heading not guarded; tilde fences missed) fixed | 1307 passed (75 files) |
| T012 | Separation tests: pipeline imports no flat module and names no template folder; root exports are the flat functions; flat model and catalog still exported. Test only | 0 blockers, 2 warnings (scanner gaps: `../steps/` prefixes, `//` inside strings) and 1 suggestion (non-vacuity) fixed; 3 suggestions deferred | 1343 passed (76 files) |
| T013 | Templates README: Status, the pipeline layouts table, placeholder table checked against the layouts, Folders (flat layouts marked as remaining until F-07). Documentation only | 0 blockers, 3 warnings (placeholders in prose, inaccurate "section layouts", inaccurate build description) and 1 suggestion fixed; 1 deferred (test label `F-03 T016`) | 1343 passed (76 files) |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T004 `source/packages/core/test/layouts-agent-rule.test.ts` `REPO_ROOT`: the constant points at `source/`, not the repository root. The same name is used in `layouts-base.test.ts` and `templates-readme.test.ts`; renaming it is a cross-file change outside T004.
- T003 `source/packages/core/src/pipeline/generate/command-layouts.ts` `routeRuleList` and `pipeline-command.ts` `ruleLines`: the same back-route loop is written twice. Not merged in T003 because `pipeline-command.ts` is imported by `command-layouts.ts`, so sharing the loop needs a move into `rules-text.ts`; the wiring task (T005) decides whether `pipeline-command.ts` switches to the template path, and the merge follows that. T005 kept `pipeline-command.ts` on its own path (the plan reads the layout, not the generator's text), so this stays open.
- T005 `source/packages/core/test/pipeline-plan-commands.test.ts`: no plan-level test that an unfilled placeholder makes `planGeneration` throw. The throw comes from `renderTemplate` (covered by the renderer's own tests, F-02 AC-019); the error paths are T007's scope in plan.md, so the plan-level test goes there. Taken by T007 (`pipeline-plan-errors.test.ts`, F-03 AC-014).
- T006c `source/packages/core/test/pipeline-flow-description.test.ts` `APPROVED`: the approved flow texts could not be checked against a separate approved record (the T006c line of plan.md and the amendment do not list them); the list matches `source/templates/pipeline/default.json` only. Confirm the texts with the user at Verify.
- T007 `source/packages/core/src/pipeline/plan.ts` `planGeneration` (WARNING, open AC-014 wording gap for the Verify phase): AC-014 says a missing layout names every missing path together, but the base templates are rendered by `renderBaseFiles` (through `generate`) before the layout preflight runs. So a missing base template is reported first, alone, and a missing command, agent or rule layout in the same run is not named. Accepted for now by the caller: the order stays as it is (base first, then the preflight), and Verify decides whether AC-014 is reworded to cover base templates or the base check moves into the preflight.
  - **Resolved by T007:** the refusal check runs first, then one preflight lists the base templates and every command, agent and rule layout the plan needs, and names each missing one.
- T012 `source/packages/core/test/pipeline-separation.test.ts` `TEMPLATE_FOLDER` (SUGGESTION): a folder written as a bare segment (`join(dir, 'steps', id)`) or inside an interpolation (`` `${dir}/steps/` ``) is not caught by the text scan. No such literal exists in the pipeline folder today (grep checked: no `'steps'`, `'workflows'` or `'rules'` path segment; `'rules'` is only the config key in `parse.ts`). Flagging bare words would flag that key, so the scan stays on literals that name a path.
- T012 `source/packages/core/test/pipeline-separation.test.ts` AC-028 presence test (SUGGESTION): it only checks that the named API suite files exist. The criterion is proven by the task check running those suites unchanged; a stronger check would pin the suites' content, which the plan does not ask for.
- T012 `source/packages/core/test/pipeline-separation.test.ts` import scan (SUGGESTION): a pipeline module importing the root barrel (`../index.js`) would reach the flat modules without naming one of the four listed. None does today (grep checked). The criterion lists four modules; widening it is an amendment, not a review fix.
- T010 `source/packages/core/src/pipeline/reply-check.ts` lines 1-6 and 63-65, `source/packages/core/test/pipeline-reply-shape.test.ts` and `pipeline-reply-content.test.ts` titles (SUGGESTION): a few comment and test-title lines run 121 to 128 characters. Kept: no line-length rule exists, and the existing sources reach 127 characters (`plan.ts`).
- T013 `source/packages/core/test/templates-readme.test.ts` line 101, describe label `F-03 T016` (SUGGESTION): the label names a task number that is not in plan.md. The test already reads the Claude Code layout table and needs no assertion change; the label is left as it is because this task stages only the README, plan.md and progress.md.
- T007 `source/packages/core/src/pipeline/plan.ts` `planGeneration` (SUGGESTION): the refusal runs twice per plan, once in `planGeneration` (`refuseInvalidConfig`) and again inside `generate`. Kept: the refusal must run before the layout preflight, and `generate` stays unchanged (its behaviour and tests are fixed by the caller). The cost is one extra pass of cheap checks.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

**Verify run (2026-11-14, preconditions met: 16 of 16 tasks ticked, Current Task None, branch `main`, clean tree).**

Task check (`source/scripts/task-check.sh`): exit 0. Typecheck passed in `apps/api`, `apps/web` and `packages/core`. Tests: core 76 files and 1343 passed; api 14 files and 348 passed; web 21 files and 375 passed; total 2066 passed, 0 failed, 0 skipped.

Coverage: each criterion counted from passing test names (`F-03 AC-0xx` in the full test name, including `describe` labels). Test count is passing tests naming the criterion. Where a test names more than one criterion, it counts for each.

| Criterion | Tests | Files |
| --------- | ----: | ----- |
| AC-001 | 7 | core: layouts-base, templates-base |
| AC-002 | 9 | core: pipeline-generate-base, pipeline-plan-commands, templates-base |
| AC-003 | 4 | core: pipeline-plan-commands, templates-base |
| AC-004 | 4 | core: pipeline-plan-commands, templates-base |
| AC-005 | 11 | core: pipeline-command-layouts, templates-workflow |
| AC-006 | 14 | core: pipeline-command-layouts, templates-scan, templates-workflow |
| AC-007 | 4 | core: pipeline-plan-commands, templates-workflow |
| AC-008 | 10 | core: pipeline-plan-agents-rules, step-files, templates-steps |
| AC-009 | 12 | core: layouts-agent-rule, pipeline-plan-agents-rules, templates-steps |
| AC-010 | 7 | core: layouts-agent-rule, templates-steps |
| AC-011 | 6 | core: generate, pipeline-plan-commands, templates-scan |
| AC-012 | 8 | core: pipeline-plan-agents-rules, pipeline-plan-flow-tags, templates-scan |
| AC-013 | 4 | core: pipeline-plan-errors, templates-rules |
| AC-014 | 16 | core: pipeline-plan-errors, templates-rules |
| AC-015 | 3 | core: catalog, pipeline-plan-agents-rules |
| AC-016 | 13 | core: pipeline-reply-presence, plan |
| AC-017 | 9 | core: pipeline-reply-presence, plan |
| AC-018 | 9 | core: pipeline-reply-presence, plan |
| AC-019 | 10 | core: pipeline-reply-presence, plan |
| AC-020 | 20 | core: pipeline-reply-content, plan |
| AC-021 | 13 | core: pipeline-reply-content, reply-check |
| AC-022 | 19 | core: pipeline-reply-shape, reply-check |
| AC-023 | 10 | core: pipeline-reply-shape, reply-check |
| AC-024 | 14 | core: layouts-stack-neutral, reply-check |
| AC-025 | 12 | core: layouts-stack-neutral, reply-check |
| AC-026 | 7 | core: pipeline-separation, reply-check |
| AC-027 | 33 | core: pipeline-separation, reply-check |
| AC-028 | 4 | core: pipeline-separation, reply-check |
| AC-029 | 38 | core: pipeline-rule-tags, templates-readme |
| AC-030 | 3 | core: pipeline-rule-tags |
| AC-031 | 27 | core: layouts-agent-rule, pipeline-flow-description, pipeline-plan-flow-tags |

Gaps: none. All 31 criteria have at least one passing test naming them. Criteria with no `[device]` tag: none (the only `[device]` text in `stories.md` is the legend), so the manual checklist is empty and `checklist.md` is not written.

Scope (`features.md` F-03): the layouts (CLAUDE.md, process.md, spec template, pipeline and flow command files, agent and rule files), the core plan and reply check, and stack-neutral templates are each covered by at least one criterion (AC-001 to AC-025, AC-031).

Note for the caller: the `plan.md` review note on the AC-014 base-template gap is resolved by T007 and is covered by the `pipeline-plan-errors` tests above.

---

## Amendments

```
### Size-guard override — 2026-11-14 (T002)
**Changed**: T002 is committed as one task at 451 changed lines (409 insertions, 42 deletions), over the 400-line guard.
**Reason**: the user chose to keep T002 as one task (option 2), not to split it into T002a and T002b.
**Impact**: none on other tasks. The review and the checks run on the whole staged change.

### Amendment — 2026-11-14 (before Plan, stories)
**Changed**: `stories.md`: the flat-removal decision, US-007 (now the pipeline generator path, AC-026 to AC-028), AC-024 and AC-025 (limited to `base/` and `claude-code/`), the out-of-scope list and the coverage row for R-07.
**Reason**: `apps/api/src/generate/service.ts` runs on the root flat `planGeneration`, `checkReply` and `validateConfig`, and the flat generator reads `steps/` and `workflows/`. Removing them in F-03 would break `/generate`. The user chose to keep the flat code until F-07 (decision 19).
**Impact**: none on built code (none yet). The plan was written from the amended stories.
```

```
### Amendment — 2026-11-14 (T002, during Build)
**Changed**: `plan.md` T002. The flat base layouts (`base/CLAUDE.md`, `base/process.md`, `base/spec-template/*`) are copied unchanged to `source/templates/flat/base/`, and the flat `BASE_FILES` path in `source/packages/core/src/generate.ts` points at that copy. Then `source/templates/base/` is rewritten for the pipeline. `templates-base.test.ts` moves to the copy.
**Reason**: the new pipeline base layouts use placeholders the flat renderer does not know (`processList`, `commandList`, `agentList`, `ruleList`). Rewriting `base/` in place would break the flat `/generate` path and `apps/api/test/templates.test.ts`. The user chose option A.
**Impact**: T002 is re-run from the start. T003 onward is unchanged. The legacy copy is removed by F-07 with the flat generator.
```

```
### Amendment — 2026-11-14 (T006, during Build: rule-set tags)
**Changed**: `stories.md`: AC-012 (agent and flow entries carry their tags), new US-008 with AC-029 to AC-031 (R-08). `architecture.md` §6: decision 21 (tags are rule ids, unknown ids refused). `plan.md`: T006a (model, parse and refusal of tags) added before T006; T006 reads the block's tags; T006b (flow entries carry the flow's description and tags) added after T006. Total tasks 13 → 15.
**Reason**: T006 found that the pipeline's Agent block has no rule-set tags field, though AC-008 and building-blocks.md §3 require one. The user decided that a tag is a rule id from `ProjectConfig.rules` and that flows carry tags too. Flow tags change the non-agent rule in AC-012, so it is amended too.
**Impact**: T006 is re-run after T006a. T005 is unchanged; its tests stay correct for the flow entries until T006b changes them, as the plan notes.
```

```
### Amendment — 2026-11-14 (T006b blocked: flow description)
**Changed**: `plan.md`: T006c added before T006b (flow `description` in the model, parser, refusal of a blank description on an enabled flow, and the six flow descriptions in `default.json`). Total tasks 15 → 16.
**Reason**: T006b needs each flow command entry to carry the flow's description, but flows had no description field. building-blocks.md §4 already describes each flow's job. The user chose a required description and approved the six texts as drafted from §4.
**Impact**: T006b is re-run after T006c. No stories change: AC-031 already requires the description.
```
