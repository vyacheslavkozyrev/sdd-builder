# Progress — Analyze and generate step (UI only) (F-13)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-24 | 5 stories, 31 criteria: 29 `[auto]`, 2 `[device]`; approved by the user. Decision 41 governs (failed or skipped review is an error); F-13 makes the real calls to `/analyze` and `/generate` (404 shown as text until F-14, F-15) |
| UX       | ✅ Complete | 2026-11-24 | Approved by the user; 11 screens in `spec/design/features/F-13-analyze-generate/`. Usability and visual reviews skipped at the owner's request (2026-11-24) |
| Plan     | ✅ Complete | 2026-11-24 | Approved by the user; 14 tasks (T001 to T014), all `[Web]` except the docs task T014 |
| Build    | 🔄 In Progress | 2026-11-24 | 12 of 14 tasks committed |
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
| T009 | Findings and results (view): findings in server order (structural, then review), plain text; review note for failed or skipped; error box with every 422 problem line; the result lines and the green line | 0 blockers, 0 warnings, 1 suggestion fixed (`GREEN_RESULT`, `REVIEW_NOT_FINISHED`, `allFindings` no longer exported); 1 suggestion and 3 owner decisions deferred. Size guard overridden by the owner (one commit for T009, 515 insertions) | task check passed: api 45, web 1851, core 1217 |
| T010 | Project preview (view): tree in a scrolling panel with the rule tag, Show full tree opening the dialog with Close, Generate and download disabled with its reason (no request until T012) | 0 blockers, 0 warnings, 2 suggestions fixed (test cast of the style object replaced by `toMatchObject`; tree rows keyed by path, not index), 2 suggestions deferred (see Deferred Findings) | task check passed: api 45, web 1861, core 1217 |
| T011 | Analyze action (AnalyzeStep): one request guarded by the tick and an in-flight flag, pending state, stored result with its key, out-of-date and not-run states | 0 blockers, 0 warnings, 2 suggestions fixed (AC-014 test reused a consumed response; pending test relabelled AC-006); 1 suggestion deferred (guard not reachable in tests) | task check passed: api 45, web 1878, core 1217 |
| T012 | Generate action and download (AnalyzeStep, `postFile`, `generate.ts`, `download.ts`): one POST /generate with the Analyze configuration, pending lock, zip saved as `sddbuilder-project.zip`, error text and 422 lines | 0 blockers, 2 warnings fixed (a 2xx reply counted as the zip without the `application/zip` media type; a throwing save left the step locked), 1 suggestion fixed (AC-028 test asserts the ticked box and enabled Analyze); 4 suggestions and 3 owner decisions deferred (see Deferred Findings). Size guard overridden by the owner (one commit for T012) | task check passed: api 45, web 1899, core 1217 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `source/apps/web/src/analyze/ProjectPreview.tsx` (T012, owner decision) — the generate error box sits in the preview column; no approved screen draws an error there (screens 07 and 09 draw it in the Analyze column). Kept as built; the owner confirms the placement.
- `source/apps/web/src/analyze/errorMessage` (T012, owner decision, wording not changed) — a failed Generate reads "Analysis could not run (…)". This is the approved pattern of screens 07 and 09, but the sentence names Analysis, not generation. Kept as approved; the owner confirms the prefix for Generate.
- Plan deviation (T012, owner-approved, recorded here): `source/apps/web/src/analyze/request.ts` (`postFile`), `generate.ts`, `PrivacyNotice.tsx` (`locked`), `ProjectPreview.tsx` and `common.ts` (error box shape) changed outside the T012 file line, which names `download.ts` and the test only. The `locked` prop matches screen 08 (checkbox, Analyze and Show full tree disabled). A plan amendment to list them is pending.
- `source/apps/web/src/analyze/AnalyzeStep.tsx:generate` (T012) — SUGGESTION: a throw from `save` now rethrows after the step unlocks, and no test covers it, because the rejection would fail the test run. Covering it needs a handled path, not a silent catch.
- `source/apps/web/src/analyze/Findings.tsx` and `ProjectPreview.tsx` (T012) — SUGGESTION: a generate error stays visible after a new Analyze or a configuration change. AC-028 does not say when it clears; owner decision.
- `source/apps/web/src/analyze/request.ts:postFile` (T012) — SUGGESTION: the browser fetch to /generate has no timeout, so a stalled connection leaves the step locked. Same as the T004 item; the server bounds the call at 300 s.
- `source/apps/web/src/analyze/reply.ts:problemLines` (T012) — SUGGESTION: lines are shown verbatim. AC-029 expects `<path>: <reason>`; the 422 body shape comes from F-15, so check it when F-15 lands.

