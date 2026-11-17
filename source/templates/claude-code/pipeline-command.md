# Pipeline

Runs the whole pipeline for one feature: each flow in order, with its approval or check gate before the next flow.
Each flow has its own command file, listed under Command files; this file only sequences them.

## Arguments

{{argumentList}}

## Steps

Run the steps in order. A check that fails sends the work back as the Rules section says.

{{pipelineStepList}}

## Rules

{{routeRules}}

## Command files

{{commandList}}
