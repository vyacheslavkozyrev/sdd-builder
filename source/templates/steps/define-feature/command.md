---
description: Clarify one feature and write its user stories with testable acceptance criteria. Asks the user questions where the answer changes a story.
---

# Define feature

## Purpose

Turn one feature into user stories. Each story states a user need, and each criterion under it can be checked. Ask the user questions where the answer would change a story, and do not guess an answer that the user has not given.

## Inputs

- Feature ID: the feature to define, as the user names it.
- Feature entry: its description, its requirement references and its "done when" statements.
- Stories of completed features: to avoid overlap with them.

## Outputs

- Stories file for the feature, with one section per story.
- Criteria numbered in order within the feature, each with a tag that says how it is checked.
- A short list of open questions, if any remain after asking.

## Rules

- Ask one question at a time. Give two to four options, the recommended one first.
- Write a criterion only when it can be observed. Do not name a technology, a framework or a tool in a criterion.
- Cover every "done when" statement with at least one criterion.
- If the feature has no requirement reference, stop and tell the user that the requirements come first.
- Do not change the files of other features.
- Ask the user to review the stories before the next step.

## Checks

- Every criterion has an ID that is unique within the feature and a tag.
- Every "done when" statement is covered by at least one criterion.
- No criterion depends on a particular stack.
- No open question blocks a criterion that is already written.
