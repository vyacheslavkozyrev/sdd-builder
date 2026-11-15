# Verify Report — Analyzer: structural checks and LLM review (F-04)

Date: 2026-11-15
Branch: `main`, working tree clean, Current Task None, all 24 plan tasks ticked (plus T013a and T013b).

## Test run

`source/scripts/task-check.sh` (type check and full test suite of the workspace): exit 0.

| Workspace | Test files | Tests | Result |
| --- | --- | --- | --- |
| `@sddbuilder/api` | 24 | 404 | passed |
| `@sddbuilder/web` | 14 | 348 | passed |
| `@sddbuilder/core` | 79 | 1338 | passed |

Type check passed for `api`, `web` and `core`.

## Criteria matrix (all `[auto]`)

Test files are relative to `source/`. Each named test carries its `F-04 AC-0xx` tag and passed in the run above.

| Criterion | Test file | Test name (proving the criterion) | Status |
| --- | --- | --- | --- |
| AC-001 | packages/core/test/pipeline-analyze-default.test.ts | F-04 AC-001 has no blocker in analyzeStructure(default); F-04 AC-001 has exactly the six retry warnings and the rules warning on the default, and nothing else | covered, passed |
| AC-002 | packages/core/test/pipeline-analyze-order.test.ts | F-04 AC-002 gives the same list, in the same order, on every call; F-04 AC-002 leaves the configuration equal before and after the analysis | covered, passed |
| AC-003 | packages/core/test/pipeline-analyze-order.test.ts | F-04 AC-003 orders findings: $name (table, incl. blocker before warning, subject order, message order on ties); F-04 AC-003 orders block path subjects by number, so blocks[3] comes before blocks[10].blocks[3] | covered, passed (`info` rank not tested, per Amendment 6 and the criterion text) |
| AC-004 | packages/core/test/pipeline-analyze-refusals.test.ts | F-04 AC-004 reports $name as a blocker at its path (rule tag, Condition fail route, block with no description); F-04 AC-004 gives each problem exactly one blocker, with the problem count | covered, passed |
| AC-005 | packages/core/test/pipeline-analyze-refusals.test.ts | F-04 AC-005 the default pipeline gives no blocker; F-04 AC-005 removing one agent description gives exactly one blocker, at that agent | covered, passed |
| AC-006 | packages/core/test/pipeline-analyze-reachability.test.ts | F-04 AC-006 reports $name, and only what the walk does not reach (orphan block, orphan flow, disabled block transparent); F-04 AC-006 gives the orphan block and the orphan flow one blocker each | covered, passed |
| AC-007 | packages/core/test/pipeline-analyze-reachability.test.ts | F-04 AC-007 gives no finding for $name (disabled block or flow, unreachable or blank); F-04 AC-007 a disabled block is not on any path | covered, passed |
| AC-008 | packages/core/test/pipeline-analyze-retries.test.ts | F-04 AC-008 gives one warning at a flow-level Condition that retries with no limit; F-04 AC-008 gives one warning at a pipeline-level gate that goes back with no limit; F-04 AC-008 a back route with a round limit gives none; F-04 AC-008 a forward route with no round limit gives none | covered, passed |
| AC-009 | packages/core/test/pipeline-analyze-inputs.test.ts | F-04 AC-009 a first-flow agent counts the pipeline Start argument as its iteration source; F-04 AC-009 an artifact produced only in a later flow does not count; F-04 AC-009 a project-scope agent gives no inputs warning; F-04 AC-009 the default pipeline gives no inputs warning in the full analysis | covered, passed |
| AC-010 | packages/core/test/pipeline-analyze-brief.test.ts | F-04 AC-010 blocks a blank %s (value %j) with the field name as subject; F-04 AC-010 gives one blocker per blank required field when several are blank | covered, passed |
| AC-011 | packages/core/test/pipeline-analyze-brief.test.ts | F-04 AC-011 warns about a blank stack.%s (value %j) with the path as subject; F-04 AC-011 gives no finding for an absent stack.%s (negative case) | covered, passed |
| AC-012 | packages/core/test/pipeline-analyze-brief.test.ts | F-04 AC-012 warns with subject rules when the list is empty; F-04 AC-012 gives no finding when the list has at least one rule (negative case) | covered, passed |
| AC-013 | apps/api/test/pipeline-prompt.test.ts | F-04 AC-013 contains each enabled flow name, its description and each enabled agent description; F-04 AC-013 omits %s (disabled block and flow); F-04 AC-013 gives the same prompt for the same input and for a copy of it | covered, passed |
| AC-014 | packages/core/test/pipeline-analyze-review-reply.test.ts | F-04 AC-014 returns status ok with the entries as findings, in reply order; F-04 AC-014 returns a model blocker as warning | covered, passed |
| AC-015 | packages/core/test/pipeline-analyze-review-reply.test.ts | F-04 AC-015 drops an entry with %s and counts it; F-04 AC-015 a reply that is not an array fails as a whole | covered, passed |
| AC-016 | apps/api/test/analyze-pipeline.test.ts | F-04 AC-016 gives the same structural findings with and without a review reply; F-04 AC-016 keeps a structural blocker when the model says the block is fine | covered, passed |
| AC-017 | apps/api/test/analyze-pipeline.test.ts | F-04 AC-017 gives review failed for $name (thrown error, cut-short reply, cut-short reply that looks valid, not JSON, not an array) | covered, passed |
| AC-018 | apps/api/test/analyze-pipeline.test.ts | F-04 AC-018 logs the event and the error name only, never the message, brief or reply; also apps/api/test/privacy.test.ts: F-04 AC-018 logs the event, the route and the error name only, with no brief, rule, reply or message text | covered, passed (wording note below) |
| AC-019 | apps/api/test/analyze-route.test.ts | F-04 AC-019 returns 200 with exactly findings and review for a valid schemaVersion 2 config | covered, passed |
| AC-020 | apps/api/test/analyze-route.test.ts | F-04 AC-020 returns 400 with project config is invalid and its problems, and does not call the model; F-04 AC-020 refuses a flat schemaVersion 1 body with 400 and does not call the model. Reader: apps/api/test/read-pipeline-config.test.ts, F-04 AC-020 returns 400 with the problem list and the fixed error message | covered, passed |
| AC-021 | apps/api/test/analyze-route.test.ts | F-04 AC-021 refuses $label with 422 listing the problems, and does not call the model; F-04 AC-021 accepts an idea of exactly 8,000 characters and exactly 60 rules. Also apps/api/test/limits-route.test.ts (8,000 / 8,001 and 60 / 61 on /analyze) and packages/core/test/pipeline-caps.test.ts (F-04 AC-021 reports $name / passes $name) | covered, passed |
| AC-022 | apps/api/test/ceiling-route.test.ts | F-04 AC-022 answers 200 with review skipped and does not call the model once the ceiling is reached. Core: packages/core/test/pipeline-analyze-skipped.test.ts | covered, passed |
| AC-023 | apps/api/test/ceiling-route.test.ts | F-04 AC-023 returns 200 with the zip for a flat schemaVersion 1 config after one model call. `apps/api/test/generate-route.test.ts` is unchanged since its last commit (6e9a367), so the existing generate route tests pass unchanged | covered, passed |
| AC-024 | packages/core/test/root-exports.test.ts | F-04 AC-024 the root namespace has no %s (analyzeStructure, skippedAnalysis, checkReview); F-04 AC-024 no flat analysis folder remains under src/analyze | covered, passed |
| AC-025 | apps/api/test/no-flat-analysis.test.ts | F-04 AC-025 no source or test file under source/apps/ imports a flat analysis export; F-04 AC-025 the scan finds the pipeline namespace import and does not flag it | covered, passed |

