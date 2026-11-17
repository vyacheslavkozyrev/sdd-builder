# Project instructions for Claude Code

This project is built with a spec-driven process. Each feature goes through the flows of the process in order, and the process is run through the commands in `.claude/commands/`. The process diagram and the description of each step are in `spec/documents/process.md`.

## The process

The process is made of flows. A flow runs its steps in order; a check step can route back to an earlier step of its flow. A gate sits between two flows and is run before the next flow starts.

{{processList}}

## Commands

The commands are the entry points. Run the pipeline command with the arguments it lists; it runs the flows above in order.

{{commandList}}

## Agents

Each agent is a subagent with its own instructions. A flow runs an agent by name, with the arguments of its step.

{{agentList}}

## Rules

The rules are the standing conventions of the project, one file each in `.claude/rules/`. The command and agent files list the rule tags that apply to them.

{{ruleList}}

## Working rules

- Work on one task at a time. Record each finished task in the plan and the progress file of its feature.
- Keep the spec files of a feature in its own folder under `spec/specifications/`. Start a new feature by copying the template folder in `spec/specifications/` into a new folder for it, named with the feature's ID and a short slug.
- Do not push, force or rewrite history unless the user asks for it.
