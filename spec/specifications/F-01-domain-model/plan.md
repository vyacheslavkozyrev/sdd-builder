# Implementation Plan — Domain model: pipeline, flows, blocks and the default pipeline (F-01)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

## Tasks

- [x] T001 [Docs] Record the F-01 decisions: schemaVersion 2; the default pipeline as `templates/pipeline/default.json`, imported at build time; ids; one pipeline per project; and the transition, in which the new model lives in `packages/core/src/pipeline/` beside the flat model until F-02 to F-07 are rebuilt — `spec/documents/architecture.md` §5 and §6 — covers none (decision record required before code depends on it)
- [x] T002 [Build] Let `packages/core` import JSON at build time: `resolveJsonModule` in its tsconfig, with the `templates/` folder in its include path; a smoke test imports `templates/pipeline/default.json` and checks it is an object — `packages/core/tsconfig.json`, `packages/core/test/pipeline-json-smoke.test.ts` — covers none (setup for AC-017)
- [x] T003 [Core] The model types in `packages/core/src/pipeline/model.ts`: `ProjectConfig` (schemaVersion 2, pipeline, arguments), `Pipeline` (one, with child flows and connections), `Flow` (one nesting level; blocks), the block union (Start, Agent, Condition, Connection, End, and Flow for the pipeline only), `Condition` (check type, decided by, threshold, pass and fail routes, optional round limit), `Route`, `Scope`, `Argument`, `enabled` on every block and flow — `packages/core/src/pipeline/model.ts`, `packages/core/src/pipeline/index.ts`, `packages/core/test/pipeline-types.test.ts` (a type test: a typed fixture of each block kind compiles) — covers AC-001, AC-003, AC-004 (types; the parse tests are in T005 to T007)
- [x] T004 [Core] The id rule and the problem list: `parsePipelineConfig(value: unknown)` returns `{ ok: true, config } | { ok: false, problems }`; each problem has a path and a message; a non-object gives one problem at the empty path; unknown keys are refused; `schemaVersion` must be 2 — `packages/core/src/pipeline/parse.ts`, `packages/core/src/pipeline/ids.ts`, `packages/core/test/pipeline-parse-basics.test.ts` — covers AC-018, AC-019, AC-020, AC-021, AC-023
- [x] T005 [Core] Structure of the parse: exactly one pipeline Start; child flows as Flow blocks only in the pipeline (one nesting level); block kinds limited to the six; uniqueness of ids across flows and blocks, and of agent names among agents; `enabled` is a boolean on every block and flow — `packages/core/src/pipeline/parse.ts`, `packages/core/src/pipeline/parse-structure.ts`, `packages/core/test/pipeline-parse-structure.test.ts` — covers AC-002, AC-003, AC-004, AC-022
- [x] T006 [Core] Scope and arguments: every Agent block has scope `project`, `feature` or `task`; the pipeline's Start carries arguments (name, required flag, hint) with unique names; a child flow's Start carries no arguments; a flow without a Start is refused — `packages/core/src/pipeline/parse-scope.ts`, `packages/core/test/pipeline-parse-scope.test.ts` — covers AC-010, AC-011, AC-012
- [x] T007 [Core] Conditions: check type from the four fixed values; `diff-size` takes a whole-number threshold of at least 1 and no other check takes one; `decided by` is `human` or `agent`; pass and fail routes are required; route kinds `next`, `stop`, `back` to an earlier block of the same flow; the round limit is optional and a whole number of at least 1 — `packages/core/src/pipeline/parse-condition.ts`, `packages/core/test/pipeline-parse-condition.test.ts` — covers AC-005, AC-006, AC-007, AC-008, AC-009
- [x] T008 [Core] The default pipeline: `packages/core/src/pipeline/default.ts` imports `templates/pipeline/default.json`, creates `templates/pipeline/default.json` with the six flows, the blocks of §4 and the five gates and checks between flows; tests check the flow order, the scopes, the gate table and that the default parses without problems; a test that changes a copy of the data and expects the refusal with a path — `templates/pipeline/default.json`, `packages/core/src/pipeline/default.ts`, `packages/core/test/pipeline-default.test.ts` — covers AC-013, AC-014, AC-015, AC-016, AC-017
- [ ] T009 [Core] Result shapes and purity: type tests keep `AnalysisResult` (`findings`, `review` with `status`, `findings`, `dropped`) and `GenerationResult` (`files`, `warnings`) unchanged; the purity test scans `packages/core/src/pipeline/` for `node:fs`, `http`, `https`, `process`, `window` and network globals — `packages/core/test/pipeline-result-shapes.test.ts`, `packages/core/test/purity.test.ts` (extended to the new folder) — covers AC-024, AC-025, AC-026

## Rationale

- **Docs first (T001).** The schemaVersion, the JSON import and the transition are decisions. `general.md` requires them in the architecture before code depends on them.
- **Build setup before the data (T002).** The default pipeline is imported at build time; the import has to work before the data and the tests that use it.
- **Types before the parser (T003 before T004 to T007).** The parser returns the types, so they come first. Each parse task then adds one group of rules, with its tests, so each commit stays small.
- **The default pipeline after the parser (T008).** It is the first large test of the parser: the default must parse without problems, which is also how AC-016 is proven.
- **Transition (T001, T003).** The flat model in `packages/core/src/model.ts`, `catalog.ts` and `parse-config.ts` is used by 27 core modules and 58 files in `apps/api` and `apps/web`. Replacing it in F-01 would break the build until F-02 to F-07 are rebuilt. So the new model lives in `packages/core/src/pipeline/` beside the flat model. It has no consumers outside its own tests until F-02 starts. The flat model is removed by the feature that rebuilds each consumer, and F-01 records that removal plan in the architecture.
- **Purity and shapes last (T009).** They cover the whole folder once it exists.
- **No device criteria.** Every criterion in F-01 is `[auto]`, so the verify step needs no manual checklist.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Docs]` | Documentation changes required by the feature |
| `[Core]` | `packages/core`: the pipeline model, parser, default pipeline, purity |
