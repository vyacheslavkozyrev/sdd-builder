# Unit tests

## Purpose

Verify that the code of the project passes its type check and its test suite. The generated script is the gate that the implementation and verification steps rely on before a change is accepted.

## Inputs

- The source code of the project, as it stands in the working tree.
- The type check and the test suite that the project defines for itself.

## Outputs

- One script file in the scripts folder of the generated project, named after this step.
- When it runs: a short report that names each check and its result.

## Rules

- Run only the checks the project defines. Do not add checks of its own.
- Run every check, in order, and report each result, even after a failure.
- Do not change source files, configuration or dependency records while it runs.
- Do not read or print secrets or environment files.
- Keep the report free of timestamps so that two runs on the same code produce the same output.

## Checks

- The type check of the whole project passes with no errors.
- The test suite of the whole project passes with no failing tests.
- The exit status is zero only when every check passes, and non-zero when any check fails.
- Every check that ran is named in the report with its result.
