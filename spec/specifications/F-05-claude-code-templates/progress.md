# Progress — Claude Code templates (F-05)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-19 | 7 stories, 40 criteria, all [auto]; re-specified from the final schema (`pipeline-schema.md`) and approved by the user |
| UX       | ➖ Not needed |  | No user interface (F-02 to F-06) |
| Plan     | ✅ Complete | 2026-11-19 | Approved by the user; 19 tasks (T001 to T019); 40 criteria, all covered |
| Build    | 🔄 In Progress | 2026-11-19 | 5 of 19 tasks committed |
| Verify   | ⏳ Pending |  | Not yet run |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Flow steps: every block of the walk is a numbered step, Start first and End last; a Condition step carries its check and routes; route text names the step numbers | 1 blocker (Conditions not steps), 1 warning (stop wording), 2 suggestions fixed | task check passed: core 965 of 965 (44 files), api 6 of 6, web 4 of 4 |
| T002 | Flow artifacts: `flowArtifacts` as `### <label>` with its template text, `No artifacts` when none; End step names producedArtifact, plain End when none | 0 blockers, 0 warnings, 1 suggestion fixed (leading blank lines of a template), 1 suggestion deferred | task check passed: core 973 of 973 (44 files), api 6 of 6, web 4 of 4 |
| T003 | Flow body and arguments: `flowBody` is the body paragraph with its line breaks, empty when blank; `flowArguments` writes `No arguments` when none, each argument on its own line | 0 blockers, 0 warnings, 2 suggestions fixed (AC-008 test string built with a stray continuation; F-04 test title casing) | task check passed: core 979 of 979 (44 files), api 6 of 6, web 4 of 4 |
| T004 | Rule tags: `flowRuleTags` and `agentRuleTags` as one comma-separated list in order, `none` when absent or empty; shared `ruleTagsText` in `values-text.ts` | 0 blockers, 0 warnings, 1 suggestion fixed (duplicated helper moved to `values-text.ts`) | task check passed: core 985 of 985 (44 files), api 6 of 6, web 4 of 4 |
| T005 | Agent frontmatter and body: `agentDescription` a quoted YAML string; `agentPurpose` the plain description for the Purpose line; `agentTools` quoted as one list when a name would break YAML; `agentBody` with its `Instructions` heading, empty when blank | 0 blockers, 3 warnings fixed (control characters and U+2028/2029 in quoted text; plain tool names starting with a digit, sign or dot; quoted forms not round-trip tested), 2 suggestions deferred | task check passed: core 1006 of 1006 (44 files), api 6 of 6, web 4 of 4 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `source/packages/core/src/pipeline/generate/values-flow.ts` (`flowConditions`, `routeLines`): a Condition's true and false routes are written both in its step (`flowSteps`, AC-012) and in its numbered rule (`flowConditions`). Kept on purpose: AC-013 requires the retry rule, and the F-04 AC-016 rule tests assert it. T011 may narrow the rules section to retries when it writes the layout.
- `source/packages/core/src/pipeline/generate/values-flow.ts` (`flowArtifacts`, `artifactText`): a label or producedArtifact with a backtick would break its code span. Kept as is: the agent name and argument spans of F-04 have the same limit, and the pipeline model owns label validation. Revisit with the model's label rules.
- T011 (layout): `flow.md` must write the `## Artifacts` heading before `{{flowArtifacts}}`, because the artifact headings are level 3 under it (see the comment on `artifactsText`).
- `source/templates/README.md` (value table, line 14 and the `flowArguments` row): the table does not yet list `flowBody`, and `flowArguments` is still described as one line per argument only (no `No arguments`). SUGGESTION: the plan assigns the value table to T018 (the README was not updated by T001 or T002 either), so it is left for T018.
- `source/packages/core/src/pipeline/generate/values-agent.ts` (`agentBody`) and `values-pipeline.ts` (`pipelineBody`): these use truthiness, so a whitespace-only body is not empty there, while `flowBody` (AC-006) trims and is empty when blank. SUGGESTION: align in T005 (`agentBody`) and with the pipeline layout task (`pipelineBody`); AC-006 is only required for flows here. Resolved for `agentBody` in T005 (a blank body is empty through `bodyText`); `pipelineBody` stays open.
- `source/templates/README.md` (value table, T018): the table does not list `agentPurpose` (the Purpose value of T005, the description as plain inline text) and describes `agentDescription` without its quoting. SUGGESTION: the plan assigns the table to T018, so it is left for T018.
- `source/packages/core/src/pipeline/parse/lists.ts` (`readTools`): tool names are read with no non-blank rule, so a blank name reaches the agent line as `""` or `"Read, "`. The quoting reads the joined text back faithfully, so this is an input rule, not a YAML fault. SUGGESTION: refuse a blank tool name in the parser (owned by the pipeline parse task, not T005).

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

Not yet run.

---

## Amendments

### Amendment — 2026-11-19
**Changed**: The earlier F-05 build (tasks T001 to T013, verified 2026-11-17) is replaced. Its layouts were removed by the reset in commit `9c86eb5`, and its task log, deferred findings and test results were cleared here at Plan approval. They remain in git history before commit `bc8f671`.
**Reason**: The pipeline schema changed (decision 38, `spec/documents/pipeline-schema.md`): Approval and Check blocks, connection labels and gates between flows were removed. The earlier stories and plan described that model.
**Impact**: Build restarts from T001 with the 19 tasks of the approved plan.
