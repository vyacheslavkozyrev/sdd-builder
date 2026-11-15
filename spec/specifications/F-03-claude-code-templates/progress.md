# Progress — Claude Code templates (F-03)

**Feature status: 🔄 In Progress.** 7 stories, 28 criteria, all `[auto]`.

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-14 | Stories approved by the user: 7 stories, 28 criteria, all `[auto]` |
| UX       | ➖ Not needed | 2026-11-14 | No user interface: the feature is templates and pure functions in `source/packages/core`; every criterion is `[auto]` |
| Plan     | ✅ Complete | 2026-11-14 | Approved by the user: 13 tasks (plan.md) |
| Build    | 🔄 In Progress |   | 7 of 16 tasks committed (plan amended: T006a, T006b and T006c added) |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist (no `[device]` criteria) |

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

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T004 `source/packages/core/test/layouts-agent-rule.test.ts` `REPO_ROOT`: the constant points at `source/`, not the repository root. The same name is used in `layouts-base.test.ts` and `templates-readme.test.ts`; renaming it is a cross-file change outside T004.
- T003 `source/packages/core/src/pipeline/generate/command-layouts.ts` `routeRuleList` and `pipeline-command.ts` `ruleLines`: the same back-route loop is written twice. Not merged in T003 because `pipeline-command.ts` is imported by `command-layouts.ts`, so sharing the loop needs a move into `rules-text.ts`; the wiring task (T005) decides whether `pipeline-command.ts` switches to the template path, and the merge follows that. T005 kept `pipeline-command.ts` on its own path (the plan reads the layout, not the generator's text), so this stays open.
- T005 `source/packages/core/test/pipeline-plan-commands.test.ts`: no plan-level test that an unfilled placeholder makes `planGeneration` throw. The throw comes from `renderTemplate` (covered by the renderer's own tests, F-02 AC-019); the error paths are T007's scope in plan.md, so the plan-level test goes there.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

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
