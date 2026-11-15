# Progress — Claude Code templates (F-03)

**Feature status: 🔄 In Progress.** 7 stories, 28 criteria, all `[auto]`.

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-14 | Stories approved by the user: 7 stories, 28 criteria, all `[auto]` |
| UX       | ➖ Not needed | 2026-11-14 | No user interface: the feature is templates and pure functions in `source/packages/core`; every criterion is `[auto]` |
| Plan     | ✅ Complete | 2026-11-14 | Approved by the user: 13 tasks (plan.md) |
| Build    | 🔄 In Progress |   | 1 of 13 tasks committed |
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

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

```
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
