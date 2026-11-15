# {{projectName}} — Claude Code

## Overview

{{idea}}

Write two to four sentences: what the project is, who uses it, and what it is not. Name the language in one line: {{stack.language}}.

## Layout

Give the folder tree as a code block and say what each folder holds: project documentation under `spec/documents/`, one folder per feature under `spec/specifications/`, the source, and the Claude Code files under `.claude/`.

## Working rules

State the rules of engagement from the brief: how features are identified and how commit messages start, where work happens, what needs approval before it lands, and what the assistant must never do without being asked (push, force, rewrite history).

## Commands and agents

The commands in `.claude/commands/`, one line each:

{{commandList}}

The agents in `.claude/agents/`, one line each:

{{agentList}}

Point to `spec/documents/process.md` for the order they run in.

## Rules

Read per task (not auto-loaded). Read only the rule files that apply to the layer being changed.

{{ruleList}}
