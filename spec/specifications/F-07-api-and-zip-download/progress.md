# Progress — API: analyze and generate, zip download (F-07)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-12 | Stories approved by the user; 29 criteria (28 `[auto]`, 1 `[device]`). |
| Plan     | ✅ Complete | 2026-11-12 | Approved by the user |
| Build    | 🔄 In Progress | 2026-11-12 | 14 of 20 tasks committed (T003 split into T003a–c; T003c committed at 502 lines by user override) |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Current Task

None

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Record the F-07 decisions: Hono, node-server and JSZip pins in architecture §5; generation rules in §6 decision 11 | 0 blockers, 2 warnings fixed (502 wording; 404 and 405 added), 2 suggestions fixed | docs only; task check: 331 core + 56 api passed |
| T002 | `parseProjectConfig` top level: schemaVersion, strings, arrays, known targets; interim cast until T003; not exported | 0 blockers, 2 warnings fixed (missing error-path tests), 2 suggestions fixed (callback types, interim comment) | 35 files, 352 passed |
| T003a | `parseProjectConfig` workflow fields and steps (split of T003 by Amendment 2026-11-12); other parts still unchecked and not exported | 0 blockers, 1 warning fixed (deferred `description` check recorded in plan), 0 suggestions | 376 core tests passed |
| T003b | `parseProjectConfig` conditions, gates, routes (absent `fail` accepted, `fail: null` refused) and optional workflow `description`; connections, custom steps, stack, architecture still unchecked | 0 blockers, 0 warnings, 2 suggestions fixed (long test row wrapped; helper return type) | 35 files, 415 core tests passed |
| T003c | `parseProjectConfig` connections, custom steps, stack, architecture; unknown fields refused; guard `isProjectConfig` replaces the cast; export of the parser and its types | 0 blockers, 2 warnings fixed (unknown fields refused; casts removed from the trust path), 2 suggestions fixed (shared list checks; typed test helpers). Staged change 502 lines, over the 400 guard: committed by user override | 35 files, 467 core tests and 56 api tests passed |
| T004 | Runtime dependencies pinned: hono 4.13.14, @hono/node-server 2.1.5, jszip 3.10.2 | 0 blockers; the audit advisories on the new packages were accepted by the user and recorded under Deferred Findings | 35 files, 467 tests passed |
| T005 | Request reading (`readConfig`: text, JSON, `parseProjectConfig`) and the one error shape (`errorBody`) | 0 blockers, 2 warnings fixed (exact problem strings in the tests instead of substring and count checks), 0 suggestions | 76 api tests, 467 core tests passed |
| T006 | App (`createApp`) and `POST /analyze`; 404 and 405 with the error shape; generic 500 that logs the error name only | 0 blockers, 2 warnings fixed (mocks reset between tests; analyze called once asserted), 1 suggestion fixed (exact findings assertion) | 88 api tests, 467 core tests passed |
| T007 | Review model wiring when the key is missing: `/analyze` answers with review failed; one log line naming `ANTHROPIC_API_KEY`, never its value | 0 blockers, 1 warning fixed (escaped-form check for the key sentinel), 0 suggestions | 94 api tests, 467 core tests passed |
| T008 | Generation prompt (`buildGenerationPrompt`): fixed instructions, brief and process in fixed key order, planned files in plan order, findings of the previous reply | 0 blockers, 2 warnings fixed (per-file and key-order assertions added), 1 suggestion fixed (empty plan tested); 1 suggestion deferred (shared helper module) | 103 api tests, 467 core tests passed |
| T009 | Reply parsing (`parseReply`): a truncated reply is refused before parsing; invalid JSON and non-object JSON are failed replies; never throws | 0 blockers, 2 warnings fixed (JSON.parse not called for truncated input; never-throws table), 1 suggestion fixed (AC-016 block separated) | 125 api tests, 467 core tests passed |
| T012 | Generation service, first pass (`generateProject`): refusal with no model call; one model call; model error gives reason `model`; reply parsed and checked; files in plan order | 0 blockers, 2 warnings fixed (planning throw documented and tested; first-pass reply failures tested), 1 suggestion fixed (typed reply) | 148 api tests, 467 core tests passed |
| T011 | Templates from disk (`loadTemplates`): recursive read with forward-slash keys; missing directory or non-file entry throws naming it | 0 blockers, 2 warnings fixed (symlinks refused, not skipped; repository plan asserts CLAUDE.md and a command file), 0 suggestions | 3 api template tests, 467 core tests passed |
| T010 | Generation model adapter (`GenerationModel`, `createAnthropicGenerationModel`): truncated from `stop_reason`, `GENERATION_MAX_TOKENS` 32000, `GENERATION_TIMEOUT_MS` 300 s; missing key throws naming the variable; constants recorded in architecture §6 decision 11 | 0 blockers, 3 warnings fixed (timeout reason documented; blank-key assertion corrected; AC-017 adapter test added), 1 warning resolved (constants in architecture), 1 suggestion deferred (shared adapter module) | 135 api tests, 467 core tests passed |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

