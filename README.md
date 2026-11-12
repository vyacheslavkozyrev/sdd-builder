# SDDBuilder

Design a spec-driven development (SDD) process for a project in the browser, and download it as a ready project structure for Claude Code.

You draw the process as a global map of workflows (for example Specify, Implement, Verify, Release). Each workflow has its own tab with its steps, quality gates and branches in order. You describe the project: idea, stack, architecture, code rules and test rules. The service checks both (structural rules plus an LLM review) and returns a zip with the files. It is anonymous and stateless: nothing is kept between visits in the MVP.

The process it packages comes from the ComEd and PhotoSync projects in `../ComEd` and `../PhotoSync`.

The screens in `design/mockups/` are wireframes, not the final UI.

## Status

Scaffold. The domain model and the step catalog exist in `packages/core`, and the model is being changed to workflows and steps. The generator, the UI and the API are planned in [spec/documents/features.md](spec/documents/features.md).

## Layout

```
apps/web/             visual builder: global map, workflow tabs, brief form (planned)
apps/api/             analyze and generate endpoints (planned)
packages/core/        model, step catalog, structural checks, generator
templates/            templates for the Claude Code layout
design/mockups/       wireframes of the MVP screens
spec/                 idea, architecture, features, building blocks, process, feature specs
.claude/              commands, agents and rules for building SDDBuilder itself
```

## Documents

- [Idea, decisions and open questions](spec/documents/idea.md)
- [Building blocks: workflows, steps, gates, branches](spec/documents/building-blocks.md)
- [Architecture](spec/documents/architecture.md)
- [Features](spec/documents/features.md)
- [Working process](spec/documents/process.md)
- [Templates and placeholders](templates/README.md)
- [Market research](spec/documents/market-research.md)
- [Screen wireframes](design/mockups/README.md)

## Setup

```
npm install
npm run typecheck
```

Requires Node 20 or later.
