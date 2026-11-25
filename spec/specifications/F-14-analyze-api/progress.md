# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-24 | Approved by the user; 7 stories, 27 criteria, all [auto]. Parse refusal is a 400 (owner answer 2026-11-24); input caps are F-17 |
| UX       | ➖ Not needed |  | No user interface (API only) |
| Plan     | ✅ Complete | 2026-11-24 | Approved by the user; 9 tasks (T001 to T009); 27 criteria, all covered |
| Build    | 🔄 In Progress |      | 6 of 9 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ------ |
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

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

```
### Amendment 1 — 2026-11-24
**Changed**: `plan.md` T003 and the comment at the top of `source/apps/api/src/http/body.ts`: the reply's promise is narrowed from "never repeats a value from the body" to "never repeats brief text (idea, architecture, rule content)". Ids, names, tags and list items named by core's parser messages (for example "repeats <item>", "got <flow.name>") may appear. Owner decision (option 1), after the T003 review warning.
**Reason**: core's parser and check messages name ids, names and tags; changing them is a core task outside T003. AC-008 and AC-009 of `stories.md` already test brief text and the unknown key's value, so they are unchanged.
**Impact**: T003 re-runs review and test on the staged change; no task before T003 is affected; no later task changes.
```
