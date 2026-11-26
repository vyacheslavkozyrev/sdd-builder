// The fields of an End block on the flow tab (F-12 AC-035, AC-036, AC-038): the outcome and the produced
// artifact. Each edit is applied to a copy of the pipeline and the parser (`parseProjectConfig` in core)
// decides; a refused edit keeps the saved value and returns the reason for that field. Only the edited End
// changes. The artifact that an End names is moved or renamed by the F-11 artifact edits (AC-037, see
// `fields.ts`), not here. Pure functions: no React and no I/O.

import type { pipeline as model } from '@sddbuilder/core';
import { refusalProblemOf, type Flow, type Pipeline, type Rule } from './fields.js';

export type EndBlock = model.EndBlock;
export type EndOutcome = EndBlock['outcome'];

// The End fields this module edits.
export type EndField = 'outcome' | 'producedArtifact';

export type EndFieldResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly field: EndField; readonly reason: string };

// The outcomes an End can have, in the order the panel offers them (AC-035).
export const END_OUTCOMES: readonly EndOutcome[] = ['done', 'stopped'];

// The text the produced artifact field reads when the flow has no outcome artifacts (AC-036).
export const NO_OUTCOME_ARTIFACT_TEXT = 'Add an outcome artifact on the flow panel first.';

// The labels the produced artifact can take: the outcome artifacts of the End's flow, in their order. "none"
// is not among them (AC-036).
export function producedArtifactChoices(flow: Flow): string[] {
  return flow.artifacts.map((artifact) => artifact.label);
}

// The note shown in place of the produced artifact choices when the flow has no outcome artifacts (AC-036),
// or undefined when there are choices to show.
export function producedArtifactNote(flow: Flow): string | undefined {
  return flow.artifacts.length === 0 ? NO_OUTCOME_ARTIFACT_TEXT : undefined;
}

// The End `blockId` of the flow `flowId`, with its position. A block that is not an End, or an unknown flow or
// block, is a programmer error.
function endAt(pipelineState: Pipeline, flowId: string, blockId: string): EndLocation {
  const flowPosition = pipelineState.flows.findIndex((flow) => flow.id === flowId);
  const flow = pipelineState.flows[flowPosition];
  if (flow === undefined) throw new Error(`F-12: there is no flow "${flowId}"`);
  const blockPosition = flow.blocks.findIndex((block) => block.id === blockId);
  const block = flow.blocks[blockPosition];
  if (block === undefined) throw new Error(`F-12: the flow "${flowId}" has no block "${blockId}"`);
  if (block.kind !== 'end') {
    throw new Error(`F-12: the block "${blockId}" of the flow "${flowId}" is not an End`);
  }
  return { flowPosition, blockPosition, block };
}

interface EndLocation {
  readonly flowPosition: number;
  readonly blockPosition: number;
  readonly block: EndBlock;
}

// Sets one field of the End `blockId` through the parser: the edit is applied to a copy, and the parser's
// problem for the edited path decides. A refused edit keeps the saved End; an accepted one replaces the End
// with `next(End)`, and every other block and flow is kept.
function editEnd(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  blockId: string,
  field: EndField,
  value: string,
  next: (block: EndBlock) => EndBlock,
): EndFieldResult {
  const { flowPosition, blockPosition, block } = endAt(pipelineState, flowId, blockId);
  const problem = refusalProblemOf(
    pipelineState,
    rules,
    flowPosition,
    (document) => ({
      ...document,
      blocks: (document.blocks as Record<string, unknown>[]).map((item, index) =>
        index === blockPosition ? { ...item, [field]: value } : item,
      ),
    }),
    `pipeline.flows.${flowPosition}.blocks.${blockPosition}.${field}`,
    'field',
  );
  if (problem !== undefined) return { ok: false, field, reason: problem.message };
  const edited = next(block);
  const flows = pipelineState.flows.map((item, position) =>
    position === flowPosition
      ? { ...item, blocks: item.blocks.map((other, index) => (index === blockPosition ? edited : other)) }
      : item,
  );
  return { ok: true, pipeline: { ...pipelineState, flows } };
}

// Sets the outcome of the End `blockId` of the flow `flowId` (AC-035). A new End starts `done`.
export function editEndOutcome(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  blockId: string,
  outcome: EndOutcome,
): EndFieldResult {
  return editEnd(pipelineState, rules, flowId, blockId, 'outcome', outcome, (block) => ({ ...block, outcome }));
}

// Sets the produced artifact of the End `blockId` of the flow `flowId` to one of the flow's outcome artifact
// labels (AC-036), or to '' for None: an End that produces no artifact (F-16 AC-024). Any other label is refused by
// the parser with its reason, and the saved End keeps its value.
export function editEndArtifact(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  blockId: string,
  label: string,
): EndFieldResult {
  return editEnd(pipelineState, rules, flowId, blockId, 'producedArtifact', label, (block) => ({
    ...block,
    producedArtifact: label,
  }));
}
