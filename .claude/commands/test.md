---
description: Run the checks and tests for the current task, or with `verify` check every acceptance criterion of the whole feature and prepare the manual checklist.
argument-hint: F-XX [verify]
---

Arguments: `$ARGUMENTS` — a feature ID (`F-04`, `04` or `4`) and an optional word `verify`. If the feature is missing, stop and tell the user a valid feature ID is required.

## Task mode (default)

No agent. Run `scripts/task-check.sh` (type check and tests of the workspace). On PASS set **Current Task** in `progress.md` to `T### — tested: <totals>`; `/commit` is next. On FAIL show the output tail and stop.

## Verify mode (`/test F-XX verify`)

Used after every task of the feature is committed. Spawn the `test` agent (`.claude/agents/test.md`) with the arguments as the prompt and surface its output. The agent checks that every `[auto]` acceptance criterion is covered by a passing test and writes `checklist.md` for the `[device]` criteria.

If the agent reports that a checklist is waiting:

1. Show the user the checklist steps for each criterion.
2. Ask the user, one criterion at a time if needed, for the result: passed, failed (with what happened), or not run yet.
3. Record the answers under **Test Results** in `progress.md`, tick the criteria in `checklist.md`, and stop if anything failed or was not run: the feature is not complete until every `[device]` criterion is confirmed.

If the agent reports gaps (a criterion with no test) or failures, surface them and stop; do not mark Verify complete.
