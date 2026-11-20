# Implementation Plan — Structural checks (F-03)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Source of the criteria: `stories.md` (AC-001 to AC-037, all `[auto]`). Paths are relative to the repository root. The analysis lives in `source/packages/core/src/pipeline/analyze/`, one module per group of rules (decision 10). Tests live in `source/packages/core/test/pipeline/`, and each test name carries `F-03 AC-0xx`.

**Reuse:** the F-02 cross-checks in `source/packages/core/src/pipeline/check/` (`ids.ts`, `rule-tags.ts`, `flow-links.ts`, `block-links.ts`, `end-artifact.ts`) are pure functions over `ProjectConfig` and already return the problems of their rules. The parser calls them. F-03 calls the same functions and wraps each problem as a finding, so each rule has one implementation (features.md F-03). F-03 adds only the rules the parser does not check: start and end counts, reachability, and the wiring of condition outputs. Paths keep F-02's form (`root.pipeline.flows.0.blocks.2.true.to`).

## Decision (owner, 2026-11-19): a return needs a round limit

A route `{to}` back to an earlier agent with no `roundLimit` is a **blocker** at the route's `to` path, as F-02 already refuses it (`block-links.ts`, F-02 AC-061). The approved AC-019 said warning; the owner chose the blocker so that the analysis and the parser agree. `stories.md` AC-019 and `features.md` F-03 drop the retry warning (T010).

## Tasks

