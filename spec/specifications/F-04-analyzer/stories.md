# User Stories — Analyzer: structural checks and LLM review (F-04)

Feature entry: `spec/documents/features.md` → F-04
Requirements owned by this feature: none (SDDBuilder has no requirement IDs; scope items S1–S5 are listed in the Requirement Coverage table)
Depends on: F-01 (the model and the step catalog, `packages/core/src/model.ts`)
Reads: `spec/documents/building-blocks.md` §2–§3, `spec/documents/architecture.md` §4 and §6, `packages/core` validation (F-02)

## Scope (from features.md)

- S1: structural checks in `packages/core`, pure and deterministic: missing required steps, module layers that break the dependency direction, unknown ids, empty required fields, and the workflow rules (no cycles, both outputs wired, every step reachable, every input produced upstream, a warning on retries with no round limit).
- S2: the LLM review in `apps/api`: a fixed review prompt over the brief and the process; output validated against the `AnalysisFinding` shape; invalid output dropped and counted. Covers gaps in the idea, contradictory or unverifiable rules, test rules that name tools outside the stack, and suggested steps. Advice only.
- S3: custom steps are checked structurally (id clash, required flag, not placed in any workflow).
- S4: structural findings are returned even when the LLM step fails.
- S5: the analysis result is deterministic for the structural part: the same configuration gives the same findings in the same order.

## Design decisions in this spec

These are the defaults chosen in the specify step. Each one is covered by an acceptance criterion; changing one means changing its criteria.

- **One result shape.** `analyze(config)` returns `AnalysisResult` with two parts: `findings` (structural, from `core`) and `review` (the LLM part, from `apps/api`): `{ status: 'ok' | 'failed', findings, dropped }`. The shape change to `AnalysisResult` in `model.ts` is recorded in `architecture.md` §5 before the code depends on it.
- **Refused configurations are findings, not throws.** Every problem `validateConfig` reports is a `blocker` finding. `generate()` keeps refusing them with `InvalidConfigError`; the analyzer never throws for a user error.
- **Severity of the workflow advice.** An unreachable step is a `blocker` (`building-blocks.md` §3: "a structural error"). An input with no upstream producer and a retry with no round limit are `warning`s.
- **Brief checks.** `name`, `idea` and `stack.language` are required: empty or whitespace-only is a `blocker`. Empty `codeRules`, `testRules` or `architecture.modules` are `warning`s.
- **Layer rule.** A module that depends on a module in a higher layer is a `blocker`. A dependency on an unknown module is a `blocker` (unknown id).
- **LLM findings are advice.** A model finding with severity `blocker` is kept as `warning`. An invalid model finding (wrong shape, unknown severity, missing `subject` or `message`) is dropped and counted in `dropped`. Model output is never applied automatically.
- **Structure decides.** The LLM review never changes the structural findings and is never required for them to be returned.
- **The HTTP route is not in this feature.** `POST /analyze` and its rate limit belong to F-07 and F-13. This feature provides the functions it calls.

## Out of Scope

