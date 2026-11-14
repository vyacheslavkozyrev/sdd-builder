# End-to-end tests

## Purpose

Verify that the application, started as a user would run it, passes its end-to-end suite. The generated script is the gate for changes that touch user-facing behaviour. It runs the end-to-end suite only when the project has one; a project without one is reported and the script stops.

## Inputs

- The source code of the project, as it stands in the working tree.
- The end-to-end suite that the project defines for itself, and the way the project starts its application.

## Outputs

- One script file in the scripts folder of the generated project, named after this step.
- When it runs: a short report that names the application start, the suite and the result of each.

## Rules

- Run only the end-to-end suite the project defines. Do not add checks of its own.
- Start the application before the suite and stop it after the suite, whatever the result.
- If the project has no end-to-end suite, report that fact and stop without running anything.
- Do not change source files, configuration or dependency records while it runs.
- Do not read or print secrets or environment files.
- Keep the report free of timestamps so that two runs on the same code produce the same output.

## Checks

- The application starts and answers before the suite begins.
- The end-to-end suite passes with no failing scenarios.
- The application is stopped when the run ends, whether the suite passes or fails.
- When the project has an end-to-end suite, the exit status is zero only when the application starts and the suite passes, and non-zero otherwise.
- A project without an end-to-end suite is reported as such, and the exit status is zero.
