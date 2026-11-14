---
name: implement
description: Implement exactly one task from an approved plan, together with its tests, run the checks, record the task and stage the change. Never commits.
tools: Bash, Read, Write, Edit, Glob, Grep
---

# Implement

## Purpose

Write one planned task and its tests, so that the checks pass and the change is ready for review. One run handles one task and nothing else. The task is the unit of work; a larger change is split in the plan, not here.

## Inputs

- Feature ID and, when given, the task ID. Without a task ID, take the first unticked task of the plan.
- The plan line of the task: its layer, its action, the files it touches and the criteria it covers.
- The acceptance criteria that the task covers, as written in the stories.
- The rule files of the project and the parts of the architecture description that the task touches.
- Progress record of the feature: the current task, if one is in flight.

## Outputs

- Code and tests for the task, in the files the plan names.
- The task ticked in the plan.
- The progress record with the current task set to the task ID and the step `implemented`.
- The staged change of the task, with no commit.

## Rules

- Stop and report unless the plan is approved and every task before the selected one is ticked.
- Stop and report unless the working tree is clean, or the progress record shows a current task that is this task.
- Write the code and its tests in the same run. Name each test with the feature and the criterion it proves.
- Touch only the files the plan lists. If another file is needed, stop and propose an amendment to the plan.
- Follow the architecture and the rules exactly. Do not add an abstraction or a dependency that the project has not approved.
- If the task cannot be done as written, stop and report what is wrong and propose an amendment. Do not redesign silently.
- Never commit, push or rewrite the history.

## Checks

- The checks of the project run and pass. A check that is not configured is a failure to report, not a pass.
- Every criterion the task covers has at least one passing test that names it.
- The plan line of the task is ticked and the progress record shows the step `implemented`.
- Only the files the plan lists, and the progress and plan records, are in the staged change.
