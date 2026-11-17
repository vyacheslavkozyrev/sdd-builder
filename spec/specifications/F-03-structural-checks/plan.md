# Implementation Plan — Structural checks (F-03)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Paths are relative to the repository root. The checks live in `source/packages/core/src/pipeline/analyze/`, one module per group of rules (decision 10). Tests live in `source/packages/core/test/pipeline/`, and each test name carries `F-03 AC-0xx`.

## Tasks

- [x] T001 [Core] Finding type, the analysis entry and the fixture: `source/packages/core/src/pipeline/analyze/finding.ts` (type `Finding` `{ severity: 'blocker' | 'warning', path, message }`; an internal position of flow index and block index, `-1` for a pipeline-level item); `source/packages/core/src/pipeline/analyze/index.ts` (`analyzeStructure(config: ProjectConfig): Finding[]` runs the rule modules in a fixed list, which starts empty, and sorts the findings by flow, then block, then rule order, then path; the positions are removed from the result); `source/packages/core/test/pipeline/analyze-fixture.ts` (a valid `ProjectConfig` literal: one flow, Start → Agent → End, and a builder that changes one part of it); `source/packages/core/test/pipeline/analyze.test.ts` — covers AC-025 in part (the sort, proved with a stub rule in the test; T008 proves it across all rules), AC-026 (same result twice, input not changed), AC-027 (severity, path and message only), AC-030 (the valid fixture returns an empty list)
- [x] T002 [Core] Flow start and end, and the first flow: `source/packages/core/src/pipeline/analyze/start-end.ts` (one blocker at the flow's path when a flow has no Start; one blocker at the second Start's path when it has two; one blocker at the flow's path when it has no End; an empty flow gets both the Start and the End blocker; a pipeline with no flow gives a blocker at `pipeline.flows`); registered in `analyze/index.ts`; `source/packages/core/test/pipeline/start-end.test.ts` (table-driven) — covers AC-001, AC-002, AC-003, AC-004, AC-005
- [x] T003 [Core] Block and route references: `source/packages/core/src/pipeline/analyze/references.ts` (a block's `connectedTo` must name a block of its own flow, blocker at its `connectedTo` path otherwise; a Check route must name a block of its own flow or be `stop`, blocker at the route's path otherwise); `source/packages/core/test/pipeline/references.test.ts` — covers AC-006, AC-007, AC-009, AC-010 (the stop route accepted)
- [ ] T004 [Core] Flow links and rule tags: add to `analyze/references.ts` (a flow's `connectedTo` must name a flow of the pipeline, blocker at its path otherwise; a rule tag on the pipeline, a flow or an agent must name an id of `rules`, blocker at the tag's path otherwise); `source/packages/core/test/pipeline/references-flows-tags.test.ts` — covers AC-008, AC-011
- [ ] T005 [Core] Loops among Connections: `source/packages/core/src/pipeline/analyze/cycles.ts` (depth-first search over the block Connections of each flow, and over the flow Connections of the pipeline; one blocker per loop, at the Connection that closes it, in document order; a `connectedTo` that names itself is a loop; a link to a missing id is not followed, since T003 and T004 report it; Check routes are not in the graph); `source/packages/core/test/pipeline/cycles.test.ts` — covers AC-012, AC-013, AC-014
- [ ] T006 [Core] Check routes and retries: `source/packages/core/src/pipeline/analyze/routes.ts` (a route to an earlier block of the same flow is a back route; a route to the Check itself is a blocker at its path, since it is not an earlier block; a back route with no `roundLimit` is a warning at its path; a route to a later block has no finding; routes that T003 already refused are skipped); `source/packages/core/test/pipeline/routes.test.ts` (table-driven) — covers AC-015, AC-016, AC-017, AC-018
- [ ] T007 [Core] Reachability: `source/packages/core/src/pipeline/analyze/reach.ts` (inside a flow with exactly one Start, the blocks reached from that Start along Connections and Check routes, stop routes not followed, the first Start counts when a flow has two, and a flow with no Start is not checked here; a flow reached from the first flow through flow Connections is reachable; a flow not reached gets one blocker at the flow, and a block not reached from its own Start gets one blocker at the block); `source/packages/core/test/pipeline/reach.test.ts` — covers AC-019, AC-020, AC-021, AC-022, AC-023
- [ ] T008 [Core] Default pipeline, disabled keys and the namespace: `source/packages/core/src/pipeline/index.ts` exports `analyzeStructure` and the type `Finding`; `source/packages/core/test/pipeline/analyze-default.test.ts` (the default pipeline gives no blocker and exactly two warnings, one for each route into `build-implement` with no `roundLimit`) — covers AC-024; `source/packages/core/test/pipeline/disabled.test.ts` (a block or flow with an `enabled` or a `disabled` key is refused by `parseProjectConfig` as an unknown key at its path) — covers AC-028; `source/packages/core/test/pipeline/analyze-order.test.ts` (one config with problems from several rules returns every finding in document order) — covers AC-025 across rules; `source/packages/core/test/pipeline/namespace.test.ts` gains the check that `pipeline.analyzeStructure` is exposed and no other name is added to the root — covers AC-029

## Rationale

- **Entry and fixture first (T001).** One function returns every finding in a fixed order, and each rule module adds itself to one list. The order (flow, then block, then rule) is set in one place, so every later rule inherits the document order required by AC-025. The valid fixture is shared by all the rule tests, so each test changes one thing.
- **Start and end before references (T002).** A flow needs one Start before its blocks can be checked for reachability (T007), and a pipeline needs a flow before any link can be tested.
- **References before loops and reachability (T003, T004).** Loops and reachability follow links. A link to a missing item is not followed, so these two rules must not be asked to report missing targets; those are reported once, by the reference rules.
- **Loops before routes (T005, T006).** Back routes are the one kind of loop that is allowed, so the loop rule has to ignore routes before the route rule adds its own checks. T006 then sees a graph without Connection loops.
- **Reachability after the routes (T007).** Reachability counts Check routes as edges, so the routes must be known. A back route makes a block reachable (AC-020), so this order follows the data.
- **Default pipeline, disabled keys and namespace last (T008).** The default pipeline check needs every rule in place. The disabled-key test proves a parser rule already in F-02 (decision 34), so no code is added for it. The namespace is the only change to `pipeline/index.ts` and comes after the names exist.

**Interpretations** (taken at Specify and carried into the rules):

- The pipeline's Start is the Start of the first flow, in pipeline order (the model has no pipeline-level blocks; decisions 30 and 33).
- A Check route to the Check itself is refused, since it does not go to an earlier block (AC-017).
- A flow whose Start count is not one is not checked for reachability inside it; the start rule already reports it (T007).
- A Connection or route that names a missing item is reported once, by the reference rules (T003, T004), and is not followed by the loop and reachability rules.

**Libraries:** none added. The rules are pure TypeScript over `ProjectConfig` (decision 19). `analyze/` is core code, so the F-02 purity scan (AC-035) covers it with no change.

**Layer tag:** all tasks are `[Core]`. No UI, API or data-file change is needed, since the default pipeline file is only read.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Core]` | `source/packages/core`: the pure structural checks and their tests |
| `[Build]` | Project setup, manifests, scripts, and the default pipeline data file |
| `[Docs]` | Documentation changes required by the feature |

## Coverage check

| Criterion | Task |
|---|---|
| AC-001 | T002 |
| AC-002 | T002 |
| AC-003 | T002 |
| AC-004 | T002 |
| AC-005 | T002 |
| AC-006 | T003 |
| AC-007 | T003 |
| AC-008 | T004 |
| AC-009 | T003 |
| AC-010 | T003 |
| AC-011 | T004 |
| AC-012 | T005 |
| AC-013 | T005 |
| AC-014 | T005 |
| AC-015 | T006 |
| AC-016 | T006 |
| AC-017 | T006 |
| AC-018 | T006 |
| AC-019 | T007 |
| AC-020 | T007 |
| AC-021 | T007 |
| AC-022 | T007 |
| AC-023 | T007 |
| AC-024 | T008 |
| AC-025 | T001, T008 |
| AC-026 | T001 |
| AC-027 | T001 |
| AC-028 | T008 |
| AC-029 | T008 |
| AC-030 | T001 |
