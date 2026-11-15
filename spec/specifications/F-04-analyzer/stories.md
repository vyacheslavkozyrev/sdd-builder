# User Stories — Analyzer: structural checks and LLM review (F-04)

Feature entry: `spec/documents/features.md` → F-04
Requirements owned by this feature: R-01 to R-07 (listed in the Requirement Coverage table)

## Out of Scope

- The `/generate` route, its flat reader and caps, and `validateConfig` and `planGeneration` on the flat model. They stay until F-07 rebuilds generation on the pipeline model (architecture §6, decision 19). F-04 does not touch the `/generate` code path.
- The web app. The wizard still sends the flat brief, so Analyze in the running app is refused with 400 until F-05 rebuilds the wizard. The web tests do not call the server and stay green. This gap is accepted by the owner (2026-11-14).
- The daily review ceiling, the per-client limits and the budget (`SDDBUILDER_REVIEW_DAILY_LIMIT`). They are F-13. F-04 keeps the ceiling that exists today and runs it on the pipeline config.
- A model call in tests. Every review test uses a fake model that returns fixed replies. The real Anthropic adapter (`source/apps/api/src/review/anthropic-model.ts`) is kept as it is and is not changed.
- Analyzer findings for parse problems. A body that fails `parsePipelineConfig` (unknown keys, bad ids, missing required fields of the model, unknown kinds, wrong schema version) is refused with 400 as today. The analyzer runs only on a config that parses.
- Suggested blocks as a separate finding kind. The review may write them as findings in the existing shape; no new finding type is added.
- Rules for the process's text beyond the checks listed here (for example the wording of a block description). Those are F-05 and F-06 concerns.

---

## Decisions taken in this specification (the owner is asked to approve them)

- **Flat analyzer is rewired now (owner, 2026-11-14).** `/analyze` moves to the pipeline model in this feature. The flat analyzer in `source/packages/core/src/analyze/` and its tests are deleted in the same feature, because their only consumer, `/analyze`, is rebuilt here (decision 19).
- **Web app gap accepted (owner, 2026-11-14).** The web app is not changed in F-04. Analyze fails in the running app until F-05.
- **Refusals reuse the pipeline checks.** The refusal checks that already exist for generation in `source/packages/core/src/pipeline/generate/refusals-*.ts` are the blockers of the analysis. They are not copied. Each problem becomes one blocker finding with its path as the subject.
- **Parse problems stay a 400.** As today, a body that does not parse is refused with 400 and its problems. The analysis only ever runs on a parsed config.
- **Iteration source (scope `task` or `feature`).** The source is an artifact produced upstream: an End block with a `produced` label, or a Connection with an `artifact` label, placed earlier in pipeline order (in the same flow, or in an earlier flow). An Agent with scope `task` or `feature` and no such earlier artifact is a warning. This follows `scope.ts` ("the iteration source is the artifact it reads") and the flat analyzer's "no upstream producer" warning.
- **Caps stay on /analyze.** The input caps of decision 12 (idea 8,000 characters; 60 rules) apply to `/analyze` on the pipeline config, so the rewire loses no cap. The module cap has no meaning in the pipeline model and is not applied there.
- **Review reply rule kept.** The reply check of the flat analyzer (a reply that is not an array fails; an entry is kept only with a known severity and non-blank subject and message; a model `blocker` becomes `warning`) moves unchanged into the pipeline analysis.

---

## Stories

Acceptance criteria are tagged by how they are verified:

- `[auto]` — an automated test can prove it.
- `[device]` — needs a person, a real device, drive or network; verified with a checklist.

Every automated test names the feature and criterion it covers (`F-04 AC-003`).

This feature has no user interface, so no UX screens are needed (`➖ Not needed`). Every criterion is `[auto]`: the analyzer is pure logic in `source/packages/core/src/pipeline/`, and the route is tested over HTTP with a fake model.

### US-001: A valid process gives a stable, ordered list of findings

**As a** developer
**I want to** get the same structural findings for the same process, in a fixed order
**So that** the analysis result can be tested and compared, and the owner sees the same list every time.

**Requirements:** R-01

#### Acceptance Criteria

- [ ] AC-001 `[auto]`: The default pipeline (`source/templates/pipeline/default.json`) gives no structural findings.
- [ ] AC-002 `[auto]`: The same configuration gives the same findings in the same order every time, and the analysis does not change the configuration (it is equal before and after).
- [ ] AC-003 `[auto]`: Findings are ordered by severity (`blocker`, then `warning`, then `info`), then by `subject`, then by `message`, in code-unit order. A table test covers ties on severity and on subject.