- WARNING T004 `npm audit --omit=dev` (unresolved, needs a user decision): `hono` 4.13.14 is affected by GHSA-4m76-xfj5-7975 (`mount()` path can bypass scoped middleware), GHSA-h7mg-cq63-vhpq (RegExpRouter skips wildcard middleware for encoded line terminators) and GHSA-3gg2-335m-rxc6 (`css` helper HTML injection); `@hono/node-server` 2.1.5 is affected by GHSA-qv5m-9pm6-hqp3 (ECONNRESET during WebSocket upgrade crashes the process) and GHSA-jpvv-r467-5p4w (backslash path bypass behind a reverse proxy). Both are new in this task; HEAD audits clean (0 vulnerabilities). Fix is `npm audit fix --force` to hono 4.13.18 and @hono/node-server 2.1.8, which are outside the exact pins the plan requires. Not applied: changing the pins contradicts the plan. Exposure depends on whether the API uses `mount()`, the `css` helper, WebSocket upgrades or a path-based proxy rule; confirm in T005–T006 or approve a pin change.
  - **Accepted by the user (2026-11-12) for now.** Pins stay. Revisit when versions at least two weeks old carry the fixes, and confirm in T005–T006 that the API does not use the affected features.
- SUGGESTION T008 `apps/api/src/generate/prompt.ts:2`: `oneLine` and `pickProject` are imported from `review/prompt.ts`; a shared prompt helper module would be cleaner. Not moved here because it would edit the review prompt file beyond the export change this task makes; revisit with the reply-side tasks (T009) if they need the same helpers.
- WARNING T010 (resolved in the T010 commit): `GENERATION_MAX_TOKENS` (32000) and `GENERATION_TIMEOUT_MS` (300 s) are now named in `architecture.md` §6 decision 11, as the plan requires.
- SUGGESTION T010 `apps/api/src/generate/generation-model.ts:1-2`: the adapter duplicates the structure of `review/anthropic-model.ts` and imports `DEFAULT_ANALYZER_MODEL` and `AnalyzerEnv` from it. A shared provider-adapter module would be cleaner. Not moved here because it would edit the review adapter, which is outside T010.

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

### Amendment — 2026-11-12

**Changed**: `plan.md` — T003 split into T003a, T003b and T003c; the Build total is now 20 tasks. `progress.md` — this record.
**Reason**: the staged T003 diff was 788 changed lines (722 added, 66 deleted), over the 400-line size guard.
**Impact**: T003 is re-cut from the staged work into three commits, each reviewed, checked and committed in order. T004 onward are unchanged. Also recorded here: `GENERATION_MAX_TOKENS` (T010) starts at 32,000 for a single whole-plan generation call; to be checked once the product runs end to end.

### Amendment — 2026-11-12 (size guard override)

**Changed**: `progress.md` only.
**Reason**: T003c's staged change is 502 changed lines (411 added, 91 deleted) after review fixes, over the 400-line guard. The user chose to accept one commit at this size rather than split it.
**Impact**: T003c is committed as one commit. This is a one-time override for T003c; the guard applies to the tasks that follow.
