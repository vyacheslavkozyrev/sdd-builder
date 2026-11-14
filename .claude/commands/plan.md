---
description: Produce the ordered task list for a specified feature and ask you to approve it before any code is written.
argument-hint: F-XX
---

The feature is `$ARGUMENTS` (accept `F-04`, `04` or `4`; normalise to `F-04`). If it is missing or unknown, stop and tell the user a valid feature ID is required.

You are acting as a Principal Software Engineer. You run in the main session so you can ask the user to approve the plan.

## Step 1 — Preflight

- Current branch must be `main` and the working tree clean. If not, stop.
- Read `spec/specifications/F-XX-*/progress.md`. If **Specify** is not ✅ Complete, stop and tell the user to run `/specify F-XX`. If **Plan** is already ✅ Complete, tell the user and stop unless they ask to redo it.
- **UX** must be ✅ Complete, or ➖ Not needed for a feature with no user interface. If not, stop and tell the user to run `/ux F-XX` first.

## Step 2 — Read

Read `stories.md`, `progress.md` and the approved screens in `design/features/F-XX-*/` (`screens.md` and the SVG files) of the feature, `spec/documents/architecture.md` (in particular §1 components, §3 generation model, §5 technology), the rule files in `.claude/rules/`, and the feature entry in `features.md`. Check other specs in `spec/specifications/` for overlap and for **prerequisite features that must be complete first**; list any that are not.

## Step 3 — Write the plan

Fill `plan.md` following its template. Each task is one implement → review → test → commit cycle:

- **Small** (about 50–200 changed lines, one purpose) and **green** (the checks pass after the task).
- **Tests travel with the code:** a task adds the tests for its own code; there are no "tests later" tasks. Tests are named with the feature and criterion, e.g. `F-04 AC-003`.
- **Ordered:** dependencies never appear after the tasks that depend on them. Follow the layer order of `architecture.md` §1 (`packages/core` first, then `apps/api` and `apps/web`); the layer tags are listed in `spec/specifications/F-00-template/plan.md`.
- Each task has an ID (`T001`, `T002`, …), a layer tag, a short action, the target file paths (code and tests), and the acceptance criteria it covers.
- Every `[auto]` criterion is covered by a task that includes a test for it. Every `[device]` criterion is covered by the task that builds the behaviour.
- Do not add libraries beyond those approved in `architecture.md` §5; if one is needed, raise it with the user.

Write the **Rationale**: why the order, cross-feature dependencies, and architectural constraints that shaped it. Do not change the Layer Tags table.

## Step 4 — Check

With Bash, confirm every acceptance criterion in `stories.md` appears in at least one task's "covers", and every task names its files. Fix any gap.

## Step 5 — Approval

Show the user a table of tasks (ID, layer, action, criteria covered), the rationale, and any unmet prerequisites. Ask whether to approve or change. Apply changes and ask again until approved. **No code is written before approval.**

## Step 6 — Record and commit

In `progress.md`, set Plan to ✅ Complete with today's date and the note "Approved by the user", and set the Build note to "0 of N tasks committed". Commit:

```
git add spec/specifications/F-XX-*/
git commit -m "plan(F-XX): add implementation plan for <feature name>"
```

Suggest `/implement F-XX` (or `/pipeline F-XX`) next.
