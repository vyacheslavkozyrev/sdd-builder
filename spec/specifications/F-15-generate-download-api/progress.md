# Progress — Generate and Download API (F-15)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-24 | Approved by the user; 6 stories, 29 criteria, all [auto]. Limits and input caps are F-17; the generator model is `SDDBUILDER_GENERATOR_MODEL` (default `claude-opus-5-5`) |
| UX       | ➖ Not needed |  | No user interface (API only) |
| Plan     | ✅ Complete | 2026-11-24 | Approved by the user; 10 tasks (T001 to T010); 29 criteria, all covered |
| Build    | ✅ Complete |      | 11 of 11 tasks committed (T011 added by Verify) |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist. Full verification waits for F-16 integration (owner decision 2026-11-24) |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Dependency Override

- 2026-11-24: the owner asked to start F-15 although F-14's `progress.md` shows Build 🔄 In Progress (9 of 9 tasks committed, feature marked complete in `a5238c0`). F-15 is built and tested now; its full verification waits for F-16 integration.

---

## Current Task

None

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Generator model setting: `settings.ts` reads `SDDBUILDER_GENERATOR_MODEL` into `generatorModel`; unset or blank gives `claude-opus-5-5` | 0 blockers, 0 warnings, 2 suggestions fixed (local name; a long line wrapped) | task check passed: api 122 of 122, web 1895 of 1895, core 1217 of 1217 |
| T002 | Templates loader `generate/load-templates.ts`: `loadTemplates(root)` reads the base manifest and layouts and the four Claude Code layouts from `source/templates`; a missing or unreadable file, or a bad manifest, throws naming its path; `GenerationTemplates` derived from `planGeneration`'s parameter (core's export list is pinned by a test) | 0 blockers, 1 warning fixed (empty manifest path or layout accepted), 3 suggestions fixed (module-private type; unreadable case tested; duplicate presence test removed) | task check passed: api 147 of 147, web 1895 of 1895, core 1217 of 1217 |
| T003 | Reply parse `generate/parse-reply.ts`: `parseReply(text)` returns the map of a whole JSON object with values as written; arrays, null, numbers, strings, booleans, code fences, leading and trailing text and empty text give `null` | 0 blockers, 0 warnings, 0 suggestions | task check passed: api 163 of 163, web 1895 of 1895, core 1217 of 1217 |
| T004 | Generation prompt `generate/prompt.ts`: `generationRequest(plan)` lists each planned file in plan order (path, rendered layout, description, rule tags) in a fixed-order JSON content; `retryRequest` adds the findings as `<path>: <message>` lines, with a path escaped to one line | 0 blockers, 2 warnings fixed (a reply key with a line break could forge retry lines; no test for it), 1 suggestion fixed (constant for one line); round 2 clean | task check passed: api 175 of 175, web 1895 of 1895, core 1217 of 1217 |
| T005 | Generation call `generate/anthropic.ts`: `GenerationClient`, `generationCallParams` with `max_tokens` 32000 and timeout 300000 ms (SDK retries left on), `callGeneration` makes one call and does not catch a thrown error | 0 blockers, 0 warnings, 5 suggestions (4 fixed: a test moved to AC-018, the SDK-options test, a single cast, an empty-reply edge case; 1 deferred, see Deferred Findings) | task check passed: api 182 of 182, web 1895 of 1895, core 1217 of 1217 |
| T006 | Zip `generate/zip.ts`: `buildZip(files)` in the given order, no directory entries, DEFLATE, fixed date 2020-01-01 UTC; rejects an empty text (JSZip would store it uncompressed), an unsafe path (`..`, `.`, empty segment, backslash, absolute, trailing slash) and a duplicate path | 0 blockers, 3 warnings fixed (empty text stored without DEFLATE; no path guard; no test across time zones), 0 suggestions | task check passed: api 201 of 201, web 1895 of 1895, core 1217 of 1217 |
| T007 | Generation service `generate/service.ts`: `generateProject(config, { templates, model })` returns zip, refused, unavailable, bad-reply or provider-error; one call for the plan; one retry only after a bad reply; no retry for a provider error; findings for keys the model did not plan are neutralised to `(reply)` | 0 blockers in the first review round: 1 blocker fixed (reply keys not in the plan reached `bad-reply` problems and the retry prompt), 2 warnings fixed (AC-010 tag, AC-015 content test); 2 suggestions deferred (core reports unplanned keys itself; the `workspace.test.ts` 5 s `tsc` timeout) | task check passed: api 216 of 216, web 1895 of 1895, core 1217 of 1217 |
| T008 | Route `/generate` in `app.ts`: 405 with `Allow: POST` before any read; body through `readProjectConfig`; service result mapped to 200 zip, 422, 503, 502 (bad reply and provider error) and 500; one log line per request, `route=/generate event=<name> status=<n>`, no text | 0 blockers, 2 warnings fixed (body read outside the guarded try; a "no body read" test that did not check it), 1 suggestion fixed (table wrapping); the `wiring.ts` placeholder `generate` stays until T009 | task check passed: api 243 of 243, web 1895 of 1895, core 1217 of 1217 |
| T009 | Wiring and server: `buildDeps` builds review and generation from one client made only when a key is set; no key gives 503 for generation and no review model; the templates load once at startup in `server.ts`; the startup line now names both (`review=off generation=off`) | 0 blockers, 1 warning fixed (a test name that claimed an assertion it did not make), 1 suggestion fixed (type parentheses); the log wording was an owner decision (option 1, applied) | task check passed: api 246 of 246, web 1895 of 1895, core 1217 of 1217 |
| T010 | Docs: `architecture.md` §3 (a generation reply is one bare JSON object; `max_tokens` is a bad reply), §4 and §5 (`SDDBUILDER_GENERATOR_MODEL`; the fixed generation constants are not environment variables) | 0 warnings; docs only, no test | task check passed: api 246 of 246, web 1895 of 1895, core 1217 of 1217 |
| T011 | Test naming for AC-023: the default-model `it.each` carries `F-15 AC-023` in its title (describe title shortened so the ID appears once) | 0 blockers, 0 warnings, 1 suggestion fixed (repeated ID in the describe title) | task check passed: api 246 of 246, web 1895 of 1895, core 1217 of 1217 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T006 (WARNING, fixed in `generate/zip.ts`): `buildZip` throws on an empty file text, because JSZip stores an empty entry uncompressed. Note for T007: `checkReply` must reject an empty text as a bad reply, so the service never reaches the throw.

