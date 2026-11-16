# Progress — Visual builder: the Map tab, flow tabs, gates and checks, custom agents (F-06)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-15 | Stories approved by the user as written; 45 criteria (43 `[auto]`, 2 `[device]` — AC-005, AC-045). Decisions: Map offers Approval and Check only (Check = `checks` or `diff-size`; review is an Agent block); live structural marks use the core rules. Open for Plan: who builds the core rule module, F-06 or F-04; `features.md` still lists F-01 only as the dependency |
| UX       | ✅ Complete | 2026-11-15 | Approved by the user. 11 screens. Decisions from approval: one gate per connection (Add buttons disabled when the arrow has one); custom-agent edits apply as made (no Save button). Open for Plan: visual points V1 (marks red or amber), V2 (10 px hint text), V3 (toolbox shift on the Start refusal); Start/End panels not drawn; refused states for a repeated flow id, rule tag and agent name not drawn |
| Plan     | ✅ Complete | 2026-11-15 | Approved by the user before any code is written; 22 tasks. Prerequisite: T020 and T021 wait for F-05 T001 to T015 committed; review is removed as a check type (T002, T003) |
| Build    | 🔄 In Progress | 2026-11-15 | 29 of 29 tasks committed; Verify pending |
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
| T014 | Map view-model: tab row, flow nodes (scope with mixed and no agent, all-block count), flow-to-flow edges with artifact labels, gates as diamonds with routes, toolbox items | reviewed: 0 blockers, 1 warning fixed (label trim and non-flow connection tested), 1 suggestion fixed (trim once) | task check passed (exit 0), 1356 tests |
| T015 | Flow tab view-model: blocks numbered in order, flow toolbox (Start disabled when one exists), property panels per block kind, generated file per block. Reads and writes are not yet in the panel (amendment 9: T015a model, T015b panel) | reviewed: 0 blockers, 1 warning fixed (back-route titles numbered), 1 suggestion fixed (copies of lists); 2 deferred (agentFilePath location; back route to a Connection, AC-021) | task check passed (exit 0), 1356 tests |
| T015a | Reads and writes on Agent blocks in core (amendment 9): optional lists of artifact names, non-blank, no duplicates within a list | reviewed: 0 blockers, 0 warnings, 1 suggestion fixed (line wrap); 1 deferred (trim or file-safe names, for the owner) | task check passed (exit 0), 1371 tests |
| T015b | The Agent panel shows its reads and writes from the model (copies, order kept) | reviewed: 0 blockers, 0 warnings, 0 suggestions (round 1, no findings) | task check passed (exit 0), 1371 tests |
| T016 | Map tab component with @xyflow/react: flows in a row, edges with artifact labels and gate diamonds, drop target on each arrow (geometry in the view-model), Approval and Check dragged onto a connection, Add approval and Add check buttons (disabled when the connection has a gate). Not mounted yet (T019). AC-005 is a device check | reviewed: 0 blockers, 1 warning fixed (drop geometry moved to the tested view-model), 2 suggestions fixed; 1 deferred (gate mapping location) | task check passed (exit 0), 1371 tests |
| T017 | Flow tab component: blocks in order with numbers, flow toolbox (Start disabled when one exists), selected block with move up and down, a Connection with its artifact label typed in a field (amendment 10); refusals shown; the component has no DOM test | reviewed: 0 blockers, 0 warnings, 1 suggestion fixed (aria-required); 1 deferred (test title AC-008 vs AC-020) | task check passed (exit 0), 1371 tests |
| T018 | Property panels: `PropertyPanel` (block or flow, with switch off and delete footer and confirmation), `PipelinePanel` (pipeline and gate panels), `FormFields` controls with inline refusals; the 400-line guard was waived by the owner (one commit approved); editing controls for Agent reads and writes, Connection, End, Start, Condition checks and flow description are not built (text only, per the owner's note) | reviewed: 0 blockers, 2 warnings fixed (round limit field kept a stale value after a route change, Condition and gate; threshold accepted `1e3` and `0x10`), 3 suggestions fixed (dead `commitOn` option removed; model constants shared; whole-number parse tested); 2 deferred (stale draft on external config replacement; panel bindings have no component test) | task check passed (exit 0), 700 web tests (17 new), 480 api, 1371 workspace |
| T019 | Builder root `PipelineBuilder`: host props (`initial`, `onChange`) through the builder state, tab row (Map, flows, +), selection, start from the default pipeline on load (AC-043 host, AC-045 `[device]` checked in a browser) | reviewed: 0 blockers, 0 warnings, 2 suggestions fixed (switched-off flow tabs marked; selection dropped when its flow leaves the configuration); 0 deferred | task check passed (exit 0), 1371 tests |
| T020 | Step 3 uses the pipeline builder in place of the flat builder; the pipeline config now lives in App state, so step 4 can read it (amendment 11); the flat map state is removed | reviewed: 0 blockers, 1 warning fixed (step-4 read; amendment 11), 1 suggestion fixed, 1 deferred (builder reads initial at mount only) | task check passed (exit 0), 1376 tests |
| T021a | Remove the flat builder files, their tests and the flat CSS selectors (amendment 12); covers none; 2,710 deletion lines, the size guard waived by the owner | reviewed: 0 blockers, 0 warnings, 0 suggestions fixed; 1 suggestion deferred (unused .module-rows and .rule-list selectors) | task check passed (exit 0), 1376 tests |
| T021b | Core flat-model removal: the result types move to the pipeline model with root re-exports (API unchanged); catalog, selection and cycle deleted with their tests; fixtures as literals (amendments 13-15); size guard waived by the owner | reviewed: 0 blockers; 2 warnings closed by the owner (F-03 AC-028 reworded; F-07 AC-028 retired); 2 suggestions fixed | task check passed (exit 0), 1340 core, 480 api, 419 web tests |
| T022 | Docs: architecture §10 and building-blocks §1 and §2 describe the built builder; the marks are computed and drawn by T023 (amendment 16) | reviewed: 4 doc fixes applied (gate buttons, flow header, Connections section, diff-size threshold); 3 warnings closed (marks by T023; the tab-view header comment is fixed in T023; decision 24 reworded) | task check passed (exit 0), 1340 core, 480 api, 419 web tests |
| T023 | Draw the live marks on the Map and the flow tabs (severity, message, next to the item); a fallback list for marks the Map cannot place (AC-039); brief and stack findings stay off the Map (they belong to the analyze step, F-22) | reviewed: 0 blockers, 1 warning fixed (status lines), 3 suggestions fixed; 2 deferred (pipeline subject with no item; recompute per render) | task check passed (exit 0), 1340 core, 480 api, 433 web tests |
| T024 | Verify gap AC-010: tests that an approval keeps its decider human and a check keeps agent after a gate settings edit (amendment 17) | reviewed: 0 blockers, 0 warnings, 1 suggestion fixed (a needless cast removed) | task check passed (exit 0), 1340 tests |

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
- T015 review, SUGGESTION: `source/apps/web/src/builder/tab-view.ts` imports `agentFilePath` from `agent-edit.ts`, so a view module depends on an edit module. Not applied: moving the helper touches `agent-edit.ts`, outside T015's file list; revisit with T021 or when a shared builder path helper is added.
- T015 review, SUGGESTION: `source/apps/web/src/builder/tab-view.ts` `routeTargetNames` shows a back route to a Connection by its raw id, because `backRouteTargets` (`source/apps/web/src/builder/block-edit.ts:148`) offers Connection ids as targets. Not applied: the target list is block-edit's contract (AC-021 says "block"), and changing it is outside T015; decide with the owner whether a Connection may be a back target.
- T015a review, SUGGESTION: `source/packages/core/src/pipeline/parse-scope.ts` `readArtifactNames` compares names as typed, so `plan` and `plan ` (or ` plan`) are two different artifacts and both pass. Not applied: the stories say "non-blank text" and do not say whether names are trimmed or restricted to file-safe characters. Decide before T015b shows or generates them (same product choice as the T003 entry on line breaks).

- T016 review, SUGGESTION: `source/apps/web/src/builder/MapTab.tsx` `gateChoice` maps the toolbox kind to a `GateChoice` (approval, or checks). It stays in the component: its input type `GateKind` lives in `Toolbox.tsx`, and moving it into `map-edit.ts` would make core-style logic import a UI file. The mapping is one line; AC-010 and AC-011 are tested through `addGate`.
- T017 review, SUGGESTION: `source/apps/web/test/builder-block-edit.test.ts:230` names the blank artifact label refusal `F-06 AC-020`, but the label is AC-008 (`stories.md`). Not applied: the test file is outside Amendment 10 (impact FlowTab.tsx only); retitle it with the next change to that file.
- T018 follow-up (owner note 2026-11-16), for a new task after T019, not built in T018: Agent reads and writes editing (`source/apps/web/src/builder/PropertyPanel.tsx:172-173` show them as text only). Connection fields (`PropertyPanel.tsx:111-115`, runs after, then and artifact, text only). End outcome (`PropertyPanel.tsx:119-123`, outcome and produces, text only). Start (`PropertyPanel.tsx:105-106`, a static sentence; no Start controls). Condition description, type, decided-by and threshold on flow Conditions (`PropertyPanel.tsx:192-197`, text only; the Condition's checks are shown but not editable). Flow description (`PropertyPanel.tsx:228`, text only). Flow id (not shown in the panel at all; `FlowFields` at `PropertyPanel.tsx:226-237` shows the name only). Pipeline Start deletion (`PipelinePanel.tsx:35`; the panel has no delete control for the pipeline Start, and shows only its arguments, `PipelinePanel.tsx:76-110`). Checked on 2026-11-16: each panel above shows the item as text as the owner asked, except flow id, which is not shown.
- T018 review, WARNING (plan): `plan.md` T018 names `source/apps/web/src/builder/Inspector.tsx`, which is the flat builder's old inspector (untouched since 2026-11-14, deleted by T021). T018 put the panels in `PropertyPanel.tsx` and `PipelinePanel.tsx` instead. The file exists, so the pre-flight passes, but the plan line is out of date. Fix the plan line (amendment) before T019 or in the T021 entry; the owner decides which.
- T018 review, SUGGESTION: `source/apps/web/src/builder/FormFields.tsx` `TextDraft` keeps its draft from mount and does not re-read `value` when it changes, so a configuration replaced by the host while a panel stays mounted would show the old text. Not applied: the only host input is the initial configuration (AC-043), and a re-sync would break typing, because the stored value is trimmed (a trailing space or newline would be removed on each keystroke). Revisit with the F-05 host wiring (T019 or later).
- T018 review, SUGGESTION: the panels' handlers (`PropertyPanel.tsx`, `PipelinePanel.tsx`) have no component test; the rules they call are tested in the edit modules and the view-model (AC-023 to AC-035). Not applied: the web tests are view-model and logic tests (`qa.md`), and no DOM test exists in the MVP. The bindings are not covered by any automated test yet; a browser check is the only way to catch a wrong handler.
- T020 review, WARNING (RESOLVED 2026-11-16): `source/apps/web/src/wizard/Wizard.tsx` rendered `<PipelineBuilder />` with no props, so `onChange` was never supplied and the config lived only inside `PipelineBuilder.tsx`; step 4 could not read the pipeline. Fixed by Amendment 11: `App.tsx` holds the config (initialised from `defaultProjectConfig`), `Wizard.tsx` passes it as `initial` and `onChange`, and the builder reports every change to App. Wiring asserted in `source/apps/web/test/builder-wiring.test.ts` (F-06 T020).
- T020 review round 2, SUGGESTION: `source/apps/web/src/builder/PipelineBuilder.tsx` reads `initial` once, at mount; later changes to the prop are ignored, and App now re-renders with a new config object after each change. Not applied: the builder is the source of truth after mount, and changing the prop doc would widen the change beyond the impact in Amendment 11 (App, Wizard, wiring test). Revisit when step 4 reads the config (F-05 T016) or with the F-06 T021 cleanup.
- T021a review, SUGGESTION: `source/apps/web/src/styles.css` lines 152-153 `.module-rows` and `.rule-list` (display flex column, gap 8px) match no class in any TSX or TS file, so they look like F-05 leftovers. Not applied: T021a's list names only the flat selectors, and the F-05 wizard owns the stepper and card rules around them; remove them with the F-05 cleanup, after checking that F-05 no longer plans them.
- T021b review, WARNING (spec text, for the owner): `spec/specifications/F-03-claude-code-templates/stories.md:156` AC-028 (`[auto]`) says the flat model and catalog (`DEFAULT_WORKFLOWS`, `DEFAULT_STEP_CATALOG`, `DEFAULT_CONNECTIONS`, `getCatalogStep`) are still exported from `@sddbuilder/core`. T021b deletes `catalog.ts` and its root exports (amendment 13), and the two AC-028 export tests in `source/packages/core/test/pipeline-separation.test.ts` go with them, so the criterion is now false and its test checks only the API suite file names. Not applied: the criterion is the owner's text. Owner to reword AC-028 to match, or accept the change; this WARNING is unresolved until then.
- T021b review, WARNING (spec text, for the owner): `spec/specifications/F-07-api-and-zip/stories.md:180` AC-028 (`[auto]`) requires `selectWorkflows` to throw on a map with a cycle and `selectSteps` to throw on an unknown step id. T021b deletes `selection.ts` and its test file `source/packages/core/test/selection.test.ts`, so no test names F-07 AC-028 now. Not applied: the criterion names helpers that the owner's scope deletes. Owner to retire the criterion or point it at the F-04 cycle finding and the pipeline refusals.
- T022 review, WARNING (owner decision): live structural marks are computed (`source/apps/web/src/builder/marks.ts`) but no Map or flow view draws them; nothing in `source/apps/web/src` imports `marks.ts` outside its own file. `architecture.md` §10 and `building-blocks.md` §1 now say so. Owner decides whether drawing the marks is a new F-06 task (the stories' mark criteria decide what is required) or an accepted gap to record at Verify. Not applied: drawing marks is new product work outside T022.
- T022 review, WARNING (owner decision): `source/apps/web/src/builder/tab-view.ts` lines 1-2 say the Connections are "drawn as arrows between them", but `source/apps/web/src/builder/FlowTab.tsx` lists them as text (`#1 to #2: label`) in a Connections section. Not applied: the header is a product-code comment outside T022's file list; owner decides the wording and when it is fixed.
- T022 review, WARNING (owner decision): `architecture.md` §6 decision 24 says "The live marks on the Map and the flow tabs call `pipeline.analyzeStructure`" in the present tense, while the marks are not drawn (see above). Not applied: §6 decisions are recorded history; owner decides whether to reword it (for example "computed; drawing them is open") or to keep it and rely on §10's status line.
- T023 review, SUGGESTION: `source/apps/web/src/builder/marks.ts` `unplacedMarks` drops a finding whose `pipeline.` subject resolves to no item. Not applied: the analyzer derives every path from the same configuration, so no real input reaches this; a test would need a fabricated finding. Revisit if the analyzer gains another path source.
- T023 review, owner decision: brief and stack findings (today the default shows "rules is empty") are not listed under the Map, as T013 decided, since they name no pipeline item. Reading "a subject the Map does not draw must be shown" literally would list them. Not applied: it would put a brief warning on the default Map. Owner decides.
- T023 review, SUGGESTION: `MapTab.tsx` recomputes `structuralMarks` and `unplacedMarks` (each runs `analyzeStructure`) on every render. Not applied: the pipeline is small, and memoizing adds state with no measurable gain.
- T023 review, note for Verify: the marks inside the fixed-size flow node and the Connection label, and the "Not on a drawn item" list, are not checked in a browser (no browser tests in the MVP). Put a visual check of overflow on the manual checklist.

---
## Test Results

_Criteria coverage matrix and manual checklist outcome._

**Verify run, 2026-11-16.** Preconditions met: all 23 plan tasks ticked, Current Task None, branch `main`, clean tree.

Totals from `source/scripts/task-check.sh` (exit 0; typecheck passed on all workspaces):

| Workspace | Test files | Tests | Failed | Skipped |
|---|---|---|---|---|
| core | 68 | 1340 | 0 | 0 |
| api | 28 | 480 | 0 | 0 |
| web | 20 | 433 | 0 | 0 |
| **Total** | **116** | **2253** | **0** | **0** |

Criteria: 45 in `stories.md`, 43 `[auto]`, 2 `[device]`. Result: 40 `[auto]` covered by passing tests, 3 `[auto]` with a gap or a partial gap (AC-010, AC-024, AC-039), 1 wording question (AC-035), 2 `[device]` on `checklist.md`.

| AC | Tag | Covering tests (passing) | Result |
|---|---|---|---|
| AC-001 | auto | `builder-map-tab-view`: "draws the default pipeline as six flows, left to right, with their scope and count"; "flow nodes show name, scope and block count, in order" | covered |
| AC-002 | auto | `builder-map-tab-view`: "the tab row is the Map, then one tab per flow in order, then the + tab"; "each flow node names the tab that opens it" | covered (view-model; the click wiring in `MapTab.tsx` has no test) |
| AC-003 | auto | `builder-map-tab-view`: "draws the connection between two flows with its artifact" | covered |
| AC-004 | auto | `builder-map-tab-view`: "a gate on a connection is a diamond with its pass and fail outputs" | covered |
| AC-005 | device | checklist, check 1 | manual |
| AC-006 | auto | `builder-flow-add`: "the + adds a flow after the last tab"; "the new flow holds one Start block and one End block..." | covered |
| AC-007 | auto | `builder-flow-add`: "refuses an id with %s and the flow keeps its id"; "skips an id that another flow already uses" | covered |
| AC-008 | auto | `builder-map-gates`: "a connection drawn from one flow to another adds a connection with the artifact label"; `builder-map-gates`: "an empty artifact label %j is refused at entry" | covered |
| AC-009 | auto | core `pipeline-analyze-cycles`: "marks the Connection that closes a three-block cycle, and only that one"; web `builder-marks`: "a Connection that closes a cycle is marked and the edit is kept"; `builder-mark-drawing`: "the Map draws the cycle mark on the Connection that closes it" | covered |
| AC-010 | auto | `builder-map-gates`: "an approval placed on a connection is a condition with check type approval, decided by a human" | GAP (partial): proves decided-by `human`; no test proves it "cannot be changed" (`setGateSettings` takes no decided-by field, but nothing asserts it) |
| AC-011 | auto | `builder-map-gates`: "a check of type %j is decided by an agent"; "a diff-size check keeps its line threshold"; core `pipeline-parse-condition`: "the review check type is removed: the parser refuses review" | covered |
| AC-012 | auto | `builder-map-gates`: "one gate per connection"; "a second gate on a connection is refused with..."; "a connection with a default gate (the default pipeline) refuses an approval from the panel" | covered (the Add buttons in `MapTab.tsx` have no test; `addGate` is tested) |
| AC-013 | auto | `builder-gate-settings`: "a threshold that is %s is refused at entry and nothing is saved"; "a positive whole number is accepted as the threshold and stored" | covered |
| AC-014 | auto | `builder-gate-settings`: "a back route to a later flow is refused at entry"; "the fail route is offered as stop, or back to the source flow or an earlier flow" | covered |
| AC-015 | auto | `builder-gate-settings`: "a back route with no round limit shows the unbounded retry warning"; "a round limit of %s is refused at entry" | covered |
| AC-016 | auto | `builder-gate-settings`: "a description of %s is refused at entry"; core `pipeline-condition-description`: "generate refuses an enabled Condition with a blank or missing description" | covered |
| AC-017 | auto | `builder-tab-view`: "a flow tab shows its blocks in order, numbered, with the Start first and the End last"; `builder-block-edit`: "a new Agent block lands before the End when no block is selected" | covered |
| AC-018 | auto | `builder-block-edit`: "a second Start in a flow is refused and the flow is unchanged"; `builder-tab-view`: "disables the Start item with its reason when the flow already has a Start" | covered |
| AC-019 | auto | `builder-block-edit`: "moving a block up swaps it with the one before and keeps the others in order"; "moving a block down swaps it with the next one..." | covered |
| AC-020 | auto | `builder-block-edit`: "a Connection to a block in another flow is refused and the flow is unchanged" | covered |
| AC-021 | auto | `builder-block-edit`: "offers next, stop and the back routes given, in that order"; "a back route to a block of another flow is refused" | covered |
| AC-022 | auto | `builder-marks`: "a flow with no End block is marked until an End is added"; `builder-mark-drawing`: "the Map and the flow tab draw the no-End mark until an End is added" | covered |
| AC-023 | auto | `builder-tab-view`: "opens the Agent panel with...", "...Condition...", "...Connection...", "...End...", "...Start...", "...flow panel..." | covered |
| AC-024 | auto | `builder-tab-view`: "a Flow panel generates .claude/commands/<flow>.md"; `builder-agent-edit`: "the agent file path" | GAP (partial): the pipeline command file (`.claude/commands/pipeline.md`) is in no test, and `PipelinePanel.tsx` shows no generated file |
| AC-025 | auto | `builder-pipeline-props`: "refuses a rule tag with %s"; "refuses a repeated tag on the same block..."; core `pipeline-rule-tags`: "refuses a pipeline tag that names no rule, at the pipeline path" | covered |
| AC-026 | auto | `builder-agent-edit`: "refuses the name"; "refuses the tool name"; "refuses a blank description"; core `pipeline-parse-agent-fields`: "refuses a tool name with %s..." | covered |
| AC-027 | auto | `builder-agent-edit`: "refuses a name another Agent block in a different flow already uses"; "agent name is file-safe and unique among Agent blocks" | covered |
| AC-028 | auto | `builder-agent-edit`: "warns a task-scope agent with no iteration source"; "warns a feature-scope agent with no iteration source in the first flow"; "the default pipeline has no agent without an iteration source" | covered |
| AC-029 | auto | `builder-agent-edit`: "adds an Agent block to a flow with the properties of an Agent block"; "a flow may have no custom agent: the default pipeline parses without one" | covered |
| AC-030 | auto | `builder-agent-edit`: "accepts a body of exactly 4,000 characters"; "refuses a body of 4,001 characters with the count and the cut" | covered |
| AC-031 | auto | core `pipeline-generate-agent-fields`: "agent file frontmatter for model and tools"; "a body is written after the stub text"; `builder-agent-edit`: "keeps name, description, model, tools and body together, and the result parses" | covered |
| AC-032 | auto | `builder-flow-switch-delete`: "switching a flow off and on"; `builder-block-switch-delete`: "switching a block off sets it to disabled and keeps its properties" | covered |
| AC-033 | auto | `builder-marks`: "a disabled block or flow is not marked" | covered |
| AC-034 | auto | `builder-block-switch-delete`: "deleting a block asks for confirmation and removes its connections"; `builder-flow-switch-delete`: "deleting a flow asks for confirmation and removes its connections and gates"; "a route that pointed to the deleted block is left unwired and keeps its target" | covered |
| AC-035 | auto | `builder-flow-switch-delete`: "refuses to delete the pipeline Start with a message that names the pipeline"; `builder-block-switch-delete`: "refuses to delete the Start of a flow with a message that names the flow" | covered; WORDING QUESTION: the criterion says the message names "the flow" for both Starts, the pipeline case names the pipeline (T006 deferred item) |
| AC-036 | auto | `builder-marks`: "a Condition with an unwired output is marked next to the item"; `builder-mark-drawing`: "a Condition with an unwired output is drawn with its mark on its box" | covered |
| AC-037 | auto | `builder-marks`: "a flow with no Start or no End is marked; a second Start is refused"; "marks the owning flow when its only Start is off..." | covered |
| AC-038 | auto | `builder-marks`: "the marks are the analyzer findings, placed on the item they name" | covered |
| AC-039 | auto | `builder-marks`: "after any sequence of edits the state is accepted or carries a mark"; core `pipeline-parse-structure`: "the parser refuses a disabled pipeline Start or End at its own path" | GAP (partial): a pipeline with no End block gets no mark (`marks.ts` `unplacedMarks` drops subject `pipeline`); the state can hold it only from a host-supplied initial configuration, since `state.ts` does not parse it (T013 deferred) |
| AC-040 | auto | `builder-marks`: "a retry with no round limit is a warning, not an error" | covered |
| AC-041 | auto | `builder-state`: "the default pipeline holds the six flows and the five gates of building-blocks §4"; "the builder starts from the default pipeline" | covered |
| AC-042 | auto | `builder-pipeline-props`: "refuses a name another row already uses, names the row and keeps its name"; "accepts a body of exactly the cap, and refuses one character more" | covered |
| AC-043 | auto | `builder-state`: "reports the current configuration to the host after each change, in order"; "accepts an initial configuration from the host instead of the default" | covered |
| AC-044 | auto | `builder-state`: "the builder folder has no request, socket or storage call"; "nothing persists between states" | covered |
| AC-045 | device | checklist, check 2 | manual |

**Scope (`features.md` F-06: Map tab, flow tabs, gates and checks, custom agents):** covered by US-001 to US-009 (R-01 to R-09).

**Manual checklist:** `spec/specifications/F-06-visual-builder/checklist.md`. AC-005 and AC-045, plus one extra check from the T023 note (marks fit on screen). Status: all three pending.

**Verify result: GAPS, not complete.** Verify stays ⏳ Pending. To close:
1. AC-010: add a test that a human-decided approval keeps `decidedBy: 'human'` after a settings edit, or confirm the criterion is met by the type alone.
2. AC-024: show the pipeline command file in the pipeline panel and test its path, or confirm with the owner that the pipeline panel is out of scope.
3. AC-039: a pipeline with no End is unmarked (T013 deferred item). Either mark it in the fallback list or refuse the host's initial configuration when it lacks a pipeline End.
4. AC-035: the owner confirms the wording for the pipeline Start refusal ("the flow" or "the pipeline").

---

## Amendments

### Amendment 17 — 2026-11-16
**Changed**: `stories.md` AC-035 names the pipeline for the pipeline Start (owner decision). `plan.md` adds T024 (AC-010 test), T025 (AC-024 pipeline command path in the panel), T026 (AC-039 pipeline End gap) and T027 (AC-035 wording), found by Verify.
**Reason**: Verify found three automated gaps and one wording question. Approved by the user on 2026-11-16.
**Impact**: stories AC-035; T024 to T027 (new).

### Amendment 16 — 2026-11-16
**Changed**: `plan.md` adds T023 (draw the live marks on the Map and the flow tabs, next to the item) after T022. `architecture.md` §6 decision 24 says the marks are computed now and drawn by T023.
**Reason**: AC-009, AC-022 and AC-036 expect the marks on screen, but no task drew them. Approved by the user on 2026-11-16.
**Impact**: T023 and the T022 docs wording.

### Amendment 15 — 2026-11-16
**Changed**: `F-03` stories AC-028 reworded to the pipeline exports (the flat catalog is removed); `F-07` stories AC-028 retired (superseded: the flat selection and cycle code is removed; the rules are checked by the pipeline analyzer).
**Reason**: T021b removes the flat catalog, selection and cycle, so those criteria were false or had no test. Approved by the user on 2026-11-16.
**Impact**: F-03 and F-07 stories only; F-03 and F-07 counts change by the retired check.

### Amendment 14 — 2026-11-16
**Changed**: `plan.md` T021b: `packages/core/test/fixtures.ts` takes the default flat workflows and connections as literal test data, so the kept parse-config and limits suites keep their inputs.
**Reason**: catalog.ts is deleted in T021b, and the kept suites read the default data through fixtures.ts. Approved by the user on 2026-11-16 (copy the data as test literals).
**Impact**: test data only, in T021b.

### Amendment 13 — 2026-11-16
**Changed**: `plan.md` T021b scope: the result types move into the pipeline model and the package root re-exports them, so the API is not changed in this task; the core tests and smoke test are re-pointed; catalog, selection and cycle are deleted.
**Reason**: the result types reach the API through the package root and the core pipeline, so moving them without a re-export would break the API build. Approved by the user on 2026-11-16 (core only, root re-exports).
**Impact**: T021b only. The API's four imports stay until a later cleanup.

### Amendment 12 — 2026-11-16
**Changed**: `plan.md` T021 is split into T021a (web: the flat builder files, their tests and CSS) and T021b (core: the result types moved into the pipeline model, catalog, selection and cycle removed; limits and parse-config kept).
**Reason**: the flat model's result types still have live consumers, smoke.test.ts reads the flat catalog, and selection and cycle are used only by the flat builder. Approved by the user on 2026-11-16 (split).
**Impact**: T021 only (now T021a and T021b).

### Amendment 11 — 2026-11-16
**Changed**: step 3 keeps the pipeline config in App state, so step 4 can read it. `App.tsx` holds the config, initialised from the default pipeline; `Wizard.tsx` passes it to `PipelineBuilder` as `initial` and receives each change through `onChange`, which updates App's state. The builder stays mounted while hidden.
**Reason**: owner decision, 2026-11-16 (F-05 AC-011). The T020 review found that the wizard could not read the builder's pipeline, because the builder kept its config inside its own state.
**Impact**: `source/apps/web/src/App.tsx`, `source/apps/web/src/wizard/Wizard.tsx` and the wiring test `source/apps/web/test/builder-wiring.test.ts` only.

### Amendment 10 — 2026-11-16
**Changed**: the flow tab's Connection takes its artifact from a typed text field (required, non-blank) next to the Connection button, not from the selected Agent's writes. The trimmed text goes to `addFlowConnection`, which keeps its refusal for a blank label.
**Reason**: owner decision, 2026-11-16. The writes-based rule in T017 handed over the first output of the selected Agent, which the stories do not ask for (AC-008 requires a typed artifact label).
**Impact**: `source/apps/web/src/builder/FlowTab.tsx` only.

### Amendment 9 — 2026-11-16
**Changed**: `plan.md` adds T015a (model and parser: reads and writes on Agent blocks) and T015b (the Agent panel shows them) before T016. `architecture.md` §6 decision 27 records the fields.
**Reason**: building-blocks §3 and screen 06 show reads and writes on an Agent block, but the model had no such field, so AC-023 was incomplete. Approved by the user on 2026-11-16 (add them to the model).
**Impact**: T015 was committed without the reads and writes rows (`1375e1f`); T015a and T015b add them. Their criteria are AC-023 only.

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

