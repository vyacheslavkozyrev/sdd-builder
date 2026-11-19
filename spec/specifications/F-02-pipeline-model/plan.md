# Implementation Plan — Pipeline model and the default pipeline (F-02)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Source of the criteria: `stories.md` (AC-001 to AC-088, all `[auto]`). Contract: `spec/documents/pipeline-schema.md`. All code is in `source/packages/core`, under `src/pipeline/` (types and parser) and `test/pipeline/` (tests). Test titles start with `F-02 AC-###`.

## Tasks

- [x] T001 [Core] Model types, the problem collector and the value rules — `source/packages/core/src/pipeline/model.ts`, `source/packages/core/src/pipeline/check/primitives.ts`, `source/packages/core/test/pipeline/primitives.test.ts` — covers AC-009, AC-010, AC-016, AC-029, AC-030, AC-088
- [x] T002 [Core] Parser entry, root object and key rules — `source/packages/core/src/pipeline/parse/index.ts`, `source/packages/core/src/pipeline/parse/project.ts`, `source/packages/core/test/pipeline/project.test.ts` — covers AC-002, AC-003, AC-004, AC-005, AC-007, AC-010
- [ ] T003 [Core] Rules and brief fields — `source/packages/core/src/pipeline/parse/rules.ts`, `source/packages/core/src/pipeline/parse/brief.ts`, `source/packages/core/src/pipeline/parse/project.ts`, `source/packages/core/test/pipeline/rules-brief.test.ts` — covers AC-066, AC-067, AC-069, AC-074, AC-075, AC-076, AC-088
- [ ] T004 [Core] Argument rows — `source/packages/core/src/pipeline/parse/argument.ts`, `source/packages/core/test/pipeline/argument.test.ts` — covers AC-015, AC-016, AC-017, AC-019
- [ ] T005 [Core] Start and End blocks — `source/packages/core/src/pipeline/parse/start.ts`, `source/packages/core/src/pipeline/parse/end.ts`, `source/packages/core/test/pipeline/start-end.test.ts` — covers AC-008, AC-044, AC-063
- [ ] T006 [Core] Condition block and its routes — `source/packages/core/src/pipeline/parse/condition.ts`, `source/packages/core/src/pipeline/parse/route.ts`, `source/packages/core/test/pipeline/condition.test.ts` — covers AC-008, AC-056, AC-057, AC-058, AC-060
- [ ] T007 [Core] Agent block and the text and tag lists — `source/packages/core/src/pipeline/parse/agent.ts`, `source/packages/core/src/pipeline/parse/lists.ts`, `source/packages/core/test/pipeline/agent.test.ts` — covers AC-047, AC-048, AC-049, AC-050, AC-051, AC-053, AC-055, AC-071, AC-072, AC-073
- [ ] T008 [Core] Block dispatch on `kind` and the block count — `source/packages/core/src/pipeline/parse/block.ts`, `source/packages/core/test/pipeline/block.test.ts` — covers AC-040, AC-041, AC-042, AC-043
- [ ] T009 [Core] Artifacts of a flow — `source/packages/core/src/pipeline/parse/artifact.ts`, `source/packages/core/test/pipeline/artifact.test.ts` — covers AC-036, AC-037, AC-038, AC-039, AC-087, AC-088
- [ ] T010 [Core] Flow object: keys, scalar fields, lists and tags — `source/packages/core/src/pipeline/parse/flow.ts`, `source/packages/core/test/pipeline/flow.test.ts` — covers AC-007, AC-008, AC-020, AC-021, AC-022, AC-023, AC-024, AC-025, AC-027, AC-029, AC-030, AC-039, AC-071, AC-072
- [ ] T011 [Core] Pipeline object and its flow list — `source/packages/core/src/pipeline/parse/pipeline.ts`, `source/packages/core/test/pipeline/pipeline.test.ts` — covers AC-011, AC-012, AC-013, AC-014, AC-019, AC-030, AC-071, AC-072, AC-086
- [ ] T012 [Core] Ids unique across the project — `source/packages/core/src/pipeline/check/ids.ts`, `source/packages/core/test/pipeline/ids.test.ts` — covers AC-018, AC-026, AC-043, AC-048, AC-068
- [ ] T013 [Core] Block references and routes inside a flow — `source/packages/core/src/pipeline/check/block-links.ts`, `source/packages/core/test/pipeline/block-links.test.ts` — covers AC-045, AC-046, AC-054, AC-059, AC-060, AC-061, AC-062
- [ ] T014 [Core] Flow names and the `next` links between flows — `source/packages/core/src/pipeline/check/flow-links.ts`, `source/packages/core/test/pipeline/flow-links.test.ts` — covers AC-028, AC-031, AC-032, AC-033, AC-034, AC-035
- [ ] T015 [Core] Rule tags name rules of the project — `source/packages/core/src/pipeline/check/rule-tags.ts`, `source/packages/core/test/pipeline/rule-tags.test.ts` — covers AC-024, AC-052, AC-070
- [ ] T016 [Core] End names an artifact of its flow — `source/packages/core/src/pipeline/check/end-artifact.ts`, `source/packages/core/test/pipeline/end-artifact.test.ts` — covers AC-064, AC-065
- [ ] T017 [Core] Default pipeline as data, imported, with its tests — `source/templates/pipeline/default.json`, `source/packages/core/src/pipeline/default.ts`, `source/packages/core/test/pipeline/default-pipeline.test.ts` — covers AC-077, AC-078, AC-079, AC-080, AC-081, AC-082, AC-083
- [ ] T018 [Core] Public namespace and the purity scan — `source/packages/core/src/pipeline/index.ts`, `source/packages/core/src/index.ts`, `source/packages/core/test/pipeline/purity.test.ts` — covers AC-084, AC-089
- [ ] T019 [Core] Every problem returned, the typed result and the table tests — `source/packages/core/src/pipeline/parse/index.ts`, `source/packages/core/test/pipeline/config.test.ts` — covers AC-001, AC-005, AC-006, AC-007, AC-008, AC-009, AC-085
- [ ] T020 [Docs] Amend the flow-model notes of the architecture to the final schema — `spec/documents/architecture.md` (§6 decision 33 and the §11 flow note) — covers no criterion

