# Verify Report — API: analyze and generate, zip download (F-07)

Date: 2026-11-15 (third run, final, after Amendment 11: T021 to T025)
Branch: `main`. Current Task: None. Working tree clean before this run.

Template note: `spec/specifications/F-00-template/` has no `verify.md`, so this report follows the layout of `spec/specifications/F-04-analyzer/verify.md`.

## Preconditions

- Every task in `plan.md` is ticked and committed, or retired. The only unticked line is T010, retired by Amendment 1 (merged into T004). Current Task is None.
- Branch is `main`; the working tree is clean.

## Amendment 11 closure

Amendment 11 is the last set of follow-up tasks. Each one is committed and its line in `plan.md` is ticked.

| Task | Closes | Result |
| ---- | ------ | ------ |
| T021 | Amendments 5 and 9 | `source/packages/core/src/render/mermaid.ts` and its test removed. `render/` is absent from core. The root-export guard covers `renderMermaid` and `mermaidId`. |
| T022 | AC-026 (new) | Reply keys longer than 120 characters are shortened in finding messages. Covered by `packages/core/test/pipeline-reply-shorten.test.ts`. |
| T023 | AC-027 (new) | Generated text is normalised to LF with exactly one trailing newline. Covered by `packages/core/test/pipeline-line-endings.test.ts` and `apps/api/test/generate-service.test.ts`. |
| T024 | AC-028 (new) | Selection helper error paths (cycle, unknown step) are tested. Covered by `packages/core/test/selection.test.ts`. |
| T025 | Amendment 11 g (label cleanup) | F-03 test labels corrected in `templates-readme.test.ts` and `templates-base.test.ts`. No assertion changed. |

Criteria AC-001 to AC-025 are unchanged from the second run. The three new criteria (AC-026 to AC-028) are in `stories.md` (US-008 and US-009) and in its Requirement Coverage table.

## Test run

`source/scripts/task-check.sh`: **exit 0**. Type check passed for every workspace. The full test suite passed.

| Workspace | Test files | Tests | Passed | Failed | Skipped |
| --- | --- | --- | --- | --- | --- |
| `@sddbuilder/api` | 28 | 480 | 480 | 0 | 0 |
| `@sddbuilder/web` | 14 | 348 | 348 | 0 | 0 |
| `@sddbuilder/core` | 66 | 1258 | 1258 | 0 | 0 |
| Total | 108 | 2086 | 2086 | 0 | 0 |

The tag matrix below comes from a separate JSON run of the `api` and `core` suites (both exit 0): 1738 tests, all passed. The `web` suite has no test that names an F-07 criterion (checked: 0 files).

## Criteria matrix (all `[auto]`)

Counts are passing tests whose full name carries `F-07 AC-0xx`. Test files are relative to `source/`. No criterion has a failing or skipped tagged test.