- T005: `generate/anthropic.ts` repeats the shape of `callReview` in `review/anthropic.ts`. Not merged: the plan asks for a shape like `ReviewClient`, and the limits and retry settings differ (generation keeps SDK retries on, review turns them off).
- Note for Verify (T005): AC-020 says "no retry". The SDK's own retries (architecture §12 decision 11) can re-send a request on 429 or 5xx inside the adapter. Our code makes one call per attempt; the wording is looser than the mechanism. Owner to confirm at Verify.

- `source/apps/api/src/generate/anthropic.ts:44-55` (T005, SUGGESTION): `callGeneration` repeats the shape of `callReview` in `source/apps/api/src/review/anthropic.ts`. Not merged here: the plan asks for a `GenerationClient` "like `ReviewClient`", the two calls differ in limits and retries, and a shared helper is a refactor beyond T005. Revisit when a third model call appears.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

**Verify run 2026-11-24** (branch `main`, clean tree). `source/scripts/task-check.sh` exits 0, no timeouts: typecheck clean; api 246 of 246 in 17 files, web 1895 of 1895 in 83 files, core 1217 of 1217 in 59 files. No `.skip`, `.only` or `.todo` in the API tests. All 130 `F-15 AC-` test lines in the API verbose run show a pass.

Manual checklist: none (all 29 criteria are `[auto]`; no `checklist.md` needed).

**Second verify run 2026-11-24** (HEAD `eb2ea8c`, branch `main`, clean tree at start; supersedes the gap result of the first run). `source/scripts/task-check.sh` exits 0, no timeouts: typecheck clean; api 246 of 246 in 17 files, web 1895 of 1895 in 83 files, core 1217 of 1217 in 59 files. Every AC-001 to AC-029 has at least one passing test whose name carries `F-15 AC-0xx`; the AC-023 default cases are now named (T011). The six weaker proofs below were re-checked against the tests and still apply.

