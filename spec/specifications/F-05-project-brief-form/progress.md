# Progress — Project brief form (F-05)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-13 | Stories approved by the user as written; 26 criteria (24 `[auto]`, 2 `[device]`). Decisions: Project name field added; Analyze needs a valid brief and the checkbox. |
| Plan     | ✅ Complete | 2026-11-13 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-13 | 5 of 11 tasks committed (plan amended: former T003 split into T003 and T004) |
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
---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `package.json:9` (root `engines.node` `>=20`): Vite 7 requires Node `^20.19.0 || >=22.12.0`, so `npm run dev` or `build` can fail on Node 20.0 to 20.18. Not changed in T002 because the root engines range is a repo-wide decision; to be recorded in `architecture.md` §5 before the range changes.
- For T005 (idea length, AC-002): the trimmed idea goes into the configuration, but the 8,000-character check must run on the raw submitted text, so trimming cannot hide an over-limit idea. Recorded here as a note for T005.

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
