import { checkBlockLinks } from '../check/block-links.js';
import { checkFlowLinks } from '../check/flow-links.js';
import type { Problem, ProjectConfig } from '../model.js';
import type { Position, PositionedFinding } from './finding.js';

// Links between flows and the `next` links of Start and Agent blocks (F-03 AC-007 to AC-012, AC-014). Both checks
// are the F-02 functions in check/, so the rules are not written twice: each problem they return becomes a blocker
// at the same path. The condition routes that checkBlockLinks also returns (`.true.to`, `.false.to`) belong to the
// route rule (T006) and are dropped here.

const FLOW_LINK_RULE = 'flow-link';
const BLOCK_LINK_RULE = 'block-link';

// A flow's own path (an unlinked flow) or its `next` path.
const FLOW_PATH = /^pipeline\.flows\.(\d+)(?:\.next)?$/;
// The `next` path of a Start or Agent block.
const BLOCK_NEXT_PATH = /^pipeline\.flows\.(\d+)\.blocks\.(\d+)\.next$/;

function positionOf(path: string): Position {
  const block = BLOCK_NEXT_PATH.exec(path);
  if (block !== null) return { flow: Number(block[1]), block: Number(block[2]), slot: -1 };
  const flow = FLOW_PATH.exec(path);
  if (flow !== null) return { flow: Number(flow[1]), block: -1, slot: -1 };
  throw new Error(`the structural analysis has no position for the problem path ${path}`);
}

function asBlockers(rule: string, problems: readonly Problem[]): PositionedFinding[] {
  return problems.map(({ path, message }) => ({
    severity: 'blocker',
    rule,
    path,
    message,
    position: positionOf(path),
  }));
}

export function linksRule(config: ProjectConfig): PositionedFinding[] {
  const blockNextProblems = checkBlockLinks(config).filter(({ path }) => BLOCK_NEXT_PATH.test(path));
  return [
    ...asBlockers(FLOW_LINK_RULE, checkFlowLinks(config)),
    ...asBlockers(BLOCK_LINK_RULE, blockNextProblems),
  ];
}
