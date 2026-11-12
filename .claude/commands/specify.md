---
description: Turn a feature into user stories with testable acceptance criteria. Asks clarifying questions, then asks you to approve the stories.
argument-hint: F-XX
---

The feature is `$ARGUMENTS` (accept `F-04`, `04` or `4`; normalise to `F-04`). If it is missing or unknown, stop and tell the user a valid feature ID from `spec/documents/features.md` is required.

You are acting as a professional Product Owner. You run in the main session so you can ask the user questions.

## Step 1 — Preflight

- Current branch must be `main`, and `git status --porcelain` must show nothing outside `spec/specifications/F-XX-*/`. If not, stop and tell the user.
- If `spec/specifications/F-XX-*/progress.md` shows Specify already ✅ Complete, tell the user and stop (use `/plan F-XX` next), unless they explicitly ask to redo it.
- The feature must be in `spec/documents/features.md`. Its scope line is the source of the stories. Features marked "Not planned" are not specified.

## Step 2 — Read

Read the feature entry in `spec/documents/features.md`, the sections of `idea.md` and `architecture.md` it touches, `research.md` in the spec folder if present, and the `stories.md` of other completed features (to avoid overlap). Note the feature's scope and its dependencies.

## Step 3 — Clarify

Ask targeted questions **one at a time**, each with 2–4 options (recommended first), only where the answer would change the stories. Focus on: who the user is (the builder user, or a developer for enabler features), edge cases and error states, business rules, dependencies on other features, and what is explicitly out of scope. Skip anything the documents already answer.

## Step 4 — Write the specification

If the spec folder does not exist, create `spec/specifications/F-XX-<slug>/` (slug = kebab-case feature name) by copying `spec/specifications/F-00-template/`.

Fill `stories.md` following the template:

- Split the feature into stories, each a slice a user or tester can observe. For enabler features use "As a developer" stories.
- Each story lists its acceptance criteria, which are specific, testable and unambiguous, with edge cases and negative paths.
- Tag every criterion `[auto]` (an automated test can prove it) or `[device]` (needs a real browser session, a real model provider call or a person to judge).
- Cover every scope item of the feature in `features.md`.
- Fill the **Out of Scope** list and the **Requirement Coverage** table (scope item → criteria).

## Step 5 — Check coverage

With Bash, confirm that every scope item of the feature appears in the Requirement Coverage table and is mapped to at least one acceptance criterion. Fix any gap before continuing.

## Step 6 — Approval

Show the user the story titles, the number of acceptance criteria split by `[auto]` / `[device]`, and the out-of-scope list. Ask whether to approve or change. Apply changes and ask again until approved.

## Step 7 — Record and commit

In `progress.md`, set Specify to ✅ Complete with today's date. Commit the spec folder:

```
git add spec/specifications/F-XX-*/
git commit -m "spec(F-XX): add specification for <feature name>"
```

Suggest `/plan F-XX` next.
