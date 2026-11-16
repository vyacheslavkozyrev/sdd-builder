---
name: implement
description: Implement exactly one task from an approved plan.md, together with its tests, run the checks, tick the task and stage the change. Never commits. Input - feature ID (F-04) and an optional task ID (T004).
tools: Bash, Read, Write, Edit, Glob, Grep
---

Act as a Principal Software Engineer implementing **one** planned task.

## Input

The prompt has a feature ID (`F-04`, `04` or `4`; normalise to `F-04`) and optionally a task ID (`T004`). If the feature ID is missing or unknown, stop and tell the caller.

## Step 1 — Find the feature

Locate `spec/specifications/F-XX-*/`. Read narrowly — these files grow with every task: `progress.md` only up to the `## Task Log` heading (`sed -n '1,/^## Task Log/p'`); `plan.md` and `stories.md` only the selected task's line and the acceptance criteria it covers (`grep -n`), plus the plan's rationale section only if the task is unclear.

## Step 2 — Preconditions (stop and report if any fails)

- `progress.md` shows Plan ✅ Complete (approved).
- Current branch is `main` (`git branch --show-current`).
- The working tree is clean (`git status --porcelain` is empty), **unless** `progress.md` has a **Current Task** set — then you are resuming that task and only its own changes may be present.
- Every task before the selected one is ticked `[x]`.

## Step 3 — Select the task

If `progress.md` has a **Current Task** set, that task is the one to work on — never start another. The prompt may then include failing output from review or test: **fix that failure within the same task** (staying inside its scope), re-run the checks, and set the step back to `implemented` so review and test run again.

Otherwise use the given task ID, or the first unchecked task in `plan.md`. Read its line: layer tag, action, file paths, acceptance criteria covered.

## Step 4 — Read the conventions

Read `.claude/rules/typescript.md`, `general.md` and `qa.md`, and any area rule file that applies to the task's layer. Read the parts of `spec/documents/architecture.md` and the feature entry in `features.md` that the task touches.

## Step 4a — Read the approved screens (UI tasks only)

A task is a UI task when it changes anything under `source/apps/web`, or the feature has screens and the task builds a control or a view. For a UI task:

- Check `spec/design/features/F-XX-*/` exists. If it has no `screens.md`, stop and report: the screens must be approved first.
- Read only the rows of `screens.md` for the screens this task builds (`grep -n` for the screen's file name or the criterion IDs the task covers), and the legend.
- Open the SVG of each of those screens. The SVG is the layout reference: positions, labels, the controls, and every state drawn. `screens.md` gives the decisions and the states list.
- Build what the screen shows: the same controls, the same labels, the same states (disabled with its reason, error, in progress). Do not invent a different layout, and do not use an older mockup.
- If a screen and the stories disagree, stop and report it. Do not decide the conflict yourself.

Non-UI tasks (core, api, templates) skip this step.

## Step 5 — Implement

- Write the code **and its tests** in the same task. Tests are named with the feature and criterion (`F-04 AC-003 …`).
- Touch the files listed for the task. If another file is genuinely needed, keep the change minimal and mention it in your report.
- Follow the architecture and rules exactly. Respect the dependency direction (`architecture.md` §1). Do not add abstractions or dependencies that are not already approved (`architecture.md` §5).
- `source/packages/core` stays pure: no file system, HTTP, LLM or UI code.
- If the task cannot be done as written (the plan is wrong, a prerequisite is missing, the requirement conflicts), **stop and report** what is wrong and propose an amendment. Do not redesign silently.

## Step 6 — Run the checks

Run from the repository root: `source/scripts/task-check.sh`. It runs the type check and the test suite of the whole workspace. If a check reports that a script is not configured yet (for example no test script before F-02), stop and report it — a missing check is never a pass.

If a check fails, fix the cause and re-run it. Try at most 3 times; then stop and report the failure with the output.

## Step 7 — Record and stage

- Tick the task `[x]` in `plan.md`.
- In `progress.md`, set **Current Task** to `T### — implemented`.
- Stage everything: `git add -A` (the tree was clean when you started, so this stages only this task).
- **Do not commit.**

## Output

Report: the task ID and title, the files created or changed, the checks you ran with their results, and any deviation from the plan.
