# Progress — API and UI integration (F-16)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-24 | Approved by the user; 3 stories, 10 criteria: 4 `[auto]`, 6 `[device]` (the owner's checks in the browser with a real key) |
| UX       | ➖ Not needed |  | No new screens: the analyze step is approved in F-13 |
| Plan     | ✅ Complete | 2026-11-24 | Approved by the user; 2 tasks (T001 to T002); 10 criteria: 4 `[auto]` covered by T001, 6 `[device]` on the Verify checklist |
| Build    | ✅ Complete |      | 22 of 22 tasks committed (T022 added by owner bugs 2026-11-25) |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist (the owner's end-to-end check) |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Dependency Override

- 2026-11-24: F-16 depends on F-13, F-14 and F-15. F-13 is complete. F-14's `progress.md` still shows Build 🔄 In Progress (see F-15 `progress.md` for the same note). F-15's Verify is Pending until F-16 integration, as the owner asked on 2026-11-24. The owner asked to proceed with F-16.

---

## Current Task

None

_While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Dev proxy `dev-proxy.ts`: `devProxy(env)` forwards `^/analyze(\?.*)?$` and `^/generate(\?.*)?$` (anchored: Vite treats a plain key as a prefix) to `http://localhost:<PORT>` with timeouts of 300000 ms; `vite.config.ts` calls it | 0 blockers, 1 warning (PORT differs from the API for blank and invalid values; resolved by owner decision, see T003 and the Amendment), 2 suggestions fixed (comment; exact keys asserted) | task check passed: api 246 of 246, web 1916 of 1916, core 1217 of 1217 |
| T003 | API PORT rule matches the proxy: `readPort` trims, blank gives 3000, a whole number from 1 to 65535 otherwise, else refused naming PORT | 0 blockers, 0 warnings, 1 suggestion fixed (comment), 1 deferred (the proxy passes a non-numeric PORT through; the API refuses it at start; dev-only) | task check passed: api 251 of 251, web 1916 of 1916, core 1217 of 1217 |
| T004 | Analyze and generate bodies follow the pipeline schema: `buildRequestBody` sends the document form (no `index` at any level; rule tags as ids), the tree and the config key keep the parser-shaped config | 0 blockers, 0 warnings, 1 suggestion fixed (test rename reverted), 1 deferred (analyze imports `toDocument` from the builder) | task check passed: api 251 of 251, web 1921 of 1921, core 1217 of 1217 |
| T005 | Command files take the flow name: `flowFileName` (`generate/flow-file.ts`: lower-case, NFC, runs of non-letters and non-digits to one `-`); file list and the process list use it; blockers for an empty file name, a clash between flows, and the file name `pipeline` (`analyze/command-file.ts`); flow id kept for links and labels | 0 blockers, 2 warnings fixed (non-ASCII letters; a test that asserted nothing), 1 suggestion fixed; 1 warning resolved by owner decision (web subtitle, T007); AC-015 amended for the pipeline clash | task check passed: api 251 of 251, web 1921 of 1921, core 1254 of 1254 |
| T006 | Docs: architecture §3 and §12 (command file names from the flow name; the two blockers); `templates/README.md` (the `<flow file name>` placeholder and the naming sentence); the README-table test resolves `<flow file name>` with `flowFileName` | 0 warnings; the README test helper needed the placeholder (fixed in the same task) | task check passed: api 251 of 251, web 1921 of 1921, core 1254 of 1254 |
| T007 | Subtitle shows the real command file name: `PipelineStep.tsx` uses core's `flowFileName` (exported, and pinned in the F-02 namespace test) | 0 blockers, 0 warnings, 1 suggestion fixed (comment wrap) | task check passed: api 251 of 251, web 1922 of 1922, core 1254 of 1254 |
| T008 | Every analyze finding in a 200 reply carries `subject` (the path); the web step's parser now accepts the reply | 0 blockers, 0 warnings, 3 suggestions fixed (shared test helper, comment wrap, import); 2 deferred (decision 10 dated record; AC-018 uses a fixed reply by design) | task check passed: api 258 of 258, web 1923 of 1923, core 1254 of 1254 |
| T009 | A new project and a restart start with an empty pipeline in the UI (`emptyPipelineValue`); the parser is unchanged and refuses that pipeline (AC-019, amended) | 0 blockers, 1 warning fixed (a weakened identity test split out), 2 suggestions fixed, 2 deferred (default has no production caller; no render test of step 3) | task check passed: api 258 of 258, web 1928 of 1928, core 1254 of 1254 |
| T010 | Blocker: the flow Body field accepts typed text. A refused edit no longer clears the body: edits are scoped to their field, a blank-body flow is checked against a never-saved placeholder in the web (parser unchanged), an over-limit body shows the parser reason under the field (AC-020) | 0 blockers; 2 warnings fixed (over-limit reason hidden by the key press in a new flow; artifact and approval edits on a blank-body flow untested); owner decisions applied | task check passed: api 258 of 258, web 1951 of 1951, core 1254 of 1254 |
| T011 | Blocker: block ids unique across the pipeline; `nextBlockId` checks every flow, and the toolbox no longer makes ids (AC-021) | 0 blockers, 1 warning fixed (the flow's own ids when the list leaves it out), 2 suggestions fixed (a repeat from an earlier session is marked, not extended; arrow wrapping) | task check passed: api 258 of 258, web 1956 of 1956, core 1254 of 1254 |
| T012 | Builder errors and block panels name flows and blocks, not paths and ids (`builder/problemLabel.ts`; AC-022) | 0 blockers, 2 warnings fixed (a path ending in a list index left a fragment; tests that could not fail on a label mix-up), 2 suggestions fixed; 6 deferred (refusal reasons in fields/blockEnd/blockCondition/blockFields and the analyze findings still show raw ids: owner follow-up) | task check passed: api 258 of 258, web 1975 of 1975, core 1254 of 1254 |
| T013 | Blocker: arguments kept on selection change; an open new line and an edited saved id are saved when the list unmounts, never into a deleted holder (`RowEditors.tsx`) | 0 blockers; 1 warning fixed (no test for the write order), 3 suggestions fixed; the owner's edited-id case fixed in this task | task check passed: api 258 of 258, web 1989 of 1989, core 1254 of 1254 |
| T014 | Blocker: the End's Produced artifact control shows the saved value; a blank value shows a placeholder and the required reason, and a stale saved artifact stays shown (AC-024) | 0 blockers, 1 warning fixed (a stale saved artifact was shown as another one) | task check passed: api 258 of 258, web 1995 of 1995, core 1254 of 1254 |
| T015 | Blockers: the pipeline Name (and every builder edit) states its refusal scope; a keystroke is refused only for a problem at its own path, or a new uniqueness clash (AC-025). The argument loss (AC-023) is not reproduced: owner steps requested | 0 blockers left after review (1 fixed: a repeated artifact label accepted; 1 warning fixed: a misleading round-limit reason; 2 suggestions fixed) | task check passed: api 258 of 258, web 2017 of 2017, core 1254 of 1254 |
| T016 | Blocker: a new argument's id is generated from the typed name (`F-XX` gives `f-xx`); a refused line stays open with the parser's reason, not dropped (AC-026) | 0 blockers; 2 warnings fixed (ui.md description; digit-start test), 2 suggestions fixed (test names); ASCII-id note deferred for owner confirmation | task check passed: api 258 of 258, web 2024 of 2024, core 1254 of 1254 |
| T022 | Owner bugs: rule dropdowns show rule titles (values stay ids); a blank Agent name shows no id on the card, arrow panel or delete title (AC-030) | 0 blockers; 1 warning fixed (delete title test), 1 suggestion fixed; 1 deferred (two blank Agents read `Agent`) | task check passed: api 258 of 258, web 2040 of 2040, core 1272 of 1272 |
| T017 to T021 | Every id is a generated GUID (AC-027, AC-028, AC-029): the parser accepts only GUIDs and keeps uniqueness; command and rule file names come from names (blank and clashing names are blockers); rule tags name rule files; the default pipeline has GUIDs; the builder generates ids and shows no id input; the wizard's rule file line uses core's name. One commit by owner approval | Review of the whole change: 1 blocker fixed (rule-block preview crash), 1 warning fixed (agent name message), comments fixed; the wizard rule name warning resolved by owner decision; 2 owner follow-ups recorded (GUIDs shown in process.md and pipeline.md; the 60-character file-name message) | task check passed: api 258 of 258, web 2032 of 2032, core 1272 of 1272 |
| T002 | Docs: `architecture.md` §1 and §5 name the dev proxy's `/analyze` and `/generate` with the 300-second timeout | 0 warnings; docs only, no test | task check passed: api 251 of 251, web 1916 of 1916, core 1217 of 1217 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- T022 (SUGGESTION, deferred): `source/apps/web/src/builder/blockArrows.ts` `blockName` shows a blank Agent as `Agent` (arrow panel, delete title, Condition subtitle), so two blank Agents read the same. `problemLabel.ts` numbers them (`Agent N`). Numbering would need the block's ordinal passed to `blockName` at every call site; left for a later pass since AC-030 only requires no id.

- T002: `architecture.md` decision 13 (about line 131) still says the Vite dev server forwards `/analyze` only. Outside T002's sections (§1 and §5). Needs the same change in a later docs pass.

- T001 (WARNING, unresolved, needs an owner decision): `source/apps/web/dev-proxy.ts` and AC-004 assume the API maps a blank `PORT` to 3000. It does not: `readPort` in `source/apps/api/src/settings.ts` throws on `''`, on a space-padded value and on a non-numeric value, so the API refuses to start. The proxy follows the approved AC-004 wording (blank gives 3000, any other value is used as given, trimmed), so the two differ for blank and invalid values. Fixing the proxy to throw would contradict AC-004; changing the API is outside T001. Options: (a) the API treats a blank `PORT` as unset (small change in F-14's `settings.ts`, with a test), or (b) amend AC-004 to say the API rejects a blank PORT. Impact is dev-only and limited to a misconfigured `PORT`.

- T003 (SUGGESTION, deferred, by AC-004 wording): `source/apps/web/dev-proxy.ts` `apiPort` passes a non-numeric or out-of-range PORT through as given (for example `abc` gives `http://localhost:abc`), while the API refuses it at start. AC-004 says "any other value is used as given", and the proxy test pins it. Blank and space-padded values agree with the API. Dev-only; a misconfigured PORT fails at the first request.

- T005 (WARNING, unresolved, needs a plan amendment): `source/apps/web/src/wizard/PipelineStep.tsx` lines 233 and 376 show `Generates .claude/commands/${flow.name}.md`, which is no longer the file name (for example `UX` now gives `ux.md`, pinned by `source/apps/web/test/PipelineStep.test.tsx` line 431). Fix: use `flowFileName(flow)` (export it from `source/packages/core/src/pipeline/index.ts`) and update that test. Outside T005's Core file list and outside the two F-04 expectation changes the owner allowed, so not applied here. The task stays `implemented` until it is resolved.

- T005 (note for the owner, AC-015): the implementer's third blocker (a flow whose file name is `pipeline`, `command-file-clash` in `source/packages/core/src/pipeline/analyze/command-file.ts`) is recorded as part of AC-015's clash rule: two generated command files would share one path. AC-015's text should say so (a flow name that gives `pipeline` clashes with the pipeline command). Stories were not changed in this task.

- T005 (SUGGESTION, deferred): `source/templates/README.md` line 89 says `<flow id>.md`. T006 covers it (plan item), so it is not changed here.

- T004 (SUGGESTION, deferred): `source/apps/web/src/analyze/config.ts` imports `toDocument` from `builder/fields.ts`, so the analyze step reaches into a builder module. Moving it to a neutral web module would touch five more files for a naming change only; revisit with the next change to either module.

- T008 (SUGGESTION, deferred): `spec/documents/architecture.md` decision 10 (about line 128) describes the analysis result without `subject`. It is a dated decision record (2026-11-12, updated 2026-11-15), so it is left as recorded; a docs pass can add an update note.

- T008 (note, by plan): the AC-018 web test runs `parseAnalysisReply` on a fixed reply written in the test, not on the API's output, because web must not import the API. The API tests pin the shape (AC-017), so the two halves meet at the same shape.

- T009 (SUGGESTION, deferred): `source/apps/web/src/wizard/state.ts` `defaultPipelineValue()` has no production caller after T009 (tests only). Kept because the plan says it stays for any caller that needs the default; remove it if no caller appears by Verify.

- T009 (SUGGESTION, deferred): no UI render test of step 3 with the empty pipeline. AC-019 is `[auto]` and is proven by the state and parser tests; how the empty Workflow step looks is part of the owner's browser check, so it is not added in this task.

- T010 (WARNING, resolved 2026-11-25 by the owner, who said the parser is not to change and this is a UI issue): the row edits on a flow whose body is blank were not checked against the parser's cross-checks. The web now checks such a flow with a placeholder body (`checkedDocument` in `fields.ts`); the placeholder is never saved, so the saved body stays blank. Tests: `F-16 AC-020` in `builder-rows.test.ts`. Earlier analysis, kept for the record: The parser drops a flow with a blank body, so its argument ids (`checkIdsUnique`), rule tags (`checkRuleTags`) and End artifacts (`checkEndArtifacts`) are not checked while the body is blank. `addFlowRuleTag` with an unknown rule id and `addFlowArgument` with an id that clashes with a pipeline argument both return ok (reproduced in a probe, removed). After the body is typed the saved pipeline fails the parser; the body edit is accepted, as AC-020 requires, so the problem shows at the row only after the body is typed. `/analyze` still answers 422, so no invalid output is generated. The masking predates T010 (the row functions keep the `'document'` scope). Not fixed: a web-side placeholder body would check a body the user has not typed, and a parser change alters core's flow contract. Options: (a) the parser keeps a blank-body flow's cross-checks (core change with tests), or (b) the row checks use a placeholder body and refuse at the row path only.

- T010 (resolved 2026-11-25 by the owner): a refused body over 1000 characters shows the parser's reason under the Body field, as AC-020 says. The device fix of 2026-11-24 still hides the reason for a name with content only. The FlowPanel tests "refuses a body over the limit ..." and "F-11 AC-022 refuses a body of 1001 characters ..." now assert the reason is shown. The key press check keeps a body's refusal while the text has content.

- T012 (known follow-up named by the owner, deferred; not a finding of this review): refusal reasons still show raw ids and paths: `source/apps/web/src/builder/fields.ts` (lines 80, 500, 544, 619), `blockEnd.ts` (line 84), `blockCondition.ts`, `blockFields.ts` (line 133) and `source/apps/web/src/analyze/Findings.tsx` (line 150). Outside T012's scope; left as the owner asked.

- T012 (SUGGESTION, deferred): `source/packages/core/src/pipeline/check/ids.ts` lines 99 and 108 name an argument id (`the id topic is also used at ...`) as the raw id. An argument has no display name, and AC-022 names flows and blocks only; the path part is named.

- T016 (note for the owner, AC-026): the generated id keeps only `[a-z0-9]` (ASCII), as the owner's T016 rule says and as the parser's id charset requires. `flowFileName` keeps Unicode letters and digits, so the two differ on purpose. AC-026 says "each run of characters that is not a letter or digit", which read literally would keep `é` and give an id the parser refuses (`Café` stays on the line). The owner should confirm the ASCII reading, or amend AC-026 to say `[a-z0-9]`. Impact: names with non-ASCII letters only.

- T012 (SUGGESTION, deferred): `source/apps/web/src/builder/problemLabel.ts` rewrites a quoted pipeline field path to `pipeline` (`pipeline.name is blank` gives `pipeline is blank`), as AC-022 says ("pipeline for a pipeline field"). The field name is lost from the message; a clearer wording needs an owner decision on the text.

- T012 (SUGGESTION, deferred): `problemLabel.ts` matches every flow and block id as a whole word in a message. Block ids are generated (`nextBlockId`), so an id that is an ordinary word is unlikely; the rewrite is visible only when an id differs from its name.

- T012 (SUGGESTION, deferred): a path that names a flow the pipeline does not have (for example `pipeline.flows.7`) is located at `pipeline`, not at a flow. Core does not produce such a path for a parsed pipeline; the fallback is pinned by a test.

- T012 (SUGGESTION, deferred): some added lines in `source/apps/web/test/ErrorPanel.test.tsx`, `PipelineStep.test.tsx` and `builder-problem-label.test.ts` are longer than 120 characters. The repository has no formatter configured and existing test files have longer lines too; not reflowed in this task.

- T017 to T020 review (2026-11-25, owner decision: every ID is a GUID) (WARNING, unresolved, needs an owner decision): the wizard's F-10 rule id (`source/apps/web/src/wizard/technical.ts` `ruleId`, AC-014, AC-016, AC-019) is still ASCII-only and keeps leading and trailing hyphens. It drives the rule file line shown on the block, the duplicate number, and the rule list of the builder (`PipelineStep.tsx` `builderRules`). The generated file uses core's `fileNameOf` (F-16 AC-029, the flow rule). So for `Testing!` the block shows `.claude/rules/testing-.md`, and the file written is `testing.md`; for `Café` the block shows `caf-.md`, and the file is `café.md`. Fixing it changes the F-10 AC-014 and AC-016 rules and their tests, so the owner decides. The preview (`analyze/tree.ts`) and the analysis (`command-file-clash`) do not depend on it: both use the core name.
- T017 to T020 review (SUGGESTION, deferred): `source/packages/core/src/pipeline/generate/values-flow.ts` `flowValues` and `values-agent.ts` `agentValues` take `rules` with the default `[]`. A tag then names no rule and throws, which is loud, but the parameter could be required; the test call sites (about 90) would change, so it is kept as is.
- T017 to T020 review (SUGGESTION, deferred): `source/packages/core/src/pipeline/generate/values-base.ts` the process list still writes each flow's id in backticks after its name (F-05 AC-029 asks for the id). The id is a GUID now, so the line is long; the owner may want the name only. Not changed: the criterion says id.

---

- T013 (note): the unmount commit of an open line reads the step's current pipeline (`CurrentPipelineContext`, set in `PipelineStep` by a layout effect), and skips the line when its flow or Agent block was deleted in the same step. Before this, a deleted block or flow was written back with the line (`PipelineStep.test.tsx`, F-16 AC-023 negative cases).

## Test Results

_Criteria coverage matrix and manual checklist outcome._

Verify run 2026-11-24 (QA, verify mode, after the US-004 bug fix: AC-011 to AC-016). Branch `main`, working tree clean at start.

**Preconditions**: branch `main` and clean tree pass. Plan tasks T001 to T007 are ticked and committed (latest `1158dfe`). `Current Task` reads None. Build is complete (7 of 7).

**Check run** (`source/scripts/task-check.sh`, exit 0, no timeouts; log at `/private/tmp/claude-501/-Users-vyacheslavkozyrev-Projects-SDDBuilder/66b1aef7-4def-458a-9ec2-b298ecb92676/scratchpad/check.log`):

| Package | Test files | Tests |
| ------- | ---------- | ----- |
| api | 17 of 17 | 251 of 251 |
| web | 84 of 84 | 1922 of 1922 |
| core | 60 of 60 | 1254 of 1254 |

Typecheck passed for all workspaces. Total: 3427 tests passed, 0 failed.

**Acceptance criteria matrix** (F-16 tests counted in the run: 70 cases, all passing: web 27, api 6, core 37)

| Criterion | Tag | Covering tests (file › test name) | Result |
| --------- | --- | --------------------------------- | ------ |
| AC-001 | auto | `source/apps/web/test/dev-proxy.test.ts` › `F-16 AC-001 forwards /analyze to the API`, `... /generate to the API`, `... /analyze?debug=1 to the API`, `... targets http://localhost:<PORT> for env {}`, `... for env {"PORT":"3000"}`, `... for env {"PORT":"4100"}` | pass (6 tests) |
| AC-002 | auto | `source/apps/web/test/dev-proxy.test.ts` › `F-16 AC-002 does not forward /`, `... /generate/x`, `... /analyzer`, `... /analyze/x`, `... /src/main.tsx`, `... /api/analyze`; `F-16 AC-002 negative case: the proxy has entries for /analyze and /generate only` | pass (7 tests) |
| AC-003 | auto | `source/apps/web/test/dev-proxy.test.ts` › `F-16 AC-003 sets 300000 ms on ^/analyze(\?.*)?$`; `... on ^/generate(\?.*)?$` | pass (2 tests) |
| AC-004 | auto | `source/apps/web/test/dev-proxy.test.ts` › `F-16 AC-004 gives the target for PORT unset`, `... empty`, `... only spaces`, `... a port value`, `... a port with surrounding spaces`, `... a value used as given, not validated`; `source/apps/api/test/settings.test.ts` › `F-16 AC-004 PORT matches the dev proxy` (empty, only spaces, 8080 with spaces, refusals of 0, 80.5, abc naming PORT) | pass (6 web, 6 API) |
| AC-011 | auto | `source/apps/web/test/analyze-config.test.ts` › `F-16 AC-011 has no index key at any level for the default pipeline and two rule blocks`; `... for a filled-in state with arguments, flows and rule tags`; `F-16 AC-011 keeps the list order and the other keys of the configuration` | pass (3 tests) |
| AC-012 | auto | `source/apps/web/test/analyze-config.test.ts` › `F-16 AC-012 is accepted by parseProjectConfig for a filled-in state, with the same pipeline and rules back`; `... for the default pipeline with no rule blocks` | pass (2 tests) |
| AC-013 | auto | `source/packages/core/test/pipeline/command-file.test.ts` › `F-16 AC-013 names the command file of the flow name ...` (19 cases: "Specify" to "specify", "Review code" to "review-code", "  Build  ", "!Build!", "a  --  b", "Build 日本", "---" and others); `... names the command file from the name, not from the flow id`; `... keeps the flow id in the content, while the file takes the name` | pass (21 tests) |
| AC-014 | auto | `source/packages/core/test/pipeline/command-file.test.ts` › `F-16 AC-014 refuses the name "---"` (and "?!", "½ ²", a combining mark only); `... is reported by the refusal gate, so generation refuses the config`; `... leaves a blank name to the flow-name rule only`; `... has no finding for a name with a letter or digit` | pass (7 tests) |
| AC-015 | auto | `source/packages/core/test/pipeline/command-file.test.ts` › `F-16 AC-015 refuses "Build" and "build!"`, `... "Review code" and "review  code"`, `... "Specify" and "SPECIFY"`; `... is reported by the refusal gate, so generation refuses the config`; `... has no finding for two flows with different file names`; `... has no finding for two names whose non-ASCII letters give different file names`; `... gives the clash for each later flow with the same file name`; `... refuses a flow whose file name is pipeline, the pipeline command file` | pass (8 tests) |
| AC-016 | auto | `source/packages/core/test/pipeline/command-file.test.ts` › `F-16 AC-016 lists every flow command file under the name its file list path has`; `source/apps/web/test/PipelineStep.test.tsx` › `F-16 AC-016 a flow named "Build Code" shows build-code.md as its command file` | pass (2 tests) |
| AC-005 | device | Manual checklist item 1 | pending |
| AC-006 | device | Manual checklist item 2 | pending |
| AC-007 | device | Manual checklist item 3 | pending |
| AC-008 | device | Manual checklist item 4 | pending |
| AC-009 | device | Manual checklist item 5 | pending |
| AC-010 | device | Manual checklist item 6 | pending |

Gaps: none for the `[auto]` criteria (AC-001 to AC-004, AC-011 to AC-016). Failing tests: none.

Note: AC-014 and AC-015 are proven at the refusal gate (`configProblems` in core, which `generate/plan.ts` calls before any model call). No API test names them directly; the 422 reply shape is F-15's (`generate-route.test.ts`).

Scope check (`spec/documents/features.md` F-16): "the step sends the configuration, shows findings, generates and downloads" is covered by AC-011 and AC-012 (the request body the step sends), AC-005 and AC-007 (findings, generate and download, on the checklist), and AC-001 to AC-004 (the calls reach the API).

**Manual checklist**: `spec/specifications/F-16-api-ui-integration/checklist.md`, 6 items, all pending, to be run again on the fixed app (the steps are unchanged for the fix). Verify is **AWAITING CONFIRMATION** for these items; it is not complete.

---

## Amendments

```
### Amendment — 2026-11-25 (owner bugs: rule dropdowns show ids; new Agent shows its id)
**Changed**: stories.md gains US-014 (AC-030, R-16-15); plan.md gains T022.
**Reason**: the rule dropdowns show the rule ids and a new Agent shows its id while its name is blank.
**Impact**: Build reopens for T022; Verify re-runs.
```

```
### Amendment — 2026-11-25 (owner decision: every ID is a generated GUID)
**Changed**: stories.md gains US-013 (AC-027, AC-028, AC-029, R-16-14); plan.md gains T017 to T021.
**Reason**: the owner asked that the user never types an ID, to avoid confusion with names. Command and rule file names come from names.
**Impact**: Build reopens for T017 to T021; the core model, parser, generator, default template, builder and docs change; tests that used word ids change to GUIDs; Verify re-runs.
```

```
### Amendment — 2026-11-25 (owner blocker: argument named F-XX dropped silently)
**Changed**: stories.md gains US-012 (AC-026, R-16-13); plan.md gains T016.
**Reason**: the argument id must be lowercase; a new line with capitals is refused and dropped with no message. This is the argument loss the owner reported.
**Impact**: Build reopens for T016; Verify re-runs.
```

```
### Amendment — 2026-11-25 (owner blockers: pipeline name cannot be typed; arguments still lost)
**Changed**: stories.md gains US-011 (AC-025, R-16-12); plan.md gains T015.
**Reason**: the owner reports the pipeline name cannot be typed, and the argument loss of AC-023 is still in the browser after T013.
**Impact**: Build reopens for T015; Verify re-runs.
```

```
### Amendment — 2026-11-25 (owner blocker: End artifact shows a value that is not saved)
**Changed**: stories.md gains US-010 (AC-024, R-16-11); plan.md gains T014.
**Reason**: the Produced artifact dropdown shows the first artifact while the saved value is blank; the analysis is then refused.
**Impact**: Build reopens for T014; Verify re-runs.
```

```
### Amendment — 2026-11-25 (owner blocker: arguments lost on selection change)
**Changed**: stories.md gains US-009 (AC-023, R-16-10); plan.md gains T013.
**Reason**: arguments added in the builder are gone after another block is selected and the first is selected again, for any block and the pipeline.
**Impact**: Build reopens for T013; Verify re-runs.
```

```
### Amendment — 2026-11-25 (owner request: error messages name flows and blocks)
**Changed**: stories.md gains US-008 (AC-022, R-16-9); plan.md gains T012.
**Reason**: the builder's error list shows paths and block ids (`pipeline.flows.1.blocks.0.id`, `block-1`).
**Impact**: Build reopens for T012; Verify re-runs.
```

```
### Amendment — 2026-11-25 (owner blocker: block ids repeat across flows)
**Changed**: stories.md gains US-007 (AC-021, R-16-8); plan.md gains T011.
**Reason**: a block added to a second flow reused an id of the first flow (`block-1`), and the parser requires every block id unique in the pipeline.
**Impact**: Build reopens for T011; Verify re-runs.
```

```
### Amendment — 2026-11-25 (owner blocker: flow body cannot be typed into)
**Changed**: plan.md gains T010 (reproduce and fix the flow body input).
**Reason**: the owner reports the Body field of the flow properties panel cannot be typed into.
**Impact**: Build reopens for T010; Verify re-runs.
```

```
### Amendment — 2026-11-25 (owner decision: empty in the UI, parser unchanged)
**Changed**: AC-019 and T009 state that a new project has no flows in the UI and the parser refuses it until a flow and a name are added; no core change.
**Reason**: the parser refuses an empty pipeline (blank name; at least one flow, F-02 AC-086). The owner chose to keep the parser and start the UI empty.
**Impact**: T009 re-runs with the amended AC-019.
```

```
### Amendment — 2026-11-25 (owner request: empty pipeline for a new project)
**Changed**: stories.md gains US-006 (AC-019, R-16-6); plan.md gains T009.
**Reason**: the owner asked that a new project start with no default pipeline.
**Impact**: Build reopens for T009; the F-11 test for the default pipeline on a new project changes.
```

```
### Amendment — 2026-11-25 (owner bug report: 200 reply shows an error)
**Changed**: stories.md gains US-005 (AC-017, AC-018, R-16-5); plan.md gains T008 (the API adds `subject` to each finding).
**Reason**: a 200 reply was shown as an error because the structural findings had `rule` and `path` but no `subject`, which the web parser requires. The owner chose the API side.
**Impact**: Build reopens for T008; the F-14 route and analysis tests that pinned the old finding shape change with it. Verify re-runs.
```

```
### Amendment — 2026-11-24 (T005 review: AC-015 clash, web subtitle)
**Changed**: stories.md AC-015 also refuses a flow whose file name is `pipeline`; plan.md gains T007 (the pipeline step's subtitle shows the real file name, with the core export and the pinned namespace list).
**Reason**: T005 review found the clash with the pipeline command file, and a subtitle that still showed the flow name. The owner approved both.
**Impact**: T007 is a new task; T006 (docs) and T007 follow T005.
```

```
### Amendment — 2026-11-24 (owner bug report: 400 and file names)
**Changed**: stories.md gains US-004 (AC-011 to AC-016, R-16-4); plan.md gains T004 to T006.
**Reason**: the owner's analyze request for a real project returned 400 because the web app sends `index` keys, which `spec/documents/pipeline-schema.md` does not define. The owner also asked that command files take the flow name (`specify.md`, not `flow-1.md`). Approved by the owner.
**Impact**: Build reopens for T004 to T006. Verify re-runs, and the earlier checklist (AC-005 to AC-010) is run again on the fixed app.
```

```
### Amendment — 2026-11-24 (PORT rule, owner decision)
**Changed**: `plan.md` gains T003 (the API's `readPort` treats a blank PORT as unset, so 3000 applies, as the proxy does). F-14's `settings.ts` is changed in T003, with its test.
**Reason**: review of T001 found that the API refuses a blank or space-padded PORT, while the proxy used 3000. The owner chose option (a): the API treats blank as unset.
**Impact**: T003 only. The F-14 test that asserts a blank PORT is refused changes with it.
```
### Amendment — 2026-11-25 (owner decision: a rule file name is core's rule, T020)
**Changed**: F-10 AC-014 and AC-016 tests (and their AC-015 and AC-019 tests, where the same names changed) now expect core's `ruleFileName` (F-16 AC-029) in `source/apps/web/src/wizard/technical.ts`: `Testing!` shows `testing`, `Café` shows `café`, `2 tests` shows `2-tests` with no message; the start-with-a-letter message is removed. `pipeline.ruleFileName` is exported from core and pinned in the F-02 AC-089 namespace test.
**Reason**: the wizard showed the ASCII id (`testing-.md`) while the generator wrote `testing.md`, so the file line did not match the file written.
**Impact**: T020 only; the no-letter-or-digit blocker stays (the wizard shows no file name and the analysis reports it). Verify re-runs the F-10 rule-block checks.
```

```

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
