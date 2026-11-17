# Progress — Claude Code templates (F-05)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-17 | 7 stories, 35 criteria, all `[auto]`; approved by the user. Mermaid diagram in `process.md` included (features.md scope); AC-008 keeps Start and End as steps, as F-04 renders them; AC-010, AC-021, AC-023 and AC-028 amended 2026-11-17: Start and End kept as steps; no project name, idea or stack in F-05 (F-09, F-21 add them); a pipeline gate has no fail route in the model |
| UX       | ➖ Not needed | 2026-11-17 | No user interface: templates and a pure generator in `source/packages/core` (the stories have no user-facing criterion) |
| Plan     | ✅ Complete | 2026-11-17 | 13 tasks, all 35 criteria covered; approved by the user |
| Build    | ✅ Complete | 2026-11-17 | 13 of 13 tasks committed |
| Verify   | ✅ Complete | 2026-11-17 | 35 of 35 criteria covered by passing tests; no `[device]` criteria, so the checklist has no entries (`checklist.md`) |

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
| T011 | Process text layout (process.md) with the Mermaid diagram fence; manifest lists it second; README placeholder rows | 0 blockers, 4 warnings and 1 suggestion fixed | task check passed: core 887 of 887 (48 files), api 6 of 6, web 3 of 3 |
| T012 | Self-containment and determinism tests over the real layouts (tests only); AC-033 checks the layout files on disk | 0 blockers, 1 warning fixed, 1 suggestion deferred | task check passed: core 904 of 904 (49 files), api 6 of 6, web 3 of 3 |
| T013 | Templates README matched to the finished layouts (status, placeholders, layout tables, values sources, branch and gate text) | 0 blockers, 2 warnings and 1 suggestion fixed | task check passed: core 904 of 904 (49 files), api 6 of 6, web 3 of 3 |

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

- T012 SUGGESTION `source/packages/core/test/pipeline/layouts-default.test.ts` (`EXPECTED_PATHS`): the 21 paths are a fixed list checked against the default pipeline, not read from the README layout table. Reading a Markdown table back would couple the test to the README's wording; the list is kept, and it changes only with a change to the default pipeline or the base manifest.
- T011 SUGGESTION `source/templates/README.md` rows for `{{processList}}`, `{{commandList}}` and `{{agentList}}`: still say "enabled" blocks and flows, a concept the generator no longer has. Predates T011 (the README is not changed by T011 beyond the diagram rows); T013 owns the README sweep.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

Verify run 2026-11-17 on `main`, clean tree. `source/scripts/task-check.sh`: typecheck passed; tests passed in full: core 904 of 904 (49 files), api 6 of 6, web 3 of 3. F-05 filter in core: 150 passed, 0 failed (the other 754 skipped by the filter). Manual checklist: none (`checklist.md` has no entries; all 35 criteria are `[auto]`).

Matrix (criterion → test file, test name). Names are shortened; the full name starts with `F-05 AC-###`.

