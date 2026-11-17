# Progress — Pipeline model and the default pipeline (F-02)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-16 | 10 stories, 35 criteria, all `[auto]`; approved by the user. Schema recorded as `architecture.md` §6 decision 33 |
| UX       | ➖ Not needed | 2026-11-16 | No user interface: a model, a parser and a JSON file |
| Plan     | ✅ Complete | 2026-11-16 | Approved by the user before any code is written |
| Build    | 🔄 In Progress | 2026-11-16 | 7 of 13 tasks committed |
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
| T007 | Pipeline and the complete config: `parse/pipeline.ts`; `arguments` required (user decision), empty list valid; placeholder removed, valid config returns typed. Size of about 530 changed lines accepted by the user (guard waived) | 0 blockers; `arguments` changed to required on the user's instruction, with a refusal test | task check passed: core 395, api 6, web 3 |
| T006 | Flows and flow links with gates: flow keys, empty `blocks` and `arguments` accepted, `connectedTo` `{ to, label, gate? }`, gates `approval` and `check` (threshold required for `diff size`, refused for `checks`). Size of about 511 changed lines accepted by the user (guard waived for this task). Helpers `CHECK_TYPES`, `plainText` and `idList` exported from block.ts without behaviour change | 0 blockers, 2 warnings fixed (criteria names moved to AC-007 and AC-016; test for empty flow `arguments` added), 0 suggestions fixed, 1 suggestion deferred | task check passed: core 344, api 6, web 3 |
| T001 | Model types and primitive checks (decision 33 types; value rules of AC-021, AC-024 to AC-026). Built as one commit of about 440 changed lines by the user's decision, size guard waived for this task | 0 blockers, 2 warnings fixed (body cap reads at most 2,000 units; sparse list holes refused), 1 suggestion fixed (shared-rule tests not claimed as criteria) | task check passed: core 85, api 6, web 3 |
| T005 | Agent and Check blocks; the placeholders are gone. Size of about 580 changed lines accepted by the user (guard waived for this task). Agent `description` and `arguments` accept blank text (the schema marks neither non-blank) | 0 blockers, 1 warning fixed (blank agent text accepted), 1 suggestion fixed (block.ts header comment) | task check passed: core 298, api 6, web 3 |
| T004 | Block links `{ to, label }` and routes `{ to, roundLimit? }` or `{ stop: true }`; `connectedTo` optional on Start and Approval | 0 blockers, 1 warning fixed (two refusal tests renamed AC-019 to AC-016), 0 suggestions fixed | task check passed: core 212, api 6, web 3 |
| T003 | Start, Approval and End blocks and the dispatch on `kind`; Agent and Check refused with a placeholder until T005. `producedArtifact` accepts blank text (AC-014 says optional text) | 0 blockers, 1 warning fixed (blank `producedArtifact` accepted), 1 suggestion fixed (AC-021 table extended) | task check passed: core 173, api 6, web 3 |
| T002 | Parser entry `parseProjectConfig` and the root: non-object, unknown keys in written order (`visitKeys`), `schemaVersion` 2, rules with unique ids. The result stays refused until T007 (placeholder problem at `pipeline`) | 0 blockers, 2 warnings fixed (document order by written key order; a misleading test name); 1 suggestion deferred (see Deferred Findings) | task check passed: core 128, api 6, web 3 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T002 (`source/packages/core/src/pipeline/check/primitives.ts`, `visitKeys`): JavaScript lists array-index-like keys (such as `"1"`) before the others, so the written position of such an unknown key is lost after parsing. Only the relative order of unknown keys is affected; known keys keep their order. Not changed.

- T002 `source/packages/core/src/pipeline/check/primitives.ts` `visitKeys`: JavaScript lists array-index-like keys (for example `"1"`) before other keys, so the written position of such unknown keys is lost once the input is parsed. Only the relative order of unknown keys is affected, and a parsed value cannot recover it. Not fixed.

- T003 (`source/packages/core/src/pipeline/parse/block.ts`, `parseBlock`): an `agent` or `check` block is refused with a placeholder problem at `kind`, although the kind is valid (AC-009). Planned: removed in T005, when the Agent and Check parsers exist. Not changed.

- T003 (`source/packages/core/src/pipeline/parse/block.ts`, `parseStart` and `parseApproval`): a `connectedTo` key was reported as unknown until T004. Resolved in T004: allowed on Start and Approval, absent when not written.

- T004 (`source/packages/core/src/pipeline/parse/link.ts`, `parseRoute`): the `if (found.to === undefined) return undefined;` guard is unreachable in practice (a refused `to` has already added a problem), kept only to narrow the type. Not changed: removing it needs a restructure with no behaviour gain.

- T004 (`spec/documents/architecture.md` §6 decision 33, parser rules): a `roundLimit` on a `{ stop: true }` route is refused by the code, which follows from the type (the stop variant has no `roundLimit`), but the parser rules do not say so. Owner to confirm the reading and add it to the rules. Not changed: a decision text is the owner's.

- T006 (`source/packages/core/src/pipeline/parse/flow.ts`, `parseFlow` and `parseGate`): the callback's `const value` shadows the parameter of the same name. It is legal and clear in context; renaming it touches about ten lines with no behaviour gain. Not changed.

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
