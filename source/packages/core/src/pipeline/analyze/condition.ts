import { childPath, ROOT_PATH } from '../check/primitives.js';
import type { Block, ConditionBlock, Flow, ProjectConfig } from '../model.js';
import type { PositionedFinding, Position } from './finding.js';

// A condition's description is required text (F-12 AC-046). A blank description is a blocker at the
// description's path, the same message the other blank-text blockers use (text.ts).

const PIPELINE_PATH = childPath(ROOT_PATH, 'pipeline');
const FLOWS_PATH = childPath(PIPELINE_PATH, 'flows');

function blockPath(flow: Flow, block: Block): string {
  return childPath(childPath(childPath(FLOWS_PATH, String(flow.index)), 'blocks'), String(block.index));
}

function isBlank(text: string): boolean {
  return !/\S/.test(text);
}

function descriptionOfCondition(flow: Flow, condition: ConditionBlock): PositionedFinding[] {
  if (!isBlank(condition.description)) return [];
  const position: Position = { flow: flow.index, block: condition.index, slot: -1 };
  return [
    {
      severity: 'blocker',
      rule: 'condition-description',
      path: childPath(blockPath(flow, condition), 'description'),
      message: 'must not be blank',
      position,
    },
  ];
}

export function conditionRule(config: ProjectConfig): PositionedFinding[] {
  return config.pipeline.flows.flatMap((flow) =>
    flow.blocks.flatMap((block) => (block.kind === 'condition' ? descriptionOfCondition(flow, block) : [])),
  );
}
