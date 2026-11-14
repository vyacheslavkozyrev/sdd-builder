---
description: Run a whole feature — specify, UX screens (approved by you before any code), plan, then implement → review → test → commit for every task, then verify — pausing only where you must decide.
argument-hint: F-XX [research]
---

Arguments: `$ARGUMENTS` — a feature ID (`F-04`, `04` or `4`) and an optional word `research`. If the feature ID is missing or not in `spec/documents/features.md`, stop and tell the user a valid feature ID is required.

You are the orchestrator and run in the main session. Follow the steps in order. Spawn agents by name (`implement`, `review`; `test` only in verify mode) and pass the feature ID unchanged. **Do not ask the user anything except at the pause points listed below.**

## Pause points (the only times you wait for the user)

1. Specify: clarifying questions and approval of the stories.
2. UX: approval of the screens. Nothing is planned or implemented before this approval.
3. Plan: approval of the task list.
4. Verify: results of the manual checklist.
5. Any stop condition (see the end of this file).

## Step 0 — Preflight

- Current branch must be `main`. Working tree must be clean, unless `progress.md` shows a task in flight (Current Task is set) — then you are resuming that task.
- **Dependencies:** read the feature's "Depends on" in `features.md`. Every feature it names must have all phases ✅ Complete in its own `progress.md`. If anything is unmet, list it and stop. The user may override explicitly.
- Features marked "Not planned" in `features.md` cannot be run; stop and say so.
- If `research.md` is absent and the `research` argument was given, run the steps of `/research F-XX` (feature mode) now.

## Step 1 — Find the resume point

Glob `spec/specifications/F-XX-*/progress.md` (glob the file, not the folder). If none exists, start at Step 2. Otherwise read the Phase Status table and **Current Task**:

- Specify pending → Step 2. UX pending → Step 3 (a feature with no user-facing criteria marks UX ➖ Not needed and moves on to Plan). Plan pending → Step 3a.
- Build pending or in progress → Step 4. If Current Task is set, resume that task at its next step (`implemented` → review, `reviewed` → test, `tested` → commit).
- Verify pending → Step 5.
- Every phase ✅ Complete → tell the user the feature is already complete and stop.

Never redo a phase that is ✅ Complete.

## Step 2 — Specify (pause point 1)

Run the steps of the `/specify` command in this session (clarify, write `stories.md`, coverage check, user approval, commit).

## Step 3 — UX (pause point 2)

Run the steps of the `/ux` command in this session (plan the screens, draw them as SVG under `design/features/F-XX-<slug>/`, coverage check, user approval, commit). The screens show the layout and states that the stories require. **Stop at the approval and wait.** If the user requests changes, apply them and ask again. Plan starts only after the user approves the screens.

## Step 3a — Plan (pause point 3)

Run the steps of the `/plan` command in this session (write `plan.md` from the stories and the approved screens, coverage check, user approval, commit). No code is written before the plan is approved.

## Step 4 — Build: one task at a time

Repeat for every unchecked task in `plan.md`, in order. **A task is finished only when it is committed; never start the next before that.**

1. **Implement** — spawn the `implement` agent with the feature ID and the task ID. It writes the code and its tests, runs the checks, ticks the task, and stages the change. Not committed. For a feature with approved screens, the agent builds the layout and states shown in `design/features/F-XX-*/` (not the older mockups).
2. **Review** — spawn the `review` agent. It reviews the staged diff, fixes all findings (at most 2 review rounds), and re-stages.
3. **Test** — no agent. Run `scripts/task-check.sh` yourself and wait for it. On PASS, set **Current Task** in `progress.md` to `T### — tested: <totals from the output>`. On FAIL:
   - send the failure (the output tail) to the `implement` agent as a targeted fix for the same task (do not start a new task),
   - then run **review** again on the changed lines and the check again,
   - allow at most **2** such fix cycles, then stop.
4. **Commit** — perform the steps of the `/commit` command.

No user prompts between tasks. Print a one-line progress note after each commit (`T004 committed — 4 of 12`).

## Step 5 — Verify (pause point 4)

When every task is committed, spawn the `test` agent in **verify** mode.

- **Gaps or failures** (an `[auto]` criterion with no passing test): add the missing work as new tasks at the end of `plan.md`, recording an **Amendment** in `progress.md`, and go back to Step 4. If the gap is a specification problem, stop and tell the user.
- **Manual checklist:** follow the "Verify mode" procedure of the `/test` command — show the checklist, collect the user's result for each criterion, record it. Anything failed or not run stops the pipeline; the user re-runs `/pipeline F-XX` after fixing.

## Step 6 — Complete

When all criteria are confirmed: set Verify and the feature ✅ Complete in `progress.md` and commit only the spec folder:

```
git add spec/specifications/F-XX-*/
git commit -m "chore(F-XX): mark feature complete"
```

Report a short summary: tasks committed, criteria verified (auto / manual), findings deferred, and the next suggested feature (from `features.md` phases and dependencies).

## Stop conditions

Stop immediately, leave the working tree as it is, and tell the user exactly what happened and how to resume, when:

- a preflight check fails or a dependency is unmet;
- an agent reports it cannot complete the task as specified (the plan is wrong or incomplete) — propose an Amendment;
- review leaves an unresolved BLOCKER or WARNING after 2 rounds;
- tests still fail after 2 fix cycles;
- checks cannot run (for example a check script is not configured yet);
- the staged diff of a task is larger than the size guard (400 changed lines): the task must be split — propose an Amendment;
- the user declines an approval or reports a failed manual check.

Never work around a stop condition by committing anyway, skipping review or tests, or amending a previous commit.
