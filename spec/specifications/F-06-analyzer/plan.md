# Implementation Plan — Analyzer (F-06)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Paths are relative to the repository root. Core tests live in `source/packages/core/test/pipeline/`; API tests live in `source/apps/api/test/`. Each test name carries `F-06 AC-0xx`.

## Tasks

- [x] T001 [Docs] Record the decisions before code depends on them: `spec/documents/architecture.md` §6 gains decision 37 (brief fields in the pipeline model, brief checks kept out of `analyzeStructure`, the review's 8192-token and 60-second limits with no SDK retry, at most 10 kept review entries, the review prompt held in `source/apps/api`); §4 names the review severities `warning` and `info`, and states that the review call makes no SDK retry (this supersedes the SDK default in §4 "Failure", per AC-015). No test. Covers no criterion; it is the record the later tasks rely on.
- [x] T002 [Core] Brief fields in the model and the parser: `source/packages/core/src/pipeline/model.ts` (optional `name`, `idea`, `architecture` and `stack` on `ProjectConfig`; type `Stack` with optional `language`, `framework`, `platform`, `buildTool`, `testFramework`); `source/packages/core/src/pipeline/parse/brief.ts` (text fields must be strings; `idea` and `architecture` longer than 5,000 code points refused with their path, counted by code point; unknown keys in `stack` refused with their path; text kept as submitted); `source/packages/core/src/pipeline/parse/project.ts` (the four keys added to the root key list, so the root no longer refuses them as unknown); `source/packages/core/test/pipeline/brief-parse.test.ts` (table-driven: valid brief, absent brief, non-string, unknown `stack` key, 5,000 accepted and 5,001 refused, surrogate pair as one code point, no trimming) — covers AC-001, AC-002, AC-003, AC-004, AC-005, AC-006
- [x] T003 [Core] Brief checks, kept apart from the structural rules: `source/packages/core/src/pipeline/analyze/brief.ts` (`analyzeBrief(config: ProjectConfig): Finding[]`: a blocker at `name`, `idea` or `stack.language` when absent or blank (only spaces or line breaks); a warning at `stack.<field>` for each of `framework`, `platform`, `buildTool`, `testFramework` when absent or blank; a warning at `rules` for an empty list; findings in the order name, idea, stack.language, the four optional stack fields, rules); `source/packages/core/src/pipeline/index.ts` exports `analyzeBrief`; `analyze/index.ts` is not changed, so `analyzeStructure` does not see the brief; `source/packages/core/test/pipeline/brief-checks.test.ts` (table-driven: each blocker field absent, empty and blank; each optional field absent and blank; empty and non-empty rules; complete brief gives none; order of findings) — covers AC-007, AC-008, AC-009, AC-010, AC-012; `source/packages/core/test/pipeline/brief-structure.test.ts` (the `analyzeStructure` output of one pipeline is equal with a blank brief and with a complete brief) — covers AC-011
- [x] T004 [Core] Review reply check: `source/packages/core/src/pipeline/analyze/review.ts` (`checkReview(text: string)`: parses the text as JSON; returns `failed` when the text is not JSON or the value is not an array; otherwise returns `ok` with the kept entries and the count of dropped ones; an entry is kept only as an object with severity `warning` or `info` and a `subject` and `message` that are not blank; a severity `blocker` is kept as `warning`; anything else is dropped and counted; kept entries are returned in reply order, at most 10, and valid entries beyond 10 are counted as dropped); exported from `source/packages/core/src/pipeline/index.ts` as `checkReview` with the types `ReviewEntry` and `ReviewResult`; `source/packages/core/test/pipeline/review-reply.test.ts` (table-driven: not JSON; JSON not an array; empty array; each dropped case; blocker kept as warning; the 10-entry cap with the rest counted) — covers AC-017, AC-018, AC-020, AC-021, AC-022, AC-023
- [ ] T005 [API] Review request: `source/apps/api/src/review/prompt.ts` (the fixed review prompt, as one exported string, and `reviewRequest(config)` that returns the prompt and the JSON text of the brief and the pipeline config, serialised with a fixed key order); `source/apps/api/src/review/anthropic.ts` (`reviewCallParams(model, request)`: the parameters of one Anthropic Messages call with `max_tokens` 8192, a timeout of 60,000 ms and `maxRetries` 0; a thin function that makes the call and returns the reply text and its stop reason; no test calls the network); `source/apps/api/test/review-request.test.ts` (same config gives the same request text twice; the parameters carry 8192, 60000 and no retry) — covers AC-013, AC-014, and the parameter part of AC-015
- [ ] T006 [API] The analysis result: `source/apps/api/src/analyze.ts` (`analyzePipeline(config, model, log)`, with `model` an interface `{ review(request): Promise<{ text: string; stopReason: string | null }> }` or `null` when no model is configured; the result is `{ findings, review: { status, findings, dropped } }`, where `findings` are `analyzeStructure` output followed by `analyzeBrief` output; with no model, or a thrown error, or a stop reason of `max_tokens`, the review is `failed` with no entries and `dropped` 0 and no reply is parsed; otherwise `checkReview` gives the review; one review call per analysis, with no retry; the input config is not changed); `source/apps/api/test/analyze.test.ts` (a fake model with fixed replies: no model; a throw; stop reason `max_tokens`; invalid JSON; valid reply with entries; valid empty reply; valid reply with every entry dropped; structural findings returned on every failure; findings equal `analyzeStructure` then `analyzeBrief`; config equal before and after; one call made) — covers AC-015 (one call, no retry), AC-016, AC-019, AC-024, AC-025, AC-026, AC-027, AC-028, AC-029
- [ ] T007 [API] Privacy of the analysis: `source/apps/api/src/analyze.ts` (log lines carry the event name and the status only, through the `log` argument; the message of a thrown error is neither logged nor put in the result; no module-level state); `source/apps/api/test/analyze-privacy.test.ts` (a sentinel in `idea` never appears in any log line, on the success path or on each failure path; a thrown error whose message holds the sentinel leaves it out of the log lines and the result; two calls with different configs each return only their own findings; the analysis writes no file) — covers AC-030, AC-031, AC-032

## Rationale

- **Decisions first (T001).** Four choices in this plan go beyond the text of §4 or §6: the brief fields in the model, the brief checks outside `analyzeStructure`, the review's limits without an SDK retry, and the review prompt in the API. The rules require them recorded in `architecture.md` before code depends on them.
- **Model before checks (T002, then T003).** The checks read the brief fields, so the fields and their parse rules come first. The brief fields are optional in the type, so every existing fixture and the default pipeline still parse with no change (AC-002).
- **Brief checks outside the structural rules (T003).** Putting them in `analyzeStructure` would give the default pipeline, which has no brief, a blocker and break F-03's "no blocker" test (AC-011). A separate function keeps the pipeline refusals of F-04 and the marks of F-11 as they are. The analysis result joins the two lists (T006).
- **Reply check in core, before the call (T004).** `checkReview` is pure: it takes the reply text and returns the kept entries. The API only makes the call and tells core whether the reply was cut short, so the rules of the reply are tested without a model.
- **Request before the result (T005, then T006).** The request text and the call's parameters are checked alone, so the limits (8192 tokens, 60 seconds, no retry) are proved before the result depends on them.
- **Privacy last (T007).** It hardens the logging of the result built in T006 and adds the tests that prove the brief is not kept or logged. Nothing after it depends on the logging.
- **Scope.** The `/analyze` route, the daily ceiling, rate limits and the input caps are not in this plan (F-14, F-17). The review's `skipped` status is not produced, so no code path returns it.

**Interpretations** (taken at Specify and carried into the tasks):

- A brief text field is "absent" when the key is missing and "blank" when it holds only spaces or line breaks; both count the same for the checks.
- A failed review has `dropped` 0, because no reply was checked entry by entry.
- A model entry with severity `blocker` is kept as `warning` (decision 10); an entry with severity `info` is kept as `info`.

**Libraries:** none added. `@anthropic-ai/sdk` is already a dependency of `source/apps/api` (architecture §5, the LLM SDK row).

**Layer tags:** `[Core]` for the model, parser, checks and reply check; `[API]` for the review call, the analysis and its privacy; `[Docs]` for the recorded decisions.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Core]` | `source/packages/core`: the brief model and parse, the brief checks, the review reply check, and their tests |
| `[API]` | `source/apps/api`: the review request, the analysis function and its tests (no HTTP route; that is F-14) |
| `[Docs]` | Documentation changes required by the feature (`architecture.md` §4 and §6) |

## Coverage check

| Criterion | Task |
|---|---|
| AC-001 | T002 |
| AC-002 | T002 |
| AC-003 | T002 |
| AC-004 | T002 |
| AC-005 | T002 |
| AC-006 | T002 |
| AC-007 | T003 |
| AC-008 | T003 |
| AC-009 | T003 |
| AC-010 | T003 |
| AC-011 | T003 |
| AC-012 | T003 |
| AC-013 | T005 |
| AC-014 | T005 |
| AC-015 | T005, T006 |
| AC-016 | T006 |
| AC-017 | T004 |
| AC-018 | T004 |
| AC-019 | T006 |
| AC-020 | T004 |
| AC-021 | T004 |
| AC-022 | T004 |
| AC-023 | T004 |
| AC-024 | T006 |
| AC-025 | T006 |
| AC-026 | T006 |
| AC-027 | T006 |
| AC-028 | T006 |
| AC-029 | T006 |
| AC-030 | T007 |
| AC-031 | T007 |
| AC-032 | T007 |
