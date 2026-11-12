# QA Rules

## Tests travel with the code

Say that every task adds or updates the tests for the code it changes, in the same task. Say that there are no tests-later tasks.

## Where tests live

Say where each level of test lives in the project: unit tests inside the package they cover, HTTP-level tests with fakes for every external service, and tests of view models and logic for the user interface. Say that no test runs against a real external service, the real network or the wall clock.

## Naming criteria

Say that criterion identifiers restart in every feature. Say that every test that proves a criterion carries the feature and the criterion in its name. Say that a criterion tagged for automated checks needs at least one passing test that names it, and that a criterion tagged for a device goes into the feature's manual checklist.

## What to test

Say that pure logic is tested with table-driven tests that include edge and negative cases. Say that error paths are tested, not only the happy path. Say that generated output is deterministic and is proved so by generating twice and comparing. Say that no test depends on the state left by another test.
