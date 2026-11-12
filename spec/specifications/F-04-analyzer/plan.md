# Implementation Plan — Analyzer: structural checks and LLM review (F-04)

Each task is one implement → review → test → commit cycle and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the checks pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Paths are under `packages/core/` (structural checks, pure) and `apps/api/` (review and LLM, server only). Every test name carries `F-04 AC-###`.

## Tasks

- [x] T001 [Docs] Record the analyzer decisions before code depends on them: result shape, refusals as blockers, advice severities, the analyzer model default `claude-sonnet-5-5` and the environment variable — `spec/documents/architecture.md` (§4 and §6 decision 10) — covers: none (prerequisite; decisions recorded before code)
- [x] T002 [Core] Result shape: `AnalysisResult` becomes `{ findings, review }` with `AnalysisReview = { status: 'ok' | 'failed', findings, dropped }`; `AnalysisFinding` unchanged — `packages/core/src/model.ts`, `packages/core/test/model.test.ts` — covers: none (type shape; behaviour is tested in T003–T013)
- [x] T003 [Core] Refusals as blockers: each problem `validateConfig` reports becomes a `blocker` finding; subject is the leading quoted label of the problem (`workflow "x"`, `condition "c1"`) or `configuration`; message is the full problem text; `generate()` behaviour unchanged — `packages/core/src/analyze/refusals.ts`, `packages/core/test/analyze-refusals.test.ts` — covers AC-001, AC-002
- [x] T004 [Core] Reachability: from the first enabled step, follow the order and the route targets of conditions; an enabled step no route reaches is a `blocker` naming the step and its workflow; disabled steps are not checked — `packages/core/src/analyze/reachability.ts`, `packages/core/test/analyze-reachability.test.ts` — covers AC-003, AC-006
- [x] T005 [Core] Inputs: a step input is satisfied by an earlier enabled step of the same workflow, an enabled step of an upstream workflow (transitive, through `connections`), or the workflow's `iterationSource`; otherwise a `warning` naming the step and the input — `packages/core/src/analyze/inputs.ts`, `packages/core/test/analyze-inputs.test.ts` — covers AC-004
- [x] T006 [Core] Retries: a backward fail route whose condition has no `roundLimit` is a `warning` naming the condition and saying "no limit set"; a route with a limit gives no finding — `packages/core/src/analyze/retries.ts`, `packages/core/test/analyze-retries.test.ts` — covers AC-005
- [ ] T007 [Core] Brief: empty or whitespace-only `name`, `idea`, `stack.language` are `blocker`s; empty `codeRules`, `testRules` or no modules are `warning`s; a module depending on a higher layer is a `blocker` naming both; a `dependsOn` naming no module is a `blocker` — `packages/core/src/analyze/brief.ts`, `packages/core/test/analyze-brief.test.ts` — covers AC-007, AC-008, AC-009, AC-010
- [ ] T008 [Core] Custom steps: a custom step placed in no enabled workflow is a `warning` naming the step (id clashes are already blockers through T003) — `packages/core/src/analyze/custom-steps.ts`, `packages/core/test/analyze-custom-steps.test.ts` — covers AC-011
- [ ] T009 [Core] Structural result: combine T003–T008 in a fixed order, sort by severity (`blocker`, `warning`, `info`), then `subject`, then `message`; export `analyzeStructure(config)`; a valid default configuration gives an empty list — `packages/core/src/analyze/index.ts`, `packages/core/src/index.ts`, `packages/core/test/analyze-structure.test.ts` — covers AC-002, AC-012
- [ ] T010 [Core] Review reply check: `checkReview(reply: unknown)` returns `{ status: 'ok', findings, dropped }` or `{ status: 'failed' }` for a reply that is not an array; each entry must have a known severity and non-empty `subject` and `message`, else it is dropped and counted; a `blocker` from the model is kept as `warning` — `packages/core/src/analyze/review-reply.ts`, `packages/core/test/analyze-review-reply.test.ts` — covers AC-016, AC-017, AC-018
- [ ] T011 [Build] `apps/api` setup: `tsconfig.json` extending the base (rootDir `src`, include `src` and `test`), `typecheck` and `test` scripts, Vitest as a dev dependency matching `packages/core`; a smoke test that imports `validateConfig` from `@sddbuilder/core` — `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/test/smoke.test.ts`, `package-lock.json` — covers: none (enabler for `scripts/task-check.sh`)
- [ ] T012 [API] Review prompt: fixed instructions followed by the brief and the process as JSON with a fixed key order; the same configuration gives the same text; no value from the server environment is included — `apps/api/src/review/prompt.ts`, `apps/api/test/prompt.test.ts` — covers AC-015
- [ ] T013 [API] Analysis service: `analyze(config, model)` returns the structural findings from `core` and `review` from one `model.complete` call; a thrown error or an unparsable reply gives `review.status` `failed`; the structural part is never changed by the review; one call per request — `apps/api/src/analyze.ts`, `apps/api/test/analyze.test.ts` — covers AC-013, AC-014, AC-018, AC-019, AC-020
- [ ] T014 [API] Anthropic adapter: `ReviewModel` port with `complete(prompt): Promise<string>`; implementation on `@anthropic-ai/sdk` 1.3.0 (added to `apps/api`), model from `SDDBUILDER_ANALYZER_MODEL` with default `claude-sonnet-5-5`, key from `ANTHROPIC_API_KEY` read at start-up and never logged; tests use a fake SDK client, no network — `apps/api/src/review/anthropic-model.ts`, `apps/api/test/anthropic-model.test.ts`, `apps/api/package.json`, `package-lock.json` — covers AC-021 (device: the real call is checked by the manual checklist)
- [ ] T015 [Docs] Describe the behaviour as built: the analysis result and its `review` field, the failure notice, the model variable — `spec/documents/architecture.md` (§4), `spec/documents/features.md` (F-04 entry, if it changes) — covers: none (documents behaviour, per `general.md`)

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Docs]` | Documentation changes required by the feature |
| `[Core]` | `packages/core`: pure structural checks and the reply check |
| `[API]` | `apps/api`: review prompt, analysis service, LLM adapter |

## Rationale

**Order.** Decisions first (T001), because the result shape and the severities are used by everything after. The model change (T002) comes next, then the structural checks in `core` (T003–T009), which are pure and need no network. The reply check (T010) is also `core`, because `core` checks what the model returns (`architecture.md` §6 decision 7). The API setup (T011) is a prerequisite for every `apps/api` test. Then the prompt (T012), the analysis service (T013) and the real adapter (T014), which is the only code that calls the model. Documentation of the behaviour as built is last (T015).

**Architecture constraints.** `packages/core` has no I/O: no HTTP, no `process.env`, no SDK import. The LLM is called only from `apps/api` (`architecture.md` §1, §4). Structure decides, advice does not: the review can only add findings, never change or remove structural ones (AC-019). Model output is validated at the boundary with `unknown` and narrowed (`typescript.md`).

**Subject of a refusal finding (T003).** `validateConfig` returns problem strings, not structured objects. The subject is the leading quoted label of the problem text, which the validators already write (`workflow "x": …`). Each problem category is tested, so a change of wording breaks a test rather than the finding. Changing the validators to return structured problems would touch F-02 code and tests, so it is left out of this feature.

**Inputs (T005).** `consumes` names artifacts that some steps produce and some never do (`features.md`, `checklist.md`), and some are produced in another workflow (`commit` is consumed by Verify). The check therefore accepts three sources, as AC-004 states: an earlier step of the same workflow, a step of an upstream workflow on the map, or the iteration source.

**Dependencies.** The only new library is `@anthropic-ai/sdk`, already approved in `architecture.md` §5. Version 1.3.0 is pinned: it was released 2026-10-23, at least two weeks before this plan. Vitest matches `packages/core`.

**Model default (T014, T001).** `architecture.md` §4 leaves the default open ("set when F-04 starts"). This plan uses `claude-sonnet-5-5`, the Sonnet 5.5 ID. It is a single environment variable, so changing it needs no code change.

**Decision record (T001).** `.claude/rules/general.md` says architecture decisions go in `architecture.md` §5, but the decisions list is §6 (`architecture.md` §5 is Technology). The record goes in §6 decision 10.

## Coverage check

| Criterion | Tasks |
|---|---|
| AC-001 | T003 |
| AC-002 | T003, T009 |
| AC-003 | T004 |
| AC-004 | T005 |
| AC-005 | T006 |
| AC-006 | T004 |
| AC-007 – AC-010 | T007 |
| AC-011 | T008 (clashes: T003) |
| AC-012 | T009 |
| AC-013 | T013 |
| AC-014 | T013 |
| AC-015 | T012 |
| AC-016 | T010 |
| AC-017 | T010 |
| AC-018 | T010, T013 |
| AC-019 | T013 |
| AC-020 | T013 |
| AC-021 (device) | T014 |