- [x] T001 [Core] Finding type, rule modules in a fixed list, and the analysis entry: `source/packages/core/src/pipeline/analyze/finding.ts` (type `Finding` `{ severity: 'blocker' | 'warning', rule, path, message }`, the rule-id strings, and an internal position of flow index, block index and slot, with `-1` for a pipeline-level item); `source/packages/core/src/pipeline/analyze/index.ts` (`analyzeStructure(config: ProjectConfig): Finding[]` runs the rule modules in a fixed list, sorts the findings by position (pipeline level first, then flow, then block, then route `true` before `false`), and removes the positions from the result); `source/packages/core/test/pipeline/analyze-fixture.ts` (a valid `ProjectConfig` literal with one flow, Start → Agent → End, with `index` set on every list item, and a builder that changes one part of it); `source/packages/core/test/pipeline/analyze.test.ts` — covers AC-033 (same result twice, input not changed), AC-034 (every finding has severity, rule, path and message; no other severity)
- [x] T002 [Core] Start and End per flow: `source/packages/core/src/pipeline/analyze/start-end.ts` (blocker at the flow's path with no Start; blocker at the second Start's path when there are two; blocker at the flow's path with no End; an empty flow gets both; a pipeline with no flow gives a blocker at `root.pipeline.flows`), registered in `analyze/index.ts`; `source/packages/core/test/pipeline/analyze-start-end.test.ts` (table-driven) — covers AC-001, AC-002, AC-003, AC-004, AC-005, AC-006
- [x] T003 [Core] Identity and required text: `source/packages/core/src/pipeline/check/primitives.ts` (export `isFileSafeId`, the existing `ID_PATTERN` test, with no change of behaviour); `source/packages/core/src/pipeline/analyze/text.ts` (a flow id that is not file-safe, or is `pipeline`, is a blocker at its `id` path; an agent name that is not file-safe is a blocker at its `name` path; a flow with a blank name or blank body is a blocker at that path; an agent with a blank description is a blocker at its `description` path); registered in `analyze/index.ts`; `source/packages/core/test/pipeline/analyze-text.test.ts` — covers AC-026, AC-027 (file-safe part), AC-028, AC-029
- [x] T004 [Core] Reused id and tag checks: `source/packages/core/src/pipeline/analyze/reuse.ts` (wraps `checkIdsUnique` from `check/ids.ts`, so a repeated flow id is a blocker at the later `id` path and a repeated agent name a blocker at the later `name` path; wraps `checkRuleTags` from `check/rule-tags.ts`, so a tag that names no rule is a blocker at the tag's path); registered in `analyze/index.ts`; `source/packages/core/test/pipeline/analyze-names.test.ts` — covers AC-025, AC-027 (duplicate part), AC-030
- [x] T005 [Core] Flow links and block links from F-02: `source/packages/core/src/pipeline/analyze/links.ts` (wraps `checkFlowLinks` from `check/flow-links.ts`: a `next` that names no flow or itself, a flow named by two `next`s, a chain that loops, a flow with neither link in a pipeline of more than one flow; wraps `checkBlockLinks` from `check/block-links.ts` for the Start and Agent `next` links only: a `next` that names another flow's block or no block, and a `next` that closes a loop); registered in `analyze/index.ts`; `source/packages/core/test/pipeline/analyze-links.test.ts` — covers AC-007, AC-008, AC-009, AC-010, AC-011, AC-012, AC-014
- [x] T006 [Core] Condition outputs and routes: `source/packages/core/src/pipeline/analyze/outputs.ts` (a condition with no `true` or no `false` route is a blocker at the condition's path that names the missing output); `source/packages/core/src/pipeline/check/block-links.ts` (a guard only: a missing route or `next` is skipped instead of read, so a partial model is analysed without a throw; F-02 test results do not change); `source/packages/core/src/pipeline/analyze/routes.ts` (wraps the route checks of `checkBlockLinks`: a route to another flow's block or to no block, a route to the condition itself or to an earlier start, condition or end, a `roundLimit` on a route to a later block, and a back route with no `roundLimit` as a blocker at its `to` path); registered in `analyze/index.ts`; `source/packages/core/test/pipeline/analyze-routes.test.ts` (table-driven) — covers AC-013, AC-015, AC-016, AC-017, AC-018, AC-019, AC-020, AC-035 (partial model: a condition with no routes and a start with no `next` give findings without a throw)
- [x] T007 [Core] Reachability of blocks: `source/packages/core/src/pipeline/analyze/reach.ts` (inside a flow with exactly one Start, the blocks reached from that Start along `next` links and condition routes, with `{stop: true}` not followed and a route to a missing block not followed; a flow with two Starts is checked from the first; a flow with no Start is skipped, since T002 reports it; a block not reached gets one blocker at its path); registered in `analyze/index.ts`; `source/packages/core/test/pipeline/analyze-reach.test.ts` — covers AC-021, AC-022
- [ ] T008 [Core] Reachability of flows: add to `source/packages/core/src/pipeline/analyze/reach.ts` (the first flow is the first flow, in pipeline order, that no flow's `next` names; flows reached from it along `next` are reachable; a flow not reached gets one blocker at its flow path, and its blocks are not reported; when two flows have no incoming `next`, the second is reported unless a chain from the first reaches it); `source/packages/core/test/pipeline/analyze-reach.test.ts` (extended) — covers AC-023, AC-024
- [ ] T009 [Core] Public surface, default pipeline and the full order: `source/packages/core/src/pipeline/index.ts` (exports `analyzeStructure` and the types `Finding` and `Severity`, and no other name); `source/packages/core/test/pipeline/namespace.test.ts` (the root exposes `pipeline.analyzeStructure`, and the expected export list gains only the new names); `source/packages/core/test/pipeline/analyze-default.test.ts` (the default pipeline in `source/templates/pipeline/default.json` gives no finding; a minimal valid pipeline gives none); `source/packages/core/test/pipeline/analyze-order.test.ts` (one config with problems from several rules returns every finding in document order) — covers AC-031, AC-032, AC-036, AC-037
- [ ] T010 [Docs] Record the analysis as built: `spec/documents/architecture.md` §12 (the analysis is `analyzeStructure`; the rules reuse the F-02 cross-checks; a return without a `roundLimit` is a blocker, not the retry warning); `spec/documents/features.md` (the F-03 scope line: drop "a warning for a retry with no limit"); no criterion is covered by this task, it documents the rules that T001 to T009 build

## Rationale

- **Entry first (T001).** One function returns every finding in one fixed order, and each rule module adds itself to one list. The sort is set in one place, so every later rule inherits the document order that AC-032 requires. The valid fixture is shared by the rule tests, so each test changes one thing.
- **Start and end before the rest (T002).** The reachability rules need a Start to start from. A missing Start is reported here, once.
- **Identity and text (T003, T004).** These are not links, so they can run before the link rules. The file-safe test is exported from `primitives.ts` so the analysis and the readers use one pattern.
- **Reuse before new routes (T004 to T006).** The F-02 cross-checks already decide loops, links and back routes. Wrapping them keeps one implementation. The only change to F-02 code is the guard in T006, which stops a crash on a model that did not parse; F-02's own tests keep their results.
- **Reachability last (T007, T008).** Reachability follows links and routes, and it must not report a link that is already missing, so the link rules come first. The block rule uses the Start of each flow; the flow rule uses the links between flows.
- **Namespace and default pipeline last (T009).** The default pipeline check needs every rule in place, and the public names come after they exist.
- **Docs last (T010).** The rules as built are written down once they exist.

**Interpretations** (taken at Specify and carried into the rules):

- The pipeline's Start is the Start of the first flow, in pipeline order (decisions 30 and 33). The first flow is the first in pipeline order that no flow's `next` names.
- A flow whose Start count is not one is not checked for block reachability inside it; T002 reports the count.
- A link or route that names a missing item is reported once, by the link and route rules, and is not followed by the reachability rules.
- A route to the condition itself is refused (AC-017), since it does not go to an earlier block.

**Libraries:** none added. The rules are pure TypeScript over `ProjectConfig` (decision 19). `analyze/` is core code, so the F-02 purity scan covers it with no change.

**Layer tag:** all code tasks are `[Core]`. The default pipeline file is only read. T010 is `[Docs]`.

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
| AC-006 | T002 |
| AC-007 | T005 |
| AC-008 | T005 |
| AC-009 | T005 |
| AC-010 | T005 |
| AC-011 | T005 |
| AC-012 | T005 |
| AC-013 | T006 |
| AC-014 | T005 |
| AC-015 | T006 |
| AC-016 | T006 |
| AC-017 | T006 |
| AC-018 | T006 |
| AC-019 | T006 |
| AC-020 | T006 |
| AC-021 | T007 |
| AC-022 | T007 |
| AC-023 | T008 |
| AC-024 | T008 |
| AC-025 | T004 |
| AC-026 | T003 |
| AC-027 | T003, T004 |
| AC-028 | T003 |
| AC-029 | T003 |
| AC-030 | T004 |
| AC-031 | T009 |
| AC-032 | T009 |
| AC-033 | T001 |
| AC-034 | T001 |
| AC-035 | T006 |
| AC-036 | T009 |
| AC-037 | T009 |
