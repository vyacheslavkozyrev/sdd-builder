# Implementation Plan — Generator Core (F-02)

Each task is one implement → review → test → commit cycle and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the checks pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Paths are under `packages/core/`. Tests live in `packages/core/test/`. Every test name carries `F-02 AC-###`.

## Tasks

- [x] T001 [Build] Add Vitest and a `test` script to `packages/core` and the root; a smoke test proves the runner works — `packages/core/package.json`, `packages/core/vitest.config.ts`, `packages/core/test/smoke.test.ts` — covers: none (enabler for `scripts/task-check.sh`)
- [x] T002 [Core] Replace the flat block model with workflows, ordered steps, gates, branch routes, map connections and custom steps; `schemaVersion` stays 1 — `packages/core/src/model.ts`, `packages/core/test/model.test.ts` — covers: none (prerequisite for all criteria; type tests only)
- [x] T003 [Core] Default step catalog for the reference workflows (Specify, Implement, Verify, Release) and their required steps and gates, per `building-blocks.md` §4 — `packages/core/src/catalog.ts`, `packages/core/test/catalog.test.ts` — covers AC-006 (catalog data)
- [x] T004 [Core] `InvalidConfigError` that collects a list of problems; the `TemplateSource` interface; `GenerationResult` error handling — `packages/core/src/errors.ts`, `packages/core/src/template-source.ts`, `packages/core/test/errors.test.ts` — covers AC-011 (error shape)
- [x] T005 [Core] Refuse duplicate ids across workflows, catalog steps and custom steps, naming both occurrences; collect every problem before throwing — `packages/core/src/validate/ids.ts`, `packages/core/test/validate-ids.test.ts` — covers AC-001, AC-011
- [x] T006 [Core] Refuse unknown references in connections and gate targets (AC-002), map cycles naming the cycle (AC-003), and connections to or from disabled workflows or steps (AC-010, connections part) — `packages/core/src/validate/map.ts`, `packages/core/test/validate-map.test.ts` — covers AC-002, AC-003, AC-010
- [x] T007 [Core] Branch routes: refuse routes into another workflow (AC-004), backward routes to a step that is not earlier in the same workflow (AC-004), conditions with a missing pass or fail output (AC-005), and routes into disabled steps (AC-010, routes part) — `packages/core/src/validate/routes.ts`, `packages/core/test/validate-routes.test.ts` — covers AC-004, AC-005, AC-010
- [x] T008 [Core] Required steps and gates present and enabled (AC-006), gate types limited to the fixed set (AC-007), round limits positive integers when set (AC-008), custom steps never required and never clashing with catalog ids (AC-009) — `packages/core/src/validate/policy.ts`, `packages/core/test/validate-policy.test.ts` — covers AC-006, AC-007, AC-008, AC-009
- [x] T009 [Core] Select and order: workflows in map order with tab order as tie-break (AC-012), steps in tab order with disabled steps dropped (AC-013), disabled workflows removed from ordering (AC-014) — `packages/core/src/select.ts`, `packages/core/test/select.test.ts` — covers AC-012, AC-013, AC-014
- [x] T010 [Core] Placeholder values for the project placeholders in `templates/README.md`; a placeholder with no value fails generation naming template and placeholder (AC-024); values containing `{{` are inserted literally (AC-027) — `packages/core/src/render/placeholders.ts`, `packages/core/test/placeholders.test.ts` — covers AC-024, AC-027
- [x] T011 [Core] Conditional sections `{{#step:<id>}}…{{/step:<id>}}`, kept or removed by step state; nested, unclosed or mismatched markers and unknown placeholders fail with a message; no raw `{{` marker reaches output (AC-025, AC-026) — `packages/core/src/render/conditionals.ts`, `packages/core/test/conditionals.test.ts` — covers AC-025, AC-026
- [x] T012 [Core] Workflow command `workflow-<id>.md`: numbered enabled steps in tab order naming their generated files; scope and iteration source stated (AC-015, AC-016, AC-019) — `packages/core/src/render/workflow-command.ts`, `packages/core/test/workflow-command.test.ts` — covers AC-015, AC-016, AC-019
- [ ] T013 [Core] Branch rules as numbered items with pass and fail destinations and round limit or "no limit set" (AC-017); gate rules as stop rules after steps and as preconditions at the top of the downstream workflow for map gates (AC-018) — `packages/core/src/render/rules-text.ts`, `packages/core/test/rules-text.test.ts` — covers AC-017, AC-018
- [ ] T014 [Core] Step files by kind: command, agent, skill, script paths (AC-020); rule-set tags listed and missing rule files refused (AC-021); a step used in two workflows yields one file (AC-022); missing step template refused with step and path (AC-023) — `packages/core/src/render/step-files.ts`, `packages/core/test/step-files.test.ts` — covers AC-020, AC-021, AC-022, AC-023
- [ ] T015 [Core] `process.md` Mermaid flowchart of the enabled map: workflow nodes, artifact-labelled edges, gate decision nodes, branch edges with round limit or "no limit set", ids sanitised, every edge declared (AC-028, AC-029, AC-030) — `packages/core/src/render/mermaid.ts`, `packages/core/test/mermaid.test.ts` — covers AC-028, AC-029, AC-030
- [ ] T016 [Core] File list rules: sorted by path, relative forward-slash paths with no leading slash or `..`, duplicate path refused (AC-032); UTF-8, LF, exactly one trailing newline, no timestamps or random ids (AC-033) — `packages/core/src/file-list.ts`, `packages/core/test/file-list.test.ts` — covers AC-032, AC-033
- [ ] T017 [Core] `generate(config, templates)` assembles tasks T005–T016, collects generation errors together, and returns the file list; generating the same input twice gives identical output — `packages/core/src/generate.ts`, `packages/core/src/index.ts`, `packages/core/test/generate.test.ts` — covers AC-031
- [ ] T018 [Core] Purity scan: a test reads `packages/core/src` and fails on any import of `node:*`, `fs`, `http`, `process` or an LLM SDK — `packages/core/test/purity.test.ts` — covers AC-034

## Rationale

**Order.** T001 gives the test runner first, so every later task can prove itself. T002 changes the model before anything reads it. The catalog (T003) and the error and template types (T004) are the shared inputs for validation and rendering. Validation comes before rendering (T005–T009), so rendering only ever sees a configuration that passed. Rendering is built bottom-up: placeholders and conditionals (T010–T011) before the files that use them (T012–T014). The Mermaid view (T015) needs the ordering and the map validation. T016 and T017 put the output rules and the assembly on top. T018 is a standing check that the core stays pure.

**Dependencies on other features.** F-01 is the scaffold that T002 replaces; it has no separate task because the model change is the feature's first task. F-03 (the real templates) is not needed: tests use fixture templates.

**Dependency added.** Vitest (T001) is the test runner named in `architecture.md` §5 as a proposal. It is the only new dependency.

**Size.** Each task is estimated at 50–200 changed lines. T005–T008 are the largest because they hold the validation rules; if one exceeds 200 lines it is split at its rule boundary before implementation starts.

**Coverage.** Every acceptance criterion AC-001 to AC-034 appears in at least one task's "covers" list. T002 and T001 cover none directly, and the rationale says so.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Core]` | `packages/core`: model, validation, rendering, file list, generation |
| `[Docs]` | Documentation changes required by the feature (none planned for F-02) |