## Rationale

**Order.** The order follows the dependencies of the schema, so each task builds on tasks before it:

1. The model types and the value rules (T001) come first, because every parser and check uses them. The problem collector sits here too, since every later task reports through it.
2. The root (T002) and the two independent top-level parts (rules and brief, T003) come next. The user's suggested order put "problem paths and every-problem rule" last. It is moved to the front of the parser (T002) because every parser has to report into the collector from the first task on. The integration check of every problem (T019) stays last.
3. Argument rows (T004) come before the lists that use them: pipeline, flow and agent arguments.
4. The blocks come before the flow (deviation from the suggested order). A flow holds blocks, so the block parsers exist first: Start and End (T005), Condition and its routes (T006), Agent with its lists (T007), and the dispatch on `kind` with the count of at least two blocks (T008). Block parsing does not depend on the flow around it. The reference checks between blocks wait for the flow (T013).
5. Artifacts (T009) come before the flow (T010), which holds them. The flow object (T010) and the pipeline object (T011) follow, so the whole structure is parsed before the checks that need it.
6. The cross-checks come after the full shape is parsed: ids across the project (T012), block references (T013), flow names and `next` links (T014), rule tags (T015) and the End's artifact (T016). Each check reads the parsed structure and needs no later task.
7. The default pipeline (T017) needs all the rules to be in place, because it must parse with no problems. It is written as one task: its six flows are linked, so a partial file (for example three flows, with `plan.next` naming a missing flow) would fail the `next` check of T014 and leave the tests red.
8. The namespace and the purity scan (T018; the namespace has its own criterion, AC-089) and the integration tests of the whole config (T019) come last. The short documentation edit (T020) comes after them, so the notes point to the parser as built.

**Owner decisions applied (2026-11-19).** AC-089 added to US-017 for the namespace (T018). Domain shapes of the pipeline live in `source/packages/core/src/pipeline/model.ts`, and `.claude/rules/typescript.md` says so. The architecture notes for decision 33 and the §11 flow note point to `pipeline-schema.md` and decisions 38 to 41 (T020). Root-level problems use the path `root`. T010 and T017 stay whole. The problem order stays as written above.

**Constraints the tasks keep.**

- **Purity (AC-084, AC-085 and the TypeScript rules).** `source/packages/core/src/pipeline/` does no I/O, network or process access. The default pipeline is a JSON import resolved at build time (decision 17); core never reads a file at run time. The purity scan (T018) is an AST scan of the import specifiers and of the global names `process`, `window`, `fetch` and `import.meta.env`. It matches import specifiers, not the word `path`, because problem paths use that word in their names.
- **Deterministic parser (AC-085).** The parser visits keys in the order they are written (`Object.keys`) and never changes its input. The same value always gives the same result and the same problem list.
- **Every problem returned (US-002, AC-005).** Each parser pushes its problems into the collector and returns its value when it has one. The parser returns a discriminated result (`ParseResult`): a typed config only when there are no problems (AC-006). The cross-checks run on whatever part of the structure parsed, so one error does not hide another. The problems come in the order the parser meets them: the shape pass first, then the cross-checks in a fixed walk (rules, then the pipeline's arguments, then each flow in order: its id, its arguments, its blocks).
- **No new libraries.** Pure TypeScript with the existing Vitest setup. Code points are counted with `Array.from(text).length`. Tests use fixed fixtures; no test reads the clock or the network.
- **Types.** Domain shapes live in `pipeline/model.ts`; other code imports them and does not redeclare them. Unknown input is `unknown` and is narrowed in the parser.

**Decisions that shaped it.**

- Decision 17 and the tsconfig include (`../../templates/pipeline/*.json`) fix the path of the default pipeline: `source/templates/pipeline/default.json`. The path is recreated (the folder does not exist yet). No decision text needs to change.
- Decision 18: ids are file-safe and unique across flows, blocks, arguments and rules, and agent names are unique among agents (T012).
- Decisions 16, 20, 21, 26, 27, 28 and 37 set the pipeline fields, the rules, the rule tags, the Agent's model, tools, reads and writes, the text limits (in code points) and the optional brief (T003, T007, T011, T015).
- Decisions 25 and 40 and the schema of `pipeline-schema.md` set the Condition, its routes and the round limit of 1 to 5 (T006, T013).
- Decisions 38 and 39 set the flow links by `next`, the connected flows and the flow's required fields (T010, T014).
- `pipeline-schema.md` (final, owner-approved 2026-11-19) replaces the connection model of decision 33. Where decision 33's text disagrees with the schema, the plan follows the schema.

**Later work.** F-03 (the structural rules: reachability, one Start and End per flow, no cycle, the warning for a retry without a round limit) builds on this parser and is not in F-02. F-04 (the generator), F-05 (the Pipeline tab and the UI), F-06 (the analyzer's review) and the later features depend on F-02 and start after it is verified.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Docs]` | Documentation changes required by the feature |

Add layer tags matching the modules in `architecture.md` §3.
