# Implementation Plan — [Feature Name] ([F-XX])

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

## Tasks

- [ ] T001 [Layer] [Short action] — `source/[path]`, `source/[test path]` — covers AC-001
- [ ] T002 [Layer] [Short action] — `source/[path]` — covers AC-002

## Rationale

[Why the tasks are in this order; dependencies and architecture constraints that shaped it.]

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Docs]` | Documentation changes required by the feature |

Add layer tags matching the modules in `architecture.md` §3.
