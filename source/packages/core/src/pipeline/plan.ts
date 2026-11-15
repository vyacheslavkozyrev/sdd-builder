// The generation plan for the pipeline model (F-03 AC-002, AC-003, AC-004, AC-007, AC-008, AC-009, AC-011, AC-012). One
// entry per output file, in the order and with the paths that the pipeline `generate` returns. Each entry carries the
// layout of its file with its values filled: base files from `templates/base`, the pipeline command from
// `claude-code/pipeline-command.md`, each flow command from `claude-code/command.md`, each agent from `claude-code/agent.md`
// and each rule from `claude-code/rule.md`. An agent entry and a flow command entry carry their description and rule-set
// tags. Pure: no file or network I/O; the templates come from a TemplateSource and the plan is returned, never written.
import type { ListableTemplateSource } from '../template-source.js';
import { renderBaseFiles } from './generate/base-files.js';
import { argumentList, flowStepList, pipelineStepList, routeRuleList } from './generate/command-layouts.js';
import { generate } from './generate/generate.js';
import { enabledIds, renderTemplate, type RenderInputs } from './generate/render.js';
import { selectBlocks, type SelectedFlow } from './generate/select.js';
import type { AgentBlock, PipelineStartBlock, ProjectConfig, Rule } from './model.js';

const COMMANDS_DIR = '.claude/commands/';
const AGENTS_DIR = '.claude/agents/';
const RULES_DIR = '.claude/rules/';
const PIPELINE_COMMAND_PATH = `${COMMANDS_DIR}pipeline.md`;
const PIPELINE_COMMAND_LAYOUT = 'claude-code/pipeline-command.md';
const FLOW_COMMAND_LAYOUT = 'claude-code/command.md';
const AGENT_LAYOUT = 'claude-code/agent.md';
const RULE_LAYOUT = 'claude-code/rule.md';

/** One planned output file: its path, its layout with values filled, and what it is for. */
export interface PipelinePlanEntry {
  /** Path relative to the project root, as the pipeline `generate` returns it. */
  readonly path: string;
  /** The file's layout with its values filled in, before any LLM writing. */
  readonly layout: string;
  /** The owning Agent block's or flow's description; empty for a file with no owning Agent block or flow. */
  readonly description: string;
  /** The owning Agent block's or flow's rule-set tags; empty for a file with no owning Agent block or flow. */
  readonly ruleTags: readonly string[];
}

/** The rule-set tags as the agent layout shows them: a comma-separated list, or `none` when there are none. */
function tagList(tags: readonly string[]): string {
  return tags.length > 0 ? tags.join(', ') : 'none';
}

/**
 * Plans every output file in the order of the file list from the pipeline `generate`. A configuration that `generate`
 * refuses throws here too, with the same problems, and no plan is returned. The same configuration and templates always
 * give the same paths and order (F-03 AC-011). Agent entries carry their block's description and rule-set tags (AC-008,
 * AC-012); rule entries carry their title and text in the layout (AC-009).
 * A flow command entry carries the flow's description and rule-set tags (AC-031).
 */
export function planGeneration(config: ProjectConfig, templates: ListableTemplateSource): PipelinePlanEntry[] {
  const { files } = generate(config, templates);
  const selection = selectBlocks(config);
  const inputs: Omit<RenderInputs, 'values'> = { templates, enabled: enabledIds(config) };
  const baseLayouts = new Map(renderBaseFiles(config, templates).map((file) => [file.path, file.content]));
  const flows = new Map(selection.flows.map((entry) => [`${COMMANDS_DIR}${entry.flow.id}.md`, entry]));
  const agents = new Map<string, AgentBlock>();
  for (const entry of selection.flows) {
    for (const block of entry.blocks) {
      if (block.kind === 'agent') agents.set(`${AGENTS_DIR}${block.name}.md`, block);
    }
  }
  const rules = new Map<string, Rule>(config.rules.map((rule) => [`${RULES_DIR}${rule.id}.md`, rule]));

  const pipelineLayout = (): string => {
    const start = selection.pipeline.find((block): block is PipelineStartBlock => block.kind === 'start');
    if (start === undefined) throw new Error('the pipeline has no enabled Start block, so no pipeline command can be planned');
    return renderTemplate(PIPELINE_COMMAND_LAYOUT, {
      ...inputs,
      values: {
        argumentList: argumentList(start),
        pipelineStepList: pipelineStepList(selection.pipeline),
        routeRules: routeRuleList(selection.pipeline),
      },
    });
  };

  const flowLayout = (entry: SelectedFlow): string =>
    renderTemplate(FLOW_COMMAND_LAYOUT, {
      ...inputs,
      values: {
        flowId: entry.flow.id,
        flowName: entry.flow.name,
        description: entry.flow.description,
        ruleTags: tagList(entry.flow.ruleTags ?? []),
        stepList: flowStepList(entry.flow),
        routeRules: routeRuleList(entry.blocks),
      },
    });

  const agentLayout = (block: AgentBlock): string =>
    renderTemplate(AGENT_LAYOUT, {
      ...inputs,
      values: {
        name: block.name,
        description: block.description,
        ruleTags: tagList(block.ruleTags ?? []),
      },
    });

  const ruleLayout = (rule: Rule): string =>
    renderTemplate(RULE_LAYOUT, {
      ...inputs,
      values: {
        ruleTitle: rule.title,
        ruleText: rule.text,
      },
    });

  const layoutOf = (path: string): string => {
    const base = baseLayouts.get(path);
    if (base !== undefined) return base;
    if (path === PIPELINE_COMMAND_PATH) return pipelineLayout();
    const flow = flows.get(path);
    if (flow !== undefined) return flowLayout(flow);
    const agent = agents.get(path);
    if (agent !== undefined) return agentLayout(agent);
    const rule = rules.get(path);
    if (rule !== undefined) return ruleLayout(rule);
    throw new Error(`no layout is planned for the output file "${path}"`);
  };

  return files.map((file) => {
    const owner = agents.get(file.path) ?? flows.get(file.path)?.flow;
    return {
      path: file.path,
      layout: layoutOf(file.path),
      description: owner?.description ?? '',
      ruleTags: [...(owner?.ruleTags ?? [])],
    };
  });
}
