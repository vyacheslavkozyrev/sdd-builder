# SDDBuilder — Claude Code

SDDBuilder is a web service. A user designs an SDD (spec-driven development) process in the browser, as a global map of workflows and describes a project; the service checks the brief (structural checks plus an LLM review), and returns a zip with the Claude Code framework files (instructions, spec templates, commands, agents, rules). Anonymous and stateless; the only target in the MVP is Claude Code. GitHub Spec Kit and OpenSpec outputs are planned next (`spec/documents/architecture.md` §8), and gates and a process diagram are planned (§9, §10).

Documents are **not** auto-loaded. Read only the part you need, with `grep -n '^## ' <file>` to find sections:

- Idea, assessment and decisions: `spec/documents/idea.md`
- Components, data flow, LLM analysis, technology: `spec/documents/architecture.md`
- Feature list and dependencies: `spec/documents/features.md`
- Building blocks: workflows, steps, gates, branches, the global map: `spec/documents/building-blocks.md`
- Screen wireframes (not the final UI): `design/mockups/README.md`
- Working process: `spec/documents/process.md`
- Template placeholders: `templates/README.md`

## Layout

```
apps/web/             visual builder (global map, workflow tabs), brief form (Vite + React, proposed)
apps/api/             HTTP API: analyze (structural + LLM), generate, zip (stateless)
packages/core/        domain model, block catalog, structural checks, generator (pure TypeScript)
templates/            text templates for the Claude Code layout (data, not code)
spec/documents/       project documentation
spec/specifications/  one folder per feature; F-00-template is the starting point
.claude/rules/        coding and QA rules
```

## Working rules

- Dependency direction: `web → core`, `api → core`. `core` never imports from `apps/`.
- `packages/core` is pure: no file system, HTTP, LLM or UI code. I/O and LLM calls belong in `apps/api`.
- The LLM is called only from `apps/api`, only in `/analyze` (review) and `/generate` (writing the final framework files from the block descriptions). `packages/core` sets the structure of the output and checks what the model returns (`architecture.md` §6, decision 7).
- `ANTHROPIC_API_KEY` lives in the server environment only. Never put it in the browser bundle, a log line, a fixture or a commit.
- Brief content is never stored or logged by the server.
- The process is data: workflow and step definitions and templates change the output without changing generator code.
- Workflows do not nest. A workflow's steps run in order; branches route only inside their workflow.
- Every feature is `F-XX`; commit messages start with the feature ID.
- The repository is not a git repository yet. Do not commit until `git init` is done and asked for.
- Never push, force, or rewrite history without being asked.

## Setup

```
npm install
npm run typecheck
scripts/task-check.sh      # type check + tests; fails until the test script exists (F-02)
```

## Commands and agents

The working cycle is the same as in the ComEd and PhotoSync projects. Commands in `.claude/commands/`: `/research`, `/specify`, `/plan`, `/ux`, `/implement`, `/review`, `/test`, `/commit`, `/pipeline`. The UX step (`/ux`) draws the feature's screens as SVG under `design/features/F-XX-<slug>/` and waits for the user's approval before Build. Agents in `.claude/agents/`: `implement`, `review`, `test` (verify mode). Details in `spec/documents/process.md`.

Commands and agents run only after the repository is a git repository on `main` with a clean tree (`git init` first).

## Rules

Read per task (not auto-loaded):

- Any TypeScript code: `.claude/rules/typescript.md`
- Any code: `.claude/rules/general.md`
- Writing tests and acceptance criteria: `.claude/rules/qa.md`
