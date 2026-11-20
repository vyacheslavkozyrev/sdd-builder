# User Stories — Structural checks (F-03)

Feature entry: `spec/documents/features.md` → F-03
Requirements owned by this feature: the F-03 scope items in `features.md` (as amended 2026-11-18); `architecture.md` §12 (structural rules); decisions 18 (file-safe ids), 21 (rule tags), 35 (the `pipeline` flow id), 38 (linear flows, no loops), 39 (flow requires name and body; flow connected), 40 (a failed check's retry)

## Out of Scope

- Shape, value types, unknown keys, id uniqueness across the project, file-safe ids, route shape, the round limit range (1 to 5), the end's `outcome` and `producedArtifact`, the `enabled` and `disabled` keys, the blank-or-missing refusals of the parser, and the parse-time refusals of backward `next` links, loops, flow connectivity and back routes without a `roundLimit`. These stay in the parser (F-02). The structural rules that F-02's cross-checks already implement (ids, rule tags, flow links, block links and end artifacts) are reused by F-03, not written again, so the parser and the analysis share one implementation for the builder marks and the analyzer; the parser's behaviour does not change in this feature (its one change is a guard against a partial model, planned in T006).
- The iteration-source warning for agents. Architecture decision 29 supersedes it, and the analysis does not check scope.
- The generator's refusal checks (`configProblems`, `planGeneration`) and their appearance in the analysis (F-04, F-06).
- Brief and stack checks, the LLM review, and the `/analyze` endpoint (F-06, F-14).
- Drawing the findings on the builder: the structure marks and the notification (F-11).
- Any change to the default pipeline's content (`source/templates/pipeline/default.json`). F-03 checks its structure only.
- Flow gates and approval. They are not blocks and carry no route, so the analysis does not check them.

## Reading of §12 for this model

The pipeline holds flows and no blocks of its own (decision 30). So:

- The pipeline's Start is the Start block of the first flow, in pipeline order. The first flow is the first flow, in pipeline order, that no flow's `next` names.
- A block's kinds are `start`, `agent`, `condition` and `end`. A Check of §12 is a `condition` block.
- A Connection is the `next` of a `start` or `agent` block, or the `next` of a flow. An `end` has no `next`.
- A route is the `true` or the `false` output of a `condition`: `{to}`, `{to, roundLimit}` or `{stop: true}`. A route is not a Connection and is not part of a loop check.
- A retry is a route to an earlier agent of the same flow. With a `roundLimit` it is the retry of decision 40. Without one it is a blocker, not the warning of §12: the parser already refuses it (F-02 AC-061, owner decision of 2026-11-19), and the analysis gives the same answer (owner decision of 2026-11-19, recorded in the F-03 plan).
- Path notation: `pipeline.flows.<n>` for a flow, `pipeline.flows.<n>.blocks.<m>` for a block, `…blocks.<m>.true` and `…false` for a condition's routes, and `…next` for a `next`. Paths use the index of the item in its list.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-03 AC-003`).

This feature is an enabler: the stories are written for the developer who builds the builder marks, the analyzer and the generator on top of the checks. Every finding carries a severity (`blocker` or `warning`), a rule id, the path of the item it names, and a message.

### US-001: Each flow has one Start and at least one End

**As a** developer
**I want to** have the checks refuse a flow with no start, with two starts, or with no end
**So that** every flow the generator writes has one entry and a way out

**Requirements:** F-03 scope (one start per flow, at least one end per flow); §12; the pipeline has flows

#### Acceptance Criteria

- AC-001 `[auto]`: a flow with one Start block and one End block has no finding.
- AC-002 `[auto]`: a flow with no Start block gives a blocker at the flow's path.
- AC-003 `[auto]`: a flow with two Start blocks gives a blocker at the second Start's path.
- AC-004 `[auto]`: a flow with no End block gives a blocker at the flow's path; a flow with two or more End blocks has no finding.
- AC-005 `[auto]`: an empty flow (no blocks) gives one blocker for the missing Start and one for the missing End, both at the flow's path.
- AC-006 `[auto]`: a pipeline with no flow gives a blocker at `pipeline.flows`.

### US-002: Flows are linked in one line

**As a** developer
**I want to** have the checks refuse a flow link that names nothing, names itself, is shared, or leaves a flow unconnected
**So that** the pipeline is one line of flows, each reached from the first

**Requirements:** F-03 scope (connections join flows of the pipeline; a flow must be connected); decisions 38 and 39

#### Acceptance Criteria

- AC-007 `[auto]`: a flow's `next` that names no flow of the pipeline gives a blocker at the `next` path.
- AC-008 `[auto]`: a flow's `next` that names its own id gives a blocker at the `next` path.
- AC-009 `[auto]`: two flows whose `next` names the same flow give a blocker at the second `next`'s path.
- AC-010 `[auto]`: in a pipeline of more than one flow, a flow with neither an incoming nor an outgoing `next` gives a blocker at the flow's path; in a pipeline of one flow, that flow with no `next` has no finding.

### US-003: No loops among flows or blocks

**As a** developer
**I want to** have the checks refuse a loop of flow links or of block Connections
**So that** every flow and the pipeline have one order to run in, and a retry is only ever a route with a round limit

**Requirements:** F-03 scope (no cycles); decision 38 (no loops); §12 (a route is a retry, not a Connection)

#### Acceptance Criteria

- AC-011 `[auto]`: a chain of flow `next` links that returns to a flow already in the chain gives one blocker at the `next` that closes it, for a two-flow loop and for a three-flow loop; a chain that ends without a `next` has no finding.
- AC-012 `[auto]`: a chain of `next` links among the blocks of one flow that returns to a block already in the chain gives one blocker at the `next` that closes it; a block whose `next` names itself is such a chain.
- AC-013 `[auto]`: a condition's route that goes back to an earlier agent with a `roundLimit` is not a link in a chain and gives no loop finding.

### US-004: Block links and condition routes name items in their own flow

**As a** developer
**I want to** have the checks refuse a link or a route that names a block outside its flow, names nothing, or leaves a condition output unwired
**So that** no link in the generated process points at a missing or foreign item

**Requirements:** F-03 scope (connections join blocks of one flow; both outputs of every Check wired; back routes only to earlier blocks); §12; decision 40

#### Acceptance Criteria

- AC-014 `[auto]`: a Start or Agent `next` that names a block of another flow, or no block, gives a blocker at the `next` path.
- AC-015 `[auto]`: a condition with no `true` route, or no `false` route, gives a blocker at the condition's path that names the missing output.
- AC-016 `[auto]`: a route whose `to` names a block of another flow, or no block, gives a blocker at the route's `to` path.
- AC-017 `[auto]`: a route whose `to` names the condition itself, or an earlier block of its flow that is not an agent (a start, a condition or an end), gives a blocker at the route's `to` path, with or without a `roundLimit`.
- AC-018 `[auto]`: a route with a `roundLimit` whose `to` names a later block gives a blocker at the route's `to` path, because a round limit is only for a retry to an earlier agent.
- AC-019 `[auto]`: a route `{to}` to an earlier agent of its flow with no `roundLimit` gives a blocker at the route's `to` path, with the message that a return needs a `roundLimit` (as F-02 AC-061 refuses it).
- AC-020 `[auto]`: a route `{to, roundLimit}` to an earlier agent of the same flow has no finding; a route `{to}` to a later block of the same flow has no finding; `{stop: true}` has no finding.

### US-005: Every block and flow is reachable

**As a** developer
**I want to** have the checks refuse a block or flow that nothing reaches
**So that** no part of the process is written and never run

**Requirements:** F-03 scope (reachability); §12; decision 38 (every flow reachable from the pipeline's first flow)

#### Acceptance Criteria

- AC-021 `[auto]`: a block that no `next` or route reaches from its flow's Start gives a blocker at the block's path.
- AC-022 `[auto]`: a block reached only through a condition route from a reachable block of its flow is reachable and has no finding.
- AC-023 `[auto]`: a flow that is not reached from the first flow along the flow `next` links gives one blocker at the flow's path; the blocks of that flow are not reported separately.
- AC-024 `[auto]`: when two flows have no incoming `next`, the first in pipeline order is the first flow; the other is reached only through a chain from it, and otherwise gives a blocker at its path (AC-023).

### US-006: Names, ids and required text

**As a** developer
**I want to** have the checks refuse a flow or agent with a clashing, unsafe or blank name, and a rule tag that names no rule
**So that** every generated file has a safe, unique name and every tag points at a real rule

**Requirements:** F-03 scope (unique file-safe names); decisions 18, 21, 35 and 39

#### Acceptance Criteria

- AC-025 `[auto]`: two flows with the same id give a blocker at the second flow's `id` path.
- AC-026 `[auto]`: a flow id that is not file-safe (lowercase letters, digits and hyphens, starting with a letter), or that is `pipeline`, gives a blocker at the flow's `id` path.
- AC-027 `[auto]`: two agents with the same name give a blocker at the second agent's `name` path; an agent name that is not file-safe gives a blocker at its `name` path.
- AC-028 `[auto]`: a flow with a blank name or a blank body gives a blocker at its `name` or `body` path; a flow with a description or arguments left empty has no finding for them.
- AC-029 `[auto]`: an agent with a blank description gives a blocker at its `description` path.
- AC-030 `[auto]`: a rule tag on the pipeline, a flow or an agent that names no rule gives a blocker at the tag's path; a tag that names a rule has no finding.

### US-007: The analysis as one function

**As a** developer
**I want to** call one pure function that returns every structural finding of a pipeline, in a fixed order, and never fails on a model that is still being edited
**So that** the builder marks, the analyzer and the generator all show the same problems in the same order

**Requirements:** F-03 scope (pure functions, one implementation per rule); §5 decision 10; decision 34

#### Acceptance Criteria

- AC-031 `[auto]`: the default pipeline (`source/templates/pipeline/default.json`) gives no finding.
- AC-032 `[auto]`: a pipeline with several problems returns every finding, not only the first, in document order: pipeline-level findings first, then each flow in pipeline order with its flow-level findings, then its blocks in list order, with a condition's `true` route before its `false` route.
- AC-033 `[auto]`: analysing the same pipeline twice gives the same list in the same order, and the pipeline is not changed by the analysis (equal before and after).
- AC-034 `[auto]`: every finding has a severity of `blocker` or `warning`, a rule id, a path and a message; no other severity is returned.
- AC-035 `[auto]`: a model that did not pass the parser (a flow with no `next`, no description and no arguments; a condition with no routes; a start with no `next`) is analysed without throwing, and each gap gives its finding.
- AC-036 `[auto]`: a minimal valid pipeline (one flow, Start → Agent → End, no `next`) has no finding.
- AC-037 `[auto]`: the analysis is exposed as `pipeline.analyzeStructure` from the `pipeline` namespace, and F-03 adds no other name to the namespace.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| One start per flow | AC-001, AC-002, AC-003, AC-005 |
| At least one end per flow | AC-004, AC-005 |
| The pipeline has flows; the first flow starts it | AC-006, AC-023, AC-024 |
| Connections join blocks of one flow | AC-014 |
| Flow links join flows of the pipeline, one target, one incoming, never itself | AC-007, AC-008, AC-009 |
| A flow must be connected unless the pipeline has one flow (decision 39) | AC-010 |
| No loops among flows (decision 38) | AC-011 |
| No loops among blocks' Connections | AC-012 |
| Both outputs of every Check wired | AC-015 |
| Route targets name a block of the same flow | AC-016 |
| Back routes only to earlier agents of the same flow | AC-017, AC-018, AC-020 |
| A return to an earlier agent needs a round limit (blocker, F-02 AC-061) | AC-019 |
| A retry with a round limit is not a loop (decision 40) | AC-013 |
| Every block reachable from its flow's Start | AC-021, AC-022 |
| Every flow reachable from the pipeline's first flow | AC-023, AC-024 |
| Unique file-safe names of flows and agents (decisions 18, 35) | AC-025, AC-026, AC-027 |
| A flow requires a name and a body (decision 39) | AC-028 |
| Rule tags name existing rules (decision 21) | AC-030 |
| Findings are pure, ordered and shaped (§5 decision 10) | AC-032, AC-033, AC-034, AC-035 |
| The default pipeline is accepted | AC-031, AC-036 |
| Namespace exposure | AC-037 |
