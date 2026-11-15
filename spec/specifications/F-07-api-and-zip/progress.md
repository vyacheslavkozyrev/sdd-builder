# Progress — API: analyze and generate, zip download (F-07)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional | | Not run |
| Specify  | ✅ Complete | 2026-11-15 | Stories approved by the user: 7 stories, 25 criteria, all `[auto]`. Decisions: pipeline config only on `/generate` (flat body refused with 400); flat generator removed in this feature; duplicate output path is a 500 |
| UX       | ➖ Not needed | 2026-11-15 | No user interface in this feature; every criterion is tested over HTTP or in core |
| Plan     | ✅ Complete | 2026-11-15 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | | 9 of 19 tasks committed (T010 retired by Amendment 1) |
| Verify   | ⏳ Pending  | | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None.

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Decision 23 in architecture §6 (pipeline-only `/generate`, flat generator removed, duplicate path 500) | 0 blockers, 0 warnings, 1 suggestion fixed, 1 deferred | task check passed: 404 api, 348 web, 1338 core |
| T002 | Pipeline generation prompt in `generate/pipeline-prompt.ts` beside the flat prompt (AC-008 prompt, AC-010 retry prompt); flat `prompt.ts` unchanged | 0 blockers, 1 warning fixed (a white-space-only description now reads `(none)`), 0 suggestions fixed, 2 deferred | task check passed: 418 api, 348 web, 1338 core (14 new tests in the pipeline-prompt file) |
| T003 | Pipeline generation service in `generate/pipeline-service.ts` (refuse, one call, one retry on a failed reply, provider error not retried); `configProblems` exported from core `pipeline/index.ts`; `loadTemplates` returns `ListableTemplateSource`; flat `service.ts` and `prompt.ts` unchanged | 0 blockers, 3 warnings fixed (`GeneratedFile` redeclared instead of imported from core; refusal test compared only against `configProblems`, now also asserts the AC-006 message; truncated-reply retry untested, now covered), 0 suggestions fixed, 2 deferred | task check passed: 434 api, 348 web, 1338 core (16 tests in the service file) |
| T004 | Route switch: `POST /generate` on the pipeline path (readPipelineConfig, pipeline caps 422, configProblems 422 before the ceiling, generatePipelineProject, 200/422/502/503/500); flat `/generate` cases in five test files moved to pipeline fixtures (Amendment 1); AC-006 route wording and no module cap (Amendments 2 and 3) | 0 blockers, 3 warnings fixed, 4 deferred. 400-line guard waived by the owner for this task | task check passed: 450 api, 348 web, 1338 core |
| T005 | Zip on the pipeline route: headers, entries in plan order, each entry's text, DEFLATE and fixed 2020-01-01 date, byte-identical zips across two requests on a fake clock (route unchanged) | 0 blockers, 3 warnings fixed, 1 suggestion fixed | task check passed: 456 api, 348 web, 1338 core |
| T006 | Privacy of `/generate`: log lines for a 200, a 422 and a 502 checked against the sentinels and the line format (AC-017); static scan of the `generate/` directory and the `/generate` part of `app.ts` for forbidden modules and globals (AC-018), the provider adapter allowed only the SDK import | 0 blockers, 2 warnings fixed (the scan missed `globalThis.fetch(`, `process['env']` and `process.getBuiltinModule(`; the scan covered three named files, not the directory AC-018 names), 1 suggestion fixed (repeated `createApp` calls factored into one helper) | task check passed: 498 api, 348 web, 1338 core (42 tests in the two files, 12 added in this review) |
| T007 | Limits on `/generate`: 404 and 405 rules, shared per-client count with `/analyze` (a minute-refused request adds nothing, also across the day), the generation daily ceiling (422 and minute refusals do not count; a failed model call counts; no model call at the ceiling) | 0 blockers, 2 warnings fixed (day-spanning count test; refusal reason checked), 2 suggestions fixed; 11 mutations caught | task check passed: 498 api, 348 web, 1338 core |
| T008 | Removed the flat generation path: `generate/service.ts`, `generate/prompt.ts`, `http/read-config.ts` and their four tests; `read-pipeline-config.test.ts` drops the flat-reader comparison (the invalid-JSON 400 cases stay) | 0 blockers, 0 warnings; the deferred flat-import warning is resolved by Amendment 4 in T011 | task check passed: 498 api, 348 web, 1338 core |
| T009 | Renamed the pipeline service and prompt to `generate/service.ts` and `generate/prompt.ts` (`generateProject`, `buildGenerationPrompt`, `GenerateResult`, `GenerateDeps`); the two test files renamed to match; renames and references only | 0 blockers, 0 warnings, 1 suggestion fixed, 2 deferred | task check passed: 498 api, 348 web, 1338 core |

---

## Amendments

