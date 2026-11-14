# Progress — Domain model: pipeline, flows, blocks and the default pipeline (F-01)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-14 | Stories approved by the user as written; 26 criteria, all `[auto]`. Decisions: scope is types, default pipeline and parsing; ids user-given and file-safe; default pipeline in `templates/pipeline/default.json`, imported at build time; one pipeline per project; schemaVersion 2 |
| UX       | ➖ Not needed |      | No user interface in F-01 |
| Plan     | ✅ Complete | 2026-11-14 | Approved by the user before any code is written; 9 tasks; transition: the new model lives in `packages/core/src/pipeline/` beside the flat model until F-02 to F-07 are rebuilt |
| Build    | 🔄 In Progress | 2026-11-14 | 8 of 9 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None.

_None. While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Decisions recorded in architecture §5 and §6 (schemaVersion 2, default pipeline at build time, ids, transition) | reviewed: 0 blockers, 2 warnings fixed (id rule and transition wording) | docs only; task check passed |
| T002 | Build-time JSON import for core: resolveJsonModule, rootDir at repo root, placeholder `templates/pipeline/default.json`, smoke test | reviewed: 0 blockers, 0 warnings (1 suggestion deferred: rootDir has no effect while core does not emit) | task check passed (exit 0), core 530 tests |
| T003 | Pipeline model types in `packages/core/src/pipeline/model.ts`: ProjectConfig v2, pipeline, flows (blocks only), block kinds, conditions with fixed check types, routes; pipeline gates link to their connection | reviewed: 0 blockers, 2 warnings fixed (gate link; AC-002 tag), 3 suggestions deferred | task check passed (exit 0), core 544 tests |
| T004 | Problem list `parsePipelineConfig`, id rule for block, flow, argument and agent ids, unknown keys refused, schemaVersion 2; blocks returned unchecked until T005 to T007 | reviewed: 1 blocker, 2 warnings, 2 suggestions fixed (no cast of unchecked blocks; pipeline name is free text) | task check passed (exit 0), 588 tests |
| T005 | Structure of the parse: block kinds per list, one Start and at least one End per flow, one nesting level, enabled, unique ids and agent names; structural types, no cast (Amendment 1) | reviewed: 0 blockers, 4 warnings, 3 suggestions fixed (tests for enabled, repeated ids, invalid ids; AC tags) | task check passed (exit 0), 643 tests |
| T006 | Scope on Agent blocks; pipeline Start arguments (name, required, hint); child Start refuses arguments; Start and Agent converted to model types, no cast | reviewed: 0 blockers, 3 warnings, 1 suggestion fixed (tests: dropped-block paths, pipeline Start unknown key) | task check passed (exit 0), 671 tests |
| T007 | Conditions (check type, decider, routes, round limit, pipeline gate onConnection); Connection and End; every parsed block is a model type, no cast | reviewed: 0 blockers, 2 warnings fixed, 2 suggestions fixed. Open for the owner: criterion for Connection/End/onConnection rules; pipeline back route to an earlier flow. Size 959 lines, committed as one change by the owner's approval | task check passed (exit 0), 748 tests |
| T008 | Default pipeline as `templates/pipeline/default.json`: six flows, scopes, five gates on connections, build-flow routes; `defaultProjectConfig` parsed at build time | reviewed: 0 blockers, 1 warning fixed (build-flow test), 1 suggestion deferred (agent iteration source has no field) | task check passed (exit 0), 755 tests |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 `stories.md:22` (suggestion, not applied): the line "The flat model is removed, with no compatibility layer" can be read as F-01 removing it, while `architecture.md` §6 decision 19 and plan.md's transition note keep it until its consumers are rebuilt. The approved stories text is not edited here; the owner should confirm which reading holds.

- T002 `packages/core/tsconfig.json:4` (suggestion, not applied): `rootDir` is now the repository root (`../..`), so any future emit from `packages/core` (declarations included) nests output under the root-relative path. No emit exists in F-01 (`typecheck` is `--noEmit`), and `apps/api` and `apps/web` typecheck clean against it. Revisit when a core build step is added.

- T003 `packages/core/src/pipeline/model.ts` (suggestion, not applied): `ProjectStack` duplicates the flat `TechStack` by design, so the new model does not import the file that is removed later (architecture §6 decision 19). Reconcile the two when the flat model is removed.

