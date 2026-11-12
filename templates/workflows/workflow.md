# {{workflow.name}}

## Purpose

This command runs the workflow `{{workflow.id}}`. Work through its steps in the order listed below, check the rules before each step, and stop at the first step whose precondition is not met. Report what is missing instead of guessing.

## Steps

Each step has its own file, named in the list. Read that file before running the step, and finish one step before starting the next.

{{workflow.steps}}

## Rules

Apply these rules before and between steps. A rule is never skipped because a step looks simple.

{{workflow.rules}}

## Scope

Run this workflow {{workflow.scope}}.
