# Implementation Plan — Analyze API (F-14)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Paths are relative to the repository root. API tests live in `source/apps/api/test/`, use Hono's in-memory `app.request` (no network port) and fakes for the model. Each test name carries `F-14 AC-0xx`. No test calls the real provider, the network or the wall clock.

## Tasks

- [x] T001 [Docs] Correct `spec/documents/features.md` F-14: a body that fails the parse is a 400 with every problem, not a 422 (owner answer 2026-11-24); the input caps and their 422 are named as F-17. `architecture.md` §4 already says 400 and needs no change. No test. Covers no criterion; it brings the scope line in line with the stories before code depends on it.
- [x] T002 [API] Route skeleton: `source/apps/api/src/app.ts` (`createApp(deps)` returns a Hono app; `deps` holds the analysis function and the log function, so tests inject fakes); `/analyze` answers 405 with `Allow: POST` for any method other than POST; every other path, including `/generate`, answers 404; error replies are JSON `{ error }`; `source/apps/api/test/analyze-route.test.ts` (GET, PUT, PATCH and DELETE on `/analyze` give 405 with the header and no analysis call; `POST /generate` and an unknown path give 404 with no analysis call; a non-POST method on an unknown path gives 404) — covers AC-010, AC-011, AC-012
- [x] T003 [API] Body reading and parse refusal: `source/apps/api/src/http/body.ts` (reads the request text and parses it as JSON: a text that is not JSON, or empty, gives 400 `{ error }` with no `problems`; a JSON value goes to `pipeline.parseProjectConfig` from core; a refusal gives 400 `{ error, problems }` with `problems` as the strings `<path>: <reason>` in the parser's order; a `schemaVersion` 1 body is refused with a problem that names version 2; the reply never repeats brief text (idea, architecture, rule content); ids, names, tags and list items from core's messages may appear, per Amendment 1 in progress.md); `app.ts` uses it for `/analyze`; `source/apps/api/test/analyze-body.test.ts` (table-driven: empty body, `{`, a JSON array, a parse refusal with several problems, an unknown key named by its path, a flat `schemaVersion` 1 body; the analysis function is not called on any of these; a sentinel idea text does not appear in any 400 reply, including one with a parse problem elsewhere in the config) — covers AC-005, AC-006, AC-007, AC-008, AC-009. If the parser's message for `schemaVersion` does not name version 2, the task stops and proposes an Amendment (a change to core is a task of its own).
- [x] T004 [API] The success path: `POST /analyze` with a valid config calls `analyzePipeline` (F-06, `source/apps/api/src/analyze.ts`) and answers 200 with `Content-Type: application/json` and the body `{ findings, review }`; the model is the injected `ReviewModel | null`; `source/apps/api/test/analyze-route.test.ts` gains the success cases (the body has `findings` and `review` with `status`, `findings` and `dropped`; the findings equal the F-06 analysis of the same config in the same order; the same body and the same fake model give the same response; a config with no brief fields gets 200 with the brief blockers; one request makes one model call and a throwing call is not retried) — covers AC-001, AC-002, AC-003, AC-004, AC-017
- [ ] T005 [API] Review failures in the route: `source/apps/api/test/analyze-route.test.ts` gains the cases in which the review fails and the route still answers 200: no model (`review.status` `failed`, no review findings, `dropped` 0, the structural findings in full); a model call that throws (200, `failed`, the thrown message in no part of the response); a reply that is not JSON (200, `failed`); a valid reply (200, `ok`, the kept entries as `checkReview` gives them, a model `blocker` returned as `warning`). Source change only if a case exposes a gap in the route. Covers AC-013, AC-014, AC-015, AC-016
- [ ] T006 [API] Generic 500: `app.ts` catches an error that the analysis function throws outside the model call, logs the event and the status only, and answers 500 `{ error }` with a generic message that carries no part of the error text; `source/apps/api/test/analyze-route.test.ts` gains the case with an analysis function that throws a message holding a sentinel (500, the generic message, the sentinel in no part of the reply, the reply is JSON with the `error` field the 400 replies use) — covers AC-018, AC-019
- [ ] T007 [API] Settings from the environment: `source/apps/api/src/settings.ts` (`readSettings(env)`: `PORT` unset gives 3000; a whole number from 1 to 65535 is accepted; any other value (`0`, `65536`, `80.5`, `abc`, a negative number, an empty string) throws an error that names `PORT` only; `SDDBUILDER_ANALYZER_MODEL` unset gives `claude-sonnet-5-5`, otherwise the value given; `ANTHROPIC_API_KEY` is returned as given or as absent, and absent is not an error); `source/apps/api/test/settings.test.ts` (table-driven, with a plain object as `env`, so no test reads the real environment) — covers AC-020, AC-021, AC-022, and the not-an-error part of AC-023
- [ ] T008 [API] Wiring and the server entry: `source/apps/api/src/wiring.ts` (`buildAnalyzeDeps(settings, clientFactory, log)`: with a key, the review model calls `callReview` (F-06, `review/anthropic.ts`) through the client the factory makes; without a key, the model is `null` and the log line names `ANTHROPIC_API_KEY` as missing and never its value; the key is passed to the client only); `source/apps/api/src/server.ts` (reads the environment, builds the app, serves it with `@hono/node-server` on `PORT`, logs the listen line with the port and no other setting); `source/apps/api/test/wiring.test.ts` (a sentinel key with a fake client factory: the key is passed to the factory only; with no key the model is `null` and the log line names the key without its value; the sentinel appears in no response of the app and in no log line) — covers AC-023, AC-024. `server.ts` is not imported by any test. Before this task, confirm the `start` script's runner (`vite-node`) is installed; if not, stop and report.
- [ ] T009 [API] Log format and the privacy of a request: the log lines of `analyze.ts` and of the route follow one format, `route=/analyze event=<name> status=<value>`, and carry no other field; the route logs one line per request, with the status it answers; `source/apps/api/test/analyze-privacy.test.ts` gains the route cases (a sentinel idea appears in no log line on the success path, a 400, a 405 or a 500; each log line has exactly the event, route and status fields; two requests with different briefs each return only their own findings; a request writes no file and keeps no state) — covers AC-025, AC-026, AC-027