Gaps: none.

## Amendments against the stories text

| Amendment | Stories text it governs | Match |
| --- | --- | --- |
| 1, 2 | AC-006 (orphan block and orphan flow; disabled block transparent; enabled block reached through live blocks before it) | matches |
| 3 | AC-009 (Start arguments count as the iteration source of a first-flow agent) | matches |
| 4 | AC-012 (unchanged; the default's empty `rules` list gives its warning) | matches |
| 5 | AC-001 (no blocker; warnings are six retry warnings and the `rules` warning) and AC-003 (numeric path order for path subjects, code-unit order for other text) | matches |
| 6 | AC-003 (`info` after `warning`; rank not tested) | matches |
| 7 | AC-020 (unknown key name may appear in a 400 problem; no other submitted text; server neither stores nor logs the body) | matches |
| 8 to 15 | Plan and build sequencing only (task splits, size exceptions, root namespace test names, the F-01 case rewrite); no criterion text changed | n/a |

## Scope check (`spec/documents/features.md`, F-04)

Covered by at least one criterion:
- Structural rules, empty required fields and unknown ids: AC-004, AC-005, AC-010, AC-011, AC-012.
- Reachability and back routes with a retry warning: AC-006, AC-007, AC-008, AC-009.
- Semantic review over the brief and the process, output validated, invalid output dropped and counted, advice only: AC-013, AC-014, AC-015, AC-016.
- Structural findings returned when the LLM step fails: AC-017, AC-018.
- `/analyze` route, caps and ceiling: AC-019 to AC-023.

## Notes for the owner (not gaps)

1. AC-018 wording. The criterion says the failed-call log line carries "the event and the error name only". The route also logs `route=/analyze` (`privacy.test.ts`, which names the route explicitly), as decision 12 allows for refusals. This was already raised as a deferred finding in T016. The privacy requirement itself (no brief, rule, reply or message text) is proven. The owner should decide whether the criterion text should name the route.
2. Mis-tagged tests. `apps/api/test/anthropic-model.test.ts` tags its model-selection and API-key tests as `F-04 AC-021`, but AC-021 is the input caps. The real AC-021 tests exist, so coverage is not affected, but the tags mislead. A test-only fix would be needed; it was not made here.
3. AC-003 `info` rank is not tested, as the criterion itself says (Amendment 6).

## Manual checklist

Empty. Every criterion of F-04 is tagged `[auto]`, so no `checklist.md` is needed.
