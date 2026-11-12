# Progress — Generator Core (F-02)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-11 | Stories re-specified for the workflow model (34 criteria); approved by the user; committed (33e8859). |
| Plan     | ✅ Complete | 2026-11-11 | Approved by the user before any code is written |
| Build    | ✅ Complete | 2026-11-11 | 18 of 18 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

_None. While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Vitest test runner and `test` script; task check fixed to detect the script | self-review: no findings | 1 passed |
| T002 | Model replaced: workflows, steps, gates, routes, conditions, map, custom steps; flat catalog removed until T003 | self-review: no findings | 3 passed, typecheck clean |
| T003 | Default steps, workflows and map for Specify, Implement, Verify, Release. A condition after a disabled step is dropped, not refused | self-review: no findings | 8 passed (cumulative) |
| T004 | InvalidConfigError with all problems; TemplateError; TemplateSource interface and in-memory source | self-review: no findings | 12 passed (cumulative) |
| T005 | Duplicate ids across workflows, catalog steps and custom steps; default workflow ids renamed to implement-cycle, verify-feature, release-project (display names unchanged) | self-review: no findings | 16 passed (cumulative) |
| T006 | Unknown workflows, steps and conditions' steps; connections to disabled workflows; map cycles. Default Release workflow enabled (the reference process releases) | self-review: no findings | 23 passed (cumulative) |
| T007 | Outputs wired; routes stay in the workflow; fail routes go back, pass routes go forward; no route into a disabled step; conditions after disabled steps are dropped | self-review: no findings | 31 passed (cumulative) |
| T008 | Required workflows (specify, implement-cycle, verify-feature), required steps and gates from the catalog, fixed gate types, positive integer round limits, custom steps never required. Fixture `withDefaults` for tests that change workflows | self-review: no findings | 41 passed (cumulative) |
| T009 | Workflows in map order with tab order as tie-break; steps in tab order, disabled steps dropped; conditions after disabled steps not selected | self-review: no findings | 46 passed (cumulative) |
| T010 | Project placeholder values; one-pass substitution; no value and unknown placeholders refused (the unknown-name rule of AC-026 is here, not in T011) | self-review: no findings | 51 passed (cumulative) |
| T011 | Conditional sections by step state; nested, unclosed, mismatched, orphan and unknown-step markers refused; malformed markers refused before values are inserted; template pipeline `renderTemplate` | self-review: no findings | 60 passed (cumulative) |
| T012 | `workflow-<id>.md` from a workflow template: numbered steps in tab order with their files, scope and iteration source. Placeholders `workflow.name`, `workflow.id`, `workflow.scope`, `workflow.steps`, `workflow.rules` | self-review: no findings | 65 passed (cumulative) |
| T013 | Gate and branch rules: map gates as preconditions; quality gates as stop rules; retries as branch rules with their round limit or "no limit set". Wording is "unless <condition>, <action>". Templates README updated for the workflow placeholders | self-review: no findings | 71 passed (cumulative) |
| T014 | Step files by kind; catalog steps from templates, custom steps from their body; rule tags listed and rule files written; one file per step; missing template or rule refused | self-review: no findings | 77 passed (cumulative) |
| T015 | Mermaid flowchart: a subgraph per enabled workflow with steps, conditions, branch edges labelled with their limit or "no limit set"; map connections with artifact labels; gates as decision nodes; ids cleaned; every edge declared | self-review: no findings | 84 passed (cumulative) |
| T016 | File list: sorted by path; unsafe paths (leading slash, `..`, backslash) and duplicates refused together; LF, exactly one trailing newline | self-review: no findings | 91 passed (cumulative) |
| T017 | `generate(config, templates)`: validation first (InvalidConfigError with all problems); base files, workflow commands and step files; template problems collected into GenerationError. Step-file problems are collected as one group, since that renderer stops at its first error | self-review: no findings | 97 passed (cumulative) |
| T018 | Purity scan of packages/core/src: no Node built-ins, I/O, network or LLM imports; no process globals | self-review: no findings (scan first matched comments; narrowed to real globals) | 99 passed (cumulative) |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

---

## Test Results

Verified 2026-11-11 after T018. Totals: 18 test files, 99 tests, all passing. Typecheck clean. Every criterion is `[auto]`; this feature has no device checklist.

| Criterion | Tag | Covering tests (file) | Result |
|---|---|---|---|
| AC-001 | `[auto]` | validate-ids | pass |
| AC-002 | `[auto]` | validate-map | pass |
| AC-003 | `[auto]` | validate-map | pass |
| AC-004 | `[auto]` | validate-routes | pass |
| AC-005 | `[auto]` | validate-routes | pass |
| AC-006 | `[auto]` | catalog, validate-policy | pass |
| AC-007 | `[auto]` | catalog, validate-policy | pass |
| AC-008 | `[auto]` | validate-policy | pass |
| AC-009 | `[auto]` | validate-policy | pass |
| AC-010 | `[auto]` | validate-map, validate-routes | pass |
| AC-011 | `[auto]` | errors, generate, validate-ids | pass |
| AC-012 | `[auto]` | select | pass |
| AC-013 | `[auto]` | select | pass |
| AC-014 | `[auto]` | select | pass |
| AC-015 | `[auto]` | generate, workflow-command | pass |
| AC-016 | `[auto]` | workflow-command | pass |
| AC-017 | `[auto]` | rules-text | pass |
| AC-018 | `[auto]` | rules-text | pass |
| AC-019 | `[auto]` | workflow-command | pass |
| AC-020 | `[auto]` | step-files | pass |
| AC-021 | `[auto]` | step-files | pass |
| AC-022 | `[auto]` | step-files | pass |
| AC-023 | `[auto]` | step-files | pass |
| AC-024 | `[auto]` | placeholders | pass |
| AC-025 | `[auto]` | conditionals | pass |
| AC-026 | `[auto]` | conditionals, placeholders | pass |
| AC-027 | `[auto]` | conditionals, placeholders | pass |
| AC-028 | `[auto]` | generate, mermaid | pass |
| AC-029 | `[auto]` | mermaid | pass |
| AC-030 | `[auto]` | mermaid | pass |
| AC-031 | `[auto]` | generate | pass |
| AC-032 | `[auto]` | file-list | pass |
| AC-033 | `[auto]` | file-list, generate | pass |
| AC-034 | `[auto]` | purity | pass |

**Deferred findings and deviations** (recorded, none blocks the feature)

- AC-010 covers connections to disabled workflows (map) and routes into disabled steps (workflow). A condition after a disabled step is dropped rather than refused, as `building-blocks.md` §3 states.
- A backward fail route must go to an earlier step, and a pass route must go forward. Both readings are recorded in T007.
- Default workflow ids are `specify`, `implement-cycle`, `verify-feature`, `release-project`. The step id `implement` clashed with the workflow id `implement` under AC-001.
- The default Release workflow is enabled, because the Verify to Release connection needs an enabled target.
- Step-file errors are collected as one group, since that renderer stops at its first error (T017).
- The approval gate between Specify and Implement lives in Specify, after Plan. The mockup `07-map.svg` draws it on the connection. The two should be aligned in a later doc review.

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
