# Progress — Project brief form (F-05)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-13 | Stories approved by the user as written; 26 criteria (24 `[auto]`, 2 `[device]`). Decisions: Project name field added; Analyze needs a valid brief and the checkbox. |
| Plan     | ✅ Complete | 2026-11-13 | Approved by the user before any code is written |
| Build    | ✅ Complete | 2026-11-13 | 11 of 11 tasks committed (plan amended: former T003 split into T003 and T004) |
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
| T009 | Web: brief form, sections 1 to 5 (`App.tsx` holds the brief in React state; `BriefForm.tsx` renders name, idea with the counter, stack, style and module rows, code and test rules, the "Other problems" list for problems no field shows, and the progress panel with the two reload notes); `ModuleRows.tsx` (add, remove, problems beside name and layer by list position); `RuleList.tsx` (add, remove); `main.tsx` renders `App`. Decision (review): the "Other problems to fix" list is kept, because core checks at paths with no field (for example `responsibility`, `dependsOn[i]`) would otherwise disable Analyze with no visible reason. Decision (review): stack language stays a plain text field, not the wireframe's dropdown, because the plan names no list. Review round 1: 1 warning (path routing untested inside a `.tsx` file, now `brief/placement.ts` with `test/brief-placement.test.ts`) and 2 suggestions (duplicate message helpers, now `brief/Messages.tsx`; unused `ProgressEntry.label`, now the panel text), all fixed; round 2 clean. Privacy notice, checkbox and Analyze left to T010 | Review: reviewed, 0 blockers, 1 warning, 2 suggestions fixed | task check passed (typecheck; web 191 tests; core 492; no component tests, as declined); `npm run build` in `apps/web` ok; no storage call in `apps/web/src` |
| T010 | Web: privacy gate (`PrivacyGate.tsx`: `PRIVACY_NOTICE`, `PRIVACY_CHECKBOX_LABEL` checkbox unticked at start, Analyze enabled by `canAnalyze` and no request in flight); `AnalysisPanel.tsx` takes the in-flight guard with `start()` before `analyzeBrief(browserFetch, config)`, shows a waiting state, shows the findings table and review notice or the error message, and releases the guard in a `finally`; wired in `BriefForm.tsx` before Progress; brief kept in React memory. Deferred: client timeout for `analyzeBrief` (see Deferred Findings) | Review: 0 blockers, 1 warning fixed (the review part's empty list said "No structural findings."; `FindingsTable` now takes its empty text, "The review gave no findings." for the review); the guard, the bad-layer re-check, the `finally` release, the `role="alert"` message and the unchanged brief were checked against AC-014 to AC-023 with no finding; no storage call and no `any` in `apps/web/src`; the fetch wrapper binds through an arrow; staged change 155 lines, under 400 | task check passed (typecheck; 492 core and web tests); `npm run build` in `apps/web` ok; no component tests, as planned |
| T011 | Web: `apps/web/src/styles.css` (colour tokens on `:root`, a `prefers-color-scheme: dark` block, one centred column with a 16px gutter, `box-sizing` and `minmax(0, 1fr)` so nothing is wider than the screen, inputs and textarea at 100%, fieldsets and tables kept inside the column); `main.tsx` imports the stylesheet; `index.html` already had the viewport meta; DOM order checked against `02-brief.svg` (sections 1 to 5, Other problems, privacy and Analyze, progress) and needed no JSX change. Device checks, not run by the agent, for the manual checklist before Verify: AC-025 (reload clears the brief and the privacy checkbox); AC-026 (at phone width, 360 to 390px, the side gutter is 16px, there is no horizontal page scroll, and the order is sections 1 to 5, Other problems, privacy notice, Analyze, results, then the progress panel, as in `02-brief.svg`) | Review: 0 blockers, 1 warning fixed (dark-mode Analyze text was white on `#3b82f6`, 3.7:1 under AA for 14px text; the dark `--on-accent` is now `#18181b`, 4.8:1), 1 suggestion deferred (plan T011 wording lists the progress panel before the notice; see Deferred Findings); contrast ratios calculated, no browser run; no commented-out code, no new dependency, no fixed width wider than the column | task check passed (typecheck; web 191 tests; workspace 492); `npm run build` in `apps/web` ok; `dist/` is git-ignored and not staged; no component logic changed |
---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `spec/specifications/F-05-project-brief-form/plan.md` T011 line (SUGGESTION, for T011 review): the plan's parenthetical reads "form, progress panel, notice, Analyze, results", but `design/mockups/02-brief.svg` and AC-026 put the progress panel after the notice and Analyze. The code follows the wireframe (sections 1 to 5, Other problems, notice and Analyze, progress). Not changed: the plan wording is the user's; correct it to match the wireframe or confirm the order at the device check.
- `package.json:9` (root `engines.node` `>=20`): Vite 7 requires Node `^20.19.0 || >=22.12.0`, so `npm run dev` or `build` can fail on Node 20.0 to 20.18. Not changed in T002 because the root engines range is a repo-wide decision; to be recorded in `architecture.md` §5 before the range changes.
- Resolved in the T006 review (AC-027): see the T006 row. For T006 (progress panel, found while implementing): `validateBrief` (T005) returns the field problems and skips `parseProjectConfig` when idea, name, stack language or style is blank, so a blank module name or other module problem is hidden and the modules entry reads valid. The gate is unaffected (any problem keeps Analyze disabled). Also, `parseProjectConfig` accepts an empty module `name` (presence only), so `validateBrief` passes a module with a blank name. Both need a decision in T004/T005 before T010; not changed in T006.
- Resolved in the T006 review (AC-027, AC-028): see the T006 row. For T006 (empty module list): `progressEntries` shows modules as valid when there are no module rows, because core allows an empty list and the plan says "valid when required fields pass". Decide whether an empty list should read incomplete.
- For T006 review (SUGGESTION, `apps/web/test/brief-gate.test.ts`): the `it.each` titles under AC-013 to AC-017 carry the criterion only on the enclosing `describe`. Renaming about 20 titles is churn with no change in coverage; the criteria are still named in every `describe`. Not changed.
- For T005 (idea length, AC-002): the trimmed idea goes into the configuration, but the 8,000-character check must run on the raw submitted text, so trimming cannot hide an over-limit idea. Recorded here as a note for T005.
- For T010 (AC-020, `apps/web/src/analyze/in-flight.ts`): the guard has only `start()` and `release()`, no readable busy flag. T010 keeps the waiting state in its own React state: set it when `start()` returns true, clear it in the `finally` after `analyzeBrief`. Add a `busy` read to the guard only if the UI needs it; no UI code was added in T007.
- For T010 (AC-020, `apps/web/src/analyze/request.ts`, SUGGESTION): `analyzeBrief` sets no client timeout, so a hung request keeps the guard held and Analyze disabled. The server bounds the LLM call. A client timer needs a timer source and a changed `FetchFn` signature that the plan fixes, so not changed.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome. Verify run on 2026-11-13 (branch `main`, clean tree, all 11 tasks committed)._

**Check:** `scripts/task-check.sh` passed (exit 0). Core 37 files, 492 tests; web 8 files, 191 tests (`apps/web/test`); typecheck ok.

**Gaps:** none. All 24 `[auto]` criteria have at least one passing test. The two `[device]` criteria are in `checklist.md`.

### Coverage matrix

Test files are in `apps/web/test/`. Each name below is the criterion prefix `F-05 AC-###` followed by the test title.

| Criterion | Tag | Covering tests (file: test) | Result |
|---|---|---|---|
| AC-001 | auto | brief-validation: idea is required; gives a problem at idea for blank and whitespace text | pass |
| AC-002 | auto | brief-validation: accepts an idea of exactly 8,000 characters; gives a problem at idea for 8,001 characters | pass |
| AC-003 | auto | brief-validation: idea counter; reads the counter for each length (312 gives `312 / 8,000`) | pass |
| AC-004 | auto | brief-validation: project name is required; gives a problem at name for blank text | pass |
| AC-005 | auto | brief-validation: stack language is required; gives a problem at stack.language for blank text | pass |
| AC-006 | auto | brief-config: optional stack fields; leaves each blank optional field out of stack | pass |
| AC-007 | auto | brief-config: trimmed values; stores the framework trimmed | pass |
| AC-008 | auto | brief-validation: architecture style is required; gives a problem at architecture.style for blank text | pass |
| AC-009 | auto | brief-depends: depends-on split; splits the text into names in order; gives an empty array for no dependencies | pass (row add is UI, see note) |
| AC-010 | auto | brief-validation: module layer is a whole number of 0 or more; reports the position of the row, not the value typed; brief-config: parse layer text; brief-placement | pass |
| AC-011 | auto | brief-depends: unmatched depends-on names; keeps a name that matches no module, in place | pass (row remove is UI, see note) |
| AC-012 | auto | brief-depends: rule lists; sets the code and test rules, dropping blanks; gives empty arrays when there are no rules | pass (add and remove are UI, see note) |
| AC-013 | auto | brief-gate: progress panel | pass |
| AC-014 | auto | brief-gate: privacy notice (compares with `PRIVACY_NOTICE` from `src/brief/privacy.ts`) | pass |
| AC-015 | auto | brief-gate: checkbox starts unticked | pass |
| AC-016 | auto | brief-gate: Analyze needs a valid brief | pass |
| AC-017 | auto | brief-gate: unticking the checkbox disables Analyze again | pass |
| AC-018 | auto | analyze-request: sends POST /analyze with a JSON content type and the built configuration; sends the configuration for the wireframe brief. brief-config: builds the wireframe brief into the expected configuration; copies the core workflows and connections | pass |
| AC-019 | auto | brief-validation: valid brief builds an accepted configuration; gives a configuration that parseProjectConfig accepts. brief-config: builds a body that the core model accepts | pass |
| AC-020 | auto | analyze-request: refuses a second start while the first request is pending; releases the guard on success and on failure | pass (disabled button and waiting text are UI, see note) |
| AC-021 | auto | analyze-result: structural findings as table rows; does not sort the rows by severity | pass |
| AC-022 | auto | analyze-result: failed notice names the status; skipped notice names the status; ok with review findings gives them in order | pass |
| AC-023 | auto | analyze-request: gives ok false with the fixed message for a network error and non-200 replies; leaves the brief untouched after a failure | pass (on-page display is UI, see note) |
| AC-024 | auto | analyze-request: writes nothing to localStorage, sessionStorage or indexedDB when the brief is filled in and analyzed | pass |
| AC-025 | device | checklist.md, AC-025 | pending (manual) |
| AC-026 | device | checklist.md, AC-026 | pending (manual) |
| AC-027 | auto | brief-validation: module name is required; gives a problem at the name path; runs even when the idea is blank. brief-gate: keeps Analyze disabled for a blank module name even when ticked | pass |
| AC-028 | auto | brief-validation: at least one module is required; gives a problem at architecture.modules for an empty list. brief-gate: progress shows modules incomplete with no modules; keeps Analyze disabled with the box ticked | pass |

**Scope (`features.md` F-05):** covered by the criteria. Idea and structured fields (AC-001 to AC-004, AC-005 to AC-012); validation against `model.ts` (AC-019); privacy notice and Analyze gate (AC-014 to AC-017); Analyze request and review (AC-018 and AC-020 to AC-023); nothing saved (AC-024, AC-025); phone layout (AC-026).

**Notes (not gaps):**

- Rows add and remove (AC-009, AC-011, AC-012), the disabled Analyze button and the waiting text (AC-015 to AC-017, AC-020), and the on-page error (AC-023) are wired in `ModuleRows.tsx`, `RuleList.tsx`, `PrivacyGate.tsx` and `AnalysisPanel.tsx`. The tests cover the logic they call, not the rendered elements, because `qa.md` allows no component or browser tests in the MVP. The device run in `checklist.md` observes them.
- AC-003's example text is 312 characters; the test uses 312 repeated characters and checks the count, not the sentence.
- AC-026 wording lists the progress panel before the privacy notice. `design/mockups/02-brief.svg` and the code put Progress after Analyze. The checklist asks the user to confirm which order is wanted.
- Deferred from T010 (client timeout) and T011 (plan wording) are unchanged; see Deferred Findings.

### Manual checklist

Full steps are in `checklist.md` in this folder. Status:

- AC-025 (reload clears the brief and the checkbox): pending, not run.
- AC-026 (phone width 360 to 390 px, gutter, no horizontal scroll, order): pending, not run.

Verify stays Pending until the user confirms both entries.

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