Result: **0 gaps, 0 failures.** Manual checklist: none. The matrix is complete; the Verify phase row is left Pending because the owner's 2026-11-24 decision holds full verification until F-16 integration. Marking it complete is the owner's call.

| AC | Covering tests (file: test name) | Status |
| -- | -------------------------------- | ------ |
| 001 | generate-route.test.ts: `F-15 AC-001 gives 200 with the zip content type and the attachment file name` | pass |
| 002 | generate-zip.test.ts: `F-15 AC-002 holds each file at its path with its text`; generate-route.test.ts: `F-15 AC-001 the body is the zip of every planned path, in plan order` | pass |
| 003 | generate-zip.test.ts: `F-15 AC-003 keeps the entries in the order given`, `stores each entry compressed with DEFLATE`, `dates each entry 2020-01-01 00:00 UTC` | pass |
| 004 | generate-zip.test.ts: `F-15 AC-004 gives the same bytes for the same files on two runs` | pass (weaker, see Weaker proofs) |
| 005 | generate-service.test.ts: `F-15 AC-005 gives a zip with every planned path when the brief has warnings and no blocker` | pass (service level) |
| 006 | generate-route.test.ts: `F-15 AC-006 lists every blocker as a path and reason, in the order configProblems gives them, with no model call` | pass |
| 007 | generate-route.test.ts: `F-15 AC-007 the 422 reply holds only the error and the problems, with no zip and no files field` | pass |
| 008 | generate-service.test.ts: `F-15 AC-008 AC-010 refuses with every blocker, the same problems as the gate, and records zero model calls` | pass |
| 009 | generate-service.test.ts: `F-15 AC-009 refuses a blocked configuration before the missing model is checked` | pass |
| 010 | generate-service.test.ts: `F-15 AC-008 AC-010 refuses with every blocker, the same problems as the gate, and records zero model calls` | pass (weaker, see Weaker proofs) |
| 011 | generate-route.test.ts: `F-15 AC-011 a body that is not JSON gets 400 with an error and no model call` | pass |
| 012 | generate-route.test.ts: `F-15 AC-012 a JSON body the parser refuses gets 400 with problems that name the unknown key` | pass |
| 013 | generate-route.test.ts: `F-15 AC-013 a flat schemaVersion 1 body gets 400 and no model call` | pass |
| 014 | generate-route.test.ts: `F-15 AC-014 an empty body gets 400 with an error and no model call` | pass |
| 015 | generate-prompt.test.ts: `F-15 AC-015 the content holds every planned path in plan order`; generate-service.test.ts: `F-15 AC-015 makes one call whose prompt holds every planned path in plan order` | pass |
| 016 | generate-parse-reply.test.ts: `F-15 AC-016 accepts %s` and `F-15 AC-016 refuses %s` (table) | pass |
| 017 | generate-service.test.ts: `F-15 AC-017 retries once with the findings of the first reply in the retry prompt`; generate-prompt.test.ts: `F-15 AC-017 the retry prompt lists each finding as a path and a message` | pass |
| 018 | generate-service.test.ts: `F-15 AC-018 builds the zip from the good retry reply, in plan order` | pass |
| 019 | generate-route.test.ts: `F-15 AC-019 when the second reply also fails the answer is 502 with problems and no file text`; generate-service.test.ts: `F-15 AC-019 gives the paths and messages of the second reply and never its text` | pass |
| 020 | generate-call.test.ts: `F-15 AC-020 propagates a thrown provider error after one call and does not retry`; generate-service.test.ts: `F-15 AC-020 gives provider-error after one call when the first call throws, and does not retry` | pass (weaker, see Weaker proofs) |
| 021 | generate-call.test.ts: `F-15 AC-021 sends max_tokens 32000 and a client timeout of 300 seconds` | pass |
| 022 | generate-route.test.ts: `F-15 AC-022 a valid configuration with no model answers 503 with no call`; wiring.test.ts: `F-15 AC-022 with no key POST /generate gives 503 with an error and the client factory is never called` | pass |
| 023 | settings.test.ts: `F-15 AC-023 uses the model when SDDBUILDER_GENERATOR_MODEL is %s` (default `claude-opus-5-5` for unset, empty and spaces; named in T011); `F-15 AC-023 the generator model is independent of the analyzer model` (value); wiring.test.ts: `F-15 AC-023 every generation call names settings.generatorModel` | pass |
| 024 | wiring.test.ts: `F-15 AC-024 the sentinel key appears in no generate response or log line, even when the provider error carries it` | pass (partial, see Weaker proofs) |
| 025 | generate-route.test.ts: `F-15 AC-025 %s on /generate answers 405 with Allow: POST, reads no body and makes no model call` (table) | pass |
| 026 | generate-route.test.ts: `F-15 AC-026 %s %s answers 404 with an error and makes no model call` (table) | pass |
| 027 | generate-route.test.ts: `F-15 AC-027 an error that escapes the generator answers 500 with the generic message and no error text`; generate-service.test.ts: `F-15 AC-027 throws the generator error for a duplicate output path, and makes no call` | pass |
| 028 | generate-route.test.ts: `F-15 AC-028 a second request with the same body gives the same bytes as the first` | pass (partial, see Weaker proofs) |
| 029 | generate-route.test.ts: `F-15 AC-029 $name writes exactly one line with route, event and status` (7 rows); `F-15 AC-029 a zip request writes no line with file text or the brief idea` | pass |

