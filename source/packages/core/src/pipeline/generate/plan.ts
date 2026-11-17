// The file list of the generator (architecture.md §6, decisions 23 and 35). Planning fixes which files are
// written, their paths and their order, from the config and the template shapes. Every layout is rendered here,
// with the values of its file (command, agent, rule or base); the description and rule tags come from the flow or
// Agent block it is built from. Pure: no file is read and no config or template is changed.

import type { Finding } from '../analyze/index.js';
import type { Agent, Flow, Id, Pipeline, ProjectConfig, Rule } from '../model.js';
import { GenerationError } from './errors.js';
import { configProblems } from './problems.js';
import { type PlaceholderValues, renderText } from './render.js';
import type { Layout, Templates } from './templates.js';
import { agentValues, baseValues, ruleValues } from './values-agent.js';
import { flowValues, pipelineValues } from './values-command.js';

// One file the generator writes: its output path, its rendered layout text, the `##` headings a Markdown output
// must carry (the reply check reads them from the plan), and the description and rule tags of the flow or Agent
// block it is built from (empty when none).
export interface PlannedFile {
  readonly path: string;
  readonly text: string;
  readonly headings: readonly string[];
  readonly description: string;
  readonly ruleTags: readonly Id[];
}

// The outcome of planning: the files sorted by path, or the blockers that refuse the config.
export type Plan =
  | { readonly ok: true; readonly files: readonly PlannedFile[] }
  | { readonly ok: false; readonly problems: readonly Finding[] };

// Plans the files of a config. A config with a blocker is refused and nothing is planned. A path that is not
// file-safe, or a path planned twice, is a bug in the generator or the templates and throws GenerationError.
export function planGeneration(config: ProjectConfig, templates: Templates): Plan {
  const problems = configProblems(config);
  if (problems.length > 0) {
    return { ok: false, problems };
  }

  const { flows } = config.pipeline;
  const base = baseValues(config);
  const files: PlannedFile[] = [
    ...templates.base.map((file) => entry(file.path, rendered(file.path, file, base), '', [])),
    pipelineCommand(config.pipeline, templates.pipelineCommand),
    ...flows.map((flow) => flowCommand(flow, templates.command)),
    ...flows.flatMap((flow) =>
      flow.blocks.flatMap((block) => (block.kind === 'agent' ? [agentFile(block, templates.agent)] : [])),
    ),
    ...config.rules.map((rule) => ruleFile(rule, templates.rule)),
  ];

  const seen = new Set<string>();
  for (const file of files) {
    if (!isFileSafe(file.path)) {
      throw new GenerationError(`The planned path "${file.path}" is not a file-safe relative path.`);
    }
    if (seen.has(file.path)) {
      throw new GenerationError(`Two planned files have the path "${file.path}".`);
    }
    seen.add(file.path);
  }

  files.sort((a, b) => compareCodePoints(a.path, b.path));
  return { ok: true, files };
}

// A planned file from a layout, with the given description and rule tags.
function entry(path: string, layout: Layout, description: string, ruleTags: readonly Id[]): PlannedFile {
  return { path, text: layout.text, headings: layout.headings, description, ruleTags };
}

// A layout with its placeholders filled from the values of its file; the headings are kept.
function rendered(path: string, layout: Layout, values: PlaceholderValues): Layout {
  return { text: renderText(path, layout.text, values), headings: layout.headings };
}

// The agent file of an Agent block: its layout rendered with the block's values, its description and rule tags.
function agentFile(agent: Agent, layout: Layout): PlannedFile {
  const path = `.claude/agents/${agent.name}.md`;
  return entry(path, rendered(path, layout, agentValues(agent)), agent.description, agent.ruleTags ?? []);
}

// The rule file of a rule: its layout rendered with the rule's title and text, with no description and no tags.
function ruleFile(rule: Rule, layout: Layout): PlannedFile {
  const path = `.claude/rules/${rule.id}.md`;
  return entry(path, rendered(path, layout, ruleValues(rule)), '', []);
}

// The pipeline command file: its layout rendered with the pipeline's values. It has no description or rule tags
// of its own; those belong to the flow or Agent block a file is built from.
function pipelineCommand(pipeline: Pipeline, layout: Layout): PlannedFile {
  const path = '.claude/commands/pipeline.md';
  const text = renderText(path, layout.text, pipelineValues(pipeline));
  return entry(path, { text, headings: layout.headings }, '', []);
}

// The command file of a flow: its layout rendered with the flow's values, its description and its rule tags.
function flowCommand(flow: Flow, layout: Layout): PlannedFile {
  const path = `.claude/commands/${flow.id}.md`;
  return {
    path,
    text: renderText(path, layout.text, flowValues(flow)),
    headings: layout.headings,
    description: flow.description,
    ruleTags: flow.ruleTags ?? [],
  };
}

// A file-safe path is relative, uses `/` only, and has no empty segment and no `..` segment.
export function isFileSafe(path: string): boolean {
  if (path.startsWith('/') || path.includes('\\')) {
    return false;
  }
  return path.split('/').every((segment) => segment !== '' && segment !== '..');
}

// Orders two texts by code point. A plain `<` compares UTF-16 units, which puts an astral character before
// U+FFFF, so the code points are compared one by one.
export function compareCodePoints(a: string, b: string): number {
  const x = Array.from(a, (char) => char.codePointAt(0) ?? 0);
  const y = Array.from(b, (char) => char.codePointAt(0) ?? 0);
  const length = Math.min(x.length, y.length);
  for (let i = 0; i < length; i++) {
    const delta = (x[i] ?? 0) - (y[i] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return x.length - y.length;
}
