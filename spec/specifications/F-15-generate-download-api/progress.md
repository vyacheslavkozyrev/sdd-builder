# Progress — Generate and Download API (F-15)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-24 | Approved by the user; 6 stories, 29 criteria, all [auto]. Limits and input caps are F-17; the generator model is `SDDBUILDER_GENERATOR_MODEL` (default `claude-opus-5-5`) |
| UX       | ➖ Not needed |  | No user interface (API only) |
| Plan     | ✅ Complete | 2026-11-24 | Approved by the user; 10 tasks (T001 to T010); 29 criteria, all covered |
| Build    | 🔄 In Progress |      | 5 of 10 tasks committed |
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

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T005: `generate/anthropic.ts` repeats the shape of `callReview` in `review/anthropic.ts`. Not merged: the plan asks for a shape like `ReviewClient`, and the limits and retry settings differ (generation keeps SDK retries on, review turns them off).
- Note for Verify (T005): AC-020 says "no retry". The SDK's own retries (architecture §12 decision 11) can re-send a request on 429 or 5xx inside the adapter. Our code makes one call per attempt; the wording is looser than the mechanism. Owner to confirm at Verify.

- `source/apps/api/src/generate/anthropic.ts:44-55` (T005, SUGGESTION): `callGeneration` repeats the shape of `callReview` in `source/apps/api/src/review/anthropic.ts`. Not merged here: the plan asks for a `GenerationClient` "like `ReviewClient`", the two calls differ in limits and retries, and a shared helper is a refactor beyond T005. Revisit when a third model call appears.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
