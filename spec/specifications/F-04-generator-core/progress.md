# Progress — Generator core (F-04)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-16 | 6 stories, 33 criteria, all `[auto]`; approved by the user. Scope: core generator only (planning, reply check, refusals); the templates text, the model call and the analyzer rewiring are later features |
| UX       | ➖ Not needed | 2026-11-16 | No user interface: a pure generator in `source/packages/core` |
| Plan     | ✅ Complete | 2026-11-16 | Approved by the user |
| Build    | 🔄 In Progress | 2026-11-16 | 6 of 10 tasks committed |
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
| T001 | Decision 35 recorded; §3 and decision 22 corrected; template README sort and duplicate wording | 0 blockers, 0 warnings | task check passed: core 545 of 545, web 3 of 3, api 6 of 6 |
| T002 | Flow-name blocker for `pipeline`; configProblems = analysis blockers; architecture §12 lists the rule | 0 blockers, 1 warning fixed | task check passed: core 556 of 556, web 3 of 3, api 6 of 6 |
| T003 | Template input type; one-pass placeholder rendering; GenerationError for a missing value | 0 blockers, 1 warning and 2 suggestions fixed (test-only) | task check passed: core 583 of 583, web 3 of 3, api 6 of 6 |
| T004 | File list in planGeneration: base, pipeline command, flow commands, agents, rules; file-safe paths; code-point sort; refusal and duplicate handling; headings carried on each planned file. Staged size 451 lines, over the 400 guard; kept as one task at the user's direction | 0 blockers, 2 warnings and 1 suggestion fixed | task check passed: core 615 of 615, web 3 of 3, api 6 of 6 |
| T005 | Command entries: flow and pipeline values, step and route rules, rendered command layouts with description and tags. Staged size 531 lines, over the 400 guard; kept as one task at the user's direction | 0 blockers, 2 warnings and 3 suggestions fixed (tests added) | task check passed: core 630 of 630, web 3 of 3, api 6 of 6 |
| T006 | Agent, rule and base entries: agent description and tags, rule title and text, base files rendered; processList, commandList, agentList and ruleList | 0 blockers, 2 warnings and 2 suggestions fixed | task check passed: core 639 of 639, web 3 of 3, api 6 of 6 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 review: `source/templates/README.md` still says "enabled" in the command, agent and rule rows (lines 59–61 and 75–77). Decision 34 removed the enabled property, so the wording is stale. Not in T001's scope; to be fixed with the template placeholder work (F-04 T003 or a later Docs task).
- T005 review: `source/templates/README.md` lines 28–31 name `command-layouts.ts` as the builder of the step, rule and argument values; they now live in `source/packages/core/src/pipeline/generate/values-command.ts`. The same lines carry the deferred "enabled" wording, so the file name is corrected with it.
- T006 review: no `ProjectConfig` field carries `projectName`, `idea` or `stack` (`source/packages/core/src/pipeline/model.ts` has `name` only on `Pipeline`), so a base layout using `{{projectName}}` throws at planning (AC-013). The behaviour matches AC-013, but `source/templates/README.md` lines 17–20 still promise these values from `ProjectConfig`. Open decision for the user: give the base layouts a value source (for example `Pipeline.name`, or a new config field), or drop the rows. Not changed here: it is a model and template decision. The T004 fixture now uses placeholder-free text so the structure test stays valid.

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
