# Progress — Pipeline model and the default pipeline (F-02)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-19 | 17 stories, 88 criteria, all [auto]; re-specified from the final schema and approved by the user |
| UX       | ➖ Not needed |  | No user interface (F-02 to F-06) |
| Plan     | ✅ Complete | 2026-11-19 | Approved by the user; 20 tasks (T001 to T020) |
| Build    | 🔄 In Progress | 2026-11-19 | 7 of 20 tasks committed |
| Verify   | ⏳ Pending |  | reset 2026-11-19: to be re-specified from the final schema and architecture |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

_None. While a task is in flight, this holds its ID and the step reached: `implemented`, `reviewed` or `tested`. Cleared in the commit that completes the task._

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Model types, problem collector and value rules (`pipeline/model.ts`, `pipeline/check/primitives.ts`) | 0 blockers; 3 warnings fixed (test labels; dead export removed); 1 suggestion fixed (singular message) | task check passed: core 64, api 6, web 4 |
| T002 | Parser entry, root object and key rules (`pipeline/parse/project.ts`, `pipeline/parse/index.ts`) | 0 blockers; 2 warnings fixed (unknown keys and the missing-key order tested); 2 suggestions fixed (value named in the schemaVersion message; undefined input) | task check passed: api 6, web 4, core 87 |
| T003 | Rules and brief fields (`pipeline/parse/rules.ts`, `pipeline/parse/brief.ts`) | 0 blockers; 4 warnings fixed (conditional assertions split; dropping and no-throw tested; emoji limits for idea and architecture) | task check passed: api 6, web 4, core 131 |
| T004 | Argument rows (`pipeline/parse/argument.ts`) | 0 blockers; 0 warnings; 2 test-gap suggestions fixed; 1 suggestion deferred (shared key-loop helper) | task check passed: api 6, web 4, core 167 |
| T005 | Start and End blocks (`pipeline/parse/start.ts`, `pipeline/parse/end.ts`) | 0 blockers; 1 warning fixed (missing negative and edge tests); 1 suggestion deferred (shared key loop) | task check passed: api 6, web 4, core 212 |
| T006 | Condition block and routes (`pipeline/parse/condition.ts`, `pipeline/parse/route.ts`) | 0 blockers; 0 warnings; 2 suggestions fixed (test labels) | task check passed: api 6, web 4, core 255 |
| T007 | Agent block and the text and tag lists (`pipeline/parse/agent.ts`, `pipeline/parse/lists.ts`) | 0 blockers; 0 warnings open; 3 warnings and 3 suggestions fixed (emoji limits, repeats, list-field types) | task check passed: api 6, web 4, core 310 |

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

- T009 (`source/templates/pipeline/default.json`, flow `specify` block `specify-start`): the Start block's link label is `feature-id`, an argument name, while decision 33 types a block link label as an artifact. §11 names no label for block links. Not changed: the label is the implementer's choice and is only a naming question for the owner.

- T010 (`source/templates/pipeline/default.json`, flow `build`, block links `build-implement` → `change`, `build-review` → `review`, `build-test` → `test report`, `build-start` → `task-id`, `build-commit` → `commit`): the labels are not artifacts, as decision 33 types them, and §11 names none. Same question as T009. Not changed: owner to decide.

- T011 (`source/templates/pipeline/default.json`, the `build` → `verify` gate): architecture §11 asks for a false output that stops, on the flow link. Decision 33's `Gate` has no route field and refuses unknown keys, and the decision says a gate's fail output stops the process, so the link carries no route and the stop is implicit. Not changed: a route on a gate would change decision 33; owner to confirm.

- T012 (`source/packages/core/test/pipeline/purity.test.ts`, `FORBIDDEN`): the scan covers exactly the six modules that AC-035 names. Other I/O modules, such as `fs/promises`, `node:fs/promises` and `node:process`, are not flagged, so a file could import them and pass. Not changed: the list is the criterion's, and widening it is a spec change the owner should decide. No core file imports them today.

