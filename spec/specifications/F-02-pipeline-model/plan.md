# Implementation Plan — Pipeline model and the default pipeline (F-02)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Paths are relative to the repository root. The new model lives in `source/packages/core/src/pipeline/` (decision 19). Tests for it live in `source/packages/core/test/pipeline/`, and each test name carries `F-02 AC-0xx`.

## Tasks

- [x] T001 [Core] Model types and primitive checks: `source/packages/core/src/pipeline/model.ts` (the types of `architecture.md` §6 decision 33 and the `Model` values); `source/packages/core/src/pipeline/check/primitives.ts` (problem collector, unknown-key check, non-blank text, positive whole number, boolean, enum, string list without blanks or duplicates, id rule, body cap in code points, model value); `source/packages/core/test/pipeline/primitives.test.ts` (table-driven) — covers AC-021, AC-024, AC-025, AC-026 (the value rules; their use per level comes with each task below)
- [x] T002 [Core] Parser entry and the root: `source/packages/core/src/pipeline/parse/project.ts` (`parseProjectConfig(input: unknown)` returns `{ ok: true, config }` or `{ ok: false, problems }`; never throws; problems in document order); root unknown keys; `schemaVersion` must be 2; `rules` entries `{ id, title, text }` with unique ids; `source/packages/core/test/pipeline/project.test.ts` — covers AC-002, AC-003, AC-023, AC-027, AC-028, AC-029; AC-004 (root and rule levels)
- [x] T003 [Core] Start, Approval and End blocks, and the block dispatch on `kind`: `source/packages/core/src/pipeline/parse/block.ts` (kinds `start`, `approval`, `end`; `kind` refused when not one of the five, including `connection`; End `outcome` `done` or `stopped`, optional `producedArtifact`; Approval non-blank `description`); `source/packages/core/test/pipeline/block-simple.test.ts` — covers AC-009, AC-011, AC-014; AC-005 (End refuses `connectedTo`); AC-004 (block level)
- [x] T004 [Core] Connections and routes: `source/packages/core/src/pipeline/parse/link.ts` (block link `{ to, label }` with non-blank `label`; route `{ to, roundLimit? }` or `{ stop: true }`; `connectedTo` optional on Start, Agent and Approval); `source/packages/core/test/pipeline/link.test.ts` — covers AC-016, AC-018, AC-019 (the optional case); AC-004 (link and route levels)
- [x] T005 [Core] Agent and Check blocks: `source/packages/core/src/pipeline/parse/block.ts` (Agent `name` file-safe, `description`, `arguments`, optional `restrictions`, `model`, `tools`, `reads`, `writes`, `ruleTags`, `body` at most 1,000 code points, `connectedTo` optional; Check `description`, `type` `checks` or `diff size`, `threshold` required for `diff size` and refused for `checks`, `connectedTo` required with `true` and `false` routes); `source/packages/core/test/pipeline/block-agent-check.test.ts` — covers AC-010 (required fields and file-safe name), AC-012, AC-013, AC-019 (a Check without `connectedTo` is refused), AC-024 (agent body), AC-025 (agent lists); AC-005 (`outcome` on an Agent, `threshold` on `checks`); AC-004 (block level)
- [x] T006 [Core] Flows and flow links with gates: `source/packages/core/src/pipeline/parse/flow.ts` (flow `id`, `name`, `description`, `arguments` text, optional `model`, `ruleTags`, `body` at most 1,000 code points, `blocks` in order, empty `blocks` accepted, optional `connectedTo` `{ to, label, gate? }`; gate `approval` with `description`, or gate `check` with `description`, `type` and `threshold` only for `diff size`; other gate kinds refused); `source/packages/core/test/pipeline/flow.test.ts` — covers AC-007, AC-015, AC-017, AC-020; AC-024 (flow body); AC-025 and AC-026 (flow lists and model); AC-004 (flow and gate levels)
- [x] T007 [Core] Pipeline and the complete config: `source/packages/core/src/pipeline/parse/pipeline.ts` (pipeline `name`, `description`, `arguments` structured `{ id, required, hint }` with `required` boolean, `flows` array, optional `model`, `tools`, `ruleTags`, `body`); wire it into `parse/project.ts`; `source/packages/core/test/pipeline/pipeline.test.ts` with a valid fixture config (`schemaVersion` 2, rules, one pipeline) — covers AC-001, AC-006, AC-008; AC-004 (pipeline and argument levels); AC-024 (pipeline body); AC-025 (pipeline `tools` and `ruleTags`); AC-026 (pipeline `model`)
- [x] T008 [Core] Ids unique across the project: `source/packages/core/src/pipeline/parse/ids.ts` (one pass after the structure is parsed: ids of flows, blocks and pipeline arguments unique together, agent names unique among agents, each clash refused with the path of the second occurrence); `source/packages/core/test/pipeline/ids.test.ts` — covers AC-022, AC-010 (agent name clash)
- [x] T009 [Build] Default pipeline data, part 1: `source/templates/pipeline/default.json` with the pipeline header (name, description, arguments `feature-id` required, model, body) and the flows `specify`, `ux` and `plan` with their blocks as `architecture.md` §11 describes them. No test yet; the data is parsed and tested in T011 — covers none (data for AC-030 to AC-032)
- [x] T010 [Build] Default pipeline data, part 2: add the flow `build` to `source/templates/pipeline/default.json`: start, agent `implement`, agent `review`, check `checks`, agent `test`, check `checks`, check `diff size`, agent `commit`, end, with the links and the `diff size` threshold of §11 (400 lines) and the Check outputs wired; no test yet — covers none (data for AC-031)
- [x] T011 [Build] Default pipeline data, part 3 and its tests: add the flows `verify` and `complete` to `source/templates/pipeline/default.json`, and the Check gate `checks` (false output stops) on the link from `build` to `verify` (architecture §11 gate table; amended after T010); `source/packages/core/test/pipeline/default-data.test.ts` reads the file, parses it with `parseProjectConfig` (using a `schemaVersion` 2 wrapper with an empty rules list) and checks that it parses without problems, that the six flows come in the order specify, ux, plan, build, verify, complete, that the build flow has the blocks of T010 in order, and that the pipeline arguments include a required `feature-id` — covers AC-030, AC-031, AC-032
- [x] T012 [Core] Default pipeline as an import and core purity: `source/packages/core/src/pipeline/default.ts` (imports `../../../templates/pipeline/default.json` with `with { type: "json" }` and exports it as `defaultPipeline`); `source/packages/core/test/pipeline/default-import.test.ts` (the exported value deep-equals the parsed content of the file read in the test); `source/packages/core/test/pipeline/purity.test.ts` (scans `source/packages/core/src` and fails on an import of `fs`, `node:fs`, `http`, `node:http`, `process` or `window`) — covers AC-033, AC-035
- [x] T013 [Core] Public namespace: `source/packages/core/src/pipeline/index.ts` (exports the model types, `parseProjectConfig` and `defaultPipeline`); `source/packages/core/src/index.ts` adds `export * as pipeline from './pipeline/index.js';`; `source/packages/core/test/pipeline/namespace.test.ts` imports the root and checks that `pipeline` exposes `parseProjectConfig` and `defaultPipeline` — covers AC-034

