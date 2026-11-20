import { childPath, ROOT_PATH } from '../check/primitives.js';
import type { Block, ConditionBlock, Flow, ProjectConfig } from '../model.js';
import type { PositionedFinding, Position } from './finding.js';

// Both outputs of every condition are wired (F-03 AC-015). A condition with no `true` route, or no `false` route,
// is a blocker at the condition's path that names the missing output. A parsed model always has both routes; the
// check matters for a partial model, which is analysed without a throw.

const PIPELINE_PATH = childPath(ROOT_PATH, 'pipeline');
const FLOWS_PATH = childPath(PIPELINE_PATH, 'flows');

function blockPath(flow: Flow, block: Block): string {
  return childPath(childPath(childPath(FLOWS_PATH, String(flow.index)), 'blocks'), String(block.index));
}

function blocker(path: string, position: Position, message: string): PositionedFinding {
  return { severity: 'blocker', rule: 'condition-output', path, message, position };
}

function outputsOfCondition(flow: Flow, condition: ConditionBlock): PositionedFinding[] {
  const path = blockPath(flow, condition);
  const position: Position = { flow: flow.index, block: condition.index, slot: -1 };
  const findings: PositionedFinding[] = [];

  if (condition.true === undefined) {
    findings.push(blocker(path, position, 'must have a true route, got none'));
  }
  if (condition.false === undefined) {
    findings.push(blocker(path, position, 'must have a false route, got none'));
  }
  return findings;
}

export function outputsRule(config: ProjectConfig): PositionedFinding[] {
  return config.pipeline.flows.flatMap((flow) =>
    flow.blocks.flatMap((block) => (block.kind === 'condition' ? outputsOfCondition(flow, block) : [])),
  );
}
