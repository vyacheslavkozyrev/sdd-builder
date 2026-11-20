# Progress — Claude Code templates (F-05)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-19 | 7 stories, 40 criteria, all [auto]; re-specified from the final schema (`pipeline-schema.md`) and approved by the user |
| UX       | ➖ Not needed |  | No user interface (F-02 to F-06) |
| Plan     | ✅ Complete | 2026-11-19 | Approved by the user; 19 tasks (T001 to T019); 40 criteria, all covered |
| Build    | 🔄 In Progress | 2026-11-19 | 9 of 19 tasks committed |
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
| T006 | Agent Reads and Writes: `agentReads` and `agentWrites` as `## Reads` and `## Writes` sections, one artifact label per line; left out when the list is empty or absent | 0 blockers, 0 warnings, 1 suggestion fixed (test name), 1 suggestion deferred (backtick in a label) | task check passed: core 1011 of 1011 (44 files), api 6 of 6, web 4 of 4 |
| T007 | Mermaid flowchart: `processDiagram` in `generate/mermaid.ts` (first line `flowchart`; nodes `F1`, `F2` in `next` order from the first flow, labelled with the flow name and ` approval` when on; one unlabelled edge per `next`); supplied as `processDiagram` by `baseValues` | 0 blockers, 1 warning fixed (`templates/README.md` said `processDiagram` was not supplied), 2 suggestions fixed (plan line did not name the two F-04 test files whose expectations change; redundant type annotation in `flowChain`), 2 deferred (see below) | task check passed: core 1024 of 1024 (45 files), api 6 of 6, web 4 of 4 |
| T008 | Mermaid escaping and determinism: flow names escape `#`, `"`, `[`, `]`, `{`, `}` and `|` to Mermaid entity codes (`#` first); line breaks and Unicode line separators become spaces; the approval word is added after escaping | 0 blockers, 1 warning fixed (U+2028/U+2029 untested), 2 suggestions fixed (AC-035 test against the same object; regex form) | task check passed: core 1037 of 1037 (45 files), api 6 of 6, web 4 of 4 |
| T009 | process.md flow list: `processFlows` replaces `processList`; one item per flow in `next` order, each once (a loop stops at the flow already listed); each item has its name and id, its description, the pipeline's approval sentence (stop, or does not stop) and its conditions and retry routes under it | 1 blocker fixed (a flow without approval had no approval sentence), 3 warnings fixed (approval wording taken from the flow command, not the pipeline's; tests did not prove both cases; plan T009 line missed two files), 3 suggestions fixed (stale comment; a test title over 120 characters; `architecture.md` named `processList`), 1 suggestion deferred (`templates/README.md`, T018) | task check passed: core 1045 of 1045 (45 files), api 6 of 6, web 4 of 4 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `source/packages/core/src/pipeline/generate/values-flow.ts` (`flowConditions`, `routeLines`): a Condition's true and false routes are written both in its step (`flowSteps`, AC-012) and in its numbered rule (`flowConditions`). Kept on purpose: AC-013 requires the retry rule, and the F-04 AC-016 rule tests assert it. T011 may narrow the rules section to retries when it writes the layout.
- `source/packages/core/src/pipeline/generate/values-flow.ts` (`flowArtifacts`, `artifactText`): a label or producedArtifact with a backtick would break its code span. Kept as is: the agent name and argument spans of F-04 have the same limit, and the pipeline model owns label validation. Revisit with the model's label rules.
- T011 (layout): `flow.md` must write the `## Artifacts` heading before `{{flowArtifacts}}`, because the artifact headings are level 3 under it (see the comment on `artifactsText`).
- `source/templates/README.md` (value table, line 14 and the `flowArguments` row): the table does not yet list `flowBody`, and `flowArguments` is still described as one line per argument only (no `No arguments`). SUGGESTION: the plan assigns the value table to T018 (the README was not updated by T001 or T002 either), so it is left for T018.
- `source/packages/core/src/pipeline/generate/values-agent.ts` (`agentBody`) and `values-pipeline.ts` (`pipelineBody`): these use truthiness, so a whitespace-only body is not empty there, while `flowBody` (AC-006) trims and is empty when blank. SUGGESTION: align in T005 (`agentBody`) and with the pipeline layout task (`pipelineBody`); AC-006 is only required for flows here. Resolved for `agentBody` in T005 (a blank body is empty through `bodyText`); `pipelineBody` stays open.
- `source/packages/core/src/pipeline/generate/mermaid.ts` (`processDiagram`, flow names in node labels): a name with a quote, bracket, brace, pipe or hash is written as is, so the diagram would not parse. Resolved in T008 (AC-034): these characters and a hash are written as entity codes, and a line break as a space.
- `source/packages/core/src/pipeline/generate/mermaid.ts` (`processDiagram`, AC-033): a flow with approval off whose own name contains the word `approval` has that word in its label, which AC-033 forbids as written. The label is the flow name, so this needs an owner decision (rename the label, or accept the name). Not changed: the criterion cannot be met for such names without changing the label text, which is not in this task.
- `source/templates/README.md` (value table, T018): the table does not list `agentPurpose` (the Purpose value of T005, the description as plain inline text) and describes `agentDescription` without its quoting. SUGGESTION: the plan assigns the table to T018, so it is left for T018.
- `source/packages/core/src/pipeline/parse/lists.ts` (`readTools`): tool names are read with no non-blank rule, so a blank name reaches the agent line as `""` or `"Read, "`. The quoting reads the joined text back faithfully, so this is an input rule, not a YAML fault. SUGGESTION: refuse a blank tool name in the parser (owned by the pipeline parse task, not T005).
- `source/packages/core/src/pipeline/generate/values-agent.ts` (`artifactSection`, T006): an artifact label with a backtick would break its code span, as for `flowArtifacts` above. Kept as is: the codebase writes ids and labels in code spans without escaping (`values-base.ts`, `values-text.ts`), and the fix belongs with the model's label rules.
- `source/templates/README.md` (line 14 and the value table, `processList`): the README still names `processList`, which T009 renamed to `processFlows`. SUGGESTION: the plan assigns the value table to T018, so it is left for T018.

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