---

### US-002: Refusals of the pipeline checks are blockers

**As a** project owner
**I want to** see every broken wiring or reference as a blocker, at the place it is broken
**So that** I can fix the process before I generate it.

**Requirements:** R-01, R-02

#### Acceptance Criteria

- [ ] AC-004 `[auto]`: Each problem that the pipeline refusal checks report (names, required fields, rule tags, shape, wiring, routes, check fields) appears once as a `blocker` finding whose `subject` is the problem's path. A table test covers at least: a rule tag that names no rule, a Condition whose fail route names no block, and a block with no description.
- [ ] AC-005 `[auto]`: A configuration that the refusal checks accept produces no `blocker` from them (negative case: the default pipeline with one agent description removed gives exactly one blocker at that agent's path, and no other blocker).

---

### US-003: Reachability and disabled blocks

**As a** project owner
**I want to** be told about blocks and flows that nothing reaches, and to have disabled parts left alone
**So that** the process runs in the order I drew it, and switched-off parts do not block the analysis.

**Requirements:** R-01

#### Acceptance Criteria

- [ ] AC-006 `[auto]`: An enabled block or flow with no path from the pipeline's Start (following connections, routes and flow order) is a `blocker` whose subject is its path. A table test covers an orphan block in a flow and an orphan flow. A disabled block is transparent to the walk, so an enabled block after it is reached through the live blocks before it (as F-02 AC-005 defines).
- [ ] AC-007 `[auto]`: A disabled block or flow gives no finding, even when it is unreachable or has a blank description (negative case). A disabled block is not on any path.

---

### US-004: Retries and iteration sources give warnings

**As a** project owner
**I want to** be warned about retries with no round limit and about agents that repeat over an artifact nothing produces
**So that** a loop cannot run up model calls without a limit, and an agent is not left without its input.

**Requirements:** R-01

#### Acceptance Criteria

- [ ] AC-008 `[auto]`: A back route (retry) on a Condition with no `roundLimit` is a `warning` whose subject is the Condition's path. A back route with a `roundLimit`, and a forward route with no limit, give no such warning (negative cases). The same rule applies to a pipeline-level gate that goes back to an earlier flow.
- [ ] AC-009 `[auto]`: An enabled Agent block with scope `task` or `feature` and no artifact produced earlier in pipeline order (an End's `produced` label or a Connection's `artifact` label, in the same flow or an earlier flow) is a `warning` whose subject is its path. The default pipeline gives none (its build agents read `plan.md`). An Agent with scope `project` gives none (negative case).

---

### US-005: Brief checks on name, idea, stack and rules

**As a** project owner
**I want to** be stopped where the brief is missing what is required, and warned where it is thin
**So that** the framework is not generated from an empty brief.

**Requirements:** R-02

#### Acceptance Criteria

- [ ] AC-010 `[auto]`: A `name`, `idea` or `stack.language` that is blank after trimming gives one `blocker` per field, with the field name as subject. A value of spaces only counts as blank.
- [ ] AC-011 `[auto]`: An optional stack field that is present but blank (`framework`, `platform`, `buildTool`, `testFramework`) gives a `warning` naming it. An absent optional field gives no finding (negative case).
- [ ] AC-012 `[auto]`: An empty `rules` list gives a `warning` with subject `rules`. A list with at least one rule gives none (negative case).

---

### US-006: The review asks the model for advice and validates the reply

**As a** project owner
**I want to** get the model's advice on gaps, contradictions and suggested blocks, kept apart from the structural findings
**So that** the model can point out problems but never blocks or changes the process.

**Requirements:** R-03, R-04, R-05

#### Acceptance Criteria

- [ ] AC-013 `[auto]`: The review prompt is built from the pipeline config. It names the brief (name and idea), each enabled flow with its enabled blocks and their descriptions, and each rule's text, and it omits disabled blocks and flows. The same config gives the same prompt. A table test covers a disabled block that is absent from the prompt.
- [ ] AC-014 `[auto]`: A reply that is a JSON array of valid entries (`severity`, non-blank `subject` and `message`) gives review `ok` with those entries as `findings`. A model entry with severity `blocker` comes back as `warning`.
- [ ] AC-015 `[auto]`: An invalid entry in an otherwise valid reply (unknown severity, blank message, not an object) is dropped and counted in `review.dropped`. A reply that is not an array gives review `failed`, with no review findings.
- [ ] AC-016 `[auto]`: Model findings never change the structural findings. The structural list for a config is the same with and without a review reply (negative case: a model reply that says a block is fine does not remove a blocker).

---

### US-007: Structural findings stand when the review fails

**As a** project owner
**I want to** still see the structural findings when the model is down, slow or returns a bad reply
**So that** a provider problem never hides a broken process.

**Requirements:** R-06

#### Acceptance Criteria

- [ ] AC-017 `[auto]`: A fake model that throws, a reply cut short at the output limit, a reply that is not JSON, and a reply that is not an array each give review `failed`, with no review findings, and the full structural findings unchanged. A table test covers all four.
- [ ] AC-018 `[auto]`: The log line for a failed model call carries the event and the error name only, never the error message, the brief or the reply text (negative case for privacy).

---

### US-008: The /analyze route runs on the pipeline model

**As a** developer
**I want to** have `POST /analyze` read and analyze the pipeline config, with the same status codes and limits as before
**So that** the analysis uses the model the process is built on, and no input cap is lost.

**Requirements:** R-07

#### Acceptance Criteria

- [ ] AC-019 `[auto]`: `POST /analyze` with a valid `schemaVersion: 2` pipeline config returns 200 with `{ findings, review }`. The structural findings come from the pipeline analysis, and `review.status` is `ok` when the fake model returns a valid reply.
- [ ] AC-020 `[auto]`: A body that fails the pipeline parse returns 400 with `project config is invalid` and problems `<path>: <reason>`, and the model is not called. A flat `schemaVersion: 1` body is refused with 400 by this rule (the accepted gap until F-05).
- [ ] AC-021 `[auto]`: The input caps run before any model call on `/analyze`: an idea over 8,000 characters or more than 60 rules gives 422 listing `idea: ...` and `rules: ...` as the problems, and the model is not called. Exactly 8,000 characters and exactly 60 rules pass (boundary cases).
- [ ] AC-022 `[auto]`: When the daily review ceiling is reached, `/analyze` returns 200 with review `skipped`, the structural findings, and no model call.
- [ ] AC-023 `[auto]`: `/generate` keeps its current behaviour: the existing generate route tests pass unchanged, and a flat config still generates a zip.

---

### US-009: The flat analyzer is removed

**As a** developer
**I want to** have one analyzer, on the pipeline model
**So that** nothing keeps the flat rules alive by accident.

**Requirements:** R-07

#### Acceptance Criteria

- [ ] AC-024 `[auto]`: The core package's root exports no longer include `analyzeStructure`, `skippedAnalysis` or `checkReview`, and no file under `source/packages/core/src/analyze/` remains. A test imports the root and checks the names are absent.
- [ ] AC-025 `[auto]`: No source or test file under `source/apps/` imports a flat analysis export. The task check (type check and tests) passes.

---

## Requirement Coverage

| Requirement | Scope item (`features.md` F-04) | Covered by |
|---|---|---|
| R-01 | Structural rules of `building-blocks.md` §7: Start and End, one nesting level, connections, both outputs of every Condition, reachability, back routes, unique agent names, retry round limit, disabled blocks not checked | AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-009 |
| R-02 | Empty required fields and unknown ids | AC-004, AC-005, AC-010, AC-011, AC-012 |
| R-03 | Semantic review: fixed prompt over the brief and the process | AC-013 |
| R-04 | Output validated against the finding shape; invalid output dropped and counted | AC-014, AC-015 |
| R-05 | LLM findings are advice; a model blocker is kept as warning; model output never applied | AC-014, AC-016 |
| R-06 | Structural findings returned even when the LLM step fails | AC-017, AC-018 |
| R-07 | The analysis runs on the pipeline model in `/analyze`, with the input caps and the flat analyzer removed | AC-019, AC-020, AC-021, AC-022, AC-023, AC-024, AC-025 |

---

## Notes for the build (not criteria)

- `architecture.md` §4 (LLM analysis) and decision 10 describe `validateConfig` and the flat config. They are updated in the task that changes `/analyze`, in the same task (`general.md`, Documentation).
- The unknown-id and malformed-field checks of `features.md` F-04 are enforced by `parsePipelineConfig` (400), which runs before the analysis. The analysis does not repeat them.
