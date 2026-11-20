import { childPath, isFileSafeId, ROOT_PATH } from '../check/primitives.js';
import type { AgentBlock, Block, Flow, ProjectConfig } from '../model.js';
import type { PositionedFinding, Position } from './finding.js';

// Identity and required text (F-03 AC-026 to AC-029). A flow id must be file-safe and not `pipeline`, since its
// file name comes from it (AC-026). An agent name must be file-safe (AC-027). A flow needs a name and a body, and an
// agent needs a description, none of them blank (AC-028, AC-029). A flow's description and arguments may be empty,
// so they are not checked here. Each finding sits at the path of the field it refuses.

const FLOWS_PATH = childPath(childPath(ROOT_PATH, 'pipeline'), 'flows');
const RESERVED_FLOW_ID = 'pipeline';
const FLOW_ID_MESSAGE =
  'must be a file-safe id (lowercase letters, digits and hyphens, starting with a letter), not ' + RESERVED_FLOW_ID;

function flowPath(flow: Flow): string {
  return childPath(FLOWS_PATH, String(flow.index));
}

function blockPath(flow: Flow, block: Block): string {
  return childPath(childPath(flowPath(flow), 'blocks'), String(block.index));
}

function isBlank(text: string): boolean {
  return !/\S/.test(text);
}

function blocker(rule: string, path: string, position: Position, message: string): PositionedFinding {
  return { severity: 'blocker', rule, path, message, position };
}

function identityAndTextOfFlow(flow: Flow): PositionedFinding[] {
  const position: Position = { flow: flow.index, block: -1, slot: -1 };
  const findings: PositionedFinding[] = [];

  if (!isFileSafeId(flow.id) || flow.id === RESERVED_FLOW_ID) {
    findings.push(blocker('flow-id', childPath(flowPath(flow), 'id'), position, FLOW_ID_MESSAGE));
  }
  if (isBlank(flow.name)) {
    findings.push(blocker('flow-name', childPath(flowPath(flow), 'name'), position, 'must not be blank'));
  }
  if (isBlank(flow.body)) {
    findings.push(blocker('flow-body', childPath(flowPath(flow), 'body'), position, 'must not be blank'));
  }
  return findings;
}

function identityAndTextOfAgent(flow: Flow, block: AgentBlock): PositionedFinding[] {
  const position: Position = { flow: flow.index, block: block.index, slot: -1 };
  const findings: PositionedFinding[] = [];

  if (!isFileSafeId(block.name)) {
    findings.push(
      blocker(
        'agent-name',
        childPath(blockPath(flow, block), 'name'),
        position,
        'must be a file-safe name (lowercase letters, digits and hyphens, starting with a letter)',
      ),
    );
  }
  if (isBlank(block.description)) {
    findings.push(
      blocker('agent-description', childPath(blockPath(flow, block), 'description'), position, 'must not be blank'),
    );
  }
  return findings;
}

function identityAndTextOf(flow: Flow): PositionedFinding[] {
  const agents = flow.blocks.flatMap((block) =>
    block.kind === 'agent' ? identityAndTextOfAgent(flow, block) : [],
  );
  return [...identityAndTextOfFlow(flow), ...agents];
}

export function identityAndTextRule(config: ProjectConfig): PositionedFinding[] {
  return config.pipeline.flows.flatMap(identityAndTextOf);
}
