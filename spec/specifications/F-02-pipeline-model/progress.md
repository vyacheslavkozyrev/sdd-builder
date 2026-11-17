# Progress — Pipeline model and the default pipeline (F-02)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-16 | 10 stories, 35 criteria, all `[auto]`; approved by the user. Schema recorded as `architecture.md` §6 decision 33 |
| UX       | ➖ Not needed | 2026-11-16 | No user interface: a model, a parser and a JSON file |
| Plan     | ✅ Complete | 2026-11-16 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-16 | 3 of 13 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Model types and primitive checks (decision 33 types; value rules of AC-021, AC-024 to AC-026). Built as one commit of about 440 changed lines by the user's decision, size guard waived for this task | 0 blockers, 2 warnings fixed (body cap reads at most 2,000 units; sparse list holes refused), 1 suggestion fixed (shared-rule tests not claimed as criteria) | task check passed: core 85, api 6, web 3 |
| T003 | Start, Approval and End blocks and the dispatch on `kind`; Agent and Check refused with a placeholder until T005. `producedArtifact` accepts blank text (AC-014 says optional text) | 0 blockers, 1 warning fixed (blank `producedArtifact` accepted), 1 suggestion fixed (AC-021 table extended) | task check passed: core 173, api 6, web 3 |
| T002 | Parser entry `parseProjectConfig` and the root: non-object, unknown keys in written order (`visitKeys`), `schemaVersion` 2, rules with unique ids. The result stays refused until T007 (placeholder problem at `pipeline`) | 0 blockers, 2 warnings fixed (document order by written key order; a misleading test name); 1 suggestion deferred (see Deferred Findings) | task check passed: core 128, api 6, web 3 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T002 (`source/packages/core/src/pipeline/check/primitives.ts`, `visitKeys`): JavaScript lists array-index-like keys (such as `"1"`) before the others, so the written position of such an unknown key is lost after parsing. Only the relative order of unknown keys is affected; known keys keep their order. Not changed.

- T002 `source/packages/core/src/pipeline/check/primitives.ts` `visitKeys`: JavaScript lists array-index-like keys (for example `"1"`) before other keys, so the written position of such unknown keys is lost once the input is parsed. Only the relative order of unknown keys is affected, and a parsed value cannot recover it. Not fixed.

- T003 (`source/packages/core/src/pipeline/parse/block.ts`, `parseBlock`): an `agent` or `check` block is refused with a placeholder problem at `kind`, although the kind is valid (AC-009). Planned: removed in T005, when the Agent and Check parsers exist. Not changed.

- T003 (`source/packages/core/src/pipeline/parse/block.ts`, `parseStart` and `parseApproval`): a `connectedTo` key is reported as an unknown key until T004. Planned: allowed in T004. Not changed.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
