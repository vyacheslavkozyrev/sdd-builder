# Verify Report — API: analyze and generate, zip download (F-07)

Date: 2026-11-15 (second run, after T020)
Branch: `main`. Current Task: None. All 20 plan tasks ticked and committed (T010 retired by Amendment 1).

Template note: `spec/specifications/F-00-template/` has no `verify.md`, so this report follows the layout of `spec/specifications/F-04-analyzer/verify.md`.

## Preconditions

- Every task in `plan.md` is ticked and committed; Current Task is None.
- Branch is `main`; the working tree was clean before this report (the only untracked file was this draft).

## Gap from the first run, closed by T020

The first run found one gap: AC-024 had the folder and export tests but no test that the removed flat core source files stay absent. T020 (commit `dfd25de`) added `source/packages/core/test/flat-removed.test.ts`, tagged `F-07 AC-024`. It asserts that `generate.ts`, `plan.ts`, `reply-check.ts`, `select.ts` and `file-list.ts` are absent from `source/packages/core/src/`, that `validate/` is absent, that `render/` holds only `mermaid.ts`, and that `cycle.ts` and `selection.ts` are present. It also has a negative probe of the rule.

AC-024 now has all three parts:

- file absence: `packages/core/test/flat-removed.test.ts`
- export absence from the core root: `packages/core/test/root-exports.test.ts`
- flat template folders absent: `packages/core/test/templates-scan.test.ts`

## Test run

`source/scripts/task-check.sh`: **exit 0**. Type check passed for `api`, `web` and `core`. The full test suite passed.

| Workspace | Test files | Tests | Passed | Failed | Skipped |
| --- | --- | --- | --- | --- | --- |
| `@sddbuilder/api` | 28 | 479 | 479 | 0 | 0 |
| `@sddbuilder/web` | 14 | 348 | 348 | 0 | 0 |
| `@sddbuilder/core` | 64 | 1235 | 1235 | 0 | 0 |
| Total | 106 | 2062 | 2062 | 0 | 0 |

The tag matrix below comes from a separate JSON run of the `api` and `core` suites (both exit 0). Every test whose name carries `F-07 AC-0xx` passed; none failed or was skipped. The `web` suite has no test that names an F-07 criterion.

## Criteria matrix (all `[auto]`)

Counts are passing tests carrying the tag. Test files are relative to `source/`.

| Criterion | Covering test files (passing tests with the tag) | Passing | Status |
| --- | --- | --- | --- |
| AC-001 | apps/api/test/generate-route-pipeline.test.ts | 1 | covered |
| AC-002 | apps/api/test/generate-route-pipeline.test.ts, generate-route.test.ts | 10 | covered |
| AC-003 | apps/api/test/generate-route-pipeline.test.ts, packages/core/test/parse-config.test.ts | 137 | covered |
| AC-004 | apps/api/test/generate-route-pipeline.test.ts | 5 | covered |
| AC-005 | apps/api/test/generate-route-pipeline.test.ts | 1 | covered |
| AC-006 | apps/api/test/generate-route-pipeline.test.ts, generate-route.test.ts, generate-service.test.ts | 6 | covered |
| AC-007 | apps/api/test/generate-route-pipeline.test.ts | 3 | covered |
| AC-008 | apps/api/test/generate-prompt.test.ts, generate-service.test.ts | 11 | covered |
| AC-009 | apps/api/test/generate-route.test.ts, generate-service.test.ts, parse-reply.test.ts | 15 | covered |
| AC-010 | apps/api/test/generate-prompt.test.ts, generate-route.test.ts, generate-service.test.ts, parse-reply.test.ts | 24 | covered |
| AC-011 | apps/api/test/generate-route.test.ts, generate-service.test.ts | 6 | covered |
| AC-012 | apps/api/test/generate-service.test.ts, generation-model.test.ts | 4 | covered |
| AC-013 | apps/api/test/generate-route-pipeline.test.ts, generate-route.test.ts, generation-model.test.ts | 6 | covered |
| AC-014 | apps/api/test/generate-route.test.ts, generate-zip-pipeline.test.ts, zip.test.ts | 17 | covered |
| AC-015 | apps/api/test/generate-route.test.ts, generate-zip-pipeline.test.ts, zip.test.ts | 4 | covered |
| AC-016 | apps/api/test/generate-route-pipeline.test.ts | 1 | covered |
| AC-017 | apps/api/test/generate-privacy-pipeline.test.ts, privacy.test.ts | 21 | covered |
| AC-018 | apps/api/test/generate-no-io.test.ts | 32 | covered |
| AC-019 | apps/api/test/analyze-route.test.ts, generate-limits-pipeline.test.ts, generate-route.test.ts | 17 | covered |
| AC-020 | apps/api/test/generate-route-pipeline.test.ts, privacy.test.ts | 2 | covered |
| AC-021 | apps/api/test/generate-limits-pipeline.test.ts | 5 | covered |
| AC-022 | apps/api/test/generate-limits-pipeline.test.ts, generate-route-pipeline.test.ts | 8 | covered |
| AC-023 | apps/api/test/no-flat-generate.test.ts | 29 | covered |
| AC-024 | packages/core/test/flat-removed.test.ts, root-exports.test.ts, templates-scan.test.ts | 35 | covered (gap closed by T020) |
| AC-025 | packages/core/test/root-exports.test.ts | 11 | covered (see note) |

Note on AC-025: the criterion is that the web app's type check and tests pass with no change to the web app. The tagged tests check that the core root still exports every name the web app imports. The web type check and the 348 web tests pass in `task-check.sh`, and no commit touches `source/apps/web` after `6e9a367`, which predates F-07. No web test names AC-025, so the tagged core tests are the named proof and the web run is the supporting one.

## Gaps

None. Every criterion AC-001 to AC-025 has at least one passing test that names it.

## Scope check (F-07 scope in `spec/documents/features.md`, and stories Requirement Coverage)

The F-07 row and section in `features.md` name `POST /analyze` and `POST /generate`, the zip with the file tree, statelessness, and input validated against the model. Each part has at least one criterion:

- R-01 (`/analyze` and `/generate` on the pipeline model): AC-001, AC-002, AC-023, AC-024
- R-02 (zip with the file tree): AC-001, AC-008, AC-009, AC-010, AC-014, AC-015, AC-016
- R-03 (stateless, nothing stored or logged): AC-011, AC-017, AC-018
- R-04 (input validated against the model): AC-001, AC-003, AC-004, AC-005
- R-05 (refusals, caps, limits and status codes): AC-006, AC-007, AC-010 to AC-013, AC-019 to AC-022, AC-025

## Manual checklist

Empty. Every criterion of F-07 is tagged `[auto]`, so there is no `[device]` criterion and no `checklist.md` is needed.

## Result

All automated criteria pass. No manual criteria. Verify is complete (see `progress.md`, Phase Status).
