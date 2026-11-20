import { childPath, ROOT_PATH } from '../check/primitives.js';
import type { Block, Flow, ProjectConfig } from '../model.js';
import type { PositionedFinding, Position } from './finding.js';

// Each flow has one Start block and at least one End block (F-03 AC-001 to AC-006). A second Start is refused at
// its own path, once for each Start after the first. A flow with no Start, or with no End, is refused at the flow's
// path. An empty flow gets both blockers, Start first. A pipeline with no flow is refused at `root.pipeline.flows`.

const PIPELINE_PATH = childPath(ROOT_PATH, 'pipeline');
const FLOWS_PATH = childPath(PIPELINE_PATH, 'flows');
const PIPELINE_POSITION: Position = { flow: -1, block: -1, slot: -1 };

function flowPath(flow: Flow): string {
  return childPath(FLOWS_PATH, String(flow.index));
}

function blockPath(flow: Flow, block: Block): string {
  return childPath(childPath(flowPath(flow), 'blocks'), String(block.index));
}

function blocker(rule: string, path: string, position: Position, message: string): PositionedFinding {
  return { severity: 'blocker', rule, path, message, position };
}

function startAndEndOfFlow(flow: Flow): PositionedFinding[] {
  const position: Position = { flow: flow.index, block: -1, slot: -1 };
  const starts = flow.blocks.filter((block) => block.kind === 'start');
  const ends = flow.blocks.filter((block) => block.kind === 'end');
  const findings: PositionedFinding[] = [];

  if (starts.length === 0) {
    findings.push(blocker('flow-start', flowPath(flow), position, 'must have one Start block, got none'));
  }
  for (const start of starts.slice(1)) {
    findings.push(
      blocker(
        'flow-start',
        blockPath(flow, start),
        { flow: flow.index, block: start.index, slot: -1 },
        'must have one Start block, got another Start after the first',
      ),
    );
  }
  if (ends.length === 0) {
    findings.push(blocker('flow-end', flowPath(flow), position, 'must have at least one End block, got none'));
  }
  return findings;
}

export function startAndEndRule(config: ProjectConfig): PositionedFinding[] {
  const { flows } = config.pipeline;
  if (flows.length === 0) {
    return [blocker('pipeline-flows', FLOWS_PATH, PIPELINE_POSITION, 'must have at least one flow, got none')];
  }
  return flows.flatMap(startAndEndOfFlow);
}
