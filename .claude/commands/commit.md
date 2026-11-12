---
description: Commit the current task to main after it has passed review and tests. This is the last step of a task.
argument-hint: F-XX
---

The feature is `$ARGUMENTS` (`F-04`, `04` or `4`). If it is missing, stop and tell the user a valid feature ID is required.

You run in the main session. Committing is the only step that changes history, so check everything before you act.

## Step 1 — Preflight (stop on any failure and say which check failed)

- Current branch is `main`.
- In `spec/specifications/F-XX-*/progress.md`, **Current Task** names a task whose step is `tested`. If it is `implemented` or `reviewed`, tell the user which step is missing (`/review` or `/test`).
- That task is ticked `[x]` in `plan.md`.
- `git status --porcelain` shows no unstaged changes and no untracked files (everything for this task is staged). If something is unstaged, stop and show it; do not add it silently.
- `git diff --cached --stat` is not empty.

## Step 2 — Bookkeeping

Edit `progress.md` so it is committed together with the code:

1. Append a row to the **Task Log**: task ID, a short summary, the review outcome (e.g. "2 warnings fixed"), the test outcome (e.g. "41 passed"). Take these from the **Current Task** line.
2. Clear **Current Task** back to "None".
3. Update the Build row note to "K of N tasks committed" and its status (🔄 In Progress, or ✅ Complete when K = N).

Stage `progress.md` and `plan.md`.

## Step 3 — Commit

Choose the type by the nature of the task: `feat` (new behaviour), `fix`, `refactor`, `test`, `build` (workspace, manifests, scripts), `docs`, `chore`. Message:

```
<type>(F-XX): T### <task summary>

Covers: AC-001, AC-002
Review: <outcome>. Tests: <outcome>.
```

End the message with the attribution line required by the session. Do not push. Do not amend earlier commits.

## Step 4 — Report

Show `git log -1 --stat`. Do not write the commit hash into any file. If tasks remain, name the next one; if all are committed, suggest `/test F-XX verify`.
