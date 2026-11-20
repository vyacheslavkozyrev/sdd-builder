# Progress — Generator core (F-04)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-19 | 6 stories, 36 criteria, all [auto]; re-specified from the final schema (`pipeline-schema.md`) and approved by the user |
| UX       | ➖ Not needed |  | No user interface (F-02 to F-06) |
| Plan     | ✅ Complete | 2026-11-19 | Approved by the user; 13 tasks (T001 to T013); all 36 criteria covered |
| Build    | 🔄 In Progress |  | 5 of 13 tasks committed |
| Verify   | ⏳ Pending |  | Not run; criteria AC-001 to AC-036 are all `[auto]` |

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

_The earlier task log of this feature (before the 2026-11-19 reset to the flow model) was removed; its code is no longer in the tree. It remains in git history before commit `3b601aa`._

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `source/templates/README.md` still says "enabled" in the command, agent and rule rows (lines 59–61 and 75–77). Decision 34 removed the enabled property, so the wording is stale. To be fixed with the template placeholder work (F-05) or in T013 of this feature, whichever comes first.

- `spec/documents/architecture.md` §1 (lines 117–132), §9 (lines 246–254) and the note at line 300 still describe checks as flow properties (`checks`) and gates between flows, which `pipeline-schema.md` §5 removed (checks are conditions inside a flow). Pre-existing and outside T001's scope (§3 steps 2 and 4 only); to be aligned in a docs pass before the parser plan.

- Open decision for the user: no `ProjectConfig` field carries `projectName`, `idea` or `stack` as a template value source (`Pipeline` has `name` only), while `source/templates/README.md` lines 17–20 still promise these values for base layouts. The T003 templates input and the base layouts (F-05) need a decision: give the base layouts a value source (for example `Pipeline.name`, or a new config field), or drop the rows. Not decided here; it is a model and template decision.

- `source/packages/core/test/pipeline/generate-refuse.test.ts` (AC-021): `analyzeStructure` has no warning-producing rule yet, so a config that really yields a warning cannot be tested end to end. The warning case is tested on the pure filter `blockersOf` instead. Revisit when a warning rule is added to `analyzeStructure`.

---

## Test Results

Not run yet for this feature's new build (reset 2026-11-19).

---

## Amendments

None.
