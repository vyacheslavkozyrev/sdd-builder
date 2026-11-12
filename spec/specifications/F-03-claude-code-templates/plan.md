# Implementation Plan — Claude Code templates (F-03)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Core code is under `packages/core/`; tests in `packages/core/test/`. Template checks read `templates/` from the repository root in tests only (the core source does no file I/O). Every test name carries `F-03 AC-###`.

## Tasks

- [x] T001 [Core] Optional `description` on `Workflow` and `StepDefinition`: the user's high-level description of what the block should do. Unset means "no description" for workflows and the catalog summary for steps. No other validation (length caps are F-13) — `packages/core/src/model.ts`, `packages/core/test/model.test.ts` — covers none (prerequisite for AC-016; added beyond the approved stories, see Rationale)
- [x] T002 [Core] Catalog rule tag `typescript.md` becomes `code.md` on Implement and Code review; F-02 test fixtures and assertions updated to the new tag — `packages/core/src/catalog.ts`, `packages/core/test/fixtures-templates.ts`, `packages/core/test/step-files.test.ts`, `packages/core/test/model.test.ts` — covers AC-015
- [x] T003 [Core] Script steps render `steps/<id>/script.md` to `scripts/<id>.sh`; the `base/task-check.sh` entry leaves the base files, so no script is ever read from a template — `packages/core/src/render/step-files.ts`, `packages/core/src/generate.ts`, `packages/core/test/step-files.test.ts`, `packages/core/test/generate.test.ts`, `packages/core/test/fixtures-templates.ts` — covers AC-008 (script kind), AC-011 (generator side)
- [x] T004 [Templates] Base layouts `templates/base/CLAUDE.md` and `templates/base/process.md`: sections Overview, Layout, Working rules, Commands and agents, Rules (in that order); `process.md` has a "Process diagram" section for the Mermaid view. Stack-neutral, taken from ComEd and PhotoSync — `templates/base/CLAUDE.md`, `templates/base/process.md`, `packages/core/test/templates-base.test.ts` — covers AC-001 (CLAUDE and process files), AC-002, AC-003
- [x] T005 [Templates] Spec template layouts `templates/base/spec-template/{stories,plan,progress}.md`, byte-identical to `spec/specifications/F-00-template/`; a test compares each pair — `templates/base/spec-template/*.md`, `packages/core/test/templates-base.test.ts` — covers AC-001 (spec template part), AC-004
- [x] T006 [Templates] Workflow layout `templates/workflows/workflow.md`: sections Purpose, Steps, Rules, Scope; only the five workflow placeholders; no catalog step id as fixed text. A test lists every `{{…}}` name and fails on any other — `templates/workflows/workflow.md`, `packages/core/test/templates-workflow.test.ts` — covers AC-005, AC-006, AC-007
- [x] T007 [Templates] Command layouts `templates/steps/{define-feature,refine,plan,commit,release}/command.md`, each with the sections Purpose, Inputs, Outputs, Rules, Checks and a frontmatter `description`; test checks each step id in the catalog has its layout — `templates/steps/*/command.md`, `packages/core/test/templates-steps.test.ts` — covers AC-008, AC-009, AC-010 (command part)
- [x] T008 [Templates] Agent layouts `templates/steps/{implement,code-review,verify}/agent.md` with frontmatter `name`, `description`, `tools` and the five sections; test parses each frontmatter block — `templates/steps/*/agent.md`, `packages/core/test/templates-steps.test.ts` — covers AC-008, AC-009, AC-010 (agent part)
- [x] T009 [Templates] Script layouts `templates/steps/{unit-tests,e2e-tests}/script.md`: the five sections; the Checks section names what the script verifies and contains no command — `templates/steps/*/script.md`, `packages/core/test/templates-steps.test.ts` — covers AC-008, AC-009 (script part)
- [x] T010 [Templates] Rule layouts `templates/rules/{general,qa,code}.md` with their sections; `code.md` holds `{{codeRules}}` and `{{testRules}}`; no code sample in any rule layout — `templates/rules/*.md`, `packages/core/test/templates-rules.test.ts` — covers AC-013, AC-014
- [x] T011 [Core] `planGeneration(config, templates)`: for each file `generate` returns, an entry with its path, its rendered layout, its block description (`description`, else the catalog summary for steps, else empty) and its rule-set tags, in the file-list order; the same config gives the same entries — `packages/core/src/plan.ts`, `packages/core/src/index.ts`, `packages/core/test/plan.test.ts` — covers AC-016, AC-017
- [x] T012 [Core] Tests for the input's refusals and selection: a disabled step has no entry and a required step always has one; an invalid configuration throws `InvalidConfigError` with no entries; an enabled step with no layout fails naming the step id. No new code expected — `packages/core/test/plan.test.ts` — covers AC-018, AC-019, AC-020
- [x] T013 [Core] `checkReply(plan, reply)`: returns findings and never throws; narrows the reply to a map of strings (empty, non-object or non-string values give findings); reports missing and extra files in one pass; reports `{{`, `}}` and `{{#step:` left in a file; refuses unsafe paths (leading slash, `..`, backslash) — `packages/core/src/reply-check.ts`, `packages/core/src/index.ts`, `packages/core/test/reply-check.test.ts` — covers AC-021, AC-022, AC-023, AC-026, AC-027
- [x] T014 [Core] `checkReply` part 2: required headings of each Markdown entry's layout must appear exactly (after trimming) — applies to `.md` outputs only; a `.sh` output is not checked for headings; SDDBuilder paths (`apps/web`, `apps/api`, `packages/core`, `SDDBuilder`) are findings; findings sorted by path then message; the same reply gives the same findings — `packages/core/src/reply-check.ts`, `packages/core/test/reply-check.test.ts` — covers AC-024, AC-025, AC-028
- [x] T015 [Core] Template scans: no file under `templates/` named `.sh`, `.ps1`, `.bat`, `.py`, `.js` or `.ts`; no shebang; no word from the banned list in the stories (fixed constant in the test; the test reports file and word); every placeholder used in any layout is in `templates/README.md` — `packages/core/test/templates-scan.test.ts` — covers AC-011, AC-012, AC-006 (all layouts)
- [x] T016 [Docs] Test that every source in the Claude Code layout table of `templates/README.md` exists under `templates/` (or is a `scripts/` output from a `script.md` layout) — `packages/core/test/templates-readme.test.ts` — covers AC-029
- [ ] T017 [Docs] Describe the generation input and the reply check in `spec/documents/architecture.md` §3, and the block description field in `spec/documents/building-blocks.md` — `spec/documents/architecture.md`, `spec/documents/building-blocks.md` — covers none (documentation for T001, T011, T013, T014)