- T013 (`source/packages/core/src/pipeline/index.ts`): the namespace does not export the type `ParseResult` that `parseProjectConfig` returns, so an API caller cannot name the result type without `ReturnType`. The plan lists the exact names the namespace exposes (model types, `parseProjectConfig`, `defaultPipeline`), so the type is not added. Owner or the API task (F-03 onward) to decide whether it joins the namespace. Not changed.

- T004 (`source/packages/core/src/pipeline/parse/argument.ts`, `readArgument`; `source/packages/core/src/pipeline/parse/rules.ts`, `readRule`): the unknown-key and missing-key loops are duplicated between the argument and rule readers, and a shared helper would serve the flow, block and agent readers too. Not changed: the shared helper would edit committed T003 code, which is outside T004's scope; take it with the next task that adds a keyed row reader.

- T005 (`source/packages/core/src/pipeline/parse/start.ts` `readStart` and `source/packages/core/src/pipeline/parse/end.ts` `readEnd`): the unknown-key and missing-key loops repeat the T004 pattern a third time. A shared helper would need the unknown-key path to be the key's path (AC-044, AC-063), which differs from the row readers' block-path report, so unifying them changes T004 behaviour. Not changed: owner or the next task that touches the row readers to decide.

- T006 (`spec/specifications/F-02-pipeline-model/stories.md` AC-058): the criterion says an unknown key on a route is refused "with the path of the route". The code, following T005 and AC-008, reports it at the key's path (for example `...true.gate`). Kept by the owner's decision on 2026-11-19. Owner to amend the wording of AC-058 to match. Not changed: the criterion text is the owner's.

---

## Test Results

Verify run 2026-11-16 on `main`, clean tree, Current Task None, 13 of 13 tasks ticked.

**Suite:** `source/scripts/task-check.sh` passed (exit 0): core 438 tests in 16 files, api 6 in 3, web 3 in 2. The F-02 tests are in `source/packages/core/test/pipeline/` (418 tests in 12 files, run verbosely: all passed).

**Gaps:** none. **Failures:** none. **Manual checklist:** none, because all 35 criteria are `[auto]`; no `checklist.md` is written.

**Scope (`features.md` F-02):** `ProjectConfig` schema 2 with one pipeline (AC-001 to AC-003); flows hold blocks, five kinds (AC-006 to AC-014); `connectedTo` connections and flow gates (AC-016 to AC-020); decision 33 schema (AC-004 to AC-029); problems with paths and unknown keys refused (AC-004, AC-028, AC-029); default pipeline loaded as data at build time (AC-030 to AC-033). All covered.

Counts are the passing runs of tests naming the criterion (a table-driven test counts once per row).

