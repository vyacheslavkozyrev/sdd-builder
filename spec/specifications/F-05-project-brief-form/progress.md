# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-15 | Stories approved by the user, then split on 2026-11-15 into F-05 (frame, step 1, step 3 host, privacy: 14 criteria), F-21 (step 2: 10 criteria) and F-22 (step 4: 15 criteria). Criteria renumbered per feature. Decisions carried over: Generate waits for an analysis with no blockers; privacy notice on step 4 only; testing rules an ordinary block; stepper by Back and Next only; findings as plain text; file tree from core `planGeneration`; optional `architecture` string in the config (needs its `architecture.md` §5 record before the plan). Depends on F-06 for step 3 (AC-010, AC-011) |
| UX       | ✅ Complete | 2026-11-15 | Approved by the user. Reviewed by the `usability` and `visual` agents; the three open points decided (drag plus a select-then-add route in F-06; storage line kept on step 1; approval gates orange, rule chips violet) |
| Plan     | ✅ Complete | 2026-11-15 | Approved by the user before any code is written; 16 tasks (T001–T016); T016 blocked until F-06 is complete |
| Build    | 🔄 In Progress | 2026-11-15 | 16 of 17 tasks committed; T016 waits for F-06 |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None.

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Wizard state: four steps, Back and Next, values kept between steps | reviewed: 0 blockers, 0 warnings, 0 suggestions | task check passed (exit 0), 1371 tests |
| T002 | Name and idea state: name stored as typed; idea capped at 8,000 code points with the counter `N / 8,000` (amendment 1: separator; amendment 2: code points, the server too) | reviewed: 0 blockers, 1 warning resolved by the owner (code points; F-04 amendment 16), 1 suggestion fixed; 1 deferred (counter loop shared with brief/counter.ts) | task check passed (exit 0), 1376 tests |
| T003 | Stepper and footer view model: done, current and todo steps with no click target; Back disabled on step 1; Next hidden on step 4 | reviewed: 0 blockers, 0 warnings, 0 suggestions | task check passed (exit 0), 1376 tests |
| T004 | Wizard screen and App wiring: stepper (no click target), Back and Next footer, step 1 name and idea, placeholders for steps 2 and 4; step 3 keeps the flat builder until F-06; the counter helper moved to wizard/ (amendment 3) | reviewed: 0 blockers, 0 warnings, 0 suggestions; counter move done (amendment 3); AC-014 is a device check | task check passed (exit 0), 1376 tests; vite build passed |
| T005 | Remove the flat brief validation tests (brief-validation, brief-placement); covers none | reviewed: 0 blockers, 0 warnings, 0 suggestions; the removed AC-019 check (valid brief parses) has no other test, recorded | task check passed (exit 0), 1376 tests |
| T006 | Remove the flat brief config tests (brief-config); covers none | reviewed: 2 warnings accepted by the owner (stack trim and blank fields tested in F-21; module and layer parsing dropped, F-21 has no module list), 1 suggestion recorded | task check passed (exit 0), 1376 tests |
| T007 | Remove the flat brief dependency and gate tests (brief-depends, brief-gate); covers none | reviewed: W2 decided by the owner (the module list leaves the config with F-21; the record is due when F-21 is planned); W1 deferred to F-22 (privacy notice wording test) | task check passed (exit 0), 1376 tests |
| T008 | Remove the flat brief form components (BriefForm, ModuleRows, RuleList); covers none | reviewed: 2 warnings closed by the owner (module table: the module list leaves the config; progress panel: dropped, the stepper is the progress view); 1 suggestion deferred to the last removal task (unused CSS selectors) | task check passed (exit 0), 1376 tests |
| T009 | Remove the flat placement logic (placement.ts; amendment 4); covers none | reviewed: 1 warning closed by the owner (inline placement of problems dropped; F-22 lists every finding) | task check passed (exit 0), 1376 tests |
| T010 | Remove the flat Messages component (amendment 5); covers none | reviewed: 0 blockers, 0 warnings, 0 suggestions | task check passed (exit 0), 1376 tests |
| T011 | Remove the flat analyze request tests (analyze-request); covers none | reviewed: 1 warning accepted by the owner (the request body and URL test is lost; F-22 AC-002 and AC-010 rebuild it) | task check passed (exit 0), 1376 tests |
| T012 | Remove the flat analyze result tests (analyze-result); covers none | reviewed: 1 warning accepted by the owner (findings and review-notice tests lost; F-22 AC-003 and AC-004 rebuild them) | task check passed (exit 0), 1376 tests |
| T013 | Remove the flat analyze panel and logic (AnalysisPanel, in-flight, request, result); covers none | reviewed: 1 warning accepted by the owner (the flat Analyze step and its tests lost until F-22 AC-001 to AC-005 and AC-010), 1 suggestion fixed (comment in PrivacyGate) | task check passed (exit 0), 1376 tests |
| T013a | Remove the remaining flat brief logic (validate, to-config, progress, gate, PrivacyGate, state, privacy; amendment 5); covers none | reviewed: 1 warning accepted by the owner (the form's own field checks move to /analyze, F-04 AC-010) | task check passed (exit 0), 1376 tests |
| T014 | Privacy and storage static tests: no storage or console calls in the web source; no provider key or variable name in it (AC-006, AC-012, AC-013) | reviewed: 0 blockers, 1 warning fixed (non-vacuous scan), 3 suggestions fixed | task check passed (exit 0), 1376 tests |
| T015 | Architecture web row describes the wizard frame, its four steps, the builder hosted at step 3 and the privacy notice on step 4 (F-22); covers none | reviewed: 0 blockers, 1 warning fixed (the row said F-05 owns the step 4 privacy notice; F-22 AC-001 builds it), 0 suggestions | task check passed (exit 0), 1376 tests |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T002 `source/packages/core/src/code-points.ts` and `source/apps/web/src/brief/counter.ts` (`codePointLength`) (SUGGESTION): the same code-point loop is in two packages. Not shared: a shared export would add to core's public API, which the owner did not ask for; revisit if a third caller appears.
- T002 `source/apps/web/src/wizard/name-idea.ts:19-21` (WARNING, RESOLVED 2026-11-16): `setIdea` cut by UTF-16 code units and could leave a lone surrogate. Owner decision (Amendment 2): AC-008 counts code points; `setIdea` now keeps the first 8,000 code points and never splits a pair. Tests: `F-05 AC-008` in `wizard-name-idea.test.ts`.
- T002 `source/packages/core/src/limits.ts` and `source/packages/core/src/pipeline/caps.ts` (WARNING, RESOLVED 2026-11-16): the core cap checks counted `config.idea.length` (UTF-16 units), while the form counts code points (AC-008). Owner decision, 2026-11-16: the server cap counts code points too, so the form and the server agree; both checks now use `source/packages/core/src/code-points.ts`, and the 8,000 limit is unchanged. Recorded in F-04 Amendment 16 (F-04 AC-021 and `architecture.md` §12 say code points). Tests: `F-13 AC-013` in `source/packages/core/test/limits.test.ts` and `F-04 AC-021` in `source/packages/core/test/pipeline-caps.test.ts`, including an emoji and an 8,000-code-point emoji idea.
- T006 `source/apps/web/test/brief-config.test.ts` (WARNING, unresolved): the removal drops the only tests that a blank optional stack field is left out of the config and that stack values are trimmed (`source/apps/web/src/brief/to-config.ts` `buildStack`; F-21 AC-001). No remaining test covers it. Not restored: T006 is a removal and the test belongs to F-21. Decision for the owner or caller: keep a test for it before T006 passes, or accept the gap until F-21 builds the stack.
- T006 `source/apps/web/test/brief-config.test.ts` (WARNING, unresolved): the removal drops the only tests of `parseLayer` (digits only, safe integers) and of the `badLayers` report (`to-config.ts`). No remaining test covers them. The spec has no module list (F-21: "no module list"), and T009 removes `to-config.ts`. Not restored: the owner should confirm the module table is dropped before any test is kept.
- T006 `source/apps/web/test/brief-config.test.ts` (SUGGESTION): the file's labels (F-05 AC-006, AC-007, AC-010, AC-018; F-06 AC-002, AC-004) no longer match the F-05 stories (AC-006 is in-memory state, AC-007 is the name as typed, AC-010 is the builder on step 3, AC-018 does not exist). The plan's "covers none" note is therefore inaccurate. Reason: no criterion to re-tag once the file is removed.
- T006 `source/apps/web/test/brief-config.test.ts` (SUGGESTION): config-level guards are gone (core defaults not aliased by a built config; a fresh brief does not leak). State-level cases remain in `builder-map-state.test.ts` and `brief-gate.test.ts`. Reason: the gap is partial and the code path is removed in T009.
- T007 `source/apps/web/test/brief-gate.test.ts` (WARNING, unresolved): the exact privacy sentence (`PRIVACY_NOTICE`) and checkbox label (`PRIVACY_CHECKBOX_LABEL`) were pinned by a test and are now pinned by nothing. F-22 AC-001 covers the checkbox gate, not the wording. Not restored: the wording belongs to F-22 step 4. Fix: F-22 adds an exact-text test when step 4 is built.
- T007 `source/apps/web/test/brief-depends.test.ts` (WARNING, unresolved): the `dependsOn` split and the handling of names that match no module have no test now. Core still carries `architecture.modules[].dependsOn` (`source/packages/core/src/model.ts`, `parse-config.ts`), and no core check reports an unmatched name, so the old "/analyze can report it" claim has no criterion behind it. F-21 says "no module list", so the owner must decide whether `architecture.modules` leaves the config (an F-01 or F-21 amendment) before this is closed. Not restored: the feature it tested is out of the current stories.
- T008 `source/apps/web/src/brief/ModuleRows.tsx` (WARNING, unresolved): the module table (add and remove module, layer digits-only input, depends-on split, problem shown beside a module's name or layer) has no test and no current criterion. It is the same open question as the T007 depends-on warning: F-21 says "no module list", but core still carries `architecture.modules`. The owner must decide whether the module list leaves the config (amendment to F-01 or F-21) before this closes. Not restored: no criterion covers it.
- T008 `source/apps/web/src/brief/BriefForm.tsx` (WARNING, unresolved): the progress panel (`progressEntries` marks and the "(incomplete)" label) is not in `stories.md` (F-05, F-21, F-22) or in the approved F-05 screens, and no test covers it. The owner must confirm it is dropped; if it stays, a criterion and a screen come first.
- T009 `source/apps/web/src/brief/placement.ts` (WARNING, unresolved): the removed `isShownBeside` and `messagesAt` decided which analyzer problems show beside their field and which go to an "Other problems" list. The flat spec had this as AC-026 ("Other problems to fix" list appears only when a problem has no field of its own) and the placement comments cite AC-010 and AC-027 of the flat numbering. The split (commit 121d04e) dropped that rule without a recorded decision, and no current criterion (F-05, F-21, F-22) or screen covers field-level placement. The visibility guarantee survives in F-22 AC-003 (every finding listed with its subject and message), so no blocker is hidden; only the inline placement is lost. Not restored: the owner must confirm the inline placement is dropped (record it as an amendment to F-21 or F-22) or add a criterion before T009 is accepted.
- T008 `source/apps/web/src/styles.css:52,152,194` (SUGGESTION): the selectors `.brief-form`, `.module-rows`, `.rule-list` and `.progress` have no users after T008. Reason: no plan line for stylesheet cleanup; remove them in the last flat-brief removal task.
- T011 `source/apps/web/test/analyze-request.test.ts` (WARNING, unresolved): the removal drops the only tests of the web client's `POST /analyze` request: method, URL `/analyze`, `Content-Type: application/json`, and a body equal to the config from `toProjectConfig` (`schemaVersion` 1 config, `DEFAULT_WORKFLOWS` and `DEFAULT_CONNECTIONS` included). Its labels (F-05 AC-018 for the request, F-05 AC-020 for the in-flight guard) match no criterion in F-05 `stories.md`, which has AC-001 to AC-014. No remaining test covers the body: `source/apps/api/test/analyze-route.test.ts` tests the server only, and no core or web test sends it. The guard tests are dropped too (`source/apps/web/src/analyze/in-flight.ts`, removed in T013). Not restored: the plan says T011 covers none, and F-22 AC-002 (body from the wizard state) and AC-010 (pending Generate) own this behaviour. Owner decision: restore a request-body test now (under F-05 or in F-22 when `analyze/request.ts` is rebuilt) or accept the gap until F-22.
- T012 `source/apps/web/test/analyze-result.test.ts` (WARNING, unresolved): the removal drops the only tests of `findingRows` (structural findings as table rows, in server order, with only severity, subject and message) and of `reviewNotice` (fixed notice for `failed` and `skipped`, no findings key). The file labels them F-05 AC-021 and F-05 AC-022, but F-05 `stories.md` has AC-001 to AC-014 only. Their content maps to F-22 AC-003 (findings in order, with severity, subject and message) and F-22 AC-004 (skipped or failed note, structural findings still shown). No remaining test covers them. Nothing imports the deleted file; `source/apps/web/src/analyze/result.ts` stays until T013, and `AnalysisPanel.tsx` still uses it. The plan's "covers none" note is inaccurate for these labels. Not restored: T012 is a removal and the behaviour belongs to F-22 step 4. Owner decision: restore a findings and review-notice test now (under F-05, or in F-22 when `analyze/result.ts` is rebuilt) or accept the gap until F-22.
- T013 `source/apps/web/src/analyze/AnalysisPanel.tsx`, `in-flight.ts`, `request.ts`, `result.ts` (WARNING, unresolved): the removal drops the only Analyze step of the flat form and its tests. Lost behaviour: the Analyze button enabled only when the brief is valid, the privacy gate is ticked and no request runs (`canAnalyze`); one in-flight guard refusing a second request; the "Analyzing the brief" status while waiting; the failure text (`ANALYZE_FAILED_MESSAGE`) shown as an alert with the brief unchanged; the structural findings table and the review notice; the request body and URL (`POST /analyze`, `Content-Type: application/json`, config from `toProjectConfig`). No file imports the four removed modules (checked), and no test covers the lost behaviour. Until F-22 lands, the web app has no way to send `/analyze` from the browser. Not restored: T013 is a removal, and F-22 AC-001 (privacy gate and Analyze enabling), AC-002 (one request, config from wizard state), AC-003 and AC-004 (findings and review notice), AC-005 (failure text, brief kept), and AC-010 (second click sends no request) own this behaviour. Owner decision: accept the gap until F-22 (as for T011 and T012), or restore a request and guard test now.
- T013a `source/apps/web/src/brief/validate.ts` (WARNING, unresolved): the removal drops `validateBrief`, the form's own field checks (name, idea, stack language and architecture style required; at least one module; each module name required; the idea cap in code points) and the ordering that shows every form problem before the core problems. No test covers them at HEAD (the file was imported only by `gate.ts` and `progress.ts`, both removed). F-05 AC-005 says the analyzer owns the required-field check (F-04 AC-010), so a blank name or idea is still reported by `/analyze`; the module-name and "at least one module" checks have no criterion since F-21 says "no module list". The idea cap is covered by F-05 AC-008/AC-009 and the core cap by F-13 AC-013. Not restored: T013a is a removal and the form-level checks belong to F-21 and F-22. Owner decision: confirm the form-level checks move entirely to `/analyze` (an amendment to F-21 or F-22) or add a criterion and a test before F-21 is accepted.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment 1 — 2026-11-16
**Changed**: `stories.md` AC-008: the counter reads `8,000 / 8,000` with a thousands separator, as the approved screen 01 draws it.
**Reason**: AC-008 said `8000 / 8000`, but the approved screen shows `142 / 8,000`. Approved by the user on 2026-11-16 (keep the screen's format).
**Impact**: T002 (the counter helper groups thousands) and its test.

### Amendment 2 — 2026-11-16
**Changed**: `stories.md` AC-008 counts the idea in code points (a surrogate pair counts as one character; a cut never splits a pair), replacing JavaScript string length. The 8,000 cap and the separator wording stay. `INPUT_CAPS.ideaCharacters` stays 8000.
**Reason**: Owner decision, 2026-11-16. A cut by UTF-16 units could leave a lone surrogate at the end of the idea.
**Impact**: T002 `source/apps/web/src/wizard/name-idea.ts` and its test. Also, to keep the form on one unit: `source/apps/web/src/brief/counter.ts` (the counter), `source/apps/web/src/brief/validate.ts` (the idea cap), and their tests in `brief-validation.test.ts`. The core checks in `source/packages/core` (F-13 AC-013, F-04 AC-021) were open and now count code points too (RESOLVED 2026-11-16; see Deferred Findings).

### Amendment 5 — 2026-11-16
**Changed**: `plan.md` T010 removes only `Messages.tsx` now; `PrivacyGate.tsx`, `state.ts` and `privacy.ts` move to T013a.
**Reason**: they are still imported by `AnalysisPanel.tsx` (T013), `analyze-request.test.ts` (T011) and the logic files (T013a). Approved by the user on 2026-11-16 (split).
**Impact**: T010 and T013a only.

### Amendment 4 — 2026-11-16
**Changed**: `plan.md` T009 removes only `placement.ts` now; the other four logic files (`validate.ts`, `to-config.ts`, `progress.ts`, `gate.ts`) move to a new task T013a after T013.
**Reason**: removing them in T009 breaks the typecheck: `AnalysisPanel.tsx` and `analyze-request.test.ts` still import `to-config` and `gate`, and T011 and T013 remove those importers. Approved by the user on 2026-11-16 (split).
**Impact**: T009 and the new T013a only.

### Amendment 3 — 2026-11-16
**Changed**: the idea counter helpers (`groupThousands`, `codePointLength`, `ideaCounter`) moved from `source/apps/web/src/brief/counter.ts` to `source/apps/web/src/wizard/counter.ts` (`git mv`, one copy). The wizard (`NameIdeaStep.tsx`, `wizard-name-idea.test.ts`) imports them from there. The flat brief still imports them from the new path until T010 (`brief/validate.ts`, `brief/BriefForm.tsx`, `brief-validation.test.ts`). Behaviour and test names are unchanged.
**Reason**: the wizard must not depend on the flat brief, which T010 removes.
**Impact**: T010 no longer deletes `brief/counter.ts`, because the file is already gone from `brief/`. T010 must remove the brief importers of the counter (its other files stay in T010). Its plan line still names `brief/counter.ts`, so the plan needs a matching amendment before T010 runs.

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
