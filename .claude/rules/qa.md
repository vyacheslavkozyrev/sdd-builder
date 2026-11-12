# QA Rules — tests and acceptance criteria

## Tests travel with the code
Every task adds or updates the tests for the code it changes, in the same task. There are no "tests later" tasks.

## Where tests live

| Level | Location |
|---|---|
| Unit (a package) | `packages/<name>/test/` |
| API | `apps/api/test/` (HTTP-level tests with fakes for the LLM) |
| Web | `apps/web/test/` for view-model and logic; no browser tests in the MVP unless a feature asks for them |

## Naming acceptance criteria
- Criterion IDs restart in every feature; every test that proves one carries the feature and criterion, e.g. `F-04 AC-003 rejects a block id that clashes with the catalog`.
- A criterion tagged `[auto]` in `stories.md` needs at least one passing test naming it.
- A criterion tagged `[device]` goes into the feature's manual checklist.

## What to test
- Pure logic with table-driven tests, including edge and negative cases.
- Error paths, not only the happy path.
- Generated output is deterministic: a test generates twice and compares.
- No test calls the real LLM provider, the real network or the wall clock. Use fakes and fixed inputs.
- No test depends on another test's state.
