# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-24 | Approved by the user; 7 stories, 27 criteria, all [auto]. Parse refusal is a 400 (owner answer 2026-11-24); input caps are F-17 |
| UX       | ➖ Not needed |  | No user interface (API only) |
| Plan     | ✅ Complete | 2026-11-24 | Approved by the user; 9 tasks (T001 to T009); 27 criteria, all covered |
| Build    | 🔄 In Progress |      | 9 of 9 tasks committed |
| Verify   | ✅ Complete | 2026-11-24 | 27 of 27 [auto] criteria covered by 72 passing F-14 tests; 0 gaps; 0 failures; API 117 of 117 passing (10 files); no [device] criteria, so no checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ------ |
| T009 | Log format and privacy of a request: every /analyze log line is `route=/analyze event=<name> status=<value>`; one line per request on each path (`answered` 200, `refused` 400 and 405, `analysis-failed` 500, `body-unreadable` 500); a body that cannot be read is answered 500 inside the route (`app.ts`); tests cover AC-025 to AC-027 (`analyze-privacy.test.ts`) | 0 blockers, 1 warning fixed (unreadable body escaped the route's log and handler), 0 suggestions | task check passed: api 117, web 1895, core 1217, exit 0 |
| T008 | Wiring and the server entry: `wiring.ts` (`buildAnalyzeDeps`: the key reaches the client factory only; no key gives a null model and a startup line naming the key), `server.ts` (reads the environment once, serves on PORT, logs the port); `vite-node` 5.3.0 added as an exact devDependency after the owner's approval (stop, 2026-11-24) and recorded in architecture §5 | 0 blockers, 2 warnings fixed (vite-node pin made exact; vite row said peer, now dependency), 1 suggestion fixed (header comment); 1 suggestion deferred (listen errors not caught) | task check passed: api 103, web 1895, core 1217, exit 0 |
| T007 | Settings from the environment `src/settings.ts` (`readSettings(env)`): PORT rule, model default, optional key; tests table-driven with plain objects (AC-020 to AC-023 settings part) | 0 blockers, 2 warnings fixed (an empty or blank model falls back to the default; a blank key is treated as absent), 0 suggestions | task check passed: api 98, web 1895, core 1217, exit 0 |
| T006 | Generic 500: a throw from the analysis is logged as `route=/analyze event=analysis-failed status=500` and answered 500 `{ error: 'Internal error' }` (`app.ts`); tests cover AC-018 and AC-019 | 0 blockers, 0 warnings, 1 suggestion fixed (400 shape asserted exactly) | task check passed: api 80 of 80, web 1895 of 1895, core 1217 of 1217, exit 0 |
| T005 | Review failures keep the 200 and the structural findings: no model, a throwing model, a non-JSON reply, a valid reply (route tests only; no source change) | 0 blockers, 0 warnings, 0 suggestions | task check passed: api 77 of 77, web 1895 of 1895, core 1217 of 1217, exit 0 |
| T004 | Success path: `POST /analyze` answers 200 `{ findings, review }` through `deps.analyze` (`app.ts`); the temporary 501 is removed; tests cover AC-001 to AC-004 and AC-017 | 0 blockers, 1 warning fixed (AC-002 fixture produced no structural findings; a case now injects a reordered analysis), 1 suggestion fixed (line width) | task check passed: api 73 of 73, web 1895 of 1895, core 1217 of 1217, exit 0 |
| T003 | Body reading and parse refusal: `http/body.ts` (`readProjectConfig`: empty or not JSON gives 400 `{ error }`; a parser refusal gives 400 with `problems` as `<path>: <reason>`); `POST /analyze` reads the body and logs refusals; no-model-call guarantee for AC-010 and AC-011 proven by counting fakes; a valid config gets a temporary 501 until T004 | 1 warning (the reply repeats ids and names from core's messages) resolved by Amendment 1 (the promise is narrowed to brief text; comment and plan updated); 1 test assertion removed (T004 changes it); 1 suggestion deferred | task check passed: api 67 of 67, web 1895 of 1895, core 1217 of 1217, exit 0 |
| T002 | Route skeleton `src/app.ts` (`createApp()`): 405 with `Allow: POST` for non-POST on `/analyze`, 404 `{ error }` for other paths incl. `/generate` (`test/analyze-route.test.ts`) | 0 blockers, 2 warnings fixed (unused `_deps` removed; vacuous no-call assertions removed), 0 suggestions | task check passed: api 57 of 57, web 1895 of 1895, core 1217 of 1217, exit 0 |
| T001 | Correct F-14 scope line in `features.md`: a parse refusal is a 400 (owner answer 2026-11-24); input caps named as F-17 (docs only, no test) | 0 blockers, 0 warnings, 0 suggestions | task check passed: core 1217 of 1217 (59 files), exit 0 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T003 SUGGESTION `analyze-route.test.ts` and `analyze-body.test.ts`: the `fakeDeps()` helper is repeated in both files. Not extracted in T003 to keep the task to its own tests; a shared helper can come with T004 or T009 if the copies diverge.

- `source/apps/api/src/app.ts` `createApp(_deps)` (T002 review, WARNING, fixed by removal; a second WARNING, the vacuous no-call assertions in `test/analyze-route.test.ts`, was fixed the same way): the parameter was unused, which is dead code. `createApp()` takes no arguments now. The plan's `deps` (analysis and log functions) comes back in T003, the first task whose route calls them. Reason: the T002 test's "no analysis call" assertions could never fail while nothing was wired, so they were removed. The no-model-call guarantee for AC-010 and AC-011 is proven when `POST /analyze` is wired in T003.
- `source/apps/api/src/http/body.ts:4` and `source/packages/core/src/pipeline/parse/lists.ts:41` (T003 review, WARNING, resolved by Amendment 1: the reply promise is narrowed to brief text): the body reader promises that a 400 reply never repeats a value from the body (plan T003), but core's parser messages do echo body values: `lists.ts:41` `repeats <item>`, and in `check/` the messages `got <flow.name>`, `got <tag.ruleId>`, `the id <id>`, `got <route.to>` and similar. The echoed values are ids, names, tags and list items, not idea text, so AC-009 (no brief text) is not broken by them; the plan's wider promise is. Fix needs a change to core's messages (or a sanitised message form), which the plan makes a task of its own. Reason not applied here: changing core is out of this task's scope; proposed as an Amendment. Blocks the T003 outcome until the owner decides.
- `source/apps/api/test/analyze-route.test.ts` and `source/apps/api/test/analyze-body.test.ts` (T003 review, SUGGESTION): the `fakeDeps()` helper is duplicated. Reason not applied: each test file is self-contained and the duplicate is ten lines; a shared helper can come with T004 when the success cases need it.

- `source/apps/api/src/server.ts` startup (T008 review, SUGGESTION): an EADDRINUSE or other listen error is not caught, so Node prints its own stack and exits. The stack carries the port only, no secret, and a clear message would be a new code path with no criterion behind it. Reason not applied: outside AC-020 to AC-024; can come with a later operations task.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

Verify run: `npx vitest run --reporter=verbose` in `source/apps/api` (2026-11-24). Test Files 10 of 10 passed; Tests 117 of 117 passed; 72 of them carry `F-14 AC-0xx`; 0 failed. All 27 criteria are `[auto]`; there are no `[device]` criteria, so no manual checklist.

| Criterion | Covering test file | Test names (abridged) | Result |
| --- | --- | --- | --- |
| AC-001 | `analyze-route.test.ts` | a valid config answers 200 with a JSON body of findings and review | pass |
| AC-002 | `analyze-route.test.ts` | the findings are the analyzeStructure then analyzeBrief output; the route keeps the order | pass |
| AC-003 | `analyze-route.test.ts` | two requests with the same body and the same fake model give the same response body | pass |
| AC-004 | `analyze-route.test.ts` | a config with no brief fields gets 200 and the brief blockers in findings | pass |
| AC-005 | `analyze-body.test.ts` | refuses 'an empty body', 'a lone brace', 'a JSON array' with 400 and no model call | pass |
| AC-006 | `analyze-body.test.ts` | refuses 'a body with several missing keys' with 400 and no model call; does not refuse a config the parser accepts | pass |
| AC-007 | `analyze-body.test.ts` | refuses 'a flat schemaVersion 1 body' with 400 and no model call (message names version 2) | pass |
| AC-008 | `analyze-body.test.ts` | refuses 'an unknown key, named by its path'; an unknown key value is not repeated in the reply | pass |
| AC-009 | `analyze-body.test.ts` | a sentinel idea in a body that is not JSON appears in no 400 reply; a sentinel idea appears in no 400 reply, including one with a parse problem elsewhere | pass |
| AC-010 | `analyze-route.test.ts` | GET, PUT, PATCH and DELETE on /analyze answer 405 with Allow: POST and make no model call | pass |
| AC-011 | `analyze-route.test.ts` | POST /generate answers 404; GET, POST, PUT on an unknown path answer 404 with no model call | pass |
| AC-012 | `analyze-route.test.ts` | GET, PUT, PATCH and DELETE on an unknown path answer 404, not 405 | pass |
| AC-013 | `analyze-route.test.ts` | with no model a valid configuration answers 200 with a failed review and the findings in full | pass |
| AC-014 | `analyze-route.test.ts` | a model call that throws answers 200 with a failed review and the thrown message in no part of the response | pass |
| AC-015 | `analyze-route.test.ts` | a model reply that is not JSON answers 200 with a failed review | pass |
| AC-016 | `analyze-route.test.ts` | a valid reply answers 200 with an ok review of the entries checkReview keeps | pass |
| AC-017 | `analyze-route.test.ts` | one request makes one model call, and a throwing call still answers 200 with one call | pass |
| AC-018 | `analyze-route.test.ts` | an error thrown by the analysis answers 500 with a generic message; the 500 path logs the event and status only | pass |
| AC-019 | `analyze-route.test.ts` | the 500 reply is JSON with the error field the 400 replies use | pass |
| AC-020 | `settings.test.ts` | listens on 3000 when PORT is unset; on 8080; accepts 1 and 65535 | pass |
| AC-021 | `settings.test.ts` | refuses PORT set to 0, 65536, 80.5, abc, a negative number, an empty string; the error names PORT only | pass |
| AC-022 | `settings.test.ts` | uses claude-sonnet-5-5 when SDDBUILDER_ANALYZER_MODEL is unset, empty or blank; uses the value when set | pass |
| AC-023 | `settings.test.ts`, `wiring.test.ts` | an absent key is not a settings error; with no key the factory is never called and the startup line names ANTHROPIC_API_KEY | pass |
| AC-024 | `wiring.test.ts` | the key goes to the client factory once; the sentinel key appears in no response and in no log line | pass |
| AC-025 | `analyze-privacy.test.ts` | the sentinel idea appears in no log line on a success, a 400, a 405, a 500 and an unreadable body | pass |
| AC-026 | `analyze-privacy.test.ts` | each log line of a request carries the event, route and status only, on the same six paths | pass |
| AC-027 | `analyze-privacy.test.ts` | two requests with different briefs each return only their own findings; every route case leaves the temp folder unchanged | pass |

Gaps: none. Failures: none.

---

## Amendments

```
### Amendment 1 — 2026-11-24
**Changed**: `plan.md` T003 and the comment at the top of `source/apps/api/src/http/body.ts`: the reply's promise is narrowed from "never repeats a value from the body" to "never repeats brief text (idea, architecture, rule content)". Ids, names, tags and list items named by core's parser messages (for example "repeats <item>", "got <flow.name>") may appear. Owner decision (option 1), after the T003 review warning.
**Reason**: core's parser and check messages name ids, names and tags; changing them is a core task outside T003. AC-008 and AC-009 of `stories.md` already test brief text and the unknown key's value, so they are unchanged.
**Impact**: T003 re-runs review and test on the staged change; no task before T003 is affected; no later task changes.
```
