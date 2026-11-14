---
description: Record the finished task in the progress file and make one commit for it. This is the last step of a task.
---

# Commit

## Purpose

Close the current task. Record it in the progress file, then make one commit that holds the task's change, its tests and its records. Committing is the only step that changes the history, so check every condition before acting.

## Inputs

- Current task: its ID and the last step it reached.
- Review and test results of the task, as recorded in the progress file.
- The staged change of the task.

## Outputs

- Progress file with a new row in the task log, the current task cleared, and the build status updated.
- One commit on the default branch, with a message that starts with the feature ID and a type that matches the task.

## Rules

- Commit only when the current task has reached the tested step. If it has not, say which step is missing.
- Commit only the staged change of the task. Do not add unrelated changes silently.
- Stop if anything for the task is unstaged or untracked.
- Do not push, force, or rewrite the history.
- Put the progress file and the plan file in the same commit as the change.

## Checks

- The default branch is checked out.
- The current task is ticked in the plan and has reached the tested step.
- No unstaged or untracked change belongs to the task.
- The staged change is not empty.
- The commit message starts with the feature ID.
- The progress file shows no current task after the commit.
