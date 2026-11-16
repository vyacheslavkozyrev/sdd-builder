// Pipeline command file (F-02 AC-024, AC-025): `.claude/commands/pipeline.md` lists the pipeline's arguments, its enabled
// child flows and the enabled gates and checks between them in pipeline order, then a numbered rule for each back route.
// Pure: the file is returned, never written. It reads only the selection, so a disabled flow or gate is never mentioned.
import type { GeneratedFile } from '../../model.js';
import type { PipelineBlock, PipelineStartBlock, ProjectConfig } from '../model.js';
import { backRouteRule, checkRule, type Outcome } from './rules-text.js';
import { selectBlocks } from './select.js';
import { settingsFile } from './settings-file.js';

const PIPELINE_COMMAND_PATH = '.claude/commands/pipeline.md';
const FLOW_COMMANDS_DIR = '.claude/commands/';
const OUTCOMES: readonly Outcome[] = ['pass', 'fail'];

/** The arguments of the pipeline, one line each with its required flag, or a line saying there are none. */
export function argumentLines(start: PipelineStartBlock | undefined): string[] {
  const args = start?.arguments ?? [];
  if (args.length === 0) {
    return ['This pipeline takes no arguments.'];
  }
  return args.map((argument) => `- \`${argument.name}\` (${argument.required ? 'required' : 'optional'})`);
}

/** The step a pipeline block adds to the pipeline command, or undefined for a block that adds none. */
export function describePipelineStep(block: PipelineBlock): string | undefined {
  switch (block.kind) {
    case 'flow':
      return `Run the flow \`${block.name}\` (\`${block.id}\`), following \`${FLOW_COMMANDS_DIR}${block.id}.md\`.`;
    case 'condition':
      return checkRule(block);
    case 'start':
    case 'connection':
    case 'end':
      return undefined;
  }
}

/** The numbered steps: each enabled child flow in order, and each enabled gate or check between them. */
function stepLines(blocks: readonly PipelineBlock[]): string[] {
  const steps = blocks.flatMap((block): string[] => {
    const step = describePipelineStep(block);
    return step === undefined ? [] : [step];
  });
  return steps.map((step, index) => `${index + 1}. ${step}`);
}

/** The numbered rules: one for each back route of an enabled gate or check, on either outcome. */
function ruleLines(blocks: readonly PipelineBlock[]): string[] {
  const rules = blocks.flatMap((block): string[] => {
    if (block.kind !== 'condition') {
      return [];
    }
    return OUTCOMES.flatMap((outcome) => {
      const rule = backRouteRule(block, outcome);
      return rule === undefined ? [] : [rule];
    });
  });
  if (rules.length === 0) {
    return ['There are no back routes.'];
  }
  return rules.map((rule, index) => `${index + 1}. ${rule}`);
}

/**
 * Renders `.claude/commands/pipeline.md` from the selected blocks of the pipeline. The pipeline's model and tools go in
 * its frontmatter when set, and its body follows the generated sections (F-06 AC-031). Deterministic for the same config.
 */
export function renderPipelineCommand(config: ProjectConfig): GeneratedFile {
  const { pipeline } = selectBlocks(config);
  const start = pipeline.find((block): block is PipelineStartBlock => block.kind === 'start');
  const lines = [
    `# ${config.pipeline.name}`,
    '',
    'Run the pipeline in order.',
    '',
    '## Arguments',
    '',
    ...argumentLines(start),
    '',
    '## Steps',
    '',
    ...stepLines(pipeline),
    '',
    '## Rules',
    '',
    ...ruleLines(pipeline),
  ];
  return { path: PIPELINE_COMMAND_PATH, content: settingsFile(config.pipeline, lines.join('\n')) };
}
