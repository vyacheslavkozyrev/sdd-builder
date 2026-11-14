# Progress — Project brief form (F-05)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-13 | Stories approved by the user as written; 26 criteria (24 `[auto]`, 2 `[device]`). Decisions: Project name field added; Analyze needs a valid brief and the checkbox. |
| Plan     | ✅ Complete | 2026-11-13 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-13 | 8 of 11 tasks committed (plan amended: former T003 split into T003 and T004) |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None.

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Docs: F-05 web decisions recorded (architecture §5 web and tests rows, §6 decision 13; features F-05 note) | 0 blockers, 0 warnings, 1 suggestion fixed | task check passed (492 tests, docs only) |
| T002 | Build: `apps/web` set up (Vite 7, React 19, Vitest 3, scripts typecheck/test/dev/build, `/analyze` proxy to the API port read from `PORT` (default 3000, as `apps/api`), empty root in `src/main.tsx`, smoke test that imports `@sddbuilder/core`); web workspace now checked by `scripts/task-check.sh` | 0 blockers, 2 warnings fixed (smoke test asserted `1 + 1`, which cannot fail, now imports core; proxy hardcoded port 3000 while the API reads `PORT`), 1 suggestion deferred | task check passed (web: typecheck and 1 smoke test; all workspaces green; `npm run build` in `apps/web` ok; proxy target checked with `PORT` unset and set to 4567) |
| T003 | Web: brief state (`BriefState`, `emptyBrief()`) and configuration body (`toProjectConfig`, `parseLayer`, `ConfigBuild`): trims, optional stack keys absent when blank, `schemaVersion` 1, `targets` claude, core workflows and connections copied; module depends-on and rule lists are placeholders until T004 | Review: 0 blockers, 2 warnings fixed (AC-018 body now checked with `parseProjectConfig`; the fresh-state test was tagged AC-018 but now states its reason), 2 suggestions fixed (AC-007 table rows reformatted; placeholders for `dependsOn` and rule lists marked in code until T004) | task check passed (`brief-config.test.ts` 35 tests; core 492; typecheck ok); T005 note on idea length in Deferred Findings confirmed |
| T004 | Web: depends-on split (`splitDependsOn`: comma split, names trimmed, blanks dropped, duplicates and unmatched names kept in order); rule lists (`buildRules`: trimmed, blanks dropped); placeholders removed from `toProjectConfig`; stale "until T004" comments removed | Review: 0 blockers, 0 warnings, 0 suggestions to fix; no placeholder comment or `[]` placeholder left for `dependsOn` or the rule lists; unmatched depends-on names kept (core `analyze` reports them). Decision: rule trimming follows the T003 convention (every text value is trimmed in `toProjectConfig`, so rules are trimmed as module names are; blank rules dropped); recorded here, no architecture change | task check passed after review (web 62 tests incl. `brief-depends.test.ts` 26 and `brief-config.test.ts` 35; core 492; typecheck ok) |
| T005 | Web: field validation (`validateBrief`: name, idea blank and over 8,000 on the raw text, `stack.language`, `architecture.style`, module layers from the build's bad-layer list via `parseLayer`; `parseProjectConfig` as the final check, its paths used as form field paths) and `ideaCounter` (`N / 8,000`, JavaScript string length of the raw text, grouped with commas). Decision: the layer path uses the core's 0-based list index (`architecture.modules[i]`, as `parseProjectConfig` writes it); the reason counts rows from 1 (`module 2 layer ...` for `modules[1]`), since users count rows from the top; both are pinned together in tests. No architecture change | Review: 0 blockers, 2 warnings fixed (AC-019 test now uses the full wireframe brief with depends-on and both rule lists; the unreachable `throw` removed: layers come from the build's `badLayers`, so no bad-layer state can reach a throw), 5 suggestions fixed (idea reason reads `8,000`; the whitespace-over-cap test moved under AC-001; the form-order test names AC-001, AC-004, AC-005, AC-008; echo test added for the idea reason; progress table row no longer split by a blank line) | task check passed after review (web 97 tests incl. `brief-validation.test.ts` 35; core 492; typecheck ok) |
| T006 | Web: progress entries (`progressEntries`: idea, stack, modules valid or incomplete from the validation problems at their own paths; rules optional until a non-blank code or test rule exists, then valid), `PRIVACY_NOTICE` and `PRIVACY_CHECKBOX_LABEL`, `canAnalyze(brief, accepted)` (no problems and ticked); `emptyBrief().privacyAccepted` is false | Review: 2 blockers fixed (AC-027: `validateBrief` now checks each module name and no longer hides module problems behind the field problems, so a blank module name blocks Analyze with a problem at `architecture.modules[i].name`; AC-028: an empty module list is a problem at `architecture.modules` and reads incomplete, so Analyze is disabled), 1 warning fixed (a blank module name showed modules as ✓; now incomplete, tested), 1 suggestion deferred (test titles in `brief-gate.test.ts` carry the criterion on their `describe`, not on each title; see Deferred Findings) | task check passed (web 145 tests: `brief-validation.test.ts` 45, `brief-gate.test.ts` 38; core 492; typecheck ok) |
| T007 | Web: `analyzeBrief(fetchFn, config)` (POST `/analyze`, JSON body and content type; 200 with an analysis gives `{ ok: true, result }`, a network error, any other status or a 200 body that is not an analysis gives `{ ok: false, message }` with the fixed `ANALYZE_FAILED_MESSAGE`; the 200 body is narrowed from `unknown`), `createInFlightGuard()` (`start()` false while running, `release()` after settling); `FetchFn` and `AnalyzeRequest` types | Review: 0 blockers, 2 warnings fixed (AC-018 test compares `workflows` and `connections` with core's `DEFAULT_WORKFLOWS` and `DEFAULT_CONNECTIONS`; the 200 narrowing has seven malformed-reply cases, each giving the fixed message); 0 suggestions fixed; 2 notes deferred to T010 (busy state, client timeout, see Deferred Findings); storage spies stub the globals, real storage untouched | task check passed (web 165 tests incl. `analyze-request.test.ts` 20; core 492; typecheck ok) |
| T008 | Web: analysis result view-model (`findingRows(result)` keeps the structural findings in the order received as `severity`, `subject`, `message` rows; `reviewNotice(review)` gives `ok` with its review findings as rows, and `failed` or `skipped` as a fixed notice naming the status with no findings key; `FindingRow` and `ReviewView` types, types from core) | Review: 0 blockers, 1 warning fixed (the `skipped` notice no longer names the daily limit as its cause; `core` documents `skipped` as "not asked for", so the notice states only that the review was skipped and gives no findings), 1 suggestion fixed (AC-021 test that a finding's extra fields never reach a row); notice texts are fixed constants naming their status, no server text; no test uses network, clock or storage; no test depends on another | task check passed (web 182 tests incl. `analyze-result.test.ts` 17; core 492; typecheck ok) |
---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `package.json:9` (root `engines.node` `>=20`): Vite 7 requires Node `^20.19.0 || >=22.12.0`, so `npm run dev` or `build` can fail on Node 20.0 to 20.18. Not changed in T002 because the root engines range is a repo-wide decision; to be recorded in `architecture.md` §5 before the range changes.
- Resolved in the T006 review (AC-027): see the T006 row. For T006 (progress panel, found while implementing): `validateBrief` (T005) returns the field problems and skips `parseProjectConfig` when idea, name, stack language or style is blank, so a blank module name or other module problem is hidden and the modules entry reads valid. The gate is unaffected (any problem keeps Analyze disabled). Also, `parseProjectConfig` accepts an empty module `name` (presence only), so `validateBrief` passes a module with a blank name. Both need a decision in T004/T005 before T010; not changed in T006.
- Resolved in the T006 review (AC-027, AC-028): see the T006 row. For T006 (empty module list): `progressEntries` shows modules as valid when there are no module rows, because core allows an empty list and the plan says "valid when required fields pass". Decide whether an empty list should read incomplete.
- For T006 review (SUGGESTION, `apps/web/test/brief-gate.test.ts`): the `it.each` titles under AC-013 to AC-017 carry the criterion only on the enclosing `describe`. Renaming about 20 titles is churn with no change in coverage; the criteria are still named in every `describe`. Not changed.
- For T005 (idea length, AC-002): the trimmed idea goes into the configuration, but the 8,000-character check must run on the raw submitted text, so trimming cannot hide an over-limit idea. Recorded here as a note for T005.
- For T010 (AC-020, `apps/web/src/analyze/in-flight.ts`): the guard has only `start()` and `release()`, no readable busy flag. T010 keeps the waiting state in its own React state: set it when `start()` returns true, clear it in the `finally` after `analyzeBrief`. Add a `busy` read to the guard only if the UI needs it; no UI code was added in T007.
- For T010 (AC-020, `apps/web/src/analyze/request.ts`, SUGGESTION): `analyzeBrief` sets no client timeout, so a hung request keeps the guard held and Analyze disabled. The server bounds the LLM call. A client timer needs a timer source and a changed `FetchFn` signature that the plan fixes, so not changed.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

```
### Amendment — 2026-11-13
**Changed**: plan.md. Former T003 (brief state and configuration building, 446 staged lines) split into T003 (state, configuration body, `ConfigBuild` union, `parseLayer`; covers AC-006, AC-007, AC-010, AC-018) and T004 (depends-on and rule lists; covers AC-009, AC-011, AC-012). Tasks T004 to T010 renumbered T005 to T011, with their criteria unchanged. Rationale section still uses the old numbers for the tasks it describes.
**Reason**: the staged diff of the former T003 was 446 changed lines, over the 400-line size guard. The test file alone was 294 lines; splitting by criterion keeps each test with its code. The uncommitted T003 work was not committed; it was set aside and reused as reference for T003 and T004.
**Impact**: T003 and T004 run in order; T005 to T011 run after them. No committed task changes.
```

```
### Amendment — 2026-11-13 (second)
**Changed**: stories.md adds AC-027 `[auto]` (a module row with a blank name gives a problem at its name path and disables Analyze, even though the model accepts an empty name; the check runs even when another field has a problem) and AC-028 `[auto]` (no modules: the modules entry is not ✓). Both are under US-003 and in the Requirement Coverage table. plan.md: T006 now also covers AC-027 and AC-028, and its review step carries the fixes they need in `validate.ts` and `progress.ts`.
**Reason**: T006 review found that `validateBrief` returns early when idea, name, language or style is blank, so a blank module name is hidden and the modules entry can show ✓ falsely. Core accepts a module with an empty name and an empty module list. The user decided both points (block Analyze on a blank module name; modules incomplete with no modules).
**Impact**: T006 review and test re-run. The fixes are in T006's commit.
```
