---
description: Update a feature's user stories after the user answers questions or asks for changes. Keeps existing criterion IDs stable.
---

# Refine

## Purpose

Change the stories of one feature to reflect the user's answers or requested changes, and nothing else. Keep the stories that the user did not question as they are, so that the work already planned from them stays valid.

## Inputs

- Stories file for the feature, as it is now.
- The user's answers or requested changes, as given in the conversation.
- Progress record of the feature: whether the stories were already approved.

## Outputs

- Updated stories file for the feature.
- A list of what changed: criteria added, changed, removed, or left as they were.
- A note in the progress record if the stories changed after approval, so that the user approves them again.

## Rules

- Change only what the answers or requests cover.
- Keep the ID of every criterion that stays. Do not renumber criteria.
- A removed criterion keeps its ID retired; do not reuse that ID for a new criterion.
- A new criterion takes the next free ID in the feature.
- Apply the same rules as the define-feature step to any new or changed criterion.
- If a change conflicts with another feature's stories, stop and report the conflict.

## Checks

- Criterion IDs are unique and still in order.
- Every criterion has a tag.
- No criterion that the user did not mention has changed its wording.
- The list of changes matches the stories file.
- If the stories were approved before, the progress record says they need approval again.
