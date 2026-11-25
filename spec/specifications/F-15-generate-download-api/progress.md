# Progress — Generate and Download API (F-15)

## Phase Status

| Phase    | Status     | Date | Notes |
| -------- | ---------- | ---- | ----- |
| Research | ➖ Optional |      |       |
| Specify  | ✅ Complete | 2026-11-24 | Approved by the user; 6 stories, 29 criteria, all [auto]. Limits and input caps are F-17; the generator model is `SDDBUILDER_GENERATOR_MODEL` (default `claude-opus-5-5`) |
| UX       | ➖ Not needed |  | No user interface (API only) |
| Plan     | ✅ Complete | 2026-11-24 | Approved by the user; 10 tasks (T001 to T010); 29 criteria, all covered |
| Build    | 🔄 In Progress |      | 2 of 10 tasks committed |
| Verify   | ⏳ Pending  |      | Criteria coverage and the manual checklist. Full verification waits for F-16 integration (owner decision 2026-11-24) |

Status values: ⏳ Pending · 🔄 In Progress · ✅ Complete · ➖ Optional / not needed · ⛔ Blocked

---

## Dependency Override

- 2026-11-24: the owner asked to start F-15 although F-14's `progress.md` shows Build 🔄 In Progress (9 of 9 tasks committed, feature marked complete in `a5238c0`). F-15 is built and tested now; its full verification waits for F-16 integration.

---

## Current Task

None

---

## Task Log

| Task | Summary | Review | Tests |
| ---- | ------- | ------ | ----- |
| T001 | Generator model setting: `settings.ts` reads `SDDBUILDER_GENERATOR_MODEL` into `generatorModel`; unset or blank gives `claude-opus-5-5` | 0 blockers, 0 warnings, 2 suggestions fixed (local name; a long line wrapped) | task check passed: api 122 of 122, web 1895 of 1895, core 1217 of 1217 |
| T002 | Templates loader `generate/load-templates.ts`: `loadTemplates(root)` reads the base manifest and layouts and the four Claude Code layouts from `source/templates`; a missing or unreadable file, or a bad manifest, throws naming its path; `GenerationTemplates` derived from `planGeneration`'s parameter (core's export list is pinned by a test) | 0 blockers, 1 warning fixed (empty manifest path or layout accepted), 3 suggestions fixed (module-private type; unreadable case tested; duplicate presence test removed) | task check passed: api 147 of 147, web 1895 of 1895, core 1217 of 1217 |

---

## Deferred Findings

_Review suggestions intentionally not applied, with the reason._

---

## Test Results

_Criteria coverage matrix and manual checklist outcome._

---

## Amendments

```
### Amendment — YYYY-MM-DD
**Changed**: [documents updated]
**Reason**: [why]
**Impact**: [tasks or phases that must re-run]
```
