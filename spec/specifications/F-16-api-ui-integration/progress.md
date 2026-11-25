# Progress — API and UI integration (F-16)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-24 | Approved by the user; 3 stories, 10 criteria: 4 `[auto]`, 6 `[device]` (the owner's checks in the browser with a real key) |
| UX       | ➖ Not needed |  | No new screens: the analyze step is approved in F-13 |
| Plan     | ✅ Complete | 2026-11-24 | Approved by the user; 2 tasks (T001 to T002); 10 criteria: 4 `[auto]` covered by T001, 6 `[device]` on the Verify checklist |
| Build    | ✅ Complete |      | 9 of 9 tasks committed (T004 to T009 added by Amendments 2026-11-24 and 2026-11-25) |
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
| T002 | Docs: `architecture.md` §1 and §5 name the dev proxy's `/analyze` and `/generate` with the 300-second timeout | 0 warnings; docs only, no test | task check passed: api 251 of 251, web 1916 of 1916, core 1217 of 1217 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

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

---

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

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
