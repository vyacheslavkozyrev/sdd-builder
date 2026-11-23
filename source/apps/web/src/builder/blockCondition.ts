// The fields and route texts of a Condition block on the flow tab (F-12 AC-030 to AC-034): the description,
// the round limit of a return, and the read-only texts of the true and false routes. The description is an
// edit applied to a copy of the pipeline and the parser (`parseProjectConfig` in core) decides; a refused edit
// keeps the saved value. The round limit is read from the text the user typed, so it is checked here with the
// reason of AC-033 before the parser sees it. Only the edited Condition changes (AC-029 applies to Agents; the
// same rule holds here). Pure functions: no React and no I/O.

import type { pipeline as model } from '@sddbuilder/core';
import { blockName, flowArrows } from './blockArrows.js';
import { emptyOutputText } from './blockLink.js';
import { refusalProblemOf, type Pipeline, type Rule } from './fields.js';

export type Flow = model.Flow;
export type ConditionBlock = model.ConditionBlock;

// The Condition fields this module edits.
export type ConditionField = 'description' | 'roundLimit';

export type ConditionFieldResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly field: ConditionField; readonly reason: string };

// The reason for a round limit that is not an integer from 1 to 5, a blank one included (AC-033).
export const ROUND_LIMIT_REASON = 'A return allows 1 to 5 rounds.';

// The false route of a Condition as the panel shows it (AC-032, AC-034). A return has a round limit, or null
// while it is unset (AC-017).
export type FalseRoute =
  | { readonly kind: 'stop' }
  | { readonly kind: 'forward'; readonly target: string }
  | { readonly kind: 'return'; readonly target: string; readonly roundLimit: number | null };

// The Condition at a position in the pipeline.
interface ConditionLocation {
  readonly flowPosition: number;
  readonly blockPosition: number;
  readonly flow: Flow;
  readonly block: ConditionBlock;
}

// The Condition `blockId` of the flow `flowId`. A block that is not a Condition, or an unknown flow or block,
// is a programmer error.
function conditionAt(pipelineState: Pipeline, flowId: string, blockId: string): ConditionLocation {
  const flowPosition = pipelineState.flows.findIndex((flow) => flow.id === flowId);
  const flow = pipelineState.flows[flowPosition];
  if (flow === undefined) throw new Error(`F-12: there is no flow "${flowId}"`);
  const blockPosition = flow.blocks.findIndex((block) => block.id === blockId);
  const block = flow.blocks[blockPosition];
  if (block === undefined) throw new Error(`F-12: the flow "${flowId}" has no block "${blockId}"`);
  if (block.kind !== 'condition') {
    throw new Error(`F-12: the block "${blockId}" of the flow "${flowId}" is not a Condition`);
  }
  return { flowPosition, blockPosition, flow, block };
}

// The name of a block as a route text shows it. A target that the flow does not hold is shown by its id.
function nameOf(flow: Flow, blockId: string): string {
  const found = flow.blocks.find((block) => block.id === blockId);
  return found === undefined ? blockId : blockName(found);
}

// The false route of the Condition: no arrow means stop; an arrow to a later block is a forward route; an
// arrow to an earlier block is a return (AC-017, AC-032, AC-034). The arrows decide, as the drawing does.
export function falseRouteOf(flow: Flow, block: ConditionBlock): FalseRoute {
  if ('stop' in block.false || block.false.to === '') return { kind: 'stop' };
  const target = block.false.to;
  const arrow = flowArrows(flow).find((item) => item.fromId === block.id && item.output === 'false');
  if (arrow === undefined || !arrow.isReturn) return { kind: 'forward', target };
  return { kind: 'return', target, roundLimit: arrow.roundLimit };
}

