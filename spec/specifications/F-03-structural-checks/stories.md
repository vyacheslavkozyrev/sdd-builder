# User Stories — Structural checks (F-03)

Feature entry: `spec/documents/features.md` → F-03
Requirements owned by this feature: the F-03 scope items in `features.md`; `architecture.md` §12 (structural rules); decision 21 (rule tags that name no rule); decision 34 (blocks and flows have no enabled property)

## Out of Scope

- Shape and uniqueness refused by the parser (F-02): unknown keys, a Check without both outputs, unique ids across the pipeline, unique agent names, unique argument names, one nesting level, length and list caps. F-03 does not repeat them. The file-safe name of an agent and the uniqueness of agent names (F-02 AC-010) and of argument names (F-02 AC-022) are already refused there.
- The iteration-source warning for agents. Architecture decision 29 (2026-11-16) supersedes it, and the analysis no longer checks scope.
- The generator's refusal checks (`configProblems`, `planGeneration`) and their appearance in the analysis (F-04, F-06).
- Brief and stack checks, the LLM review, and the `/analyze` endpoint (F-06, F-14).
- Live marks drawn on the builder (F-11).
- A route on a flow link. A flow link carries a gate, and a gate's false output stops the process (decision 33). No back route is defined between flows.
- Any change to the default pipeline's content. F-03 checks its structure only.

## Reading of §12 for this model

The pipeline holds flows and no blocks of its own (decision 30 and decision 33). So:

- The pipeline's Start is the Start block of the first flow, in pipeline order.
- The "at least one End" rule of §12 applies to every flow.
- A Connection is a `connectedTo` on a Start, Agent or Approval block, or on a flow. A Check's outputs are routes, not Connections.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-03 AC-003`).

This feature is an enabler: the stories are written for the developer who builds the builder marks, the analyzer and the generator on top of the checks. Every finding carries a severity (`blocker` or `warning`), the path of the item it names, and a message.

### US-001: Each flow starts once and ends

**As a** developer
**I want to** have the checks refuse a flow with no start, with two starts, or with no end
**So that** every flow the generator writes has one entry and a way out

**Requirements:** F-03 scope (one start per flow, one end per flow, a pipeline with flows); §12

#### Acceptance Criteria

- AC-001 `[auto]`: a flow with one Start block and one End block has no finding.
- AC-002 `[auto]`: a flow with no Start block gives a blocker at the flow's path.
- AC-003 `[auto]`: a flow with two Start blocks gives a blocker at the second Start's path.
- AC-004 `[auto]`: a flow with no End block gives a blocker at the flow's path; an empty flow (no blocks) gives one blocker for the missing Start and one for the missing End.
- AC-005 `[auto]`: a pipeline with no flow gives a blocker at the pipeline's `flows` path.

### US-002: Connections and routes name items in their own scope

**As a** developer
**I want to** have the checks refuse a Connection, route or rule tag that names nothing valid
**So that** no link in the generated process points at a missing or foreign item

**Requirements:** F-03 scope (connections join blocks of one flow or flows of the pipeline); decision 21

#### Acceptance Criteria

- AC-006 `[auto]`: a block's `connectedTo` that names a block of another flow gives a blocker at that block's `connectedTo` path.
- AC-007 `[auto]`: a block's `connectedTo` that names no block gives a blocker at that path.
- AC-008 `[auto]`: a flow's `connectedTo` names a flow of the pipeline and is accepted; a flow's `connectedTo` that names no flow gives a blocker at that path.
- AC-009 `[auto]`: a Check route that names a block of another flow, or no block, gives a blocker at the route's path.
- AC-010 `[auto]`: a Check route with `stop: true` is accepted with no finding.
- AC-011 `[auto]`: a rule tag on the pipeline, a flow or an agent that names no rule gives a blocker at the tag's path; a tag that names a rule has no finding.

### US-003: No loops among Connections

**As a** developer
**I want to** have the checks refuse a loop of Connections
**So that** a flow or the pipeline always has an order to run in, and a retry is only ever written as a Check route

