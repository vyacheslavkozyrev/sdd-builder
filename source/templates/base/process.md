# Process

This project runs its features through a spec-driven process. The process is made of flows, and each flow runs its blocks in order. A check block can route back to an earlier block of its flow; a gate sits between two flows and is run before the next flow starts. The commands in `.claude/commands/` run the process, and the project instructions are in `CLAUDE.md`.

## The process as text

Each flow is listed in pipeline order, with its steps under it. A gate is listed after the flow it follows.

{{processList}}

## The process diagram

The diagram shows the same flows and gates as the text above. Each arrow runs from a flow to the gate or flow that follows it; a gate is a decision between two flows.

```mermaid
{{processDiagram}}
```

## Commands

The pipeline command runs the flows in order. Each flow also has its own command, which can be run on its own.

{{commandList}}

## Working with the process

- Start a feature by copying the template folder under `spec/specifications/` into a new folder for it, named with an ID and a short slug.
- Record each finished task in the plan and the progress file of the feature, and tick it only when its checks pass.
- Do not move on to a flow until the gate before it has passed.