- `source/apps/web/src/analyze/request.ts:26` (T004) — SUGGESTION: `postJson` sets no client-side timeout, so a hung `/analyze` keeps the state pending. Not applied: plan T004 fixes the signature `postJson(path, body, fetchFn)` and AC-010 sets no timeout; the LLM call timeout belongs to the API (F-14). Revisit with T011 or F-14.
- `source/apps/web/src/analyze/templates.ts:7` (T006) — SUGGESTION: the `GenerationTemplates` type is derived with `Parameters<typeof pipeline.planGeneration>[1]` because core's pipeline index does not export it. Not applied: exporting it changes core's public surface, which belongs to F-04; the derived type is a reference, not a redeclaration.
- `source/apps/web/src/analyze/tree.ts` (T007) — SUGGESTION: `sortLevel` compares names with `<`, while the screens say code-point order (core's `compareCodePoints` is not exported). Not applied: exporting it widens core's namespace, which F-04 AC-034 forbids; the paths are ASCII file-safe names, so the orders are the same today.
- `source/apps/web/src/analyze/tree.ts:5` (T007) — SUGGESTION: `GenerationTemplates` is derived from `pipeline.listFiles`, as in T006. Not applied for the same reason as T006 (core does not export the type).
- Follow-up for AC-021 wording (T007, no change to stories): AC-021 says "plan order", but the screens (`screens.md` §The file tree) list folders first, then files, each group in code-point order, and `listFiles` returns one flat list sorted by path. Neither matches "plan order" literally. The tree follows the screens (`projectTree` regroups the `listFiles` list), and plan T007 says "its order". Needs a documented wording follow-up in F-13 `stories.md` AC-021 (for example "folders first on each level, then files, each group in code-point order") by the owner; stories were not changed in this task.
- `source/apps/web/src/analyze/Findings.tsx` (T009) — SUGGESTION: `Findings` lists the findings of an out-of-date result (another configuration) with no mark; only the result line is hidden. Not applied: plan T009 does not cover the out-of-date note (screen 10); screens.md §Open points 4 asks the owner whether to keep the earlier result greyed or hide it. Revisit with T011 (out-of-date state) and the owner's answer.
- Owner decision, screen 05 colour (T009, reported to the owner, wording not changed): `screens.md` line 28 and the screen 05 description say "Amber note"; `05-analysis-failed.svg` and the code draw the review note in the red error box (#FEF3F2 fill, #BB241A text, `theme.palette.error`). Kept as drawn; the owner decides which the screen should show.
- Owner decision, green result line (T009, reported, wording not changed): the text matches screen 04 and the colour matches its #107569 (`theme.palette.success.dark`). The owner decides whether the green stays on this colour, since `screens.md` line 28 says "success green" without a value.
- Owner decision, non-green result lines (T009, reported, wording not changed): the warning line matches screen 11 exactly, and the blocker and review-failed lines follow screens 03 and 05. Lines no screen draws: "Result: 2 blockers. Fix the blocker, then Analyze again." (plural count), and "Result: no finding. The analysis did not finish, so Generate stays off." (a review that did not finish with no structural finding; the word "no finding" is not an approved phrase).
- `source/apps/web/src/analyze/ProjectTreeList.tsx:17` (T010) — SUGGESTION: the pure helpers `treeRows`, `countFiles` and `fileCountText` are exported from a component module. Not applied: the plan's T010 file line does not name a helper module, and a new file would sit outside the task's listed files. Move them to a pure module next to `tree.ts` when the next task touches the list.
- `source/apps/web/test/ProjectPreview.test.tsx` (T010, AC-023) — SUGGESTION: the scrolling-panel check reads the `overflowY` value of the getter, not the rendered panel, because jsdom does not lay out the page. Not applied: no layout check is possible in the MVP test setup (no browser tests, qa.md). The getter is the only source of that value.
- Expected state, not a finding (T010): Generate and download is always disabled, including on a green result, because its action is wired in T012 (the component comment says so). AC-025 is covered for every disabled case; the enabled case is T012's.
- `source/apps/web/src/analyze/AnalyzeStep.tsx:43` (T011) — SUGGESTION: the `!ticked` guard and the `inFlight` ref in `analyze()` are not reached by a test, because React drops clicks on a disabled button; the AC-003 and AC-006 tests prove the disabled state, not the guard. Not applied: a test cannot reach the guard without a seam in the component, and the disabled button is the approved control. Revisit if the step gets a seam.
- Owner decision, 200 reply that is not a result (T011, reported, wording not changed): `AnalyzeStep.tsx` `outcomeState` shows "Analysis could not run (200): the service returned an error. Try again later." The screens draw no 200 sentence (the 400, 500, 502 and network sentences are also open, screens.md §Open points 6). The owner confirms the sentence or a different one.
- Owner decision, stale error stacking (T011, reported, wording not changed): an error from an earlier configuration shows the amber out-of-date note above the red error box (`Findings.tsx`, error branch). Screen 10 draws only the result state. The owner decides whether the error should be hidden or kept under the note.
- Owner decision, screen 05 colour (T011, reported, wording not changed): the failed-review note `REVIEW_NOT_FINISHED` is red (the error box, `styles.note`); screens.md line 29 and the screen 05 description say amber. Kept as built, as in T009.
- Owner decision, out-of-date label (T011, reported, wording not changed): "Earlier result (not current)" is a new label; screen 10 says only "earlier finding shown as not current". The earlier findings are greyed (screens.md §Open points 4 asks the owner to confirm greyed or hidden). Kept as built.
- Resolved by T011: the T009 deferred note on out-of-date findings with no mark. The findings now carry the stale note, the "Earlier result (not current)" label and grey text.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment — 2026-11-24
**Changed**: `source/packages/core/src/pipeline/index.ts` exports `listFiles` and its types `ListedFile` and `FileSource`; the namespace test (`source/packages/core/test/pipeline/namespace.test.ts`, F-02 AC-089 and F-04 AC-034) takes `listFiles` out of its forbidden list and into the approved list; F-04 `stories.md` AC-034 wording is updated to match; plan T007 covers the export. The plan's "no change to `source/packages/core`" line is superseded for this one export.
**Reason**: the file tree (T007) needs `listFiles`, which core did not export; the owner chose the export over a deep import (2026-11-24).
**Impact**: T007 only; T001 to T006 are unchanged.

