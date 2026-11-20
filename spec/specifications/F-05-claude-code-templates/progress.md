# Progress — Claude Code templates (F-05)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-19 | 7 stories, 40 criteria, all [auto]; re-specified from the final schema (`pipeline-schema.md`) and approved by the user |
| UX       | ➖ Not needed |  | No user interface (F-02 to F-06) |
| Plan     | ✅ Complete | 2026-11-19 | Approved by the user; 19 tasks (T001 to T019); 40 criteria, all covered |
| Build    | ✅ Complete | 2026-11-20 | 20 of 20 tasks committed (T020 added by Verify) |
| Verify   | ✅ Complete | 2026-11-20 | 40 of 40 criteria covered by passing tests, no gaps; AC-033 amended by the owner's decision (approval-off flows get no suffix; a name may hold the word); manual checklist empty (no [device] criteria) |

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
| T010 | Pipeline command layout (`templates/claude-code/pipeline.md`) and the test loader; values: a separate stop step after each flow with approval on, `No arguments` when there are no arguments, the description and tools YAML-quoted in the frontmatter, a blank body empty; helpers shared in `values-text.ts`. Committed as one commit at the owner's decision (the 400-line guard was waived for this task; see Amendments) | 0 blockers, 2 warnings fixed (tools not quoted when YAML would break; blank pipeline body written as a paragraph), 2 suggestions fixed (stop wording after the last flow; duplicated helpers moved), 1 warning resolved by owner decision (line-break rule, see Deferred Findings) | task check passed: core 1063 of 1063 (46 files), api 6 of 6, web 4 of 4 |
| T011 | Flow command layout (`templates/claude-code/flow.md`): frontmatter with the quoted description (`flowDescriptionYaml`, new) and the rule tags; Purpose, Context, Arguments, Artifacts (level-2 heading before the level-3 artifacts), Steps, Rules and Approval | 0 blockers, 1 warning fixed (flow description not quoted in the frontmatter), 0 suggestions fixed, 1 suggestion deferred (README, T018) | task check passed: core 1082 of 1082 (47 files), api 6 of 6, web 4 of 4 |
| T012 | Agent file layout (`templates/claude-code/agent.md`): frontmatter with the name, the quoted description, model and tools; Purpose, Instructions, Arguments, Reads, Writes and Rule tags; `agentArguments` writes `No arguments` as the flow and pipeline do | 0 blockers, 1 warning fixed (AC-016 test title claimed a duplicate-name check it did not make), 1 caller change applied (`No arguments` for agents), 0 suggestions open | task check passed: core 1097 of 1097 (48 files), api 6 of 6, web 4 of 4 |
| T013 | Rule file layout (`templates/claude-code/rule.md`): `# <title>` and the rule text; rule text through `bodyText`, so a text ending in line breaks or blank lines writes no stray blank line; no rule file for an empty list | 0 blockers, 1 warning fixed (stray blank line from a text ending in line breaks), 0 suggestions, 0 deferred | task check passed: core 1103 of 1103 (49 files), api 6 of 6, web 4 of 4 |
| T014 | Base manifest (`templates/base/manifest.json`, CLAUDE.md only for now) and the generated CLAUDE.md layout (`templates/base/CLAUDE.md`): the command, agent and rule lists from the generator's values; no SDDBuilder name, path or F-XX id; AC-027 proved against the planned files as a set (config order kept) | 0 blockers, 2 warnings fixed (a rule-reading claim the layouts do not make; a test name that claimed an order it did not check), 0 suggestions fixed, 3 suggestions deferred | task check passed: core 1111 of 1111 (50 files), api 6 of 6, web 4 of 4 |
| T015 | process.md layout (`templates/base/process.md`): fixed prose, the flows list (`processFlows`) and the Mermaid fence (`processDiagram`, first line `flowchart`); manifest lists process.md after CLAUDE.md; AC-029 conditions and retry routes and AC-030 fence content proved by tests | 0 blockers, 3 warnings fixed (T014 manifest test checked containment only; AC-029 conditions and retry routes untested; AC-030 did not check the fence holds only the diagram), 0 suggestions, 0 deferred | task check passed: core 1122 of 1122 (51 files), api 6 of 6, web 4 of 4 |
| T016 | Spec template layouts (`templates/base/spec-template/`: stories, plan, progress) with the reply check's required headings in the template's order; manifest entries under `spec/specifications/F-00-template/`; AC-028 tested against the real reply check, with a negative case | 0 blockers, 1 warning fixed (AC-028 test did not run the reply check), 1 suggestion fixed (AC-026 test name), 0 deferred | task check passed: core 1131 of 1131 (52 files), api 6 of 6, web 4 of 4 |
| T017 | Default pipeline output tests (`layouts-default.test.ts`): same plan twice (AC-036), no repository path in any output (AC-037), no `{{`, `#enabled` or `#step:` marker (AC-039). Found and fixed a real AC-037 failure: the `ux` flow body in `default.json` named `spec/design`; reworded to "Draws the screens of the feature from the stories." | 0 blockers, 0 warnings, 0 suggestions fixed, 1 suggestion deferred (the marker list is enumerated) | task check passed: core 1134 of 1134 (53 files), api 6 of 6, web 4 of 4 |
| T020 | Pipeline command order: `pipelineFlows` lists the flows in the order of the `next` links from the first flow (`flowChain`, shared with `processFlows`), and the end-of-process stop goes to the last flow of the chain; tests whose array order differs from the chain (AC-002, AC-003) | 0 blockers, 1 warning fixed (README said pipeline order), 2 suggestions fixed (comment wrap; a test title), 0 deferred; mutation check: six tests fail with array order | task check passed: core 1142 of 1142 (54 files), api 6 of 6, web 4 of 4 |
| T019 | Placeholder and path tests (`layouts-placeholders.test.ts`, `layouts-default.test.ts`): every placeholder of every real layout has a value (AC-038, with a fixture that fails on an unfilled one); the default pipeline renders through every layout and its planned paths equal the README layout table as an exact set (AC-040). Shared helpers moved to `layouts-loader.ts` | 0 blockers, 1 warning fixed (layout list was hard-coded, so a new layout would pass unchecked), 2 suggestions fixed (unused binding; duplicated default-config helper), 0 deferred | task check passed: core 1139 of 1139 (54 files), api 6 of 6, web 4 of 4 |
| T018 | Templates README: value tables matched to the builders and layouts (processFlows, processDiagram, flowDescriptionYaml, pipelineDescriptionYaml, agentPurpose, agentReads and agentWrites as sections, `No arguments`); the Line breaks rules, with the two documented exceptions (agentRuleTags, processDiagram); the Claude Code layout table with the planned paths | 0 blockers, 3 warnings fixed (chained whole-line values; processDiagram missing from the tables; agentReads and agentWrites described wrongly), 3 suggestions fixed, 2 deferred (`flowId` and `ruleId` built but unused; blank lines under an empty description heading) | task check passed: core 1134 of 1134 (53 files), api 6 of 6, web 4 of 4 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- `source/packages/core/src/pipeline/generate/values-flow.ts` (`flowConditions`, `routeLines`): a Condition's true and false routes are written both in its step (`flowSteps`, AC-012) and in its numbered rule (`flowConditions`). Kept on purpose: AC-013 requires the retry rule, and the F-04 AC-016 rule tests assert it. T011 may narrow the rules section to retries when it writes the layout.
- `source/packages/core/src/pipeline/generate/values-flow.ts` (`flowArtifacts`, `artifactText`): a label or producedArtifact with a backtick would break its code span. Kept as is: the agent name and argument spans of F-04 have the same limit, and the pipeline model owns label validation. Revisit with the model's label rules.
- T011 (layout): `flow.md` must write the `## Artifacts` heading before `{{flowArtifacts}}`, because the artifact headings are level 3 under it (see the comment on `artifactsText`).
- `source/templates/README.md` (value table, line 14 and the `flowArguments` row): the table does not yet list `flowBody`, and `flowArguments` is still described as one line per argument only (no `No arguments`). SUGGESTION: the plan assigns the value table to T018 (the README was not updated by T001 or T002 either), so it is left for T018.
- `source/packages/core/src/pipeline/generate/values-agent.ts` (`agentBody`) and `values-pipeline.ts` (`pipelineBody`): these use truthiness, so a whitespace-only body is not empty there, while `flowBody` (AC-006) trims and is empty when blank. SUGGESTION: align in T005 (`agentBody`) and with the pipeline layout task (`pipelineBody`); AC-006 is only required for flows here. Resolved for `agentBody` in T005 (a blank body is empty through `bodyText`) and for `pipelineBody` in T010 (`bodyText`).
- `source/packages/core/src/pipeline/generate/mermaid.ts` (`processDiagram`, flow names in node labels): a name with a quote, bracket, brace, pipe or hash is written as is, so the diagram would not parse. Resolved in T008 (AC-034): these characters and a hash are written as entity codes, and a line break as a space.
- RESOLVED 2026-11-20 by the owner (option a), see the Amendment of that date. `source/packages/core/src/pipeline/generate/mermaid.ts` (`processDiagram`, AC-033): a flow with approval off whose own name contains the word `approval` has that word in its label, which AC-033 forbade as written. The label is the flow name, so this needs an owner decision (rename the label, or accept the name). Not changed: the criterion cannot be met for such names without changing the label text, which is not in this task.
- `source/templates/README.md` (value table, T018): the table does not list `agentPurpose` (the Purpose value of T005, the description as plain inline text) and describes `agentDescription` without its quoting. SUGGESTION: the plan assigns the table to T018, so it is left for T018.
- `source/packages/core/src/pipeline/parse/lists.ts` (`readTools`): tool names are read with no non-blank rule, so a blank name reaches the agent line as `""` or `"Read, "`. The quoting reads the joined text back faithfully, so this is an input rule, not a YAML fault. SUGGESTION: refuse a blank tool name in the parser (owned by the pipeline parse task, not T005).
- `source/packages/core/src/pipeline/generate/values-agent.ts` (`artifactSection`, T006): an artifact label with a backtick would break its code span, as for `flowArtifacts` above. Kept as is: the codebase writes ids and labels in code spans without escaping (`values-base.ts`, `values-text.ts`), and the fix belongs with the model's label rules.
- `source/templates/README.md` (line 14 and the value table, `processList`): the README still names `processList`, which T009 renamed to `processFlows`. SUGGESTION: the plan assigns the value table to T018, so it is left for T018.
- `source/templates/claude-code/pipeline.md` (line 9, `{{pipelineDescription}}` as the Purpose paragraph): WARNING. `templates/README.md` (Line breaks) says an inline value is never alone on a line, and the Purpose paragraph is the description alone. The layout cannot keep it inside a sentence without adding words to the Purpose text (AC-005 gives the text) or renaming the values. Left as is on the caller's direction. Resolved by owner decision (2026-11-19, option a): a description is a paragraph value and may stand alone on its line. T018 states this in the README line-break rule.
- `source/templates/README.md` (value table and Line breaks, T018): stale after T010. `pipelineArguments` writes `No arguments`, `pipelineFlows` writes a stop step after a flow with approval on (no approval sentence on the flow line), `pipelineBody` is blank-checked, and `pipelineDescriptionYaml` (the quoted frontmatter description) is not listed. SUGGESTION: the README is not edited in T010 (T018 owns it, by the caller's direction).
- `source/templates/README.md` (value table, T018): `flowDescriptionYaml` (the quoted flow description for the frontmatter, T011) is not listed, and `flowDescription` is described without its frontmatter quoting. SUGGESTION: the plan assigns the table to T018, so it is left for T018.
- `source/packages/core/src/pipeline/generate/values-base.ts` (header comment): says the items come in the order of the flows' `next` links, but `commandList` and `agentList` follow `config.pipeline.flows` order, which `flowChain` does not change. SUGGESTION: fix the comment in the next F-05 task that touches `values-base.ts`; the order is the one AC-027 accepts (T014 review).
- `source/packages/core/src/pipeline/generate/values-base.ts` (`commandList`, `agentList`, `ruleList`): the lists are built from the config in parallel with `listFiles`, not from the planned file list. The CLAUDE.md test compares them with the plan as sets, so a divergence fails the test; passing the plan in would change the value API committed in T010 to T012. SUGGESTION, kept as is (T014 review).
- `source/packages/core/test/pipeline/layouts-claude-md.test.ts` (agent test, `expected`): the expected line uses the planned `description` as written, while `agentList` writes it through `inlineText`. The fixture and the default descriptions are one line, so the test passes; a description with a line break would fail the test rather than hide a defect. SUGGESTION, apply `inlineText` in the test when such a description is first tested (T014 review).
- `source/packages/core/test/pipeline/layouts-default.test.ts` (`REPOSITORY_MARKERS`, T017): AC-037 checks an enumerated list of this repository's paths, so a repository path not on the list passes. SUGGESTION, kept as is: core cannot read the repository's file list, and `spec/documents/process.md` is a generated path (`base/manifest.json`), so it cannot be a marker.
- `source/packages/core/src/pipeline/generate/values-flow.ts` (`flowId`) and `values-rule.ts` (`ruleId`): both values are built but no layout uses them, so they are dead values. SUGGESTION, not removed (T018 is documentation only): remove them in the next F-05 task that touches the value builders (T018 review).
- `source/templates/claude-code/flow.md` (`{{flowDescription}}`), `pipeline.md` (`{{pipelineDescription}}{{pipelineBody}}`): an empty description leaves two or three blank lines under `## Purpose`. The README states the owner's option a and that such a value is empty when there is no description, so this is the layout's spacing, not a README error. SUGGESTION, not changed: a layout change needs the owner's view on the spacing (T018 review).

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

### Verify run — 2026-11-20 (HEAD `59f997d`, branch `main`, clean tree; re-verify after T020)

**Preconditions:** all 20 tasks ticked, Current Task None, branch `main`, tree clean.

**Check:** `source/scripts/task-check.sh` passed (exit 0). Type check passed. Tests: core 1142 of 1142 (54 files), api 6 of 6 (3 files), web 4 of 4 (2 files). No skipped or focused tests in the test trees.

**Verdict:** all 40 criteria have at least one passing test that names them and proves the criterion (the test body was read). No gaps. AC-033 is an open limit (owner decision, see Deferred Findings), not a test defect. Verify is not marked complete, because the open owner decision on AC-033 is unresolved.

**AC-002 and AC-003:** the tests whose array order differs from the `next` chain are `layouts-pipeline` (AC-002 "lists the flows in the order of the next links when the array lists them out of that order": array build, specify, ux; chain specify, ux, build), `layouts-pipeline` (AC-003 "gives the end-of-process stop to the last flow of the next links": array build, plan; chain plan, build) and `generate-values` (AC-002 "lists the flows in the order of the next links, not the array order": array build, plan). Each expects the chain order, so an implementation that walks `pipeline.flows` in array order fails them: the output would start with `build`, and the stop wording would land on the wrong flow.

**Manual checklist:** empty. No criterion is tagged `[device]`; see `checklist.md`.

Matrix. Test files are under `source/packages/core/test/pipeline/`; the name is shortened. Every named test passed in the run above.

| Criterion | Tag | Covering tests (file: test) | Result |
| --- | --- | --- | --- |
| AC-001 | auto | layouts-pipeline: writes the title, arguments with id, required flag and hint; writes No arguments as a line | pass |
| AC-002 | auto | layouts-pipeline: lists every flow as a numbered step in pipeline order; lists the flows in next-link order when the array differs; generate-values: lists the flows in next-link order, not array order | pass |
| AC-003 | auto | layouts-pipeline: stop step after an approved flow, end-of-process wording for the last flow; end-of-process stop goes to the last flow of the chain, not the array; stop step for each approved flow, none for the others; no stop step with approval off | pass |
| AC-004 | auto | layouts-pipeline: one-flow pipeline gives one flow step and no stop step; one-flow pipeline with approval gives one flow step and one stop step | pass |
| AC-005 | auto | layouts-pipeline: no model or tools line when unset; model line; tools line and none for an empty list; quoted tools when YAML breaks; model and tools together; body under Purpose only when set and not when blank; description quoted in frontmatter, plain under Purpose | pass |
| AC-006 | auto | layouts-flow: title, Purpose and Context with line breaks; quoted description in frontmatter; empty description; blank body; whole command with no stray blank line; generate-values-flow: body line breaks kept, blank body empty | pass |
| AC-007 | auto | generate-values-flow: tags in order, one tag, none when empty; layouts-flow: tags in frontmatter, none when absent | pass |
| AC-008 | auto | generate-values-flow: each argument on its own line; No arguments; layouts-flow: each argument line, No arguments | pass |
| AC-009 | auto | generate-values-flow: each artifact in order with label and template; No artifacts; label alone for empty template; leading blank lines dropped; layouts-flow: artifacts under the Artifacts heading, No artifacts | pass |
| AC-010 | auto | generate-values-flow: Start first and End last, one step per block; End reached early moved last; Condition numbered; route targets by step number; layouts-flow: route as numbered steps | pass |
| AC-011 | auto | generate-values-flow: agent file from the agent name, not the block id; every Agent step has file and description; layouts-flow: agent file and description of an Agent step | pass |
| AC-012 | auto | generate-values-flow: Condition check and true route; false route stops the flow (stop and ask); layouts-flow: check, true route, stop and ask | pass |
| AC-013 | auto | generate-values-flow: return to an earlier Agent as a rule with its round limit; layouts-flow: retry as a numbered rule naming agent and limit; rejects a limit outside 1 to 5 | pass |
| AC-014 | auto | generate-values-flow: producedArtifact on the End step; plain End when empty or blank; layouts-flow: produced artifact named in End | pass |
| AC-015 | auto | layouts-flow: Start and End steps and no rule for a two-block flow | pass |
| AC-016 | auto | layouts-agent: one agent file per Agent block, name once in the path | pass |
| AC-017 | auto | layouts-agent: name and quoted description in frontmatter, plain description under Purpose; generate-values: description quoted, quotes and backslashes escaped, decodes back | pass |
| AC-018 | auto | layouts-agent: model written as given; no model key when unset | pass |
| AC-019 | auto | layouts-agent: tools as one list in block order; quoted when YAML would break; no tools key when none; generate-values: 14 tests of plain and quoted lists, including indicator characters, colon-space, control characters, decode round-trip | pass |
| AC-020 | auto | layouts-agent: Instructions after Purpose; none when missing or blank; generate-values: Instructions heading, line breaks kept, no section when empty, blank or whitespace | pass |
| AC-021 | auto | layouts-agent: Reads and Writes one label per line in order; sections left out when empty or absent; generate-values: Reads and Writes sections, each with its own heading | pass |
| AC-022 | auto | layouts-agent: rule tags as one list, none when absent; generate-values: tags in order, one tag, none | pass |
| AC-023 | auto | layouts-agent: placeholder in body and in description written as typed | pass |
| AC-024 | auto | layouts-rule: each rule to .claude/rules/<id>.md with title heading and text; line breaks kept; heading alone with no text; trailing newline; heading alone for blank text | pass |
| AC-025 | auto | layouts-rule: no file under .claude/rules/ for an empty rules list | pass |
| AC-026 | auto | layouts-claude-md: CLAUDE.md renders from layout and fixture, no placeholder, from the default pipeline; layouts-process: process.md in the manifest after CLAUDE.md, renders from layout; layouts-spec-template: each spec template planned with its layout text | pass |
| AC-027 | auto | layouts-claude-md: lists the command files of the default pipeline, each once; lists each agent with its description; lists each rule with its title; no rule file when none | pass |
| AC-028 | auto | layouts-spec-template: stories.md headings in order; plan.md and progress.md headings; each heading a whole line; layout text accepted by the F-04 reply check; level-3 heading rejected with path and heading | pass |
| AC-029 | auto | layouts-process: each flow once in next-link order; approval sentence matches the flag; description on the line; conditions and retry text; no Conditions part without a Condition; generate-values-base: processFlows in next-link order, array order differs | pass |
| AC-030 | auto | layouts-process: one mermaid fence in the default pipeline; flowchart is the first line and the fence holds only the diagram | pass |
| AC-031 | auto | mermaid-diagram: nodes F1, F2 and so on labelled with flow names; nodes ordered by next links, array order differs | pass |
| AC-032 | auto | mermaid-diagram: one edge per next link; no edge for the last flow or a single flow; no edge label; a flow outside the chain is drawn nowhere | pass |
| AC-033 | auto | mermaid-diagram: approval flow label ends with approval; approval-off flow has no approval word; each node by its own flag | pass with open limit (see below) |
| AC-034 | auto | mermaid-diagram: each of quote, bracket, brace, pipe, hash written as its entity code; hash escaped first; all characters in one name; approval word kept after escaping; line break and CRLF as a space; U+2028 and U+2029 as a space; first line flowchart | pass |
| AC-035 | auto | mermaid-diagram: same text on two calls for a config with special characters and line breaks; same pipeline object twice | pass |
| AC-036 | auto | layouts-default: default pipeline generated twice gives the same file list, paths and text | pass |
| AC-037 | auto | layouts-default: no output file mentions SDDBuilder or a repository path; layouts-spec-template and layouts-claude-md: no SDDBuilder name, path or feature id | pass |
| AC-038 | auto | layouts-placeholders: every placeholder in source/templates has a value; a layout with a missing value fails naming placeholder and path; a real flow layout with one value left out fails | pass |
| AC-039 | auto | layouts-default: no output file has a placeholder, a section marker or a step marker | pass |
| AC-040 | auto | layouts-default: default pipeline renders through every layout, every planned file has text; planned paths equal the rows of the README Claude Code layout table | pass |

Scope check (`spec/documents/features.md`, F-05): the pipeline command (AC-001 to AC-005), one command per flow (AC-006 to AC-015), agent files (AC-016 to AC-023), rule files (AC-024, AC-025), base files (AC-026 to AC-029), `process.md` with the Mermaid diagram (AC-030 to AC-035), and self-contained output (AC-036 to AC-040). Each scope item has at least one criterion.

Gaps: none.

Open limit (not a gap, not a test defect): **AC-033.** A flow with approval off whose own name contains the word `approval` puts that word in its label, which AC-033 forbids as written. The tests cover only names without the word. The owner decision is open (Deferred Findings, `mermaid.ts`, AC-033). Until it is decided, Verify stays pending.

---

## Amendments

### Amendment — 2026-11-19
**Changed**: The earlier F-05 build (tasks T001 to T013, verified 2026-11-17) is replaced. Its layouts were removed by the reset in commit `9c86eb5`, and its task log, deferred findings and test results were cleared here at Plan approval. They remain in git history before commit `bc8f671`.
**Reason**: The pipeline schema changed (decision 38, `spec/documents/pipeline-schema.md`): Approval and Check blocks, connection labels and gates between flows were removed. The earlier stories and plan described that model.
**Impact**: Build restarts from T001 with the 19 tasks of the approved plan.

### Amendment — 2026-11-19 (T010, owner decisions)
**Changed**: (1) T010 is committed as one commit. The staged change is 419 changed lines, over the 400-line guard, and the owner chose not to split it; the guard is waived for this task only. (2) A description is a paragraph value and may stand alone on its line (option a); T018 states this in the README line-break rule.
**Reason**: Owner decisions on the stop points of T010 (the size guard and the line-break warning).
**Impact**: T018 also updates the README value table for `pipelineArguments`, `pipelineFlows` (stop step), `pipelineBody`, and `pipelineDescriptionYaml`. Other tasks are unchanged.

### Amendment — 2026-11-20 (Verify gap: T020)
**Changed**: plan.md adds T020 (pipeline command order). Build is in progress again, 19 of 20. The verify agent corrected the criteria count in checklist.md from 35 to 40 (stale count; no entries changed).
**Reason**: Verify found that AC-002 (flows in the order of the `next` links from the first flow) and the last-flow wording of AC-003 are not met. `pipelineFlows` follows the array order, and a valid pipeline can list its flows out of order. The approved test fixture has matching array and chain order, so it did not show the difference.
**Impact**: T020 runs the build cycle again, then Verify is repeated for AC-002 and AC-003. The open owner question on AC-033 (an approval-off flow whose name contains "approval") is unchanged and still in Deferred Findings.

### Amendment — 2026-11-20 (AC-033, owner decision a)
**Changed**: stories.md AC-033 now forbids only the `approval` suffix on an approval-off flow; a name that holds the word is written as typed. The code already did this, so no value changed. One test added (mermaid-diagram.test.ts, `F-05 AC-033`). Verify is complete.
**Reason**: The owner chose option (a) for the conflict between the criterion and a flow named with the word `approval`.
**Impact**: Build and Verify are complete. Feature F-05 is complete on this amendment.
