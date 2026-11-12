# SDDBuilder — Market Research

Status: first pass, 2026-11-11. Based on nine web searches and secondary sources (vendor blogs, directories, mirrors). Star counts, tool counts and feature claims are self-reported and must be checked against each project's repository before a decision depends on them.

## Question

Does something like SDDBuilder already exist: a tool that gives a developer a spec-driven development (SDD) process for a new project, configured and downloaded as files for their AI coding agent?

## Short answer

Yes, in parts. Several open-source projects give a spec-driven process for Claude Code, and several community generators set up `.claude/` for a new project. **We found no tool that combines a visual, editable lifecycle with a checked project brief and a downloadable framework.** The visual builder is the gap, but it is a thin layer on top of something that already works, so it is not enough on its own to build a product around.

## 1. Spec-driven process frameworks (the methods)

| Product | Owner | Licence | What it gives | Agents supported | Notes |
|---|---|---|---|---|---|
| [GitHub Spec Kit](https://github.github.com/spec-kit/) | GitHub | MIT | Specify → Plan → Tasks → Implement, a project constitution, a CLI (`specify`) | Copilot, Claude Code, Gemini CLI, and others | Self-reported: 30 integrations, 105 extensions, 106K+ GitHub stars (snapshot). GitHub calls it an experiment. |
| [OpenSpec](https://agentic-ai.readthedocs.io/en/latest/Standards/openspec/) | Fission AI | MIT | Propose → apply → archive; spec documents per change | Claude Code (native, `/opsx:` commands), Cursor (native, `.cursor/rules`), Copilot and 20–30+ tools (self-reported) | Installed with npm; `openspec init --tools claude,cursor`. Star count varies by source (about 27K–43K). |
| [Agent OS](https://buildermethods.com/agent-os/v2) | Builder Methods (Brian Casel) | Open source | Six phases from product planning to implementation; standards, product and spec layers | Claude Code (subagents), other tools run the same command files | Organises knowledge in three layers. Strong on context, not on configuration. |
| [BMAD-METHOD](https://github.com/bmadcode/bmad-method) | BMad Code, LLC | MIT | An agile team of specialised agents (Analyst, PM, Architect, SM, Dev, QA) | Bring-your-own-model, IDE-agnostic | Over 12 personas. Expansion packs for non-software work. Official repo not fetched in this pass. |
| [Kiro](https://tessl.io/blog/from-vibe-coding-to-viable-code-aws-dives-into-spec-driven-ai-software-development-with-kiro/) | AWS | Commercial IDE (pricing not checked) | IDE that turns a request into requirements, design and tasks, with hooks and steering files | Its own IDE (a Code OSS fork) | An IDE, not a generator. Public preview from July 2025. |
| [Tessl Framework](https://tessl.io/blog/tessl-launches-spec-driven-framework-and-registry/) | Tessl | Commercial | MCP plugin that adds spec-first tools to existing agents; a public Registry of spec "tiles" | Claude Code, Cursor, Codex, Gemini CLI | Framework in closed beta; Registry in open beta (per the launch post). |

**Read-across:** the methods are crowded and well funded. Spec Kit and OpenSpec are the two to watch: both are open source, both target Claude Code and Cursor, and both have community momentum. Neither has a visual configurator.

## 2. Generators and scaffolders for Claude Code (the files)

These are the closest to our MVP. They generate `CLAUDE.md`, agents, commands and rules for a new project.

| Product | Form | What it does | Notes |
|---|---|---|---|
| [Project Scaffolder (fltman)](https://cdn.jsdelivr.net/gh/fltman/project-scaffolder@main/README.md) | Meta-project with slash commands | Interactive wizard; ready-made CLAUDE.md templates for minimal, React/TypeScript, Python API, fullstack | Stack-specific presets; no visual editor. |
| [cc-rig](https://pypi.org/project/cc-rig/3.2.0/) | PyPI package | Agents, commands, hooks and skills, in presets from quick to standard | Presets are the main idea: a tier per project size. |
| [sakebomb/scaffold](https://github.com/sakebomb/scaffold) | CLI | Asks questions, produces constitution, commands, tiered tests, language tooling | Closest to our "analyse the answers, then generate" idea. |
| [Claude Code Templates](https://claude-skills-guide-3lc.pages.dev/claude-code-templates-600-agents-guide-2026/) | CLI with a library | Pick from a categorised library of agents, commands, hooks and MCP configs | Library-first: the user picks parts, does not design a process. |
| [project-scaffold plugin](https://skillselion.com/skills/Imit96/imit-dev-plugins/plugins/project-scaffold) | Claude plugin | A nine-phase interview that writes CLAUDE.md, rules, agents, skills, commands and progress tracking | Interview-based: similar to our brief form, without a lifecycle editor. |
| [qazuor/claude-code-config](https://lobehub.com/es/mcp/qazuor-claude-code-config) | Wizard or bundles | Agents, skills, commands, MCP servers, permissions, placeholders | Broad configuration, no process model. |
| [komluk scaffolding plugin](https://claudepluginhub.com/plugins/komluk-scaffolding) | Claude plugin | Analyses an existing project and generates `.claude/` | Works from code, not from an idea. |

**Read-across:** this is a crowded niche of one-shot scaffolders. Most offer presets or a library, not a process model. None we found analyses the brief with an LLM before generating.

## 3. Multi-tool process kits

| Product | What it does | Notes |
|---|---|---|
| [AI DevKit (lytv)](https://github.com/lytv/ai-devkit) | CLI that sets up Cursor or Claude Code, with all phases or a chosen list; phase templates in `docs/ai/`; rules in `.cursor/rules` | The nearest match on multi-tool output. Its visual element is a Mermaid flowchart in the README, not a builder. |
| [AWS AI-DLC](https://dev.to/devtoaaron/aws-ai-dlc-the-agentic-dev-lifecycle-that-works-everywhere-379j) | A methodology with rule files for many tools (`.cursor/rules/`, `CLAUDE.md`, `.claude/`) | Its authors say the rules are the same everywhere; only the location changes. Supports the idea of one source, many outputs. |
| [Developer Toolkit](https://developertoolkit.ai/en/method/) | An AI-native SDLC loop shared by Claude Code, Cursor and Codex | Describes the process; not a generator. |

## 4. Where SDDBuilder would sit

| Dimension | SDDBuilder (planned) | Closest alternatives |
|---|---|---|
| Lifecycle editable by the user | Yes: visual blocks, add, remove, reorder | Not found in any result. Spec Kit and OpenSpec have fixed flows; Claude scaffolders use presets. |
| Brief checked before generation | LLM review plus structural checks | Interview-based plugins collect answers but do not review them. |
| Download a ready project | Zip, no install | CLI tools need local install; Spec Kit and OpenSpec are npm/uv installs. |
| Anonymous, no account | Yes | Most are local tools, so no account question arises. |
| Output for Claude Code | Yes (MVP) | Most alternatives. |
| Output for Cursor and Copilot | Post-MVP | OpenSpec, AI DevKit and Spec Kit already do both. |
| Strict commit-per-task gate | Yes (our own process, from ComEd and PhotoSync) | Not found as a generated option. Spec Kit and OpenSpec do not describe commit gating in what we read. Verify. |

## 5. Implications

1. **The visual lifecycle is our differentiator, but it is unproven.** Nobody in the results offers it. That also means nobody has shown users want it. Test it with real users before building the full editor.
2. **The LLM brief review is a second differentiator.** Interview plugins collect answers; none we found checks them for gaps and contradictions. This is worth more than the visual layer if the analysis is good, so F-04 should be measured early.
3. **The competitor set is moving.** Spec Kit and OpenSpec are the two to beat on reach. They are free, open source and installed by a single command. A web configurator must justify the extra step: a visual model, a checked brief, a download with no install.
4. **Consider compatibility rather than only competition.** Generating a layout that Spec Kit or OpenSpec can read would reuse their users. This is an option to research, not a decision. It would change F-03 and the architecture.
5. **Our process is the content, and it is specific.** The commit-per-task gate, the 400-line diff guard and the traceability from requirement to commit are more opinionated than Spec Kit's flow. That is a fit for a particular kind of team, not for everyone. Position it that way.
6. **The scope risk is real.** Community scaffolders show that one-shot generation is easy to copy. Keep the MVP small and focused on the brief and the lifecycle, and do not start Cursor and Copilot until users ask for them.

## 6. Open questions for the next research pass

1. Check the GitHub repositories of Spec Kit, OpenSpec and BMAD directly: current star counts, release cadence, and whether they have a visual or web configurator.
2. Look for any web-based configurator for Claude Code or Cursor rules (search by product name or GitHub topic such as `claude-code-template`).
3. Read Spec Kit's and OpenSpec's file layouts to judge whether a compatible output is practical.
4. Find evidence of demand: forum threads, issues or posts asking for a visual or configurable process for AI coding agents.
5. Check Kiro's and Tessl's pricing and licences; they set a price expectation for paid tools.

## 7. Round 2 — format check and user input (2026-11-11)

Format check: the public pages of Spec Kit and OpenSpec were fetched and summarised. Paths are partly confirmed (OpenSpec `openspec/changes/<name>/` with `proposal.md`, `specs/`, `design.md`, `tasks.md`, and `openspec/changes/archive/`; Spec Kit `.specify/` and `/speckit-*` commands). Exact file trees were not in the fetched text; verify in the repositories before building an adapter.

The product owner's input changes three things:

1. **Compatibility is a strategy.** Support Spec Kit and OpenSpec outputs, so teams keep their tool and get our lifecycle and gates. This answers implication 4 above.
2. **Gates must be configurable.** Our process's gates (approval, checks, review, diff size) are a differentiator only if the user can set them.
3. **The visual builder is a sales tool, not only a config editor.** The product owner's own practice: a process diagram in Miro, agreed with the client, then built into the SDD setup by hand. The service should close that gap itself: the builder is the diagram, so no second tool is needed. The competitors' CLI tools do not give this.

Open question: most of the strongest players are CLI tools. A web tool that produces a diagram for a client conversation is the part they do not cover. Check this with two or three consultants before building the editor.

## Sources

- GitHub Spec Kit: https://github.github.com/spec-kit/ · https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/
- OpenSpec: https://agentic-ai.readthedocs.io/en/latest/Standards/openspec/ · https://dev.to/recca0120/openspec-make-ai-coding-assistants-follow-a-spec-not-just-guess-22dp
- Agent OS: https://buildermethods.com/agent-os/v2 · https://buildermethods.com/library/spec-driven-development-claude-code
- BMAD-METHOD: https://github.com/bmadcode/bmad-method · https://codemyspec.com/blog/bmad-method-explained
- Kiro: https://tessl.io/blog/from-vibe-coding-to-viable-code-aws-dives-into-spec-driven-ai-software-development-with-kiro/ · https://dzone.com/articles/kiro-feature-to-requirements-design-tasks
- Tessl: https://tessl.io/blog/tessl-launches-spec-driven-framework-and-registry/
- Claude Code scaffolders: https://cdn.jsdelivr.net/gh/fltman/project-scaffolder@main/README.md · https://pypi.org/project/cc-rig/3.2.0/ · https://github.com/sakebomb/scaffold · https://claude-skills-guide-3lc.pages.dev/claude-code-templates-600-agents-guide-2026/ · https://skillselion.com/skills/Imit96/imit-dev-plugins/plugins/project-scaffold · https://lobehub.com/es/mcp/qazuor-claude-code-config · https://claudepluginhub.com/plugins/komluk-scaffolding
- Multi-tool kits: https://github.com/lytv/ai-devkit · https://dev.to/devtoaaron/aws-ai-dlc-the-agentic-dev-lifecycle-that-works-everywhere-379j · https://developertoolkit.ai/en/method/
