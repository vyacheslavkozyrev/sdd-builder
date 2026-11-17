# Implementation Plan — [Feature Name] ([F-XX])

Each task is **one implement → review → test → commit cycle** and produces exactly one commit. Rules for tasks:

- **Small:** about 50–200 changed lines, one clear purpose.
- **Green:** the repository builds and all tests pass after the task.
- **Tests travel with the code:** in the same task.
- **Ordered:** a task never depends on a later task.
- **Traceable:** each task names the acceptance criteria it covers.

## Tasks

- [ ] T001 [Layer] [Short action] — `[path]`, `[test path]` — covers AC-001
- [ ] T002 [Layer] [Short action] — `[path]` — covers AC-002

## Rationale

[Why the tasks are in this order; dependencies and architecture constraints that shaped it.]

## Layer Tags

| Tag | Scope |
|-----|-------|
| `[Build]` | Project setup, manifests, scripts |
| `[Docs]` | Documentation changes required by the feature |
| `[Core]` | Example of a module tag: the pure domain logic of the project |

Add layer tags matching the modules of the project's architecture document.
