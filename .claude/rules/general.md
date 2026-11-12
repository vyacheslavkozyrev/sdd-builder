# General Rules

## Scope
- Implement what the task and its acceptance criteria ask for, nothing more.
- Generated output is part of the product: a change to a template is a change to what users download, so treat it with the same care as code.

## Code
- Match the style of the surrounding code.
- No dead code, no commented-out code, no TODOs without a feature ID.
- No secrets, tokens or API keys in the repository. Use environment variables (`.env` is git-ignored).

## Architecture
- Respect the dependency direction in `spec/documents/architecture.md` §1.
- A decision that changes the architecture is recorded in `architecture.md` §5 before code depends on it.

## Documentation
- When behaviour changes, update the document that describes it in the same task.
- Generated projects must not refer to SDDBuilder's own files; they are self-contained.
