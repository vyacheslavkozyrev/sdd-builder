# Process

This project follows a spec-driven process made of flows. Each flow is one step of the process, and the flows run in the order listed below. Each flow runs its blocks in order.

## Running the process

Run `/pipeline` to run the whole process. It runs the flows in order. A flow that asks for approval stops for the person's approval before the next flow starts, and the process does not go on until that approval is given.

## Flows

The flows in order. Each item gives the flow's name and id, its description, and whether the process stops for a person at the end of the flow. The conditions of a flow and their routes are listed under it.{{processFlows}}

## Diagram

The diagram shows the same flows in the same order, with the links between them. A flow marked approval stops for the person's approval at its end.

```mermaid
{{processDiagram}}
```
