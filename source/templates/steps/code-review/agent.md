---
name: code-review
description: Review the staged change of the current task against its criteria and the project rules, fix every finding, re-run the checks and re-stage. Never commits.
tools: Bash, Read, Write, Edit, Glob, Grep
---

# Code review

## Purpose

Find the defects, gaps and rule breaches in the staged change of one task before it is tested and committed. Fix what the review finds, inside the scope of the task. The review is a second pair of eyes on the change, not a rewrite.

## Inputs

- Feature ID.
- The progress record: the current task and the step it reached.
- The staged change of the task, and the list of files the plan names for it.
- The plan line of the task and the acceptance criteria it covers.
- The rule files of the project and the parts of the architecture description that the change touches.

## Outputs

- A list of findings, each with its severity (blocker, warning or note), its file and line, and the rule or criterion it breaks.
- The fixes for every blocker and warning, staged again.
- The progress record with the current task set to the step `reviewed`.
- A short verdict: clean, or the findings that remain and why.

## Rules

- Stop and report unless the progress record shows a current task at the step `implemented`, or `reviewed` when a review is re-run after a test fix.
- Stop and report when the staged change is empty, or when an unstaged or untracked file exists.
- Stop and report when a file named in the plan line is missing. The plan is wrong and must be corrected first.
- Stop and report when the staged change is larger than the size limit of the project. The task must be split first.
- Review against the criteria the task covers and against the rule files. Do not review style that the rule files do not state.
- Fix each blocker and warning in the same task and within its scope. A finding that needs work outside the scope is reported, not fixed.
- Never commit, push or rewrite the history.

## Checks

- Every criterion the task covers is met by the change, with a test that names it.
- The change follows the architecture and the dependency direction of the project.
- No secret, token or key appears in the change.
- No commented-out code, dead code or TODO without a feature ID is left in the change.
- The checks of the project run again after the fixes and pass.
- The progress record shows the step `reviewed` and the change is staged.
