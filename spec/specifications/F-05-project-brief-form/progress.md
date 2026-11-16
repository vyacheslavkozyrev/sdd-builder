# Progress — [Feature Name] ([F-XX])

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-15 | Stories approved by the user, then split on 2026-11-15 into F-05 (frame, step 1, step 3 host, privacy: 14 criteria), F-21 (step 2: 10 criteria) and F-22 (step 4: 15 criteria). Criteria renumbered per feature. Decisions carried over: Generate waits for an analysis with no blockers; privacy notice on step 4 only; testing rules an ordinary block; stepper by Back and Next only; findings as plain text; file tree from core `planGeneration`; optional `architecture` string in the config (needs its `architecture.md` §5 record before the plan). Depends on F-06 for step 3 (AC-010, AC-011) |
| UX       | ✅ Complete | 2026-11-15 | Approved by the user. Reviewed by the `usability` and `visual` agents; the three open points decided (drag plus a select-then-add route in F-06; storage line kept on step 1; approval gates orange, rule chips violet) |
| Plan     | ✅ Complete | 2026-11-15 | Approved by the user before any code is written; 16 tasks (T001–T016); T016 blocked until F-06 is complete |
| Build    | 🔄 In Progress | 2026-11-15 | 7 of 16 tasks committed |
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
