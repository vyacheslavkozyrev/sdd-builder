# Process

## Overview

Explain in two or three sentences how work moves through this project, from an idea to a finished feature, and where the state of each feature is recorded.

## Flows

The process in the order the pipeline runs it: each enabled block of the pipeline, and under each flow its blocks in order. Say which flow starts first and which one a connection hands over to.

{{processList}}

## Gates and checks

List the gates and checks between the flows as preconditions: what must be approved or passing before the next flow starts. Where a check routes back to an earlier block, say how many times it may retry before it stops. Where a gate or check has no round limit, say so.

## Feature state

Each feature has a folder under `spec/specifications/` with its stories, its plan and a progress file. Describe the phases recorded in the progress file and what each phase means, and say that a task is ticked only when its checks have passed.
