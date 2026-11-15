# Progress — Claude Code templates (F-03)

**Feature status: 🔄 In Progress.** 7 stories, 28 criteria, all `[auto]`.

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-14 | Stories approved by the user: 7 stories, 28 criteria, all `[auto]` |
| UX       | ➖ Not needed | 2026-11-14 | No user interface: the feature is templates and pure functions in `source/packages/core`; every criterion is `[auto]` |
| Plan     | ✅ Complete | 2026-11-14 | Approved by the user: 13 tasks (plan.md) |
| Build    | 🔄 In Progress |   | 3 of 13 tasks committed |
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

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T003 `source/packages/core/src/pipeline/generate/command-layouts.ts` `routeRuleList` and `pipeline-command.ts` `ruleLines`: the same back-route loop is written twice. Not merged in T003 because `pipeline-command.ts` is imported by `command-layouts.ts`, so sharing the loop needs a move into `rules-text.ts`; the wiring task (T005) decides whether `pipeline-command.ts` switches to the template path, and the merge follows that.

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
