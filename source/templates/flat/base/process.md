# Process

## Overview

Explain in two or three sentences how work moves through this project, from an idea to a finished feature, and where the state of each feature is recorded.

## Process diagram

{{process.diagram}}

## Workflows

For each workflow on the map, in the order it runs: its name, the steps it runs in order, and the artifact each step produces. Say which workflow starts first and which one a step hands over to.

## Gates and branches

List the gates on the map as preconditions: what must be approved or passing before the next workflow starts. List the branches: where a step routes back to an earlier step, and how many times it may retry before it stops. Where a gate or branch has no round limit, say so.

## Feature state

Each feature has a folder under `spec/specifications/` with its stories, its plan and a progress file. Describe the phases recorded in the progress file and what each phase means, and say that a task is ticked only when its checks have passed.
