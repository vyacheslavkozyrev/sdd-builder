# Implementation Plan — API: analyze and generate, zip download (F-07)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the checks pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Paths are under `packages/core/` (pure parsing) and `apps/api/` (HTTP, model calls, zip). Every test name carries `F-07 AC-###`. HTTP tests call the Hono app directly (`app.request`), with fake models and no network.

## Tasks

- [x] T001 [Docs] Record the decisions before code depends on them: Hono and `@hono/node-server` (pinned below), JSZip, and the generation rules (one call, one retry, status codes, fixed zip name) — `spec/documents/architecture.md` (§5 technology rows, §6 decision 11) — covers: none (prerequisite; decisions recorded before code)
- [x] T002 [Core] Parse untrusted input, part 1: `parseProjectConfig(value: unknown)` returns `{ ok: true, config }` or `{ ok: false, problems }`; checks the top level (`schemaVersion` is 1, `name`, `idea`, `stack`, `architecture`, `codeRules`, `testRules`, `targets` from the known set); each problem names the field path and the reason, never the value — `packages/core/src/parse-config.ts`, `packages/core/test/parse-config.test.ts` — covers AC-003 (table cases for name, schemaVersion, unknown target)
- [x] T003a [Core] Parse untrusted input, part 2a (split from T003 by Amendment 2026-11-12): the parser checks `workflows` — the workflow fields (`id`, `name`, `scope`, `iterationSource`, `enabled`) and `steps` (an array, each with a string `stepId` and boolean `enabled`) — `packages/core/src/parse-config.ts`, `packages/core/test/parse-config.test.ts` — covers AC-003 (table cases for steps `enabled` and workflow `steps` not an array)
- [x] T003b [Core] Parse untrusted input, part 2b (split from T003 by Amendment 2026-11-12): the parser checks each workflow's `conditions` (gate, pass and fail routes; an absent `fail` is accepted, `fail: null` is refused) and the optional workflow `description` (a string when present; left unchecked by T003a) — `packages/core/src/parse-config.ts`, `packages/core/test/parse-config.test.ts` — covers AC-003 (negative cases for conditions and routes)
- [x] T003c [Core] Parse untrusted input, part 2c (split from T003 by Amendment 2026-11-12): the parser checks `connections`, `customSteps` (kind, origin, required, string arrays), `stack` and `architecture`; exported from `packages/core/src/index.ts` — `packages/core/src/parse-config.ts`, `packages/core/test/parse-config.test.ts` — covers AC-003 (negative cases for connections and custom steps)
- [x] T004 [Build] Add the API runtime dependencies at the pinned versions: `hono` 4.13.14, `@hono/node-server` 2.1.5 (peer `hono` ^4), `jszip` 3.10.2 (ships its own types) — `apps/api/package.json`, `package-lock.json` — covers: none (enabler)
- [x] T005 [API] Request reading and error body: `readConfig(request)` reads the body as text, parses JSON, then calls `parseProjectConfig`; returns the config or a 400 with `error` (invalid JSON, or the problems list); `errorBody` gives the one error shape `{ error, problems? }` — `apps/api/src/http/read-config.ts`, `apps/api/src/http/errors.ts`, `apps/api/test/read-config.test.ts` — covers AC-002, AC-003, AC-026 (shape)
- [x] T006 [API] App and `POST /analyze`: `createApp({ review, log })` with the route that calls `analyze(config, review)` and returns its result as 200 JSON; a refused configuration is 200 with its blockers; a model that throws, times out or replies non-JSON gives `review.status` `failed`; unknown paths give 404 JSON; `GET` on `/analyze` gives 405 with `Allow: POST`; an unexpected exception gives 500 with a generic `error` and no exception text — `apps/api/src/app.ts`, `apps/api/test/analyze-route.test.ts` — covers AC-001, AC-004, AC-005, AC-025, AC-027 (response part)
- [x] T007 [API] Analyzer wiring when the key is missing: `reviewModelFrom(env)` builds the Anthropic review model; when the key is missing it returns a model whose `complete` throws, so `/analyze` answers 200 with `review.status` `failed`; the server logs one line naming `ANTHROPIC_API_KEY`, never its value — `apps/api/src/wiring.ts`, `apps/api/test/wiring.test.ts` — covers AC-006
- [x] T008 [API] Generation prompt: `buildGenerationPrompt(config, plan, findings?)` gives fixed instructions, the brief and process as JSON in a fixed key order, each planned file with its path, layout, description and rule tags in plan order, and asks for one JSON object mapping each path to its text; when `findings` are given they are listed as the findings of the previous reply; the same input gives the same text — `apps/api/src/generate/prompt.ts`, `apps/api/test/generate-prompt.test.ts` — covers AC-012 (the retry prompt contains the findings)
- [x] T009 [API] Reply parsing: `parseReply(text, { truncated })` returns `{ ok: true, reply }` for a JSON object, and `{ ok: false, findings }` for a truncated reply, text that is not JSON, or JSON that is not an object; a truncated reply is never parsed — `apps/api/src/generate/parse-reply.ts`, `apps/api/test/parse-reply.test.ts` — covers AC-015, AC-016 (the reply side)
- [x] T010 [API] Generation model adapter: `GenerationModel` port with `complete(prompt): Promise<{ text, truncated }>`; the Anthropic implementation reads `stop_reason` and sets `truncated` when it is the length limit; `GENERATION_MAX_TOKENS` is set in this task and named in the architecture decisions; a missing key throws at creation, naming the variable, never its value; tests use a fake SDK client — `apps/api/src/generate/generation-model.ts`, `apps/api/test/generation-model.test.ts` — covers AC-016 (adapter sets truncation), AC-018 (missing key at creation)
- [x] T011 [API] Templates from disk: `loadTemplates(dir)` reads the files of `templates/` into a `TemplateSource` once at start-up; a missing directory throws at start-up; the repository's templates give a plan that `planGeneration` accepts — `apps/api/src/templates.ts`, `apps/api/test/templates.test.ts` — covers: none (enabler for generation; AC-008 uses it)
- [x] T012 [API] Generation service, first pass: `generateProject(config, { templates, model, log })` runs `validateConfig` (a refusal returns `{ ok: false, reason: 'refused', problems }` with no model call), then `planGeneration`, the prompt, one `model.complete`, and the reply parse; a model error gives `{ ok: false, reason: 'model' }` after exactly one call; a reply that passes `checkReply` gives `{ ok: true, files }` in plan order — `apps/api/src/generate/service.ts`, `apps/api/test/generate-service.test.ts` — covers AC-008 (plan order and content), AC-010, AC-017
- [x] T013 [API] Generation service, retry rules: a reply that fails `checkReply` (or `parseReply`) triggers exactly one retry whose prompt holds the first findings; a second failure gives `{ ok: false, reason: 'reply', problems }` with findings and paths only, never file text, after exactly two calls; a first failure followed by a pass gives `{ ok: true }` after two calls — `apps/api/src/generate/service.ts`, `apps/api/test/generate-service.test.ts` — covers AC-012, AC-013, AC-014, AC-015, AC-016, AC-019
- [x] T014 [API] Zip packaging: `packageZip(files)` builds the zip in memory with JSZip: file entries only, no folder entries, forward-slash relative paths, DEFLATE, one fixed timestamp on every entry; the same files give the same bytes; the test reads the zip back and checks entries, order and content — `apps/api/src/zip.ts`, `apps/api/test/zip.test.ts` — covers AC-008 (zip content), AC-009, AC-020, AC-021
- [x] T015a [API] `POST /generate` route, first part (split of T015 by Amendment 2026-11-12): 400 for bad input (through `readConfig`), 503 when the generation model is not configured (`null` model) with no model call, 422 with every problem for a refused configuration, 502 with `problems` for a model or reply failure, 200 with the zip, `Content-Type: application/zip` and `Content-Disposition: attachment; filename="sddbuilder-project.zip"`; the existing call-site edits to `createApp`; the first half of the route tests — `apps/api/src/app.ts`, `apps/api/test/analyze-route.test.ts`, `apps/api/test/wiring.test.ts`, `apps/api/test/generate-route.test.ts` — covers AC-007, AC-010, AC-011, AC-014, AC-017, AC-018, AC-019
- [x] T015b [API] `POST /generate` route, second part (split of T015 by Amendment 2026-11-12): the same request body twice gives independent results; no file is written during a request; `GET` on `/generate` gives 405 with `Allow: POST`; the error shape of the route — `apps/api/test/generate-route.test.ts`, plan and progress updates — covers AC-022, AC-023, AC-025, AC-026
- [x] T016 [API] Logs and secrets: the logger port receives only the error's name, the route and the status — never the body, the brief, the reply text or the key; every failure path is tested with a capturing logger; the key value never appears in any response body or log line — `apps/api/src/app.ts`, `apps/api/src/log.ts`, `apps/api/test/privacy.test.ts` — covers AC-024, AC-027 (log part), AC-028
- [x] T017 [API] Server entry: `apps/api/src/server.ts` builds the app from the environment (`reviewModelFrom`, the generation model or `null`, `loadTemplates` of `templates/`) and serves it on `PORT` with `@hono/node-server`; no test imports it, and it is checked by the manual run in the device criterion — `apps/api/src/server.ts` — covers AC-029 (device: a real key and one `/generate` call are checked in the manual checklist)
- [ ] T018 [Docs] Describe the behaviour as built: the two routes, status codes, the zip name and the one retry, in `architecture.md` §2 (data flow) and §3 (generation), and the environment variables in §4 — `spec/documents/architecture.md` — covers: none (documents behaviour, per `general.md`)

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Docs]` | Documentation changes required by the feature |
| `[Core]` | `packages/core`: pure parsing of untrusted input |
| `[API]` | `apps/api`: HTTP routes, model calls, generation service, zip |

## Rationale

**Order.** The decisions come first (T001), because the libraries and the generation rules are used by everything after. The core parser (T002–T003) is pure and needs no network, so it is built and tested before any HTTP code; it is the input check of S3 for both routes. The API dependencies (T004) come next, then the HTTP shell and `/analyze` (T005–T007): this is the simpler route and gives the request reading and the error shape that `/generate` reuses. The generation pieces follow in the order they are called: prompt (T008), reply parsing (T009), the model adapter (T010), the templates (T011), the service in two passes (T012–T013), the zip (T014), and the `/generate` route that uses them all (T015). Logging and secrets (T016) are checked over the finished routes. The server entry (T017) is last, and documentation of the behaviour as built is last of all (T018).

**Architecture constraints.** `packages/core` stays pure: it has no HTTP, no `process.env`, no file system and no LLM call (`architecture.md` §1, `typescript.md`). The parser takes `unknown` and narrows it; the model is never trusted with the shape of the config (`typescript.md`, "validate at the API"). The LLM is called only from `apps/api`, only in `/analyze` (review) and `/generate` (files) (`architecture.md` §6 decision 7). `checkReply` in core decides what reaches the zip; the API never writes a reply file that has findings (`architecture.md` §3, step 6).

**Retry and failure (T012–T013).** The first pass has no retry, so each rule can be tested on its own. The retry rule is one retry with the findings in the prompt, and two calls at most. Provider errors are not retried by F-07; the SDK retries stay inside the adapter (T010), as `architecture.md` §4 says.

**Truncation (T009–T010).** A reply cut off by the length limit is parsed as text it cannot be trusted as, so it is detected in the adapter from the stop reason and treated as a failed reply. Without this, a partial JSON object would look like a short reply.

**Libraries (raised for approval).** `architecture.md` §5 names Hono or Fastify and `archiver` or `jszip` as "decided in F-07", so those choices are made here: Hono (`app.request` lets the HTTP tests run without a port) and JSZip (in-memory, no stream). The versions are pinned at least two weeks old on the date of this plan (2026-11-12): `hono` 4.13.14 (2026-10-25), `@hono/node-server` 2.1.5 (2026-10-13, peer `hono` ^4, Node 20 or later), `jszip` 3.10.2 (2023, ships its own types). These are new dependencies of `apps/api` and must be approved; they are the only ones this feature adds. `@anthropic-ai/sdk` 1.3.0 is already in use by F-04.

**Parser scope (T002–T003).** The parser checks the shape: types, known enums, required fields, the structure of the workflow data, and refuses any field the config does not define (refused, not dropped, so the typed value is exactly what was submitted). The meaning of the configuration (refusals, reachability, layers) stays with `validateConfig` and the analyzer, which already exist. Splitting the parser in two keeps each task under the size guard.

**Fixed zip date (T014).** JSZip sets a date on each entry from the current time unless one is given. Passing one fixed date is what makes the zip bytes depend only on the files (AC-009, AC-021).

**Server entry (T017).** It is the only code that reads `process.env` and the templates directory at start-up, so it is kept thin and checked by the manual run (AC-029). Everything it wires is tested through the functions it calls.

## Coverage check

| Criterion | Tasks |
|---|---|
| AC-001 | T006 |
| AC-002 | T005 |
| AC-003 | T002, T003, T005 |
| AC-004 | T006 |
| AC-005 | T006 |
| AC-006 | T007 |
| AC-007 | T015 |
| AC-008 | T011, T012, T014 |
| AC-009 | T014 |
| AC-010 | T012, T015 |
| AC-011 | T015 |
| AC-012 | T008, T013 |
| AC-013 | T013 |
| AC-014 | T013, T015 |
| AC-015 | T009, T013 |
| AC-016 | T009, T010, T013 |
| AC-017 | T012, T015 |
| AC-018 | T010, T015 |
| AC-019 | T013, T015 |
| AC-020 | T014 |
| AC-021 | T014 |
| AC-022 | T015 |
| AC-023 | T015 |
| AC-024 | T016 |
| AC-025 | T006 |
| AC-026 | T005, T015 |
| AC-027 | T006, T016 |
| AC-028 | T016 |
| AC-029 (device) | T017 |
