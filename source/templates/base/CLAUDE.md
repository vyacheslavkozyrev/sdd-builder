# {{projectName}} — Claude Code

## Overview

{{idea}}

Write two to four sentences: what the project is, who uses it, and what it is not. Name the language in one line: {{stack.language}}.

## Layout

Give the folder tree as a code block and say what each folder holds: project documentation, one folder per feature under the specifications, the source packages or apps, and the Claude Code files under `.claude/`.

Modules:

{{modules}}

## Working rules

State the rules of engagement from the brief: how features are identified and how commit messages start, where work happens, what needs approval before it lands, and what the assistant must never do without being asked (push, force, rewrite history).

## Commands and agents

List the commands in `.claude/commands/` and the agents in `.claude/agents/`, one line each, and point to `spec/documents/process.md` for the order they run in.

## Rules

Read per task (not auto-loaded). Read only the rule files that apply to the layer being changed.

- `.claude/rules/general.md`: any code.
- `.claude/rules/qa.md`: writing tests and acceptance criteria.

Code rules:

{{codeRules}}

Test rules:

{{testRules}}