- **Amendment 1 (2026-11-15), T004 absorbs T010.** T004 switches `POST /generate` to the pipeline path and breaks 57 flat-body tests in five files, so their migration moves into T004 and T010 is retired (recorded in `plan.md`). Owner choice, 2026-11-15.
- **Amendment 2 (2026-11-15), AC-006 route wording.** A parse refusal at the route is 400: `parsePipelineConfig` refuses a Condition whose fail route names no block and a block with no description before `configProblems` runs. `configProblems` refusals stay 422; the unknown rule tag case is the route's 422 case. The AC-006 text in `stories.md` says so. The service-level cases stay covered by T003.
- **Amendment 3 (2026-11-15), no module cap on pipeline `/generate`.** The flat F-13 AC-011 module cap does not apply to the pipeline model, as on `/analyze`. The removed flat module-cap test stays removed. The pipeline caps are only the idea length (8,000 characters) and the rule count (60), as `pipelineCapProblems` in core.
- **Amendment 4 (2026-11-15), flat core imports in two API tests move to T011.** `smoke.test.ts` and `templates.test.ts` import the flat `validateConfig` and `planGeneration` from the core root; T011 rewrites them to the pipeline namespace (Amendment 4 in `plan.md`). Owner choice, 2026-11-15.

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 `spec/documents/architecture.md:119` (suggestion): decision 11 still says `/generate` takes "the `ProjectConfig` itself", which reads as the flat shape. Not edited: decisions are a record, and decision 23 (line 134) states the pipeline-only body and supersedes it; the §3 text is rewritten in T019.
- T002 `source/apps/api/src/generate/pipeline-prompt.ts` `buildPipelineGenerationPrompt` (suggestion, open question for the owner): the function lists every finding it is given; AC-010 and the T002 plan line say "the first findings", but no cap number is in the spec. Not capped here, so the caller (T003) picks the subset. Needs the owner's number before T003 lands.
- T002 `source/apps/api/src/generate/pipeline-prompt.ts` (suggestion): the helpers and the instruction text duplicate `generate/prompt.ts` until T009 removes the flat prompt. Intended by the plan (flat file unchanged, both paths built side by side); merged in T009.
- T003 `source/apps/api/src/generate/pipeline-service.ts` `buildPipelineGenerationPrompt` call (open question for the owner, not a finding): the retry prompt lists every finding of the first reply, with no cap. AC-010 reads "lists the first findings", taken here as the first reply's findings. If the owner wants a cap, it is a one-line change plus a test; the T002 question above stays open until the owner answers.
- T003 `source/apps/api/src/generate/pipeline-service.ts` `attempt` (suggestion): `parsed.reply as Readonly<Record<string, string>>` is a cast after `checkReply` has proven every planned value is a string; the final loop still throws on a missing text. Not changed: a narrowing rewrite would add a branch that cannot run.
- T003 `source/apps/api/src/generate/pipeline-service.ts` `attempt` (suggestion): a non-plan key from the model is echoed into the 502 `problems` and the retry prompt through the `checkReply` message (F-03 wording). The text is not echoed, but a very long key would be. Not changed here: the message format belongs to F-03 `reply-check.ts`, and the key limit is a question for that feature.
- T004 `source/apps/api/src/app.ts` `/generate` (suggestion): the route runs `pipeline.configProblems` before the ceiling, and `generatePipelineProject` runs it again, so the config is checked twice; the `reason: 'refused'` branch in the route is therefore defensive only. Not changed: the pre-check must sit in the route so a 422 does not count toward the ceiling, and the service keeps its own refusal for its T003 tests.
- T004 `source/apps/api/test/generate-service.test.ts`, `generate-prompt.test.ts`, `generate-prompt-brief.test.ts`, `read-config.test.ts` (suggestion): these test the flat modules (`service.ts`, `prompt.ts`, `read-config.ts`) that the route no longer calls. Their F-07 labels are the nearest current criteria by behaviour, not proof of the route. Not changed: the plan keeps the flat files until T008 and T009, which delete these tests with them.
- T004 `source/apps/api/test/limits-route.test.ts`, `ceiling-route.test.ts` (suggestion): the pipeline caps are checked against the flat `INPUT_CAPS` constants, not `PIPELINE_INPUT_CAPS`, which core does not export from its root. Not changed: the flat `INPUT_CAPS` goes with the flat model in F-05, and the numbers are equal today.
- T004 `source/apps/api/test/generate-route-pipeline.test.ts` AC-022 (coverage note, not a finding): the test covers refusal before count only; "a failed model call still counts" is covered without a label in `ceiling-route.test.ts` and is owned by T007.
- T008 `source/apps/api/test/smoke.test.ts` line 2, `source/apps/api/test/templates.test.ts` line 6 (warning, deferred): both still import the flat `validateConfig` and `planGeneration` from the core root. The deletions in T008 do not touch them, and the flat core modules stay until T012–T015. `smoke.test.ts` is not named in any later task; `templates.test.ts` is named only in T017, whose wording does not mention these imports. Not changed here by review instruction. Fix: rewrite both to the pipeline names (or drop the smoke check) in T016 or T017, so the T011 static scan can pass.
- T009 `source/apps/api/test/generate-service.test.ts` describe labels and `generate-prompt.test.ts` describe label (suggestion): the `F-07 pipeline generation ...` wording is now the only generator's wording. Not renamed here: the qualifier is spread over about twenty test files and the T009 scope is the identifier and file renames. Criteria IDs are unaffected.
- T009 `source/apps/api/test/generate-route-pipeline.test.ts`, `generate-zip-pipeline.test.ts`, `generate-privacy-pipeline.test.ts`, `generate-limits-pipeline.test.ts` (suggestion): the `-pipeline` file suffix is kept on these test files. Not renamed here: T009 lists only the two renamed files, and the suffix is not a module name. Rename in a later cleanup if the owner wants the suffix gone.
