---
description: Generate UX screen mockups (SVG) for a feature's user-facing stories, check that every UI criterion has a screen, and ask you to approve them before any implementation.
argument-hint: F-XX
---

The feature is `$ARGUMENTS` (accept `F-04`, `04` or `4`; normalise to `F-04`). If it is missing or unknown, stop and tell the user a valid feature ID from `spec/documents/features.md` is required.

You are acting as a senior UX designer. You run in the main session so you can ask the user to approve the screens. The screens are wireframes in SVG, the format this repository uses for its screens (`spec/design/features/`). They show layout, content and states; colours, fonts and wording are placeholders.

## Step 1 — Preflight

- Current branch must be `main`. `git status --porcelain` must show nothing outside `spec/specifications/F-XX-*/` and `spec/design/features/F-XX-*/`. If not, stop and tell the user.
- `progress.md` of the feature must show **Specify** ✅ Complete. UX comes before Plan. If not, stop and tell the user to run `/specify F-XX` first.
- If **UX** is already ✅ Complete, tell the user and stop (use `/plan F-XX` next), unless they ask to redo it.
- If the feature has no user-facing criteria (its "Where" in `features.md` is only `source/packages/core` or `templates`), say so, mark UX ➖ Not needed in `progress.md`, and stop. The pipeline then moves to Build.

## Step 2 — Read

Read the feature's `stories.md` (the plan is written after the screens, so there is no `plan.md` yet), its entry in `features.md`, and the approved screens of earlier features in `spec/design/features/` where this feature reuses a layout. Note every criterion that a person sees or does in the UI: anything in `source/apps/web`, and every `[device]` criterion.

## Step 3 — Plan the screens

List the screens before drawing. For each screen write: its name, the state it shows (default, refused action, disabled control, empty state), and the criteria it proves. Aim for the fewest screens that show every UI criterion. Keep a screen to one view; a state that needs its own look gets its own screen.

Decide the layout with the user's stated intent in mind. If the feature's layout was reworked, follow the new layout, not an older mockup.

## Step 4 — Draw the screens

Create `spec/design/features/F-XX-<slug>/` (slug from `features.md`) with:

- One SVG per screen, named `NN-<screen>.svg`, `1280 × 800` by default, with the style block of the screens already in `spec/design/features/` so the set looks the same. Label every control and region. Mark disabled controls with the dashed `off` style, and refusal messages with the warning style.
- `index.html`: all screens on one page, in order, like the other feature folders in `spec/design/features/`.
- `screens.md`: a table of screen → criteria it shows → states shown, and a section **Open points for layout review** with the decisions the user should look at.

Do not reuse a screen of another feature as the final layout unless the feature reuses that layout.

## Step 5 — Coverage check

With Bash, confirm that every UI criterion from Step 2 appears in `screens.md` and is shown on at least one screen. Confirm that every `[device]` criterion has a screen it can be checked on. Fix any gap before continuing.

## Step 6 — Approval (pause point)

Show the user the screen list (number, name, criteria), the open points, and the path to `index.html`. Ask whether to approve the screens, request changes, or stop. Apply changes, re-run the coverage check, and ask again until approved.

## Step 7 — Record and commit

On approval, set **UX** in `progress.md` to ✅ Complete with today's date and the note "Approved by the user", and commit:

```
git add spec/design/features/F-XX-*/ spec/specifications/F-XX-*/
git commit -m "design(F-XX): add UX screens for <feature name>"
```

Suggest `/plan F-XX` next. The plan reads these approved screens; the implementer must build the approved screens and their layout, not the older mockups.
