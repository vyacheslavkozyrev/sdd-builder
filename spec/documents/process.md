# SDDBuilder — Working Process

Status: adopted from the ComEd and PhotoSync projects. The commands and agents are in `.claude/` (`/research`, `/specify`, `/plan`, `/implement`, `/review`, `/test`, `/commit`, `/pipeline`; agents `implement`, `review`, `test`). Adapted to TypeScript: the check is `scripts/task-check.sh`, not Swift tooling.

## Principles

1. **Humans decide, agents execute.** The user approves stories and plans; the rest runs on its own.
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
