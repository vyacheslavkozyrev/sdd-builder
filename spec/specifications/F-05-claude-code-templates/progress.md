# Progress — Claude Code templates (F-05)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-17 | 7 stories, 35 criteria, all `[auto]`; approved by the user. Mermaid diagram in `process.md` included (features.md scope); AC-008 keeps Start and End as steps, as F-04 renders them; AC-010, AC-021, AC-023 and AC-028 amended 2026-11-17: Start and End kept as steps; no project name, idea or stack in F-05 (F-09, F-21 add them); a pipeline gate has no fail route in the model |
| UX       | ➖ Not needed | 2026-11-17 | No user interface: templates and a pure generator in `source/packages/core` (the stories have no user-facing criterion) |
| Plan     | ✅ Complete | 2026-11-17 | 13 tasks, all 35 criteria covered; approved by the user |
| Build    | 🔄 In Progress | 2026-11-17 | 10 of 13 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Decision 36 recorded; §3 step 3 and §10 use 3 name F-05 for the Mermaid view; decision 19 note corrected | 0 blockers, 1 warning fixed, 2 suggestions deferred | task check passed: core 739 of 739 (37 files), api 6 of 6, web 3 of 3 |
| T002 | Mermaid flowchart of the flows: nodes F1…, each edge to the flow its FlowLink names; plain edge to the next flow with no FlowLink; entity escaping and line breaks; unknown target throws | 0 blockers, 2 warnings and 1 suggestion fixed, 1 suggestion deferred | task check passed: core 757 of 757 (38 files), api 6 of 6, web 3 of 3 |
| T003 | Mermaid gate nodes G<n> with pass edge and no fail edge; processDiagram in baseValues | 0 blockers, 1 warning and 2 suggestions fixed | task check passed: core 766 of 766 (39 files), api 6 of 6, web 3 of 3 |
| T004 | Agent values: optionalFrontmatter (model and tools lines) and bodySection (Instructions when a body is set) | 0 blockers, 0 warnings, 2 suggestions fixed | task check passed: core 784 of 784 (40 files), api 6 of 6, web 3 of 3 |
| T005 | headingsOf (## lines); test loader of the layouts from source/templates (test code only); fixtures for its paths and errors | 0 blockers, 1 warning fixed (loader error paths tested), 0 suggestions fixed, 1 suggestion deferred | task check passed: core 799 of 799 (42 files), api 6 of 6, web 3 of 3 |
| T006 | Pipeline and flow command layouts (pipeline-command.md, command.md); layout tests on the real command files | 0 blockers, 0 warnings, 5 suggestions fixed, 1 suggestion deferred | task check passed: core 816 of 816 (43 files), api 6 of 6, web 3 of 3 |
| T007 | Agent and rule layouts; agent frontmatter values YAML-safe (frontmatterDescription); rule title on one line; blank line moved into bodySection | 1 blocker, 2 warnings and 2 suggestions fixed | task check passed: core 848 of 848 (44 files), api 6 of 6, web 3 of 3 |
| T008 | Base manifest (stories entry only); generic spec-template stories.md; T007 amendment wording corrected | 0 blockers, 2 warnings and 3 suggestions fixed | task check passed: core 853 of 853 (45 files), api 6 of 6, web 3 of 3 |
| T009 | Spec template plan.md and progress.md (generic); manifest lists the three spec-template entries in order | 0 blockers, 0 warnings, 1 suggestion fixed, 1 suggestion deferred | task check passed: core 861 of 861 (46 files), api 6 of 6, web 3 of 3 |
| T010 | Generated project's CLAUDE.md layout (process, commands, agents, rules lists); manifest lists it first | 0 blockers, 5 warnings and 2 suggestions fixed | task check passed: core 876 of 876 (47 files), api 6 of 6, web 3 of 3 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 `spec/documents/architecture.md:32` and `:97`: name F-18 for presentation mode and process diagrams; `features.md` places presentation mode at F-23. Not the Mermaid view, so outside T001; a numbering sweep of §2 and §5 is for a docs task.
- T001 `source/templates/README.md:21`, `:37`, `:73`: the status says the renderer reads `#enabled:<id>` sections (`render.ts` does not), and two rows name F-18 for the Mermaid view. Already in T013's scope (plan line for T013); fixed there.
- T002 WARNING `source/packages/core/src/pipeline/generate/mermaid.ts` `processDiagram` (edge loop): the edge ignores `connectedTo.to`, so a flow whose Connection names a flow other than the next one is drawn as an edge to the next flow with its label. The model allows it (`analyze/reach.ts` follows `to`; `analyze/references.ts` checks only that `to` exists). AC-027 and the T002 plan line say consecutive edges. Resolved 2026-11-17 by the owner: draw each edge to `connectedTo.to`; AC-027 and the T002 plan line amended to match.

- T002 SUGGESTION `source/packages/core/src/pipeline/generate/mermaid.ts:13` (`LABEL_REPLACEMENTS`): `<`, `>` and `&` are not escaped, so Mermaid renders an HTML tag such as `<br>` in a flow name as markup. AC-029 names only the quote, bracket and pipe characters, and the Mermaid entity name for these is not verified here; check in Verify against the rendered diagram.

- T005 SUGGESTION `source/packages/core/src/pipeline/generate/templates.ts:headingsOf`: a `## ` line inside a fenced code block counts as a heading. The plan defines `headingsOf` as every line that starts with `## `, so it is kept; the layout tests of T006 to T012 must not put a `## ` line inside a fence in a template, or a fence-aware reader is needed (a plan change).

- T009 SUGGESTION `source/packages/core/src/pipeline/generate/templates.ts:headingsOf`: still not fence-aware; the T009 spec-template files hold no `## ` line inside the Amendments fence (checked), so the heading count is correct. Making the reader fence-aware is core source outside T009's scope.

- T006 SUGGESTION `source/packages/core/test/pipeline/layouts-command.test.ts` AC-002 and `source/templates/claude-code/pipeline-command.md`: the gate steps read `Approval: Approval on the stories` and `Approval: Approval: the manual checklist results`, because the default gate descriptions in `source/templates/pipeline/default.json` already start with "Approval" and `pipelineSteps` in `values-command.ts` adds the prefix. Wording of the default data is a product decision and `default-data.test.ts:65` pins the text; the test pins the current output until that decision is made.

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