| Criterion | Covering tests (file: name) | Result |
| --- | --- | --- |
| AC-001 | `layouts-command.test.ts`: plans pipeline command at `.claude/commands/pipeline.md`; writes each argument with id and required flag; optional argument has optional flag and no hint | pass |
| AC-002 | `layouts-command.test.ts`: lists each flow, its approval gate, then its check gate, in pipeline order | pass |
| AC-003 | `layouts-command.test.ts`: writes "no limit set" for a back route with no round limit; writes the round limit number when set | pass |
| AC-004 | `layouts-command.test.ts`: two rules for the build flow, not one per check outcome; no rule for a forward or stop route | pass |
| AC-005 | `layouts-command.test.ts`: plans one flow step and no gate step for a one-flow pipeline | pass |
| AC-006 | `layouts-command.test.ts`: one command file per flow at `.claude/commands/<flow-id>.md`; title and Purpose; rule tags comma-separated | pass |
| AC-007 | `layouts-command.test.ts`: writes "none" as the rule tags of a flow that has none | pass |
| AC-008 | `layouts-command.test.ts`: one step per block of the build flow, Start first and End last | pass |
| AC-009 | `layouts-command.test.ts`: each back route of the build checks under Rules, numbered | pass |
| AC-010 | `layouts-command.test.ts`: two steps and no rule for a Start-and-End flow; plans it with no error | pass |
| AC-011 | `layouts-agent-rule.test.ts`: one agent file per Agent block of the default pipeline; block in a second flow planned with its name | pass |
| AC-012 | `layouts-agent-rule.test.ts`: description as quoted YAML string; frontmatter name then description; title as name, description under Purpose | pass |
| AC-013 | `values-agent.test.ts`: a model set writes the model line; `layouts-agent-rule.test.ts`: no model key for a block with no model | pass |
| AC-014 | `layouts-agent-rule.test.ts`: no tools key without tools; tools as one comma-separated line in block order; quoted when YAML would break; no key for empty list | pass |
| AC-015 | `layouts-agent-rule.test.ts`: no Instructions section for no body or whitespace-only body; body under Instructions heading | pass |
| AC-016 | `layouts-agent-rule.test.ts`: `none` for no rule tags; rule tags comma-separated in order | pass |
| AC-017 | `values-agent.test.ts`: a body with a placeholder kept as typed through the renderer; a placeholder naming a known value not filled twice | pass |
| AC-018 | `layouts-agent-rule.test.ts`: title as heading and text as body; one file per rule entry at its id path | pass |
| AC-019 | `layouts-agent-rule.test.ts`: blank lines and list lines of the rule text kept as given | pass |
| AC-020 | `layouts-agent-rule.test.ts`: no file under `.claude/rules/` for a config with no rules | pass |
| AC-021 | `layouts-claude-md.test.ts`, `layouts-process.test.ts`, `layouts-spec-plan.test.ts`, `layouts-spec-stories.test.ts`: manifest maps CLAUDE.md, process.md and the three F-00-template files; rendered from layouts | pass |
| AC-022 | `layouts-claude-md.test.ts`: lists exactly the planned command, agent and rule files (commands, agents, rules, flow order) | pass |
| AC-023 | `layouts-claude-md.test.ts`: default config with no error and no empty line for a project name; no repository path, SDDBuilder name or F-XX id in CLAUDE.md | pass |
| AC-024 | `layouts-spec-stories.test.ts`, `layouts-spec-plan.test.ts`: exact level-2 headings of stories.md and plan.md/progress.md; tag rules; no repository names | pass |
| AC-025 | `layouts-process.test.ts`: each flow once in pipeline order; each flow step under its flow, gate after them | pass |
| AC-026 | `layouts-process.test.ts`: one mermaid fence; first line `flowchart`; `mermaid-flows.test.ts`: first line `flowchart TD`; `mermaid-gates.test.ts`: processDiagram in base values | pass |
| AC-027 | `mermaid-flows.test.ts`: one node per flow in order; node ids F1, F2; plain edge to next flow with no FlowLink; edge to the FlowLink target; loop edge back; last flow gets no edge; refuses a FlowLink to an unknown flow | pass |
| AC-028 | `mermaid-gates.test.ts`: approval and check gates as decision nodes with edge labelled `pass`; empty label unlabelled; gate back to earlier flow; no fail edge | pass |
| AC-029 | `mermaid-flows.test.ts`, `mermaid-gates.test.ts`: quote, bracket, brace, pipe and hash escaped to entity codes; line break as space; empty name and label | pass |
| AC-030 | `mermaid-gates.test.ts`: same configuration gives the same diagram text, parsed twice and on two calls | pass |
| AC-031 | `layouts-default.test.ts`: default config planned twice gives the same file list, the same paths and the same text and plan | pass |
| AC-032 | `layouts-default.test.ts`: no repository name in any output file or path; `layouts-process.test.ts`: raw layout and rendered text free of repository names | pass |
| AC-033 | `layouts-default.test.ts`: reads every layout under `source/templates/`; every placeholder has a value; fixture with an unfilled placeholder fails | pass |
| AC-034 | `layouts-default.test.ts`: no `{{`, no `#enabled` marker and no `#step:` marker in any output file | pass |
| AC-035 | `layouts-default.test.ts`: renders through every layout with no error; plans exactly the 21 expected paths; no file under `.claude/rules/` | pass |

Gaps: none. Every criterion has at least one passing test named with its `F-05 AC-###`.

Notes for the caller (not gaps under the criteria as written):
- AC-035 says the output files are one per row of the README's Claude Code layout table. The test checks the default pipeline's 21 paths against a fixed list in `layouts-default.test.ts` (`EXPECTED_PATHS`); it does not read the README. The list matches the eight README rows by hand check. A README change that the list does not follow would pass the tests.
- `mermaid.ts` (`LABEL_REPLACEMENTS`) does not escape `<`, `>` or `&`, a deferred T002 suggestion. AC-029 does not name them, so it is not a gap; the rendered Mermaid output was not checked here.

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
