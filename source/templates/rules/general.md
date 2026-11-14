# General Rules

## Scope

Say that a change implements what its task and its acceptance criteria ask for, and nothing more. Say that generated output is part of the product, so a change to a template is treated with the same care as a change to code.

## Code

Say that code matches the style of the surrounding code. Say that there is no dead code, no commented-out code, and no TODO without an identifier of the feature it belongs to. Say that no secret, token or key is written into the repository; values come from environment variables, and the local environment file is kept out of version control.

## Architecture

Say that the dependency direction in the architecture document is respected. Say that a decision that changes the architecture is recorded in the architecture document before code depends on it.

## Documentation

Say that when behaviour changes, the document that describes it is updated in the same task. Say that generated files are self-contained and do not refer to the files of the tool that produced them.