**Requirements:** F-03 scope (no cycles); §12 (a back route is a Check's retry, not a Connection)

#### Acceptance Criteria

- AC-012 `[auto]`: a loop among the Connections of one flow gives one blocker at the Connection that closes it, and a chain with no loop has no finding; a block whose `connectedTo` names itself is a loop.
- AC-013 `[auto]`: a loop among the flow Connections of the pipeline gives one blocker at the flow link that closes it; a flow whose `connectedTo` names itself is a loop.
- AC-014 `[auto]`: a Check route that goes back to an earlier block is not a Connection, so it is not reported as a loop (it is checked by AC-015 to AC-018).

### US-004: Check routes and retries

**As a** developer
**I want to** have the checks accept a retry only where it goes back inside its own flow, and warn when it has no limit
**So that** a retry always stays inside its flow and a bounded loop is the default

**Requirements:** F-03 scope (both outputs of every Check wired; back routes only to earlier blocks; retry with no limit is a warning); §12

#### Acceptance Criteria

- AC-015 `[auto]`: a Check route to an earlier block of the same flow is a back route and is accepted; with a `roundLimit` it has no finding.
- AC-016 `[auto]`: a Check route to a later block of the same flow is accepted with no finding and no warning.
- AC-017 `[auto]`: a Check route to the Check itself gives a blocker at the route's path, because the route does not go to an earlier block.
- AC-018 `[auto]`: a back route with no `roundLimit` gives a warning at the route's path; with a `roundLimit` it has no finding. A config whose only findings are warnings has no blocker.

### US-005: Every block and flow is reachable

**As a** developer
**I want to** have the checks refuse a block or flow that nothing reaches
**So that** no part of the process is written and never run

**Requirements:** F-03 scope (reachability from the pipeline's Start); §12

#### Acceptance Criteria

- AC-019 `[auto]`: a block that no Connection or route reaches from its flow's Start gives a blocker at the block's path.
- AC-020 `[auto]`: a block reached only by a back route from a reachable block of the same flow is reachable and has no finding.
- AC-021 `[auto]`: a flow that no flow Connection reaches from the first flow gives a blocker at the flow's path.
- AC-022 `[auto]`: a flow reached through a chain of flow Connections from the first flow is reachable and has no finding; a flow reached only from an unreachable flow is unreachable and gives a blocker.
- AC-023 `[auto]`: a flow that no flow Connection reaches gets one blocker at the flow, not one for each block; a block in that flow that is reachable from its own Start has no finding.

### US-006: The analysis as one function

**As a** developer
**I want to** call one pure function that returns every structural finding of a parsed config, in a fixed order
**So that** the builder marks, the analyzer and the generator all show the same problems in the same order

**Requirements:** F-03 scope (pure functions, one implementation per rule); decisions 10 and 34

#### Acceptance Criteria

- AC-024 `[auto]`: the default pipeline gives no blocker and exactly two warnings, one for each of the two retry routes into `build-implement` that have no `roundLimit`.
- AC-025 `[auto]`: a config with several problems returns every finding, in document order (flow order, then block order), not only the first.
- AC-026 `[auto]`: analysing the same config twice gives the same list, and the config is not changed by the analysis.
- AC-027 `[auto]`: every finding has a severity of `blocker` or `warning`, the path of the item it names, and a message; no other severity is returned.
- AC-028 `[auto]`: a block or flow with an `enabled` or a `disabled` key is refused by the parser as an unknown key at its path, so the analysis never sees a switched-off item (decision 34).
- AC-029 `[auto]`: the analysis is exposed as `pipeline.analyzeStructure` from the root namespace `pipeline`, and the root export list gains no other name.
- AC-030 `[auto]`: a minimal valid pipeline (one flow, Start → Agent → End) returns an empty list.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| One start per flow | AC-001, AC-002, AC-003 |
| One end per flow | AC-004 |
| A pipeline with flows; the first flow starts it | AC-005, AC-021 |
| Connections join blocks of one flow or flows of the pipeline | AC-006, AC-007, AC-008 |
| Both outputs of every Check wired (targets exist, or stop) | AC-009, AC-010 |
| No cycles among Connections | AC-012, AC-013, AC-014 |
| Back routes only to earlier blocks of the same flow | AC-015, AC-016, AC-017 |
| Retry with no round limit is a warning | AC-018, AC-024 |
| Every block and flow reachable from the pipeline's Start | AC-019, AC-020, AC-021, AC-022, AC-023 |
| Rule tags name existing rules (decision 21) | AC-011 |
| Unique file-safe agent names and unique argument names | F-02 AC-010, AC-022 (refused at parse; not repeated) |
| No disabled blocks or flows (decision 34) | AC-028 |
| Findings are pure, ordered and shaped (§5 decision 10) | AC-025, AC-026, AC-027 |
| Namespace exposure | AC-029 |