- The HTTP endpoint `POST /analyze` and its request validation (F-07).
- The per-client rate limit and the daily ceiling on analyzer calls (F-13).
- The privacy notice and the Analyze button state in the brief form (F-05).
- Showing findings in the builder (F-05, F-06).
- Retrying a failed LLM call (F-07 decides the retry rule for `/generate`; `/analyze` makes one call and reports `failed`).
- Checking the final generated files (F-10) and the LLM writing of generated content (F-07, `architecture.md` §3 step 5).
- Choosing the model provider or model ID beyond the value passed in by the caller.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-04 AC-003`).

### US-001: Structural findings for a process

**As a** user
**I want to** see every structural problem in my process when I analyze it
**So that** I fix them before I try to generate the framework

**Requirements:** none

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: a configuration that `generate()` refuses (duplicate id, unknown reference, cycle, unwired output, unknown gate type, invalid round limit, missing required step, route to a disabled step) gives one `blocker` finding per problem, whose `subject` names the element and whose `message` names the problem, in the same order as `validateConfig`.
- [ ] AC-002 `[auto]`: a valid configuration with nothing to advise gives an empty `findings` list, with no `info` findings added.
- [ ] AC-003 `[auto]`: a step no route can reach gives a `blocker` finding naming the step and its workflow.
- [ ] AC-004 `[auto]`: a step input that no earlier enabled step of the same workflow produces, no enabled step of an upstream workflow on the map produces, and that is not the workflow's iteration source, gives a `warning` finding naming the step and the input.
- [ ] AC-005 `[auto]`: a retry route with no round limit gives a `warning` finding naming the condition and saying "no limit set"; a retry with a limit gives no finding.
- [ ] AC-006 `[auto]`: a disabled step is not checked for reachability or inputs, so it gives no finding from AC-003 or AC-004.

### US-002: Brief checks

**As a** user
**I want to** be told when my brief is incomplete or its architecture contradicts itself
**So that** the framework I generate describes the project I mean

**Requirements:** none

#### Acceptance Criteria

- [ ] AC-007 `[auto]`: an empty or whitespace-only `name`, `idea` or `stack.language` gives a `blocker` finding whose `subject` names the field.
- [ ] AC-008 `[auto]`: empty `codeRules`, empty `testRules` or no architecture modules give a `warning` each, not a `blocker`.
- [ ] AC-009 `[auto]`: a module that depends on a module in a higher layer gives a `blocker` naming both modules; a dependency on the same layer or a lower layer gives no finding.
- [ ] AC-010 `[auto]`: a module whose `dependsOn` names no module gives a `blocker` finding naming the unknown id.
- [ ] AC-011 `[auto]`: a custom step that clashes with a catalog or workflow id gives a `blocker` (as in AC-001); a custom step placed in no enabled workflow gives a `warning` naming the step.

### US-003: Analysis result

**As a** user
**I want to** get one result that says what was found and whether the review ran
**So that** I can act on the structural findings even when the LLM review is not available

**Requirements:** none

#### Acceptance Criteria

- [ ] AC-012 `[auto]`: the structural findings are sorted by severity (`blocker`, then `warning`, then `info`), then by `subject`, then by `message`; the same configuration gives the same order every time.
- [ ] AC-013 `[auto]`: when the LLM review throws, the result has `review.status` `failed`, `review.findings` empty, and the structural findings unchanged.
- [ ] AC-014 `[auto]`: a configuration with structural findings and an LLM review that returns no findings gives `review.status` `ok` and the structural findings unchanged.

### US-004: LLM review

**As a** user
**I want to** get advice on gaps and contradictions in my idea and rules
**So that** I can improve the brief, without the model changing my process

**Requirements:** none

#### Acceptance Criteria

- [ ] AC-015 `[auto]`: the review prompt is built from the brief and the process only; the same configuration gives the same prompt text, and the prompt holds no value from the server environment.
- [ ] AC-016 `[auto]`: a valid model finding is kept with its `severity`, `subject` and `message`; a model finding with severity `blocker` is kept as `warning`.
- [ ] AC-017 `[auto]`: a model finding with an unknown `severity`, or a missing or empty `subject` or `message`, is dropped and counted in `review.dropped`; the valid findings in the same reply are kept.
- [ ] AC-018 `[auto]`: a model reply that is not a JSON array of findings gives `review.status` `failed`, no review findings, and `review.dropped` equal to 0.
- [ ] AC-019 `[auto]`: the review never adds, removes or changes a structural finding, whatever the model returns.
- [ ] AC-020 `[auto]`: the analysis runs one model call per request; a fake model that fails once is not called again.
- [ ] AC-021 `[device]`: with a real model provider and the sample reference process, the review returns advice that names at least one real gap and no finding repeats a structural finding. Checked by a person against the checklist.
- [ ] AC-022 `[auto]`: the review prompt lists every structural finding (its subject and message) and tells the model not to repeat them; the same configuration gives the same list in the same order; a configuration with no structural findings gives a prompt with no list; the model call receives this prompt.

---

## Requirement Coverage

| Requirement | Covered by |
|---|---|
| S1 structural checks (refused configurations) | AC-001, AC-002 |
| S1 workflow rules (unreachable, inputs, retry limit) | AC-003, AC-004, AC-005, AC-006 |
| S1 brief rules (empty fields, layers, unknown ids) | AC-007, AC-008, AC-009, AC-010 |
| S2 LLM review: fixed prompt | AC-015 |
| S2 LLM review: validated and dropped output | AC-016, AC-017, AC-018 |
| S2 LLM review: advice only | AC-016, AC-019 |
| S2 LLM review: one call per request | AC-020 |
| S2 LLM review: real model quality | AC-021 |
| S2 LLM review: no repeats of structural findings | AC-022 |
| S3 custom steps | AC-011 |
| S4 structural findings when the LLM fails | AC-013, AC-014 |
| S5 deterministic structural result | AC-012 |
