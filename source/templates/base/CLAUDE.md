# Project instructions

This project is built with a spec-driven process. The process and its flows are described in `process.md`.

## Running the process

Run `/pipeline` to run the whole process. It runs the flows in order: each flow runs its blocks in order, and a flow that asks for approval stops for the person's approval before the next flow starts.

## Commands

The command files are in `.claude/commands/`.{{commandList}}

## Agents

The agent files are in `.claude/agents/`, one for each agent block of the flows.{{agentList}}

## Rules

The rule files are in `.claude/rules/`, one for each rule of the project, each named from the rule's title. A command or an agent lists the rules it is tagged with.{{ruleList}}
