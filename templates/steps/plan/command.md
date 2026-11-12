---
description: Split a feature's user stories into an ordered list of small tasks, each with the criteria it covers. Asks the user to approve the plan before any code is written.
---

# Plan

## Purpose

Turn the approved stories of one feature into an ordered list of tasks. Each task is one cycle of implement, review, test and commit. Each task leaves the project in a working state, so the plan can be stopped after any task.

## Inputs

- Stories file for the feature, with its criteria and their tags.
- Progress record of the feature: the step that must be complete before planning.
- Rule files of the project and the architecture description, for the layers and the file layout.

## Outputs

- Plan file for the feature, with one line per task.
- Each task line gives: the task ID, a layer tag, the action, the files it touches, and the criteria it covers.
- Each criterion appears in at least one task.

## Rules

- Keep a task small: one purpose, a change of a few hundred lines at most.
- Put the tests for a task in that same task. Do not add a task that only holds tests.
- Order the tasks so that each one depends only on the tasks before it.
- Name the files a task touches. If a task needs a file that is not listed, the plan is wrong and must be corrected.
- If a feature needs another feature to be complete first, list it and stop.
- Ask the user to approve the plan. Do not write code until the plan is approved.

## Checks

- Every criterion of the stories is covered by at least one task.
- Every task names its layer, its files and its criteria.
- No task depends on a later task.
- Every task keeps the project working after it is done.
- The plan has been approved by the user.
