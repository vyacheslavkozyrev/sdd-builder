# TypeScript Rules

## Compiler
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` stay on (`source/tsconfig.base.json`). Do not weaken them to make code compile.
- Import relative modules with the `.js` extension (NodeNext resolution), e.g. `from './model.js'`.
- Use `import type` for type-only imports (`verbatimModuleSyntax`).

## Types
- Domain shapes live in `source/packages/core/src/pipeline/model.ts` (the pipeline model). Other packages import them; they do not redeclare them.
- Prefer discriminated unions over optional flags for states.
- No `any`. Use `unknown` at boundaries and narrow it (API input, saved JSON).
- Validate `ProjectConfig` at the API and at JSON load, against the model; never trust a typed value that came from outside.

## Purity
- `source/packages/core` has no I/O: no `fs`, `http`, `window`, `process.env`. Pass data in, return data out.
- Generator structure is deterministic: the file list, paths and order come from `source/packages/core`. No timestamps or random ids are added to generated files by code. LLM-written content is validated before it is returned.

## Errors
- Throw for programmer errors (unknown block id). Return findings for user errors (an incomplete brief). Never swallow an error silently.