## Rationale

**Order.** T001 and T002 change the model and the catalog first, because the templates and the input depend on them. T003 removes the script template from the generator before any layout is written, so no task can reintroduce a template script. The layouts come next (T004–T010), since the input (T011) reads them and the reply check (T013–T014) checks files derived from them. T015 and T016 scan the finished templates. T017 updates the documents last, once the code they describe exists.

**Not in the stories (needs your approval).** T001 adds an optional `description` to workflows and steps. AC-016 requires "the block description", and the approved stories did not say where it is stored. Without a field, the description a user writes in the builder has nowhere to go. The field is optional, so `schemaVersion` stays 1, and it is not validated beyond being a string. If you prefer the catalog summary as the only description, T001 is dropped and T011 uses the summary alone.

**Reading of AC-024.** The required-heading check applies to Markdown outputs only. A shell script has no sections to check, so headings are checked for `.md` entries only. This is the reading used in T014.

**Dependencies on other features.** F-02 is complete. F-03 changes two of its behaviours: the base files no longer include a script (T003), and the rule tag changes (T002). Both are covered by F-02's tests in T002 and T003. F-07 (the model call, the retry and the API route) is not part of this plan.

**Libraries.** None added. Template checks use Vitest and Node's `fs` in test code only.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Core]` | `packages/core`: model, catalog, input and reply check (architecture §1) |
| `[Templates]` | Layout files under `templates/` |
| `[Docs]` | Documentation changes required by the feature |
| `[Build]` | Project setup, manifests, scripts |
