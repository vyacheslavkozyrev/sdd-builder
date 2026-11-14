# Progress — Domain model: pipeline, flows, blocks and the default pipeline (F-01)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-14 | Stories approved by the user as written; 26 criteria, all `[auto]`. Decisions: scope is types, default pipeline and parsing; ids user-given and file-safe; default pipeline in `templates/pipeline/default.json`, imported at build time; one pipeline per project; schemaVersion 2 |
| UX       | ➖ Not needed |      | No user interface in F-01 |
| Plan     | ✅ Complete | 2026-11-14 | Approved by the user before any code is written; 9 tasks; transition: the new model lives in `packages/core/src/pipeline/` beside the flat model until F-02 to F-07 are rebuilt |
| Build    | 🔄 In Progress | 2026-11-14 | 3 of 9 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None.

_None. While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Decisions recorded in architecture §5 and §6 (schemaVersion 2, default pipeline at build time, ids, transition) | reviewed: 0 blockers, 2 warnings fixed (id rule and transition wording) | docs only; task check passed |
| T002 | Build-time JSON import for core: resolveJsonModule, rootDir at repo root, placeholder `templates/pipeline/default.json`, smoke test | reviewed: 0 blockers, 0 warnings (1 suggestion deferred: rootDir has no effect while core does not emit) | task check passed (exit 0), core 530 tests |
| T003 | Pipeline model types in `packages/core/src/pipeline/model.ts`: ProjectConfig v2, pipeline, flows (blocks only), block kinds, conditions with fixed check types, routes; pipeline gates link to their connection | reviewed: 0 blockers, 2 warnings fixed (gate link; AC-002 tag), 3 suggestions deferred | task check passed (exit 0), core 544 tests |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 `stories.md:22` (suggestion, not applied): the line "The flat model is removed, with no compatibility layer" can be read as F-01 removing it, while `architecture.md` §6 decision 19 and plan.md's transition note keep it until its consumers are rebuilt. The approved stories text is not edited here; the owner should confirm which reading holds.

- T002 `packages/core/tsconfig.json:4` (suggestion, not applied): `rootDir` is now the repository root (`../..`), so any future emit from `packages/core` (declarations included) nests output under the root-relative path. No emit exists in F-01 (`typecheck` is `--noEmit`), and `apps/api` and `apps/web` typecheck clean against it. Revisit when a core build step is added.

- T003 `packages/core/src/pipeline/model.ts` (suggestion, not applied): `ProjectStack` duplicates the flat `TechStack` by design, so the new model does not import the file that is removed later (architecture §6 decision 19). Reconcile the two when the flat model is removed.

- T003 `packages/core/src/pipeline/model.ts` `AgentBlock`, `Flow` (suggestion, not applied): building-blocks §3 lists `description` and rule-set tags for Agent blocks and flows, and §7 requires an Agent description. No F-01 criterion or plan line asks for them, so they are left out. Add them with the feature that needs them; the T004 parser refuses unknown keys, so that change must update the parser at the same time.

- T003 `packages/core/test/pipeline-types.test.ts` (suggestion, not applied): the refusal tests end in `toBeDefined()`, which cannot fail on its own. The refusal is enforced by `tsc`: an unused `@ts-expect-error` fails `npm run typecheck`. The header comment says so. Left as is.


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
