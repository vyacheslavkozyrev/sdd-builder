// The generation plan for the pipeline model (F-03 AC-002, AC-003, AC-004, AC-007, AC-011). One entry per output file, in
// the order and with the paths that the pipeline `generate` returns. Each entry carries the layout of its file with its
// values filled: base files from `templates/base`, the pipeline command from `claude-code/pipeline-command.md`, and each
// flow command from `claude-code/command.md`. Agent and rule files are added in a later step. Pure: no file or network
// I/O; the templates come from a TemplateSource and the plan is returned, never written.
import type { ListableTemplateSource } from '../template-source.js';
import { renderBaseFiles } from './generate/base-files.js';
import { argumentList, flowStepList, pipelineStepList, routeRuleList } from './generate/command-layouts.js';
import { generate } from './generate/generate.js';
import { enabledIds, renderTemplate, type RenderInputs } from './generate/render.js';
import { selectBlocks, type SelectedFlow } from './generate/select.js';
import type { PipelineStartBlock, ProjectConfig } from './model.js';

const COMMANDS_DIR = '.claude/commands/';
const AGENTS_DIR = '.claude/agents/';
const RULES_DIR = '.claude/rules/';
const PIPELINE_COMMAND_PATH = `${COMMANDS_DIR}pipeline.md`;
const PIPELINE_COMMAND_LAYOUT = 'claude-code/pipeline-command.md';
const FLOW_COMMAND_LAYOUT = 'claude-code/command.md';

/** One planned output file: its path, its layout with values filled, and what it is for. */
export interface PipelinePlanEntry {
  /** Path relative to the project root, as the pipeline `generate` returns it. */
  readonly path: string;
  /** The file's layout with its values filled in, before any LLM writing. */
  readonly layout: string;
  /** The owning block's description; empty for the files this step plans. */
  readonly description: string;
  /** The owning block's rule-set tags; empty for the files this step plans. */
  readonly ruleTags: readonly string[];
}

/** True for the agent and rule files, which the plan does not describe yet (T006). */
function isAgentOrRule(path: string): boolean {
  return path.startsWith(AGENTS_DIR) || path.startsWith(RULES_DIR);
}

/**
 * Plans every output file that is neither an agent nor a rule file, in the order of the file list from the pipeline
 * `generate`. A configuration that `generate` refuses throws here too, with the same problems, and no plan is returned.
 * The same configuration and templates always give the same paths and order (F-03 AC-011).
 */
export function planGeneration(config: ProjectConfig, templates: ListableTemplateSource): PipelinePlanEntry[] {
  const { files } = generate(config, templates);
  const selection = selectBlocks(config);
  const inputs: Omit<RenderInputs, 'values'> = { templates, enabled: enabledIds(config) };
  const baseLayouts = new Map(renderBaseFiles(config, templates).map((file) => [file.path, file.content]));
  const flows = new Map(selection.flows.map((entry) => [`${COMMANDS_DIR}${entry.flow.id}.md`, entry]));

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
        stepList: flowStepList(entry.flow),
        routeRules: routeRuleList(entry.blocks),
      },
    });

  const layoutOf = (path: string): string => {
    const base = baseLayouts.get(path);
    if (base !== undefined) return base;
    if (path === PIPELINE_COMMAND_PATH) return pipelineLayout();
    const flow = flows.get(path);
    if (flow !== undefined) return flowLayout(flow);
    throw new Error(`no layout is planned for the output file "${path}"`);
  };

  return files
    .filter((file) => !isAgentOrRule(file.path))
    .map((file) => ({ path: file.path, layout: layoutOf(file.path), description: '', ruleTags: [] }));
}
