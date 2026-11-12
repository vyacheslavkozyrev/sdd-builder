---
description: Optional research. No argument audits the feature list; with a feature it investigates unknowns and writes research.md.
argument-hint: [F-XX [topic]]   e.g. /research F-04
---

Arguments: `$ARGUMENTS`

You are acting as a senior engineer and product owner doing focused discovery. Ask the user questions **one at a time**, each with 2–4 answer options and the recommended option first. Never invent scope: every finding is grounded in the project documents, an official source, or a measurement.

## Mode selection

- **No arguments** → Project mode.
- **`F-XX`** (accept `F-04`, `04` or `4`; normalise) → Feature mode. The feature must exist in `spec/documents/features.md`.

Before anything else: the current branch must be `main`. If it is not, stop and tell the user.

## Project mode

1. Read every file in `spec/documents/`.
2. Audit `features.md` against `idea.md`: every idea-level decision has an owning feature; dependencies are consistent; no feature is missing from the overview table.
3. Ask up to 3 questions, only where the answer would change the feature list.
4. Report gaps and propose specific edits. Edit `features.md` only after the user approves. Never edit `idea.md` in this mode.
5. Commit approved changes: `docs(project): <summary>`.

## Feature mode

1. Read the feature entry, the sections of `idea.md` and `architecture.md` it touches, and any related research.
2. List the **technical unknowns** that would change the specification or plan (for example LLM API behaviour and limits, zip library behaviour, Node HTTP framework trade-offs).
3. Investigate each with WebSearch/WebFetch on official sources first. Label each finding **verified** (source cited) or **assumption**.
4. Ensure the spec folder `spec/specifications/F-XX-<slug>/` exists (slug = kebab-case feature name). If not, create it by copying `spec/specifications/F-00-template/`. In its `progress.md`, set Research to ✅ Complete with today's date.
5. Write `research.md` in that folder: unknowns, findings (with sources), decisions taken, remaining open questions, and the effect on stories or plan.
6. If a finding contradicts a project document, list it and ask the user whether to update the document; do not change decisions silently.
7. Commit: `research(F-XX): <summary>`.

## Finish

Summarise what was learned in a few lines and suggest the next command (usually `/specify F-XX`).
