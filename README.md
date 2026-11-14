# SDDBuilder

Design a spec-driven development (SDD) process for a project in the browser, and download it as a ready project structure for Claude Code.

You draw the process as a pipeline: a map of flows (for example specify, UX, plan, build, verify, complete) with the gates and checks between them. Each flow has its own tab with its blocks in order: agents, conditions and connections. You describe the project: idea, stack, architecture, code rules and test rules. The service checks both (structural rules plus an LLM review) and returns a zip with the files. It is anonymous and stateless: nothing is kept between visits in the MVP.

The process it packages comes from the ComEd and PhotoSync projects in `../ComEd` and `../PhotoSync`.

The screens in `spec/design/features/` are wireframes, not the final UI.

## Status

Scaffold. The domain model and the step catalog exist in `source/packages/core`; the model is being changed to a pipeline with flows, blocks, gates and checks. The generator, the UI and the API are planned in [spec/documents/features.md](spec/documents/features.md).

## Layout

```
source/apps/web/             wizard: brief, pipeline builder (Map tab and flow tabs), analyze and generate (planned)
source/apps/api/             analyze and generate endpoints (planned)
source/packages/core/        model, step catalog, structural checks, generator
source/templates/            templates for the Claude Code layout
spec/design/features/      wireframes per feature (UX screens, approved before Build)
spec/                 idea, architecture, features, building blocks, process, feature specs
.claude/              commands, agents and rules for building SDDBuilder itself
```

## Documents

- [Idea, decisions and open questions](spec/documents/idea.md)
- [Building blocks: pipeline, flows, blocks, gates and checks](spec/documents/building-blocks.md)
- [Architecture](spec/documents/architecture.md)
- [Features](spec/documents/features.md)
- [Working process](spec/documents/process.md)
- [Templates and placeholders](source/templates/README.md)
- [Market research](spec/documents/market-research.md)
- [Screen wireframes](spec/design/features/)

## Setup

```
npm install
npm run typecheck
```

Requires Node 20 or later.
