# Progress — API: analyze and generate, zip download (F-07)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional | | Not run |
| Specify  | ✅ Complete | 2026-11-15 | Stories approved by the user: 7 stories, 25 criteria, all `[auto]`. Decisions: pipeline config only on `/generate` (flat body refused with 400); flat generator removed in this feature; duplicate output path is a 500 |
| UX       | ➖ Not needed | 2026-11-15 | No user interface in this feature; every criterion is tested over HTTP or in core |
| Plan     | ✅ Complete | 2026-11-15 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | | 3 of 19 tasks committed (T003 committed as one change, 415 lines, over the 400-line guard by the owner's decision) |
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

---

## Amendments

- **Amendment 1 (2026-11-15), T004 absorbs T010.** T004 switches `POST /generate` to the pipeline path and breaks 57 flat-body tests in five files, so their migration moves into T004 and T010 is retired (recorded in `plan.md`). Owner choice, 2026-11-15.

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 `spec/documents/architecture.md:119` (suggestion): decision 11 still says `/generate` takes "the `ProjectConfig` itself", which reads as the flat shape. Not edited: decisions are a record, and decision 23 (line 134) states the pipeline-only body and supersedes it; the §3 text is rewritten in T019.
- T002 `source/apps/api/src/generate/pipeline-prompt.ts` `buildPipelineGenerationPrompt` (suggestion, open question for the owner): the function lists every finding it is given; AC-010 and the T002 plan line say "the first findings", but no cap number is in the spec. Not capped here, so the caller (T003) picks the subset. Needs the owner's number before T003 lands.
- T002 `source/apps/api/src/generate/pipeline-prompt.ts` (suggestion): the helpers and the instruction text duplicate `generate/prompt.ts` until T009 removes the flat prompt. Intended by the plan (flat file unchanged, both paths built side by side); merged in T009.
- T003 `source/apps/api/src/generate/pipeline-service.ts` `buildPipelineGenerationPrompt` call (open question for the owner, not a finding): the retry prompt lists every finding of the first reply, with no cap. AC-010 reads "lists the first findings", taken here as the first reply's findings. If the owner wants a cap, it is a one-line change plus a test; the T002 question above stays open until the owner answers.
- T003 `source/apps/api/src/generate/pipeline-service.ts` `attempt` (suggestion): `parsed.reply as Readonly<Record<string, string>>` is a cast after `checkReply` has proven every planned value is a string; the final loop still throws on a missing text. Not changed: a narrowing rewrite would add a branch that cannot run.
- T003 `source/apps/api/src/generate/pipeline-service.ts` `attempt` (suggestion): a non-plan key from the model is echoed into the 502 `problems` and the retry prompt through the `checkReply` message (F-03 wording). The text is not echoed, but a very long key would be. Not changed here: the message format belongs to F-03 `reply-check.ts`, and the key limit is a question for that feature.