// The read-only text of the false route (AC-032): "Stop the flow and ask the user", "Goes to <name>", or
// "Returns to <name>, up to N rounds". A return whose limit is unset says so, since AC-017 keeps it incomplete.
export function falseRouteText(flow: Flow, block: ConditionBlock): string {
  const route = falseRouteOf(flow, block);
  switch (route.kind) {
    case 'stop':
      return emptyOutputText('false');
    case 'forward':
      return `Goes to ${nameOf(flow, route.target)}`;
    case 'return':
      return route.roundLimit === null
        ? `Returns to ${nameOf(flow, route.target)}, round limit not set`
        : `Returns to ${nameOf(flow, route.target)}, up to ${route.roundLimit} rounds`;
  }
}

// The read-only text of the true route (AC-031): "Next: <name>" for the block its arrow leads to, or
// "No arrow yet".
export function trueRouteText(flow: Flow, block: ConditionBlock): string {
  if ('stop' in block.true || block.true.to === '') return emptyOutputText('true');
  return `Next: ${nameOf(flow, block.true.to)}`;
}

// Sets the description of the Condition `blockId` (AC-030). The text is kept as written; a blank or too long
// value is refused by the parser with its reason, and the saved description stays.
export function editConditionDescription(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  blockId: string,
  value: string,
): ConditionFieldResult {
  const location = conditionAt(pipelineState, flowId, blockId);
  const { flowPosition, blockPosition, block } = location;
  const problem = refusalProblemOf(
    pipelineState,
    rules,
    flowPosition,
    (document) => ({
      ...document,
      blocks: (document.blocks as Record<string, unknown>[]).map((item, index) =>
        index === blockPosition ? { ...item, description: value } : item,
      ),
    }),
    `pipeline.flows.${flowPosition}.blocks.${blockPosition}.description`,
  );
  if (problem !== undefined) return { ok: false, field: 'description', reason: problem.message };
  return withBlock(pipelineState, location, { ...block, description: value });
}

// The round limit as the text the user typed: a whole number from 1 to 5, with surrounding spaces ignored.
// Anything else, a blank value included, is undefined.
function parseRoundLimit(text: string): number | undefined {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  return value >= 1 && value <= 5 ? value : undefined;
}

// Sets the round limit of the return on the false route of the Condition `blockId` (AC-033). The panel shows
// the field only for a return (AC-034), so a limit set on any other false route is a programmer error. A
// refused limit keeps the saved one.
export function setConditionRoundLimit(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  blockId: string,
  text: string,
): ConditionFieldResult {
  const location = conditionAt(pipelineState, flowId, blockId);
  const { flowPosition, blockPosition, flow, block } = location;
  const route = falseRouteOf(flow, block);
  if (route.kind !== 'return') {
    throw new Error(`F-12: the false route of the Condition "${blockId}" is not a return`);
  }
  const roundLimit = parseRoundLimit(text);
  if (roundLimit === undefined) return { ok: false, field: 'roundLimit', reason: ROUND_LIMIT_REASON };

  const problem = refusalProblemOf(
    pipelineState,
    rules,
    flowPosition,
    (document) => ({
      ...document,
      blocks: (document.blocks as Record<string, unknown>[]).map((item, index) =>
        index === blockPosition ? { ...item, false: { to: route.target, roundLimit } } : item,
      ),
    }),
    `pipeline.flows.${flowPosition}.blocks.${blockPosition}.false.roundLimit`,
  );
  if (problem !== undefined) return { ok: false, field: 'roundLimit', reason: ROUND_LIMIT_REASON };
  return withBlock(pipelineState, location, { ...block, false: { to: route.target, roundLimit } });
}

// The pipeline with the Condition at `location` replaced by `condition`; every other block and flow is kept.
function withBlock(pipelineState: Pipeline, location: ConditionLocation, condition: ConditionBlock): ConditionFieldResult {
  const flows = pipelineState.flows.map((item, position) =>
    position === location.flowPosition
      ? { ...item, blocks: item.blocks.map((other, index) => (index === location.blockPosition ? condition : other)) }
      : item,
  );
  return { ok: true, pipeline: { ...pipelineState, flows } };
}
