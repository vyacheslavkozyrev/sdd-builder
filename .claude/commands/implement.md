---
description: Implement the next task of an approved plan, with its tests. Stages the change but does not commit.
argument-hint: F-XX [T###]
---

Arguments: `$ARGUMENTS` — a feature ID (`F-04`, `04` or `4`) and an optional task ID (`T004`). If the feature is missing, stop and tell the user a valid feature ID is required.

Spawn the `implement` agent (`.claude/agents/implement.md`) with the arguments as the prompt. Wait for it to complete and surface its output to the user.

The agent implements exactly one task (the given one, or the first unchecked one), runs the checks, ticks the task in `plan.md`, stages the change and stops. Review, test and commit follow (`/review`, `/test`, `/commit`).