| Criterion | Tag | Covering tests (file: test name, abridged) | Passing runs | Result |
|---|---|---|---|---|
| AC-001 | auto | pipeline.test: returns the typed config for a full fixture with rules and one pipeline | 2 | pass |
| AC-002 | auto | project.test: refuses 1, 3, "2", missing and null at schemaVersion | 10 | pass |
| AC-003 | auto | project.test: refuses null, array, string, number, boolean, undefined with one root problem | 12 | pass |
| AC-004 | auto | project.test (root, rule); pipeline.test (pipeline, argument); flow.test (flow, link, gates); link.test (link, route); block-simple.test (start, approval, end); block-agent-check.test (agent, check) | 53 | pass |
| AC-005 | auto | block-simple.test: refuses connectedTo on an End; block-agent-check.test: refuses outcome on an agent; refuses threshold on a checks check | 8 | pass |
| AC-006 | auto | pipeline.test: refuses a pipeline without name, description or flows; refuses blank name or description | 30 | pass |
| AC-007 | auto | flow.test: refuses a flow without id, name, description, arguments or blocks; accepts a flow with every key in array order | 13 | pass |
| AC-008 | auto | pipeline.test: accepts arguments with id, required, hint; refuses a required that is not a boolean | 22 | pass |
| AC-009 | auto | block-simple.test: accepts start, approval, end; refuses kind connection, gate, Start, empty, 3, null, missing | 20 | pass |
| AC-010 | auto | block-agent-check.test: refuses an agent with no name, description or arguments; accepts file-safe names; ids.test: refuses a repeated agent name at the second agent | 58 | pass |
| AC-011 | auto | block-simple.test: refuses a blank or missing Approval description | 10 | pass |
| AC-012 | auto | block-agent-check.test: refuses a check with no true output, no false output, neither; refuses a blank description | 24 | pass |
| AC-013 | auto | block-agent-check.test: refuses threshold 0, -1, 1.5, "10", null on diff size; accepts 1 and 400; refuses threshold on checks | 26 | pass |
| AC-014 | auto | block-simple.test: accepts done and stopped; refuses other outcomes and missing outcome; producedArtifact optional text | 28 | pass |
| AC-015 | auto | flow.test: accepts an empty blocks array | 1 | pass |
| AC-016 | auto | link.test: refuses a key other than to and label (gate); refuses a blank or missing label; flow.test: refuses a flow link without label | 32 | pass |
| AC-017 | auto | flow.test: accepts an approval gate with description; refuses one without description; refuses threshold on a checks gate; refuses a gate of any other kind | 9 | pass |
| AC-018 | auto | link.test: refuses round limit 0, -1, 1.5, "2", null; refuses a route with both to and stop, or neither; refuses a round limit on a stop route | 32 | pass |
| AC-019 | auto | link.test: accepts Start and Approval without connectedTo; block-agent-check.test: accepts an agent without connectedTo; refuses a check without connectedTo | 18 | pass |
| AC-020 | auto | flow.test: accepts a flow with no connectedTo and leaves the link out | 1 | pass |
| AC-021 | auto | primitives.test: accepts a, specify, feature-id-2; refuses uppercase, leading digit, underscore, space, dot, empty, leading hyphen, number, missing | 44 | pass |
| AC-022 | auto | ids.test: refuses a clash across flows, blocks and arguments at the second occurrence; reports every clash in document order | 24 | pass |
| AC-023 | auto | project.test: refuses a rule id equal to an earlier one, at the second rule | 6 | pass |
| AC-024 | auto | pipeline.test: accepts 1,000 and refuses 1,001 characters at pipeline.body; flow.test: accepts 1,000 emoji; block-agent-check.test: counts code points; primitives.test: body cap | 36 | pass |
| AC-025 | auto | pipeline.test, flow.test, block-agent-check.test: refuses a blank or duplicate entry in tools, reads, writes, ruleTags, with its path | 64 | pass |
| AC-026 | auto | pipeline.test, flow.test, block-agent-check.test: accepts haiku, sonnet, opus, inherit; refuses other values; primitives.test: model values | 53 | pass |
| AC-027 | auto | project.test: refuses a rule with a blank or missing id, title or text, and an unknown rule key | 22 | pass |
| AC-028 | auto | project.test: returns every problem with path and message; keeps the problems in written key order | 8 | pass |
| AC-029 | auto | project.test: returns problems and no config for undefined, a symbol, NaN, a string, rules as a string, a hole, and others | 20 | pass |
| AC-030 | auto | default-data.test: parses default.json with parseProjectConfig and reports no problems | 2 | pass |
| AC-031 | auto | default-data.test: lists specify, ux, plan, build, verify, complete; one start per flow; §11 gates on build and verify; build block order | 8 | pass |
| AC-032 | auto | default-data.test: includes feature-id as a required argument | 2 | pass |
| AC-033 | auto | default-import.test: deep-equals the parsed content of templates/pipeline/default.json | 2 | pass |
| AC-034 | auto | namespace.test: the root exposes pipeline; the root exports no other pipeline name; the namespace exposes the functions, values and types | 12 | pass |
| AC-035 | auto | purity.test: finds no forbidden import under src; scanner flags and accepts fixtures | 28 | pass |

Naming notes (not gaps): the flow.test.ts titles for AC-007, AC-015, AC-017 and AC-020 carry the ID in their `describe` block, so the full test name carries it. The AC-009 acceptance of agent and check kinds is proven through the AC-010 and AC-012 tests, not by an AC-009-named test.

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
