# Implementation Plan — Analyzer (F-06)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Paths are relative to the repository root. Core tests live in `source/packages/core/test/pipeline/`; API tests live in `source/apps/api/test/`. Each test name carries `F-06 AC-0xx`.

## Tasks

- [ ] T001 [Docs] Correct decision 37 (a) in `spec/documents/architecture.md` §6: the brief fields are owned by F-02 (the parse, the limits and the stack keys, per `pipeline-schema.md` §2); F-06 reads the parsed brief and adds no model fields. No test. Covers no criterion; it keeps the record in line with the stories before code depends on it.
- [ ] T002 [Core] Brief checks, kept apart from the structural rules: `source/packages/core/src/pipeline/analyze/brief.ts` (`analyzeBrief(config: ProjectConfig): Finding[]`: a blocker at `name`, `idea` or `stack.language` when absent or blank (only spaces or line breaks); a warning at `stack.<field>` for each of `framework`, `platform`, `buildTool`, `testFramework` when absent or blank; a warning at `rules` for an empty list; findings in the order name, idea, stack.language, the four optional stack fields, rules); `source/packages/core/src/pipeline/index.ts` exports `analyzeBrief`; `analyze/index.ts` is not changed, so `analyzeStructure` does not see the brief; `source/packages/core/test/pipeline/brief-checks.test.ts` (table-driven: each blocker field absent, empty and blank; each optional field absent and blank; empty and non-empty rules; complete brief gives none; order of findings) — covers AC-001, AC-002, AC-003, AC-004, AC-006; `source/packages/core/test/pipeline/brief-structure.test.ts` (the `analyzeStructure` output of one pipeline is equal with a blank brief and with a complete brief) — covers AC-005
- [ ] T003 [Core] Review reply check: `source/packages/core/src/pipeline/analyze/review.ts` (`checkReview(text: string)`: parses the text as JSON; returns `failed` when the text is not JSON or the value is not an array; otherwise returns `ok` with the kept entries and the count of dropped ones; an entry is kept only as an object with severity `warning` or `info` and a `subject` and `message` that are not blank; a severity `blocker` is kept as `warning`; anything else is dropped and counted; kept entries are returned in reply order, at most 10, and valid entries beyond 10 are counted as dropped); `source/packages/core/src/pipeline/index.ts` exports `checkReview` with the types `ReviewEntry` and `ReviewResult`; `source/packages/core/test/pipeline/review-reply.test.ts` (table-driven: not JSON; JSON not an array; empty array; each dropped case; blocker kept as warning; the 10-entry cap with the rest counted; no trimming of kept text) — covers AC-011, AC-012, AC-014, AC-015, AC-016, AC-017
- [ ] T004 [API] Review request: `source/apps/api/src/review/prompt.ts` (the fixed review prompt, as one exported string, and `reviewRequest(config)` that returns the prompt and the JSON text of the brief and the pipeline config, serialised with a fixed key order); `source/apps/api/src/review/anthropic.ts` (`reviewCallParams(model, request)`: the parameters of one Anthropic Messages call with `max_tokens` 8192, a timeout of 60,000 ms and `maxRetries` 0; a thin `callReview` that makes the call through an injected client and returns the reply text and its stop reason; no test calls the network); `source/apps/api/test/review-request.test.ts` (same config gives the same request text twice; the parameters carry 8192, 60000 and no retry; `callReview` with a fake client makes one call) — covers AC-007, AC-008, and the one-call and no-retry part of AC-009
- [ ] T005 [API] The analysis result: `source/apps/api/src/analyze.ts` (`analyzePipeline(config, model, log)`, with `model` an interface `{ review(request): Promise<{ text: string; stopReason: string | null }> }` or `null` when no model is configured; the result is `{ findings, review: { status, findings, dropped } }`, where `findings` are `analyzeStructure` output followed by `analyzeBrief` output; with no model, or a thrown error, or a stop reason of `max_tokens`, the review is `failed` with no entries and `dropped` 0 and no reply is parsed; otherwise `checkReview` gives the review; one review call per analysis, with no retry; the input config is not changed); `source/apps/api/test/analyze.test.ts` (a fake model with fixed replies: no model; a throw; stop reason `max_tokens`; invalid JSON; valid reply with entries; valid empty reply; valid reply with every entry dropped; structural findings returned on every failure; findings equal `analyzeStructure` then `analyzeBrief`; config equal before and after; one call made and not retried) — covers AC-009, AC-010, AC-013, AC-018, AC-019, AC-020, AC-021, AC-022, AC-023
- [ ] T006 [API] Privacy of the analysis: `source/apps/api/src/analyze.ts` (log lines carry the event name and the status only, through the `log` argument; the message of a thrown error is neither logged nor put in the result; no module-level state); `source/apps/api/test/analyze-privacy.test.ts` (a sentinel in `idea` never appears in any log line, on the success path or on each failure path; a thrown error whose message holds the sentinel leaves it out of the log lines and the result; two calls with different configs each return only their own findings; the analysis writes no file) — covers AC-024, AC-025, AC-026

## Rationale

- **Decision first (T001).** The stories drop the brief parse from F-06 because F-02 owns it. Decision 37 (a) still says F-06 adds the fields, so it is corrected before code depends on the ownership. The other decisions in 37 (checks as their own function, the review limits, the prompt in the API, the 10-entry cap) stand and are used as they are.
- **Brief checks before the reply check (T002, then T003).** Both are pure core functions. The brief checks read the parsed brief that F-02 already provides, so they need no model change.
- **Reply check in core, before the call (T003).** `checkReview` is pure: it takes the reply text and returns the kept entries. The rules of the reply are tested without a model.
- **Request before the result (T004, then T005).** The request text and the call's parameters are checked alone, so the limits (8192 tokens, 60 seconds, no retry) are proved before the result depends on them.
- **Privacy last (T006).** It hardens the logging of the result built in T005 and adds the tests that prove the brief is not kept or logged. Nothing after it depends on the logging.
- **Scope.** The `/analyze` route, the daily ceiling, the `skipped` status, rate limits and input caps are not in this plan (F-14, F-17). No code path returns `skipped`.
- **Libraries.** None added. `@anthropic-ai/sdk` is already a dependency of `source/apps/api` (`architecture.md` §5).

**Interpretations** (carried from Specify):

- A brief text field is "absent" when the key is missing and "blank" when it holds only spaces or line breaks; both count the same for the checks.
- A failed review has `dropped` 0, because no reply was checked entry by entry.
- A model entry with severity `blocker` is kept as `warning` (decision 10); an entry with severity `info` is kept as `info`.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Docs]` | Documentation changes required by the feature |
| `[Core]` | `source/packages/core` (pure TypeScript, no I/O) |
| `[API]` | `source/apps/api` (the LLM call, logging, the analysis function) |
