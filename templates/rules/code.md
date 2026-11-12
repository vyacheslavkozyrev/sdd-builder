# Code Rules

## Naming

Say how files, types, functions and variables are named, and that a name states what the thing is or does. Say that a name shared by several parts of the project is declared in one place, and that other code imports it rather than declaring it again.

{{codeRules}}

## Structure

Say how the code is split into modules and packages, and which way dependencies may point. Say which parts must stay free of input and output (the file system, the network, model calls and the user interface) and that they receive data and return data. Say that output is deterministic: generated files carry no timestamps and no random identifiers.

## Examples

Say that each rule of the project is shown with a short example in plain prose, so that a reader can apply it without guessing. Say that examples are kept in sync with the rules they illustrate.

## Errors

Say that a programmer error is raised, a user error is returned as a finding, and no error is swallowed silently. Say what the tests of error paths must cover.

{{testRules}}
