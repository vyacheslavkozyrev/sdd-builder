# Progress — API: analyze and generate, zip download (F-07)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional | | Not run |
| Specify  | ✅ Complete | 2026-11-15 | Stories approved by the user: 7 stories, 25 criteria, all `[auto]`. Decisions: pipeline config only on `/generate` (flat body refused with 400); flat generator removed in this feature; duplicate output path is a 500 |
| UX       | ➖ Not needed | 2026-11-15 | No user interface in this feature; every criterion is tested over HTTP or in core |
| Plan     | ✅ Complete | 2026-11-15 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | | 2 of 19 tasks committed |
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

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 `spec/documents/architecture.md:119` (suggestion): decision 11 still says `/generate` takes "the `ProjectConfig` itself", which reads as the flat shape. Not edited: decisions are a record, and decision 23 (line 134) states the pipeline-only body and supersedes it; the §3 text is rewritten in T019.
- T002 `source/apps/api/src/generate/pipeline-prompt.ts` `buildPipelineGenerationPrompt` (suggestion, open question for the owner): the function lists every finding it is given; AC-010 and the T002 plan line say "the first findings", but no cap number is in the spec. Not capped here, so the caller (T003) picks the subset. Needs the owner's number before T003 lands.
- T002 `source/apps/api/src/generate/pipeline-prompt.ts` (suggestion): the helpers and the instruction text duplicate `generate/prompt.ts` until T009 removes the flat prompt. Intended by the plan (flat file unchanged, both paths built side by side); merged in T009.