## Rationale

- **Decision first (T001).** `features.md` still says 422 for a parse refusal. The owner's answer is 400, so the scope line is corrected before the route is built on it. The input caps stay out (F-17), which the stories already say.
- **Skeleton before the body (T002, then T003).** The routing rules (405, 404, the `{ error }` shape) do not depend on the body, and the body reader depends on the route.
- **Success before failure (T004, then T005, T006).** The route returns the analysis as built in F-06; the failure cases then check that the route keeps the findings when the review fails, and only then the generic 500.
- **Settings before wiring (T007, then T008).** The port rule and the model default are pure functions over an environment object, so they are tested without starting a server. The wiring and the entry point use them last, and the entry point is kept out of every test.
- **Privacy last (T009).** It fixes the log format across the route and `analyze.ts` once all log calls exist, and proves that no brief text reaches a log or a file.
- **Scope.** The input caps, the rate limit, the daily ceiling and the `skipped` status are F-17. `/generate` is F-15, so it is a 404 here.
- **Libraries.** None added. `hono` and `@hono/node-server` are already dependencies of `source/apps/api` (`architecture.md` §5).
- **Core.** No change to `source/packages/core`: the parser (`parseProjectConfig`), `analyzeStructure`, `analyzeBrief` and `checkReview` already exist.

**Interpretations** (carried from Specify):

- A body is "not JSON" when its text fails `JSON.parse` or is empty; the route does not check the content type.
- A parse refusal's `problems` are the parser's problems, unchanged, as `<path>: <reason>` strings.
- A missing `ANTHROPIC_API_KEY` does not stop startup; it makes the review `failed` on every analysis (architecture §4 Failure).

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Docs]` | Documentation changes required by the feature |
| `[Core]` | `source/packages/core` (pure TypeScript, no I/O) |
| `[API]` | `source/apps/api` (the HTTP route, the LLM call, logging, the analysis function) |