| Criterion | Covering test files | Passing | Status |
| --- | --- | --- | --- |
| AC-001 | apps/api/test/generate-route-pipeline.test.ts | 1 | covered |
| AC-002 | apps/api/test/generate-route-pipeline.test.ts, generate-route.test.ts | 10 | covered |
| AC-003 | apps/api/test/generate-route-pipeline.test.ts, generate-route.test.ts, packages/core/test/parse-config.test.ts | 140 | covered |
| AC-004 | apps/api/test/generate-route-pipeline.test.ts, generate-route.test.ts | 9 | covered |
| AC-005 | apps/api/test/generate-route-pipeline.test.ts | 1 | covered |
| AC-006 | apps/api/test/generate-route-pipeline.test.ts, generate-route.test.ts, generate-service.test.ts | 6 | covered |
| AC-007 | apps/api/test/generate-route-pipeline.test.ts | 3 | covered |
| AC-008 | apps/api/test/generate-prompt.test.ts, generate-service.test.ts | 11 | covered |
| AC-009 | apps/api/test/generate-route.test.ts, generate-service.test.ts, parse-reply.test.ts | 16 | covered |
| AC-010 | apps/api/test/generate-prompt.test.ts, generate-route.test.ts, generate-service.test.ts, parse-reply.test.ts | 24 | covered |
| AC-011 | apps/api/test/generate-route.test.ts, generate-service.test.ts | 6 | covered |
| AC-012 | apps/api/test/generate-route.test.ts, generate-service.test.ts, generation-model.test.ts | 6 | covered |
| AC-013 | apps/api/test/generate-route-pipeline.test.ts, generate-route.test.ts, generation-model.test.ts | 6 | covered |
| AC-014 | apps/api/test/generate-route.test.ts, generate-zip-pipeline.test.ts, zip.test.ts | 17 | covered |
| AC-015 | apps/api/test/generate-route.test.ts, generate-zip-pipeline.test.ts, zip.test.ts | 5 | covered |
| AC-016 | apps/api/test/generate-route-pipeline.test.ts | 1 | covered |
| AC-017 | apps/api/test/generate-privacy-pipeline.test.ts, privacy.test.ts | 21 | covered |
| AC-018 | apps/api/test/generate-no-io.test.ts | 32 | covered |
| AC-019 | apps/api/test/analyze-route.test.ts, generate-limits-pipeline.test.ts, generate-route.test.ts | 17 | covered |
| AC-020 | apps/api/test/generate-route-pipeline.test.ts, privacy.test.ts | 2 | covered |
| AC-021 | apps/api/test/generate-limits-pipeline.test.ts | 5 | covered |
| AC-022 | apps/api/test/generate-limits-pipeline.test.ts, generate-route-pipeline.test.ts | 8 | covered |
| AC-023 | apps/api/test/no-flat-generate.test.ts | 29 | covered |
| AC-024 | packages/core/test/flat-removed.test.ts, root-exports.test.ts, templates-scan.test.ts | 37 | covered |
| AC-025 | packages/core/test/root-exports.test.ts | 11 | covered (see note) |
| AC-026 (new) | packages/core/test/pipeline-reply-shorten.test.ts | 10 | covered |
| AC-027 (new) | packages/core/test/pipeline-line-endings.test.ts, apps/api/test/generate-service.test.ts | 15 | covered |
| AC-028 (new) | packages/core/test/selection.test.ts | 6 | covered |

Note on AC-025: the criterion is that the web app's type check and tests pass with no change to the web app. The tagged tests check that the core root still exports every name the web app imports. The web type check and its 348 tests pass in `task-check.sh`, and the last commit touching `source/apps/web` is `6e9a367`, which predates F-07. No web test names AC-025, so the tagged core tests are the named proof and the web run is the supporting one.

Note on the matrix: it counts by tag, as `qa.md` requires. A tag shows that a test is named for a criterion; the criterion is covered by the test's assertions, which the Build review checked per task.

## Gaps

None. Every criterion AC-001 to AC-028 has at least one passing test that names it.

## Scope check (F-07 scope in `spec/documents/features.md`, and stories Requirement Coverage)

The F-07 section in `features.md` names `POST /analyze` and `POST /generate`, the zip with the file tree, statelessness, and input validated against the model. Each part has at least one criterion:

- R-01 (`/analyze` and `/generate` on the pipeline model): AC-001, AC-002, AC-023, AC-024
- R-02 (zip with the file tree): AC-001, AC-008, AC-009, AC-010, AC-014, AC-015, AC-016, AC-026, AC-027
- R-03 (stateless, nothing stored or logged): AC-011, AC-017, AC-018
- R-04 (input validated against the model): AC-001, AC-003, AC-004, AC-005
- R-05 (refusals, caps, limits and status codes): AC-006, AC-007, AC-010 to AC-013, AC-019 to AC-022, AC-025, AC-026
- R-06 (selection helpers refuse a cycle and an unknown step): AC-028

## Manual checklist

Empty. Every criterion of F-07 is tagged `[auto]`, so there is no `[device]` criterion and no `checklist.md` is needed.

## Result

All 28 criteria pass automatically. No gaps, no failing tests, no manual criteria. Verify is complete (see `progress.md`, Phase Status). The commit is left to the caller.
