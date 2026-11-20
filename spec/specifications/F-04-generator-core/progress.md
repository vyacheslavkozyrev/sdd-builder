# Progress — Generator core (F-04)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-19 | 6 stories, 36 criteria, all [auto]; re-specified from the final schema (`pipeline-schema.md`) and approved by the user |
| UX       | ➖ Not needed |  | No user interface (F-02 to F-06) |
| Plan     | ✅ Complete | 2026-11-19 | Approved by the user; 13 tasks (T001 to T013); amended 2026-11-19 to 16 tasks (T013 to T015 added, docs task now T016); 40 criteria, all covered |
| Build    | ✅ Complete | 2026-11-19 | 16 of 16 tasks committed |
| Verify   | ✅ Complete | 2026-11-19 | 40 of 40 `[auto]` criteria covered by passing tests; task check passed (core 955, api 6, web 4); no gaps, no `[device]` criteria |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Generation model aligned with the flow model in `architecture.md` §3 (steps 2, 3 and 4): walk from Start, approval as a flag, retry routes always carry a round limit | 0 blockers, 1 warning fixed (§3 step 3 gates wording); 1 suggestion deferred | task check passed: api 6 of 6, web 4 of 4, core 783 of 783 |
| T002 | Errors and one-pass rendering: `GenerationError` (`generate/error.ts`); `renderLayout` replaces every `{{...}}` span in one pass, an unknown or malformed span throws naming the placeholder and the path, values are copied as written | 1 blocker fixed (a span with a brace or an unclosed `{{` was left in the output); 1 warning fixed (malformed and empty-value tests added) | task check passed: api 6 of 6, web 4 of 4, core 795 of 795 |
| T003 | Templates input (`generate/templates.ts`); file-safe paths (`generate/paths.ts`); `listFiles` with a discriminated source per file, sorted by code point; an unsafe or duplicate path throws `GenerationError` | 0 blockers, 1 warning fixed (AC-024 collision test added); 2 suggestions fixed (test tag, escaped character) | task check passed: api 6 of 6, web 4 of 4, core 818 of 818 |
| T004 | Refusals from the analysis: `configProblems` is the blocker filter (`blockersOf`) over `analyzeStructure`, in analysis order; no warning returned; flow id `pipeline`, zero flows and the default pipeline checked against the analysis | 0 blockers, 2 warnings fixed (test mock replaced by a pure filter; tautological order test made real); 1 suggestion fixed (rule asserted) | task check passed: api 6 of 6, web 4 of 4, core 830 of 830 |
| T005 | The walk of a flow (`generate/walk.ts`): from the first Start along `next` and routes, `true` before `false`, each block listed once; a missing Start or a link to a missing block throws `GenerationError` | 0 blockers, 2 warnings fixed (order test compared a walk with itself; `{stop}` test did not prove the other branch); 1 suggestion fixed (helper renamed) | task check passed: api 6 of 6, web 4 of 4, core 840 of 840 |
| T006 | Values of a flow command (`generate/values-flow.ts`): `flowId`, `flowName`, `flowDescription`, `flowArguments`, `flowSteps` (Agent blocks only, numbered), `flowConditions` (numbered rules with true and false routes, round limits, `{stop}` text), `flowApproval`; block values carry their own leading line break and are empty when absent | 0 blockers, 2 warnings fixed (blank line when approval is off; argument lines untested); 1 suggestion deferred (unreachable map branch) | task check passed: api 6 of 6, web 4 of 4, core 858 of 858 |
| T007 | Values of the pipeline command, agents and rules (`values-pipeline.ts`, `values-agent.ts`, `values-rule.ts`, shared `values-text.ts`); inline values are flattened to one line | 0 blockers, 1 warning fixed (line breaks in inline values, which break YAML frontmatter); 2 suggestions fixed (empty reads and writes tested; long line wrapped) | task check passed: api 6 of 6, web 4 of 4, core 878 of 878 |
| T008 | The plan (`generate/plan.ts`): `planGeneration` lists the files, renders each layout with its values, carries description and rule tags from flows and Agent blocks only; base layouts render with no values | 0 blockers, 2 warnings fixed (AC-013 plan-level test; interpretations recorded in the plan); 1 suggestion fixed (code-point comparator in the test) | task check passed: api 6 of 6, web 4 of 4, core 889 of 889 |
| T009 | The refusal gate of the plan: `planGeneration` returns `{ ok: false, problems }` with no files and no layout rendered when `configProblems` has a blocker; the T008 fixtures are now valid chained configs | 0 blockers, 1 warning fixed (fixture index values matched no parser output); 1 suggestion fixed (single call); gate and sort proven by mutation | task check passed: api 6 of 6, web 4 of 4, core 893 of 893 |
| T010 | Reply check part 1 (`generate/reply-check.ts`): `checkReply` returns findings for a missing planned path, an unsafe path, a path not in the plan, a non-string value, an empty text and a `{{...}}` placeholder; it never throws on a bad reply; the reply is a `ReadonlyMap<string, unknown>` | 0 blockers, 0 warnings; 2 suggestions fixed (typed test maps; negative placeholder test) | task check passed: api 6 of 6, web 4 of 4, core 911 of 911 |
| T011 | Reply check, part 2: `headingsOf`; required `##` headings as whole lines of Markdown outputs; SDDBuilder self-reference check with a path-end boundary; findings sorted by path then message with the shared `compareCodePoints` (exported from `file-list.ts`, outside the task's listed files) | 0 blockers, 1 warning fixed (self-reference matched longer path names); 0 suggestions | task check passed: api 6 of 6, web 4 of 4, core 928 of 928 |
| T012 | Namespace and purity: `configProblems`, `planGeneration` and `checkReply` exported from `pipeline`, no other generator name; purity scan covers `generate/` and its imports stay inside `src/pipeline` | 0 blockers, 1 warning fixed (a tautological purity assertion; the import scan had no proving fixture) | task check passed: api 6 of 6, web 4 of 4, core 932 of 932 |
| T013 | Line breaks in numbered lines (AC-040): the Agent step line, the Condition rule line, its stop question and the argument lines take their text through `inlineText` | 0 blockers, 0 warnings; 1 suggestion deferred (flow description that is only a line break, in `values-pipeline.ts`) | task check passed: api 6 of 6, web 4 of 4, core 934 of 934 |
| T014 | Base values (`generate/values-base.ts`): `processList`, `commandList`, `agentList`, `ruleList` built in code; `plan.ts` renders base layouts with them; `processDiagram` is not supplied and still throws | 0 blockers; 2 warnings fixed (a self-comparing determinism test; no line-break case for agent lists); 2 suggestions fixed (typed agent collection; long lines wrapped) | task check passed: api 6 of 6, web 4 of 4, core 949 of 949 |
| T015 | The pipeline command's model, tools and body (`values-pipeline.ts`): frontmatter lines and body in the agent form, empty when absent; tool names are inlined (agent tools too, in `values-agent.ts`) | 0 blockers; 2 warnings fixed (a tool name with a line break in the pipeline and in the agent form); 0 suggestions | task check passed: api 6 of 6, web 4 of 4, core 955 of 955 |
| T016 | Record F-04 as built: `architecture.md` §3 (the three functions, `baseValues`, the value builders); `source/templates/README.md` (value names, the line-break convention, F-05's `processDiagram`) | 0 blockers; 1 warning and 1 suggestion fixed (stale Interpretations wording in plan.md; the README's manifest reference); 2 suggestions deferred | task check passed: api 6 of 6, web 4 of 4, core 955 of 955 |

_The earlier task log of this feature (before the 2026-11-19 reset to the flow model) was removed; its code is no longer in the tree. It remains in git history before commit `3b601aa`._

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `spec/documents/architecture.md` §1 (lines 117–132), §9 (lines 246–254) and the note at line 300 still describe checks as flow properties (`checks`) and gates between flows, which `pipeline-schema.md` §5 removed (checks are conditions inside a flow). Pre-existing and outside T001's scope (§3 steps 2 and 4 only); to be aligned in a docs pass before the parser plan.

- Resolved 2026-11-19 by the owner: base layouts take their lists from the config (`baseValues`, AC-037 and AC-038, T014). `projectName`, `idea` and `stack` stay out of the templates: no `ProjectConfig` field is their value source, and the rows are dropped. `processDiagram` is F-05's (Mermaid, decision 36(a)).

- `source/packages/core/src/pipeline/generate/values-flow.ts` (`flowSteps`, `conditionRule`) and `values-text.ts` (`describeArgument`): an Agent `description`, a Condition `description` and an argument `hint` are `readText` values and may hold a line break (only blank is refused), but they are written raw. A multi-line text breaks the "one numbered line per Agent block", "one numbered rule per Condition" and "one line per argument" lines that `source/templates/README.md` and architecture §3 promise. Resolved by task T013 of the amended plan (`inlineText` on those values, AC-040).

- `source/packages/core/test/pipeline/generate-refuse.test.ts` (AC-021): `analyzeStructure` has no warning-producing rule yet, so a config that really yields a warning cannot be tested end to end. The warning case is tested on the pure filter `blockersOf` instead. Revisit when a warning rule is added to `analyzeStructure`.

- `source/packages/core/test/pipeline/generate-plan.test.ts` (AC-009, the clock test): it spies on `Date.now` only, so a bare `new Date()` in planning would not be caught. No code path reads a clock, and the text check catches any date that reaches the output. A `Date` stub would add more test code than it protects.

- `source/packages/core/src/pipeline/generate/values-flow.ts` (`routeText`, the `places.get` undefined branch): unreachable after `walkFlow`, which lists every route target; kept as the narrowing for `Map.get`, and removing it needs a non-null assertion, which the TypeScript rules avoid.

- `source/packages/core/src/pipeline/generate/file-list.ts:62` (`compareCodePoints` is now exported for `reply-check.ts`): the file is not on T011's file list in `plan.md`. The export is the smallest way to share one comparator, so the code stays. Amend the T011 line in `plan.md` to list `file-list.ts`, or move the comparator to its own module in a later task.

- `source/packages/core/src/pipeline/generate/values-pipeline.ts` (`flowLine`, T013 review): the pipeline's flow description is optional and not `nonBlank` (`parse/flow.ts`), so a description of only a line break is truthy, is inlined to '' and gives "1. Flow `id`:  The process ..." (a dangling colon and a double space). The line does not split. Outside T013's file list, so not changed here; fix with a `flow.description` check on the inlined text in a later task.

- `spec/documents/architecture.md` line 218 (decision 36(b), T016 review): the decision names `optionalFrontmatter` and the stack-free base `bodySection`, which the F-04 code does not have (the agent lines are `agentModel` and `agentTools`, the base lists come from `baseValues`). Suggestion, deferred: a recorded decision is amended by the owner (a new dated sentence or decision), not rewritten by the docs task. The owner decides the wording.

- `source/templates/pipeline/default.json` line 28 (T016 review, outside T016's files): the Agent body "Draws the screens under spec/design from the stories." is generated text that names `spec/design`, the folder of SDDBuilder's own design documents. Whether a generated project has that folder is the owner's call (default pipeline, F-05); no SDDBuilder file name is otherwise present in the generated text.

---

## Test Results

### Verify — 2026-11-19 (verify mode, after T016)

Preconditions: 16 of 16 tasks ticked and committed; Current Task None; branch `main`; working tree clean.

Task check (`source/scripts/task-check.sh`): passed, exit 0. Typecheck of all workspaces passed. Tests: api 6 of 6 (3 files), web 4 of 4 (2 files), core 955 of 955 (44 files). No skipped, todo or only tests. A verbose run lists 172 test lines tagged F-04, all passed.

Result: 40 of 40 criteria `[auto]` covered by passing tests. Gaps: none. `[device]` criteria: none, so no manual checklist is needed. Scope in `features.md` (F-04: the pure file tree, deterministic paths and order, the reply check, the refusals) is covered by AC-001 to AC-006, AC-007 to AC-010, AC-025 to AC-033 and AC-019 to AC-024.

Criterion matrix (test files in `source/packages/core/test/pipeline/`, line numbers of the `F-04 AC-0xx` title):

| Criterion | Covering tests (file:line) | Result |
| --- | --- | --- |
| AC-001 | generate-file-list:63, :204 | pass |
| AC-002 | generate-file-list:75, :89 | pass |
| AC-003 | generate-file-list:95; generate-values:122, :160 | pass |
| AC-004 | generate-file-list:106, :117; generate-values:223 | pass |
| AC-005 | generate-plan:89 | pass |
| AC-006 | generate-file-list:121, :139, :198 | pass |
| AC-007 | generate-file-list:143, :153, :162; generate-plan:110 | pass |
| AC-008 | generate-plan:130 | pass |
| AC-009 | generate-plan:137 | pass |
| AC-010 | generate-plan:164 | pass |
| AC-011 | generate-plan:178 | pass |
| AC-012 | generate-render:8, :14, :47; generate-values-flow:39 | pass |
| AC-013 | generate-render:18, :35, :51; generate-plan:219 | pass |
| AC-014 | generate-render:56, :62, :68 | pass |
| AC-015 | generate-walk:42, :102; generate-values-flow:75, :115, :222 | pass |
| AC-016 | generate-values-flow:115 (describe title `F-04 AC-015 AC-016`) | pass |
| AC-017 | generate-values:46 | pass |
| AC-018 | generate-values-flow:200 | pass |
| AC-019 | generate-refuse:22 | pass |
| AC-020 | generate-plan-refuse:32 | pass |
| AC-021 | generate-refuse:38 | pass |
| AC-022 | generate-refuse:61 | pass |
| AC-023 | generate-refuse:79 | pass |
| AC-024 | generate-file-list:175, :181, :189 | pass |
| AC-025 | generate-reply-check:21, :112; generate-reply-check-text:22 | pass |
| AC-026 | generate-reply-check:25, :105 | pass |
| AC-027 | generate-reply-check:32, :37 | pass |
| AC-028 | generate-reply-check:50 | pass |
| AC-029 | generate-reply-check:55, :63, :71, :97 | pass |
| AC-030 | generate-reply-check-text:31, :40, :52, :61, :70, :75 | pass |
| AC-031 | generate-reply-check-text:81, :93, :111 | pass |
| AC-032 | generate-reply-check:81, :92 | pass |
| AC-033 | generate-reply-check-text:120, :136 | pass |
| AC-034 | namespace:105 | pass |
| AC-035 | purity:101, :140, :147, :154 | pass |
| AC-036 | generate-plan:268 | pass |
| AC-037 | generate-values-base:48, :63, :72, :100, :114 | pass |
| AC-038 | generate-plan:235; generate-values-base:130 | pass |
| AC-039 | generate-values:102, :112, :116, :126, :134 | pass |
| AC-040 | generate-values-flow:229 | pass |

Note: AC-016 is tagged only on a `describe` title, not on an `it` name. The rule asks for the tag in the test's name; a later pass should put `F-04 AC-016` on the `it` that checks the numbered rules and the round limit.

---

## Amendments

### Amendment — 2026-11-19 (Build, after T012; the owner's answers)

**Changed**: `stories.md` gains US-007 (AC-037, AC-038: base values from the config), US-008 (AC-039: the pipeline command's model, tools and body, decision 26) and US-009 (AC-040: a line break in a block description does not split a numbered line). Coverage table updated; 40 criteria, all `[auto]`. `plan.md` gains T013 (inline fix, test), T014 (base values), T015 (pipeline values); the docs task moves to T016 and runs last. The T013 docs work of the review round stays in the working tree, unstaged, and is re-done in T016.
**Reason**: the review of the docs task (formerly T013) found that the line breaks in numbered lines were not handled, and the owner decided three things: take the inline fix; F-04 supplies the base values; F-04 takes the pipeline command's model, tools and body.
**Impact**: 16 tasks in Build; Verify covers AC-001 to AC-040. `processDiagram` stays F-05's.
