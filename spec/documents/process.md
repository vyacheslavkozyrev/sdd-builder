# SDDBuilder — Working Process

Status: adopted from the ComEd and PhotoSync projects. The commands and agents are in `.claude/` (`/research`, `/specify`, `/plan`, `/ux`, `/implement`, `/review`, `/test`, `/commit`, `/pipeline`; agents `implement`, `review`, `test`).

Phases of a feature: Specify → **UX** (SVG screens, approved by the user) → Plan → Build → Verify → Complete. Nothing is implemented before the screens are approved, for features with a user interface. Adapted to TypeScript: the check is `scripts/task-check.sh`, not Swift tooling.

## The default process: the pipeline as commands

The default process of SDDBuilder is the pipeline in `.claude/commands/pipeline.md`, defined on the Map tab as flows (`building-blocks.md` §4). Only the pipeline contains flows; a flow contains blocks.

- The pipeline takes a feature ID and runs the phases `specify`, `ux` and `plan` (each with a human approval), `build` (once per task in `plan.md`: `implement`, `review`, `test`, the diff-size guard, `commit`), `verify` and `complete`.
- Each phase is a flow; the approvals and checks between the flows are gates.

A project that uses another process edits the pipeline on the Map tab; the pipeline is the default, not a requirement.

## Principles

1. **Humans decide, agents execute.** The user approves stories, plans and screens; the rest runs on its own.
2. **Commit is the last step.** Cycle: implement → review → test → commit, one task at a time.
3. **Every commit is green.** Build and tests pass after each commit.
4. **Tests travel with the code.** A task includes the tests for its own code.
5. **Everything is traceable.** Requirement → feature → stories → criteria → tasks → tests → commits.

## Where things live

| What | Where |
|---|---|
| Project documents | `spec/documents/` |
| Feature list | `spec/documents/features.md` |
| One folder per feature | `spec/specifications/F-XX-<slug>/` |
| UX screens per feature (SVG) | `design/features/F-XX-<slug>/` |
| Spec template | `spec/specifications/F-00-template/` |
| Commands, agents, rules | `.claude/` |
| Project instructions for Claude | `CLAUDE.md` |

## Rules of engagement

- Work directly on `main`. The repository is not yet a git repository; run `git init` before the first feature.
- Commit messages start with the feature ID: `feat(F-02): T001 …`, `spec(F-02): …`, `plan(F-02): …`.
- Never push, force, amend or rewrite history without being asked.
- A task is about 50–200 changed lines; over 400 must be split.

## Reference

The ComEd project is the reference for the full cycle (`/specify`, `/plan`, `/implement`, `/review`, `/test`, `/commit`, `/pipeline`). The PhotoSync project adds device-only checks and `ux-review`.
