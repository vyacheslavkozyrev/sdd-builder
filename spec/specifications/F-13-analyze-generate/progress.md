# Progress — Analyze and generate step (UI only) (F-13)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-24 | 5 stories, 31 criteria: 29 `[auto]`, 2 `[device]`; approved by the user. Decision 41 governs (failed or skipped review is an error); F-13 makes the real calls to `/analyze` and `/generate` (404 shown as text until F-14, F-15) |
| UX       | ✅ Complete | 2026-11-24 | Approved by the user; 11 screens in `spec/design/features/F-13-analyze-generate/`. Usability and visual reviews skipped at the owner's request (2026-11-24) |
| Plan     | ✅ Complete | 2026-11-24 | Approved by the user; 14 tasks (T001 to T014), all `[Web]` except the docs task T014 |
| Build    | 🔄 In Progress | 2026-11-24 | 8 of 14 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Project configuration from the wizard state: `buildProjectConfig` (schemaVersion 2, idea trimmed, rules as `{index, id, title, text}`, pipeline held) | 0 blockers, 1 warning fixed (type-only import), 0 suggestions | task check passed: api 45, web 1705, core 1217 |
| T002 | Analysis state and the green rule: `analysisState.ts` (not run, pending, result, error with the configuration key; `isGreen`, `isOutOfDate`) | 0 blockers, 1 warning fixed (AC-019 test covered only the pipeline description; now flow name and body too), 1 suggestion fixed (line length) | task check passed: api 45, web 1732, core 1217 |
| T003 | Reason Generate is disabled: `generateDisabledReason` in AC-017 order (not run, out of date or pending: "Run Analyze first"; blocker; warning; failed or skipped review) | 0 blockers, 0 warnings, 0 suggestions (round 1) | task check passed: api 45, web 1751, core 1217 |
| T004 | Request client: `postJson` with `Accept: application/json`, outcomes ok, http-error and network-error (status number or null, as the T002 error state) | 0 blockers, 0 warnings, 0 suggestions fixed (1 suggestion deferred: no client timeout, see Deferred Findings) | task check passed: api 45, web 1766, core 1217 |
| T005 | Replies and messages: `parseAnalysisReply` (refuses anything outside the result shape), `errorMessage` (status sentence, network error), `problemLines` (one line per 422 problem) | 0 blockers, 0 warnings, 1 suggestion fixed (test line wrapped to length, round 1) | task check passed: api 45, web 1805, core 1217 |
| T006 | Templates for the browser: `loadGenerationTemplates` from Vite raw imports of `source/templates`, with `baseEntries` and `layoutText` exported for tests | 0 blockers, 1 warning fixed (error paths of the manifest and the layout lookup had no tests), 1 suggestion fixed (determinism test compared two calls of a pure loader, removed), 1 suggestion deferred (see Deferred Findings) | task check passed: api 45, web 1814, core 1217 |
| T007 | File tree: `projectTree` from core's `listFiles` (folders first, rule files marked), refused and shared rule ids get no file; core exports `listFiles` and its types (amendment 2026-11-24) | 1 blocker fixed (two rule blocks with one id made `listFiles` throw in the preview; shared ids now get no file, test added), 1 warning fixed (F-04 AC-034 test did not reach `listFiles` as a function), 2 suggestions deferred (see Deferred Findings) | task check passed: api 45, web 1825, core 1217 |
| T008 | Privacy notice and its checkbox (view): the notice with the owner-worded text, the unticked checkbox, Analyze disabled with its reason until ticked | 0 blockers, 0 warnings, 2 suggestions fixed (reason linked to the button; test wrapper extracted) | task check passed: api 45, web 1832, core 1217 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `source/apps/web/src/analyze/request.ts:26` (T004) — SUGGESTION: `postJson` sets no client-side timeout, so a hung `/analyze` keeps the state pending. Not applied: plan T004 fixes the signature `postJson(path, body, fetchFn)` and AC-010 sets no timeout; the LLM call timeout belongs to the API (F-14). Revisit with T011 or F-14.
- `source/apps/web/src/analyze/templates.ts:7` (T006) — SUGGESTION: the `GenerationTemplates` type is derived with `Parameters<typeof pipeline.planGeneration>[1]` because core's pipeline index does not export it. Not applied: exporting it changes core's public surface, which belongs to F-04; the derived type is a reference, not a redeclaration.
- `source/apps/web/src/analyze/tree.ts` (T007) — SUGGESTION: `sortLevel` compares names with `<`, while the screens say code-point order (core's `compareCodePoints` is not exported). Not applied: exporting it widens core's namespace, which F-04 AC-034 forbids; the paths are ASCII file-safe names, so the orders are the same today.
- `source/apps/web/src/analyze/tree.ts:5` (T007) — SUGGESTION: `GenerationTemplates` is derived from `pipeline.listFiles`, as in T006. Not applied for the same reason as T006 (core does not export the type).
- Follow-up for AC-021 wording (T007, no change to stories): AC-021 says "plan order", but the screens (`screens.md` §The file tree) list folders first, then files, each group in code-point order, and `listFiles` returns one flat list sorted by path. Neither matches "plan order" literally. The tree follows the screens (`projectTree` regroups the `listFiles` list), and plan T007 says "its order". Needs a documented wording follow-up in F-13 `stories.md` AC-021 (for example "folders first on each level, then files, each group in code-point order") by the owner; stories were not changed in this task.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment — 2026-11-24
**Changed**: `source/packages/core/src/pipeline/index.ts` exports `listFiles` and its types `ListedFile` and `FileSource`; the namespace test (`source/packages/core/test/pipeline/namespace.test.ts`, F-02 AC-089 and F-04 AC-034) takes `listFiles` out of its forbidden list and into the approved list; F-04 `stories.md` AC-034 wording is updated to match; plan T007 covers the export. The plan's "no change to `source/packages/core`" line is superseded for this one export.
**Reason**: the file tree (T007) needs `listFiles`, which core did not export; the owner chose the export over a deep import (2026-11-24).
**Impact**: T007 only; T001 to T006 are unchanged.

