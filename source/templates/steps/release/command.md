---
description: Build the distribution artifact for a version, prepare the release notes and tag the release. Publishing happens only after the user confirms.
---

# Release

## Purpose

Prepare one release of the project from its committed state. Build the artifact, write the release notes from the feature checklists, and tag the release. Anything that leaves the project, such as an upload or a publication, waits for the user to confirm.

## Inputs

- Version: the version the user asks to release, and the build number if the project uses one.
- Release commit: the commit to release, as the user names it or the latest one on the default branch.
- Checklists of the features in the release, for the release notes.

## Outputs

- The distribution artifact, built from the release commit.
- Release notes: one entry per feature, with its checklist status.
- The tag for the release, when the project uses tags.

## Rules

- Stop if the working tree is not clean, or if the release commit is not the one the user named (or the latest on the default branch when the user named none).
- Run a dry run first when the project offers one. Report any failure with its output and stop.
- Ask the user once before any step that uploads or publishes the artifact.
- Do not push the tag. The user pushes it.
- Never write credentials into the repository or into the release notes.

## Checks

- The version and build number match the request.
- The artifact is built from the release commit.
- Every feature in the release has a checklist, and its open items are listed in the notes.
- No upload or publication ran without the user's confirmation.
- No credential appears in any written file.