**Gaps**

None. (The first run's AC-023 naming gap is closed by T011.)

**Weaker proofs** (the test passes and names the criterion, but proves less than the criterion says)

- AC-004: only `buildZip` is tested for byte equality. No request-level test names AC-004 (the two-request byte check is named AC-028).
- AC-010: "no file is planned or rendered" is not asserted; the test checks only the problems and zero calls.
- AC-020 "no retry": the fake counts our calls, so one call per attempt is proved. The SDK's own retries stay on (`generation keeps SDK retries on`), so a 429 or 5xx can be re-sent inside the SDK; no test shows that, and none can with a fake. The wording is looser than the mechanism (see Deferred Findings, T005).
- AC-024: the key is checked in responses and logs, but a log test checks file text only for the fixed fixture string "File text.", not the model reply.
- AC-028: the same-bytes check passes, but nothing proves that no file is written. The source has no file write (`grep` finds none in `source/apps/api/src`), which is not a test.
- AC-005: the 200 is proved at service level only; no route test names AC-005.

---

## Amendments

```
### Amendment — 2026-11-24 (Verify gap: AC-023 default test unnamed)
**Changed**: `plan.md` gains T011 (test naming only, `settings.test.ts`).
**Reason**: Verify (test agent, verify mode) found that the default-model cases for AC-023 are in an unnamed `it.each` title, so no test names the criterion.
**Impact**: Build reopens for T011; Verify re-runs after it. The weaker proofs the verify report lists are not gaps and are not changed here.
```

```
### Amendment — 2026-11-24 (T009 startup line)
**Changed**: the startup log line is `startup review=off generation=off missing=ANTHROPIC_API_KEY` (was `review=off` only), and the F-14 AC-023 assertion in `wiring.test.ts` is updated to match. Owner decision (option 1).
**Reason**: with no key, generation is off too, so the line must say so.
**Impact**: none on the criteria; the F-14 assertion is the only test changed.
```

```
### Amendment — 2026-11-24 (T008 size exception)
**Changed**: none to the plan. T008 staged at 498 changed lines (the route test file is about 380 of them).
**Reason**: over the 400 guard. The owner approved one commit for T008 as an exception.
**Impact**: none on T009.
```

```
### Amendment — 2026-11-24 (T007 size exception)
**Changed**: plan.md T007 line (the service takes no log function; the route logs the outcome; no split of T007)
**Reason**: the staged T007 change is 407 changed lines, over the 400 guard. The owner approved one commit for T007 as an exception.
**Impact**: none on T008. T007 commit is one commit.
```

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
