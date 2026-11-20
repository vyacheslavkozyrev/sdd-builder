# Progress — Generator core (F-04)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-19 | 6 stories, 36 criteria, all [auto]; re-specified from the final schema (`pipeline-schema.md`) and approved by the user |
| UX       | ➖ Not needed |  | No user interface (F-02 to F-06) |
| Plan     | ✅ Complete | 2026-11-19 | Approved by the user; 13 tasks (T001 to T013); amended 2026-11-19 to 16 tasks (T013 to T015 added, docs task now T016); 40 criteria, all covered |
| Build    | 🔄 In Progress |  | 12 of 16 tasks committed |
| Verify   | ⏳ Pending |  | Not run; criteria AC-001 to AC-040 are all `[auto]` |

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

_The earlier task log of this feature (before the 2026-11-19 reset to the flow model) was removed; its code is no longer in the tree. It remains in git history before commit `3b601aa`._

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `spec/documents/architecture.md` §1 (lines 117–132), §9 (lines 246–254) and the note at line 300 still describe checks as flow properties (`checks`) and gates between flows, which `pipeline-schema.md` §5 removed (checks are conditions inside a flow). Pre-existing and outside T001's scope (§3 steps 2 and 4 only); to be aligned in a docs pass before the parser plan.

- Resolved 2026-11-19 by the owner: base layouts take their lists from the config (`baseValues`, AC-037 and AC-038, T014). `projectName`, `idea` and `stack` stay out of the templates: no `ProjectConfig` field is their value source, and the rows are dropped. `processDiagram` is F-05's (Mermaid, decision 36(a)).

- `source/packages/core/src/pipeline/generate/values-flow.ts` (`flowSteps`, `conditionRule`) and `values-text.ts` (`describeArgument`): an Agent `description`, a Condition `description` and an argument `hint` are `readText` values and may hold a line break (only blank is refused), but they are written raw. A multi-line text breaks the "one numbered line per Agent block", "one numbered rule per Condition" and "one line per argument" lines that `source/templates/README.md` and architecture §3 promise. Fix in code (`inlineText` on those three values) with a test: task T013 of the amended plan (AC-040).

- `source/packages/core/test/pipeline/generate-refuse.test.ts` (AC-021): `analyzeStructure` has no warning-producing rule yet, so a config that really yields a warning cannot be tested end to end. The warning case is tested on the pure filter `blockersOf` instead. Revisit when a warning rule is added to `analyzeStructure`.

- `source/packages/core/test/pipeline/generate-plan.test.ts` (AC-009, the clock test): it spies on `Date.now` only, so a bare `new Date()` in planning would not be caught. No code path reads a clock, and the text check catches any date that reaches the output. A `Date` stub would add more test code than it protects.

- `source/packages/core/src/pipeline/generate/values-flow.ts` (`routeText`, the `places.get` undefined branch): unreachable after `walkFlow`, which lists every route target; kept as the narrowing for `Map.get`, and removing it needs a non-null assertion, which the TypeScript rules avoid.

- `source/packages/core/src/pipeline/generate/file-list.ts:62` (`compareCodePoints` is now exported for `reply-check.ts`): the file is not on T011's file list in `plan.md`. The export is the smallest way to share one comparator, so the code stays. Amend the T011 line in `plan.md` to list `file-list.ts`, or move the comparator to its own module in a later task.

---

## Test Results

Not run yet for this feature's new build (reset 2026-11-19).

---

## Amendments

### Amendment — 2026-11-19 (Build, after T012; the owner's answers)

**Changed**: `stories.md` gains US-007 (AC-037, AC-038: base values from the config), US-008 (AC-039: the pipeline command's model, tools and body, decision 26) and US-009 (AC-040: a line break in a block description does not split a numbered line). Coverage table updated; 40 criteria, all `[auto]`. `plan.md` gains T013 (inline fix, test), T014 (base values), T015 (pipeline values); the docs task moves to T016 and runs last. The T013 docs work of the review round stays in the working tree, unstaged, and is re-done in T016.
**Reason**: the review of the docs task (formerly T013) found that the line breaks in numbered lines were not handled, and the owner decided three things: take the inline fix; F-04 supplies the base values; F-04 takes the pipeline command's model, tools and body.
**Impact**: 16 tasks in Build; Verify covers AC-001 to AC-040. `processDiagram` stays F-05's.
