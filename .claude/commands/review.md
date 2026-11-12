---
description: Review the staged change of the current task against the specification and rules, fix all findings, and re-stage.
argument-hint: F-XX
---

The feature is `$ARGUMENTS` (`F-04`, `04` or `4`). If it is missing, stop and tell the user a valid feature ID is required.

Spawn the `review` agent (`.claude/agents/review.md`) with the feature ID as the prompt. Wait for it to complete and surface its output to the user.

The agent reviews the staged diff of the task that was just implemented, fixes every finding, and stops. Test and commit follow (`/test`, `/commit`). It never commits.