- T003 `packages/core/src/pipeline/model.ts` `AgentBlock`, `Flow` (suggestion, not applied): building-blocks §3 lists `description` and rule-set tags for Agent blocks and flows, and §7 requires an Agent description. No F-01 criterion or plan line asks for them, so they are left out. Add them with the feature that needs them; the T004 parser refuses unknown keys, so that change must update the parser at the same time.

- T003 `packages/core/test/pipeline-types.test.ts` (suggestion, not applied): the refusal tests end in `toBeDefined()`, which cannot fail on its own. The refusal is enforced by `tsc`: an unused `@ts-expect-error` fails `npm run typecheck`. The header comment says so. Left as is.

- T004 `packages/core/src/pipeline/ids.ts` and `packages/core/test/pipeline-parse-basics.test.ts` (suggestion, not applied): AC-021 names block, flow, argument and agent ids. Those ids are parsed in T005 and T006, so in T004 the rule is tested through `isValidId` only and no parse path applies it yet. Wire it into those parse steps and their tests.

- T005 `plan.md` T006 (note, not a review finding): T005's structure check already refuses a child flow without a Start, and `checkStartAndEnd` runs on every list. T006 should test that rule and not re-implement it, to avoid two places that refuse the same thing.

- T007 `packages/core/src/pipeline/parse-connection-end.ts` `toConnection` (suggestion, not applied): a Connection whose `from` equals its `to` (or a link that closes a cycle) passes. Building-blocks §7 puts connection and cycle checks in the analyzer (F-04), not in the parse, so it is left to F-04.

- T007 `packages/core/src/pipeline/parse-condition.ts` `readCondition` (suggestion, not applied): a Condition `description` ("what passing means", building-blocks §3) is refused as an unknown key, and the model has no field for it. Same decision as the T003 entry above for Agent and Flow descriptions; the owner decides whether Condition gets one, with the feature that needs it.

- T007 owner decision (not a finding; tests pin the current behaviour): a pipeline gate's back route may name an earlier flow of the pipeline (`pipeline-parse-condition.test.ts`, the AC-008 pipeline-route tests). building-blocks §4 needs it (the gate table: "back to specify", "back to ux", "back to plan", "back to verify"), and AC-015 and AC-016 need the default pipeline to parse. building-blocks §7 and architecture decision 9 say a back route "never leaves" its flow. The owner decides which rule holds.

- T007 owner decision (not a finding): deviation 3, Connection and End field rules and the pipeline gate's `onConnection` link have no numbered criterion. Their refusal tests are labelled "no numbered criterion" until one is added. The owner decides the criterion.

- T008 `packages/core/src/pipeline/model.ts` `AgentBlock` and `templates/pipeline/default.json` build flow (suggestion, not applied): building-blocks §4 writes the build flow as "scope `task`, iteration `plan.md`". The model has no field for an Agent's iteration source (the `Scope` comment mentions one, `AgentBlock` does not carry it), and no F-01 criterion, plan line or architecture section names it. The default keeps the scope and omits the iteration. Add the field with the feature that iterates tasks (F-02 or the generator), and update the parser and the default in the same change.

- T008 `templates/pipeline/default.json` `stack.language` (note, not a finding): "unspecified" is a placeholder for a process-only default. It satisfies the required free-text field. The brief (F-05) replaces it for each project.

- T007 note (size, not a finding): the staged change is 959 changed lines (excluding package-lock.json), above the 400-line guard. The production source under `packages/core/src` is 356 of them. The review was run because the caller asked for it; the owner decides whether T007 is split.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment 1 — 2026-11-14
**Changed**: plan.md, T005 and T006/T007. (a) T005 returns structural types (kind, id, enabled, own fields as read), not the model types; T006 and T007 turn them into the model types from `model.ts`, without a cast. (b) Unknown keys inside blocks are refused in T006 and T007, when each block's own fields are checked. (c) `packages/core/src/pipeline/parse-util.ts` is added to T005's file list, for the shared helpers.
**Reason**: T005 cannot return model types without a cast or without the field rules of T006 and T007. The stop rule asked for this amendment; the owner approved it on 2026-11-14 ("go on").
**Impact**: T005 (re-review before commit); T006 and T007 gain the model-type conversion and the block-level unknown-key refusal. No other task changes.
