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