## Rationale

- **Model and primitives first (T001).** Every later parser uses the same types and the same value rules, so the rules are written once and tested in a table (AC-021, AC-024 to AC-026). The types are the decision 33 shapes, so the parser has one source to match.
- **Root before the blocks (T002).** The entry point and the result type (`ok` with a config, or problems) are fixed before any level is added, so each later task only adds the checks for its level.
- **Blocks before flows and the pipeline (T003 to T005).** A flow holds blocks, and the pipeline holds flows, so the block parsers exist first. Links and routes (T004) come before Agent and Check (T005) because both use them. The simple kinds go first so the dispatch on `kind` is tested on the smallest cases.
- **Flows, then the pipeline (T006, T007).** The flow parser needs the block parser; the pipeline parser needs the flow parser. T007 completes the config and tests the full valid fixture (AC-001).
- **Ids last among the parsers (T008).** Uniqueness needs the whole tree, so it is one pass over the parsed config.
- **Default pipeline in three tasks (T009 to T011).** The JSON file is large, so it is written in parts of about 150 to 200 lines each. Its tests come once the file is complete, so no task has a failing test. The file is data: it changes the default process without changing code (decision 17).
- **Import and purity (T012).** The import uses the JSON import attribute that NodeNext requires. The core `tsconfig` already includes `../../templates/pipeline/*.json` and sets `resolveJsonModule`, so the import needs no config change. The purity scan is the rule of `architecture.md` §1: core does no I/O.
- **Namespace last (T013).** The namespace export is tested once the names exist, and it is the only change to the root `index.ts`.

**Corrections to the stories, found while planning (for the user to confirm):**

- The stories (AC-034) say the flat model's exports are still present. In this repository they are not: `source/packages/core/src` holds only the F-01 placeholder, and `model.ts`, `catalog.ts` and `parse-config.ts` do not exist. So the flat part of AC-034 holds trivially. T013 tests the namespace only.
- `typescript.md` says domain shapes live in `source/packages/core/src/model.ts`. Decision 19 places the new model in `source/packages/core/src/pipeline/`, and this plan follows decision 19. The flat file does not exist, so nothing conflicts.

**Libraries:** none added. The purity scan and the file read use Node's `fs` in test code only, and `@types/node` is already a core dev dependency. The test code is not part of the core source, so the scan's own `fs` use is allowed.

**Layer tag:** the tasks use `[Core]` for the code in `source/packages/core/src/pipeline/` and `[Build]` for the JSON data file, which is data for the build. The `[Core]` tag is added to the Layer Tags table below, as `architecture.md` §3 requires a tag per module.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Core]` | `source/packages/core`: the pure model, parser and default pipeline module |
| `[Build]` | Project setup, manifests, scripts, and the default pipeline data file |
| `[Docs]` | Documentation changes required by the feature |

## Coverage check

| Criterion | Task |
|---|---|
| AC-001 | T007 |
| AC-002 | T002 |
| AC-003 | T002 |
| AC-004 | T002, T003, T004, T005, T006, T007 |
| AC-005 | T003, T005 |
| AC-006 | T007 |
| AC-007 | T006 |
| AC-008 | T007 |
| AC-009 | T003 |
| AC-010 | T005, T008 |
| AC-011 | T003 |
| AC-012 | T005 |
| AC-013 | T005 |
| AC-014 | T003 |
| AC-015 | T006 |
| AC-016 | T004 |
| AC-017 | T006 |
| AC-018 | T004 |
| AC-019 | T004, T005 |
| AC-020 | T006 |
| AC-021 | T001 |
| AC-022 | T008 |
| AC-023 | T002 |
| AC-024 | T001, T005, T006, T007 |
| AC-025 | T001, T005, T006, T007 |
| AC-026 | T001, T006, T007 |
| AC-027 | T002 |
| AC-028 | T002 |
| AC-029 | T002 |
| AC-030 | T011 |
| AC-031 | T011 (data T010) |
| AC-032 | T011 |
| AC-033 | T012 |
| AC-034 | T013 |
| AC-035 | T012 |

Every criterion has a task. Every task names its files.
