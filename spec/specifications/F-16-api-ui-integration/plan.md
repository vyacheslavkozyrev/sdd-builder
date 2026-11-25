# Implementation Plan — API and UI integration (F-16)

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

Paths are relative to the repository root. Web tests live in `source/apps/web/test/` (Vitest, logic only). Each test name carries `F-16 AC-0xx`. No test starts a server, calls the network or reads the wall clock. The `[device]` criteria (AC-005 to AC-010) are not tasks: they go to the manual checklist in Verify.

## Tasks

- [x] T001 [Web] Dev proxy: the proxy settings move out of `source/apps/web/vite.config.ts` into a pure module `source/apps/web/dev-proxy.ts` that exports `devProxy(env)` with the target from `PORT` (unset or blank gives 3000, any other value is used as given, as the API reads it), a proxy entry for `/analyze` and one for `/generate`, each with `timeout` and `proxyTimeout` of 300000 ms, and no entry for any other path; `vite.config.ts` calls it with `process.env`; `source/apps/web/test/dev-proxy.test.ts` (table-driven, with plain objects as `env`: both paths forwarded to `http://localhost:<PORT>`; another path, `/`, `/generate/x` and `/analyzer`, has no entry; the timeouts are 300000 on both entries; unset, blank and a value give the expected target) — covers AC-001, AC-002, AC-003, AC-004
- [x] T003 [API] PORT rule matches the proxy: `source/apps/api/src/settings.ts` `readPort` treats a blank PORT (empty or only spaces) as unset and gives 3000, and trims any other value before the check, so a space-padded number is accepted; a value that is not a whole number from 1 to 65535 still throws naming `PORT`; `source/apps/api/test/settings.test.ts` (the F-14 PORT cases change where the rule changes: blank now gives 3000; the table adds the blank and space-padded cases) — covers AC-004 (the rule the proxy follows; the API side of it)
- [x] T002 [Docs] `spec/documents/architecture.md` §1 and §5: the web row and the Vite line say the dev server forwards `/analyze` and `/generate` to the API, with the 300-second timeout, instead of `/analyze` alone. No test — covers no criterion; it records the behaviour the code now has.

- [x] T004 [Web] Analyze request follows the schema: `source/apps/web/src/analyze/config.ts` no longer sends an `index` key on rules, arguments, flows or blocks (the parser numbers them; `spec/documents/pipeline-schema.md` has no `index`); `source/apps/web/test/analyze-config.test.ts` gains the cases: no `index` key at any level, and the body passes `pipeline.parseProjectConfig` (web may import core) for a filled-in state; name the tests `F-16 AC-011` and `F-16 AC-012` — covers AC-011, AC-012
- [x] T005 [Core] Command file name from the flow name: `source/packages/core/src/pipeline/generate/flow-file.ts` (`flowFileName(flow)`: the name lower-cased, each run of non-letter-non-digit characters replaced by one `-`, ends trimmed); `file-list.ts` and `values-base.ts` (the `process.md` list) use it for `.claude/commands/<name>.md`; `source/packages/core/src/pipeline/analyze/` gains two blocker rules: a flow name with no letter or digit, and two flows with the same file name (both refuse generation through `configProblems`, so 422 with no model call); the F-04 and F-05 tests that expect `flow.id` in the path change where the path changes; tests name `F-16 AC-013` to `F-16 AC-016` — covers AC-013, AC-014, AC-015, AC-016
- [x] T006 [Docs] `spec/documents/architecture.md` §12 (structural rules) and §3 (the command file names) record the file-name rule and the two new blockers; `source/templates/README.md` if it names the command path by id. No test — covers no criterion; it records the behaviour the code now has.

- [x] T007 [Web] Subtitle shows the real file name: `source/apps/web/src/wizard/PipelineStep.tsx` (lines near 233 and 376) shows `Generates .claude/commands/<file name>.md` with the file name from core's `flowFileName` (not the flow name); `pipeline.flowFileName` is exported from `source/packages/core/src/pipeline/index.ts` (add it to the pinned export list in `source/packages/core/test/pipeline/namespace.test.ts`, the F-02 AC-089 test, in the same task, as T002 found); `source/apps/web/test/PipelineStep.test.tsx` (line near 431) is updated to the file name; name the test `F-16 AC-016` (the file names match the file list) — covers AC-016 (the web side)

- [x] T008 [API] The analyze reply carries `subject` on every finding: `source/apps/api/src/analyze.ts` (`analyzePipeline`) maps each structural and brief finding to `{ severity, subject: path, message, rule, path }`, so the reply matches the shape the web step reads (`parseAnalysisReply`, F-13); the review findings already carry `subject`; the F-14 route and analysis tests that pinned the old finding shape change with it (name them in the report); `source/apps/api/test/analyze.test.ts` and `analyze-route.test.ts` get the cases; tests name `F-16 AC-017` and `F-16 AC-018`; the AC-018 test also runs the web parser on the reply (web may import core, and the API test may import the web parser only if the layering allows it: otherwise assert the shape in the API test and leave AC-018 to a web test that uses a fixed reply) — covers AC-017, AC-018

## Rationale

- **One code task (T001).** The four `[auto]` criteria are all about the proxy settings, and a pure function of `env` lets them be tested without a server. The config file stays a thin caller.
- **Docs last (T002).** The architecture doc describes the proxy after the code has it.
- **No browser test.** The owner runs the end-to-end check by hand (AC-005 to AC-010, `[device]`), so no task adds a browser tool.
- **Dependency direction.** The web app imports nothing from `source/apps/api` or `core`; the proxy reads only `env`.
- **Libraries.** None added. `vite` and `vitest` are already in `source/apps/web`.

**Interpretations** (choices made here):

- The proxy's target uses `PORT` as the API does, with the same blank rule as `readPort` in `source/apps/api/src/settings.ts`. A non-numeric `PORT` is passed through as given (the proxy does not refuse it; the API does, at start-up).
- `timeout` and `proxyTimeout` are both set to 300000 ms, so the proxy waits for the API's generation call at its longest.

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Web]` | `source/apps/web` (the dev proxy, its tests) |
| `[Docs]` | Documentation changes required by the feature |
