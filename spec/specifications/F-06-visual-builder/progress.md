# Progress — Visual builder: the Map tab, flow tabs, gates and checks, custom agents (F-06)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-15 | Stories approved by the user as written; 45 criteria (43 `[auto]`, 2 `[device]` — AC-005, AC-045). Decisions: Map offers Approval and Check only (Check = `checks` or `diff-size`; review is an Agent block); live structural marks use the core rules. Open for Plan: who builds the core rule module, F-06 or F-04; `features.md` still lists F-01 only as the dependency |
| UX       | ✅ Complete | 2026-11-15 | Approved by the user. 11 screens. Decisions from approval: one gate per connection (Add buttons disabled when the arrow has one); custom-agent edits apply as made (no Save button). Open for Plan: visual points V1 (marks red or amber), V2 (10 px hint text), V3 (toolbox shift on the Start refusal); Start/End panels not drawn; refused states for a repeated flow id, rule tag and agent name not drawn |
| Plan     | ✅ Complete | 2026-11-15 | Approved by the user before any code is written; 22 tasks. Prerequisite: T020 and T021 wait for F-05 T001 to T015 committed; review is removed as a check type (T002, T003) |
| Build    | 🔄 In Progress | 2026-11-15 | 16 of 22 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None.

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Decision records: `review` removed as a check type (building-blocks, features F-15 note); architecture §5 row, §6 decision 24, §9 checks row; features F-06 depends on F-01, F-04 | reviewed: 0 blockers, 0 warnings, 2 suggestions fixed; 1 deferred (idea.md and market-research.md still list review) | task check passed (exit 0), 1258 tests |
| T002 | Remove `review` from the check types: model, parser and generator list; the default's build review gate becomes `checks` so the default still parses (its description is T003) | reviewed: 0 blockers, 0 warnings, 1 suggestion fixed; 2 deferred (flat `FIXED_GATES` in catalog test, removed in T021; default description in T003) | task check passed (exit 0), 1257 tests |
| T003 | Condition description in core: required, non-blank on every Condition (parser and generator refuse a blank one); the pipeline command's check rule text carries it; default's build review gate is `checks` with its description (amendment 1) | reviewed: 0 blockers, 1 warning fixed (generator refuses a blank Condition description), 2 suggestions fixed; 1 deferred (line breaks in the description) | task check passed (exit 0), 1273 tests |
| T004 | Builder state and host contract: `builder/state.ts` starts from the default pipeline (or the host's initial config), reports each change through `onChange`; the default is exported from core; a scan test finds no network or storage call in the builder folder | reviewed: 0 blockers, 1 warning fixed (shared default object cloned), 1 suggestion fixed (scan covers subfolders) | task check passed (exit 0), 1273 core, 357 web, 480 api tests |
| T005 | Flows on the Map: add a flow after the last one with a unique id, one Start, one End and a default name; refuse an unsafe or repeated flow id and keep the old one; rename a flow (blank refused); core exports `isValidId` for the builder | reviewed: 0 blockers, 0 warnings, 0 suggestions | task check passed (exit 0), 1273 tests |
| T006 | Flows on the Map: switch a flow off and on (`enabled`, properties kept); delete a flow with its connections and gates (confirmation question), routes to it left unwired and marked by the analysis; the pipeline Start refusal | reviewed: 0 blockers, 1 warning fixed (dangling-route test asserted only "some blocker"; now asserts the exact finding), 1 suggestion fixed (Start guard simplified); 1 deferred (AC-035 wording "naming the flow") | task check passed (exit 0), 1273 tests |
| T007 | Connections and gates: a connection needs a non-blank artifact label; a gate by drop or button (approval human, or checks and diff-size agent) with the amendment 2 defaults; one gate per connection; `gateTargetAt` hit test | reviewed: 0 blockers, 1 warning fixed (file-safe id asserted), 0 suggestions; 2 deferred (`gateTargetAt` has no caller until T016; shared `pipelineIds` import) | task check passed (exit 0), 1273 core, 437 web tests |
| T008 | Gate settings: diff-size threshold, route options (stop, the source flow, earlier flows), optional round limit (kept only for a back route), required description, unbounded-retry warning. Code went into commit 6276381 by mistake (with amendment 3; not amended) | reviewed: 1 blocker fixed (source flow offered, as amendment 3 approves), 0 warnings, 0 suggestions applied; 2 deferred (description line breaks; a second unbounded-retry rule in the analyzer) | task check passed (exit 0), 1273 core, 480 api, 470 web tests |
| T009 | Blocks in a flow: add after the selection (Start once, End last), move up or down (refused if it breaks a back route), connection inside the flow only, Condition routes (back to an earlier block, optional limit). One commit by the owner's approval; the 400-line guard was waived for this task | reviewed: 0 blockers, 1 warning fixed (move keeps back routes earlier), 1 suggestion fixed; 1 deferred (duplicated helpers, with T021) | task check passed (exit 0), 1273 core, 480 api, 505 web tests |
| T010 | Blocks: switch a block off and on (kept in place with its properties); delete a block with its connections (confirmation question), routes to it left unwired; the flow Start refused with a message naming the flow | reviewed: 0 blockers, 0 warnings, 1 suggestion fixed (header comment reflowed) | task check passed (exit 0), 1273 core, 480 web, 523 api tests |
| T011a | Agent and pipeline fields in core (amendment 4): optional model, tools and body on Agent blocks; description, rule tags, model, tools and body on the pipeline; tool names with spaces or control characters refused | reviewed: 1 blocker fixed (tool names with spaces or control characters), 0 warnings, 0 suggestions; 1 question deferred (spaced permission form, kept refused) | task check passed (exit 0), 1313 tests |
| T011b | Generator writes the agent fields: agent files start with frontmatter (name, description as JSON strings, then model and tools when set); body after the generated text; pipeline command takes model, tools and body; tool names with commas refused | reviewed: 2 blockers fixed (name and description frontmatter; commas refused), 1 warning fixed (YAML quoting), 1 suggestion fixed; 1 deferred (YAML indicator in tool names) | task check passed (exit 0), 1333 tests |
| T011 | Agent blocks and custom agents: name (file-safe, unique), description, scope and iteration warning, model, tools, body capped at 4,000 characters, path `.claude/agents/<name>.md` | reviewed: 1 blocker fixed (new agent gets a unique name), 1 warning fixed (blank description test), 1 suggestion fixed; 2 deferred (iteration warning matched by message; plural wording) | task check passed (exit 0), 1333 core, 480 api, 569 web tests |
| T012 | Rule tags on Agent blocks, flows and the pipeline (file-safe, no folder, a repeat refused on the same block); pipeline properties (name, description, model, tools, body) and arguments with unique names (amendment 5 checks the pipeline's tags in core) | reviewed: 0 blockers, 3 warnings fixed (round 1: 2; core pipeline-level rule tags, amendment 5), 2 suggestions fixed (round 1: 1; tag refusal wording "must be" after a full stop); 1 deferred (repeated helpers, with T021) | task check passed (exit 0), 1340 core, 480 api, 610 web tests |
| T013a | Cycle finding in core (amendment 6): a Connection that closes a cycle in its list is one blocker, at its path; disabled Connections and flows skipped; added to analyzeStructure | reviewed: 0 blockers, 2 warnings fixed (criterion on each test name; whole-output assertion), 1 suggestion fixed | task check passed (exit 0), 1353 tests |
| T013 | Live structural marks in `marks.ts` on `analyzeStructure` findings; a disabled flow Start or End is marked on its enabled flow (AC-037 fix, owner directive); no core change | review round 1: 0 blockers, 0 warnings, 1 suggestion fixed (header comment); AC-037 fix applied; 1 warning unresolved (deferred). Round 2 (owner decision, amendment 7): warning resolved in core, 3 AC-039 parser tests added, 0 blockers, 0 warnings left | task check passed (exit 0), 1356 core, 480 api, 630 web tests (20 in builder-marks) |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T001 review, SUGGESTION: `spec/documents/idea.md` lines 35, 48 and 80 still list `review` among the four check types. Not applied: `idea.md` is the pre-decision idea record (draft, 2026-11-14), and T001's file list does not include it. Same for `spec/documents/market-research.md` line 86.
- T002 review, SUGGESTION: `source/packages/core/test/catalog.test.ts:5` `FIXED_GATES` still lists `review`. Not applied: it tests the flat model (F-02 T003 catalog), which F-06 T021 removes; changing it now would touch code that is still in use.
- T002 review, SUGGESTION: `source/templates/pipeline/default.json:127` build review gate is set to `checks` in T002 (outside T002's file list, needed so the default still parses). The generated line now reads "Check checks, decided by agent". Not applied here: T003 owns the gate's description and its generated text.
- T003 review, SUGGESTION: `source/packages/core/src/pipeline/generate/rules-text.ts` `checkRule` writes the Condition's description into one numbered rule line, so a description with a line break splits the list in the command file. Not applied: the parser allows any non-blank text, and whether to refuse line breaks or to collapse them is a product choice that the stories do not settle. Decide before F-06 T008 (the web gate settings) so the builder can enforce the same rule.
- T006 review, SUGGESTION: `source/apps/web/src/builder/flow-edit.ts` `deletePipelineStart` refuses with "The Start of the pipeline ... cannot be deleted", but AC-035 says the message names "the flow". Not applied: the pipeline is the container the Start belongs to, the message names it, and the stories do not define the wording further. Confirm the wording with the user before the Map view wires this refusal (T010 or later).

- T007 review, SUGGESTION: `source/apps/web/src/builder/map-edit.ts` `gateTargetAt` has no caller yet. Not applied: the plan puts the Map view's drag-and-drop wiring in T016, so the function is consumed when that task lands; the test file covers its contract now.
- T007 review, SUGGESTION: `source/apps/web/src/builder/map-edit.ts` imports `pipelineIds` from `flow-edit.ts`. Not applied: a shared module would be a refactor with no behaviour change, and T021 removes the flat builder files around it; revisit when T021 lands.
- T008 review, WARNING (spec text): `spec/specifications/F-06-visual-builder/stories.md` AC-014 and the T008 line in `plan.md` say routes to the same flow are not offered. The T008 fix offers the connection's own source flow as the fail route, as the caller directed, because the default pipeline needs it (building-blocks §4: approve-stories, approve-screens, approve-plan and approve-checklist fail back to their source flows) and `setGateSettings` must accept those routes. Stories were not edited. Open: the user must approve an amendment that replaces "the same flow" with "the flow the connection starts from" in AC-014 and T008 before the next task advances.
- T009 review, SUGGESTION: `source/apps/web/src/builder/block-edit.ts` `refuse` and `requireFlow` repeat helpers of `flow-edit.ts`. Not applied: a shared module is a refactor with no behaviour change, the same call as the T007 entry on `pipelineIds`; revisit with T021.
- T008 review, SUGGESTION: `source/apps/web/src/builder/map-edit.ts` `setGateSettings` accepts a description with line breaks. Not applied: this is the open product choice recorded under T003 above (line breaks in a rule); decide it there, then enforce it in `checkDescription`.
- T011a review, QUESTION (product): `source/packages/core/src/pipeline/parse-scope.ts` `readTools` now refuses a tool name with a space, as the user directed for AC-026, so Claude Code's spaced form `Bash(git add:*)` is refused. Applied as directed (`Bash(git:*)` stays allowed). Open: confirm with the user before T011b whether the spaced form should be allowed in a tool list.
- T011b review, SUGGESTION: `source/packages/core/src/pipeline/parse-scope.ts` `readTools` accepts a tool name that starts with a YAML indicator (`*`, `&`, `!`, `[`, `{`, `%`, `@`, a backtick, a quote), which would make the plain `tools:` line invalid YAML. Not applied: Claude Code tool names start with a letter, and the tools line format is the one AC-031 and the tests pin; quoting the tools line or refusing such names is a product choice to decide with the spaced-name question above.
- T011 review, SUGGESTION: `source/apps/web/src/builder/agent-edit.ts` `agentIterationWarning` finds the F-04 finding by its message prefix; a reworded core message would drop the warning without a failing build (the AC-028 tests pin the current text). Not applied: the message is the core analyzer's contract and F-04 exposes no stable code for it; revisit if F-04 adds one.
- T011 review, SUGGESTION: `source/apps/web/src/builder/entry-checks.ts` `checkAgentBody` says "Cut 1 characters." for one character over. Not applied: the body cap wording is pinned by the AC-030 test and the cap was to be kept as built.
- T012 review, SUGGESTION: `source/apps/web/src/builder/pipeline-edit.ts` `requireFlow` and `refuse` repeat helpers of the other builder modules. Not applied: the same call as the T007 and T009 entries; revisit with T021.
- T013 review, WARNING, RESOLVED (amendment 7, owner decision 2026-11-16): a disabled pipeline-level Start or End (`pipeline.blocks[i]`) had no owning flow, so `source/apps/web/src/builder/marks.ts` gave it no mark. Now `source/packages/core/src/pipeline/parse-structure.ts` refuses it at its own path (`is disabled; the pipeline needs an enabled Start block`); tests named F-06 AC-039 in `source/packages/core/test/pipeline-parse-structure.test.ts`. The builder cannot switch a pipeline-level endpoint off (`setBlockEnabled` takes a flow id), so no mark is needed. Original finding: a disabled pipeline-level Start or End (`pipeline.blocks[i]`, core blocker "Start block ... is disabled; the pipeline needs an enabled Start block") has no owning flow, so `source/apps/web/src/builder/marks.ts` gives it no mark. Not fixed: the fix needs core or a Map-level mark, and the owner asked for no core change. The caller's note said the parser refuses this state; a probe on 2026-11-16 found `parsePipelineConfig` accepts it (and accepts a flow whose only Start or End is off). So the gap is that the analyzer blocker has no visible mark while the parser accepts the state, not a parser refusal. AC-039 gap for this state; decide with the owner before T016.
- T013 review, SUGGESTION: a pipeline with no End block (subject `pipeline`, "the pipeline has no End block") gets no mark, and the parser refuses it. The builder's edit functions cannot reach it (block edits are scoped to a flow), so it arises only from a loaded file. Not applied: no mark has an owner for a pipeline-level finding; revisit with the item in the entry above.
- T012 review, WARNING, RESOLVED (amendment 5, owner decision 2026-11-16): `source/packages/core/src/pipeline/generate/refusals-names.ts` `ruleTagProblems` checked the tags of enabled flows and Agent blocks only, so a pipeline-level rule tag that names no project rule was not refused. Now the pipeline's own tags are checked with the same wording and path form (`pipeline.ruleTags[i]`); tests named F-06 AC-025 in `source/packages/core/test/pipeline-rule-tags.test.ts`. Open follow-up: F-03 `stories.md` AC-029 still says "on an Agent block or a flow"; its wording is not edited here (the owner asked for the amendment record only).

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment 8 — 2026-11-16
**Changed**: `plan.md` T014 records the Map node rules: scope is the one scope of the enabled Agent blocks, "mixed" when they differ, "no agent" when there is none; the block count is all blocks.
**Reason**: AC-001 says the node shows its scope, but the spec did not say what a flow with mixed or no agents shows. Approved by the user on 2026-11-16.
**Impact**: T014 only.

### Amendment 7 — 2026-11-16
**Changed**: the parser refuses a disabled pipeline Start or End, at the path of the block (`pipeline.blocks[i]`). A child flow's disabled Start or End is unchanged. `building-blocks.md` §7 records the rule.
**Reason**: owner decision, 2026-11-16. The pipeline must always have one enabled Start and one enabled End; the T013 review found the parser accepted a disabled one, and the live marks had no mark for it.
**Impact**: core parser (`source/packages/core/src/pipeline/parse-structure.ts`) and its tests (`source/packages/core/test/pipeline-parse-structure.test.ts`, F-06 AC-039). No other core test built a disabled pipeline endpoint, and the API and web suites are unchanged.

### Amendment 6 — 2026-11-16
**Changed**: `plan.md` adds T013a (a core cycle finding in `analyzeStructure`) before T013, and corrects the T013 rationale: `analyzeStructure` does not report cycles today. `building-blocks.md` §7 records the no-cycle rule.
**Reason**: AC-009 (a Connection that closes a cycle is marked) had no implementation; the analyzer had no cycle check. The owner chose a core finding over a web-only check, so the rule has one implementation (AC-038). Approved by the user on 2026-11-16.
**Impact**: T013a changes F-04's analyzer output (one more finding kind); its tests are updated in T013a. T013 maps the finding to the Connection.

### Amendment 5 — 2026-11-16
**Changed**: the pipeline's own rule tags are checked by the generator like flows and Agent blocks: a tag that names no project rule is refused at `pipeline.ruleTags[i]` with the same wording (F-03 AC-029, F-06 AC-025). This widens F-03 AC-029's scope from flows and Agent blocks to the pipeline as well.
**Reason**: the pipeline takes rule tags (amendment 4, F-06 AC-042), and the review of T012 found that an unknown pipeline tag was not refused. Owner decision, 2026-11-16.
**Impact**: `source/packages/core/src/pipeline/generate/refusals-names.ts` and its tests (`source/packages/core/test/pipeline-rule-tags.test.ts`). No change to the parser or the builder.

### Amendment 4 — 2026-11-16
**Changed**: `plan.md` adds T011a (model and parser: agent and pipeline model, tools, body) and T011b (generator output) before T011. `architecture.md` §6 decision 26 records the fields.
**Reason**: the core Agent block and the pipeline had no model, tools or body, so AC-026, AC-030, AC-031 and AC-042 could not be stored or checked. Approved by the user on 2026-11-16 (add the fields to core).
**Impact**: T011a and T011b are new; T011 and T012 use the fields. The 4,000-character body cap stays an entry check in the builder.

### Amendment 3 — 2026-11-16
**Changed**: `stories.md` AC-014 now allows a gate's fail route back to the flow its connection starts from, as well as to an earlier flow. `plan.md` T008 notes it.
**Reason**: the approved AC-014 excluded the same flow, but every default gate fails back to the flow its connection starts from (building-blocks §4 and §7). T008's review found that the default's routes would be refused. Approved by the user on 2026-11-16.
**Impact**: T008 only (the route options and their tests). The default pipeline is unchanged.

### Amendment 2 — 2026-11-15
**Changed**: `plan.md` T007 records the defaults for a gate placed by drop or button (approval and check descriptions, the `checks` type, pass next and fail stop, the ids, the hit test); T014 uses `map-tab-view.ts`, a new name, so the flat `map-view.ts` is not overwritten before T021.
**Reason**: T007 needs a non-blank description on a new gate (core rule from T003), and the plan did not set one. Approved by the user on 2026-11-15. T014's file name clashed with the flat builder's view file.
**Impact**: T007 and T014 only. No change to other tasks.

### Amendment 1 — 2026-11-15
**Changed**: `plan.md` T003 widened to the core model, parser and generator (Condition description); `architecture.md` §6 decision 25 records the description as a required model field.
**Reason**: T003 found that the core Condition has no description field, so the default's review gate cannot carry one. The stories require a description on every Condition (AC-016), and `building-blocks.md` §3 lists it. Approved by the user on 2026-11-15.
**Impact**: T003 is larger (core model, parser, generator, default data and tests). Existing Condition fixtures in core tests gain the description. T008 (the web gate settings) is unchanged.

