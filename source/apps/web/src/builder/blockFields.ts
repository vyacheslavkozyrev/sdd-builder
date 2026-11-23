// The text fields of an Agent block on the flow tab (F-12 AC-022 to AC-024, AC-028, AC-029, AC-050): name,
// description and body. Each edit is applied to a copy of the pipeline and the parser (`parseProjectConfig`
// in core) decides. A refused edit keeps the saved value and returns the reason for that field; only the
// edited block changes, so its arrows and the other blocks are kept (AC-029). The name clash is the parser's
// own problem, shown with the reason of AC-023. Pure functions: no React and no I/O.

import type { pipeline as model } from '@sddbuilder/core';
import { refusalProblemOf, type Problem, type Rule } from './fields.js';

export type Pipeline = model.Pipeline;
export type AgentBlock = model.AgentBlock;

// The Agent fields this module edits. The Agent's lists and model are edited elsewhere (F-12 T007).
export type AgentField = 'name' | 'description' | 'body';

// One field edit of an Agent. The name is trimmed first, as a flow's name is (F-11 AC-020); the other
// values are kept as written.
export type AgentFieldEdit =
  | { readonly field: 'name'; readonly value: string }
  | { readonly field: 'description'; readonly value: string }
  | { readonly field: 'body'; readonly value: string };

export type BlockFieldResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly field: AgentField; readonly reason: string };

// The reason for a name that another Agent of the pipeline already has (AC-023).
export const NAME_CLASH_REASON = 'Another Agent already has this name.';

// The position of the item with `id`, or a programmer error with `missing` when there is none.
function positionOf(items: readonly { readonly id: string }[], id: string, missing: string): number {
  const position = items.findIndex((item) => item.id === id);
  if (position === -1) {
    throw new Error(`F-12: ${missing}`);
  }
  return position;
}

// The name paths of the Agents of the pipeline, as the parser names them: by position in the document.
function agentNamesOf(pipelineState: Pipeline): { readonly path: string; readonly name: string }[] {
  const names: { path: string; name: string }[] = [];
  pipelineState.flows.forEach((flow, flowPosition) => {
    flow.blocks.forEach((block, blockPosition) => {
      if (block.kind === 'agent') {
        names.push({ path: `pipeline.flows.${flowPosition}.blocks.${blockPosition}.name`, name: block.name });
      }
    });
  });
  return names;
}

// True when the problem is the name of an Agent that another Agent of the pipeline shares. The problem is
// matched by its path, which is the path of an Agent's name, and the shared name is read from the pipeline.
function isNameClash(problem: Problem, edited: Pipeline): boolean {
  const agents = agentNamesOf(edited);
  const own = agents.find((agent) => agent.path === problem.path);
  return own !== undefined && agents.some((agent) => agent.path !== own.path && agent.name === own.name);
}

// The Agent with the edited value set, as the typed block.
function editedAgent(agent: AgentBlock, field: AgentField, value: string): AgentBlock {
  switch (field) {
    case 'name':
      return { ...agent, name: value };
    case 'description':
      return { ...agent, description: value };
    case 'body':
      return { ...agent, body: value };
  }
}

// Applies one field edit to the Agent `blockId` of the flow `flowId`. A block that is not an Agent is a
// programmer error, and so is an unknown flow or block id.
export function editAgentField(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  blockId: string,
  edit: AgentFieldEdit,
): BlockFieldResult {
  const flowPosition = positionOf(pipelineState.flows, flowId, `there is no flow "${flowId}"`);
  const flow = pipelineState.flows[flowPosition];
  if (flow === undefined) throw new Error(`F-12: there is no flow "${flowId}"`);
  const blockPosition = positionOf(flow.blocks, blockId, `the flow "${flowId}" has no block "${blockId}"`);
  const block = flow.blocks[blockPosition];
  if (block === undefined || block.kind !== 'agent') {
    throw new Error(`F-12: the block "${blockId}" of the flow "${flowId}" is not an Agent`);
  }

  const value = edit.field === 'name' ? edit.value.trim() : edit.value;
  const agent = editedAgent(block, edit.field, value);
  const edited: Pipeline = {
    ...pipelineState,
    flows: pipelineState.flows.map((item, position) =>
      position === flowPosition
        ? { ...item, blocks: item.blocks.map((other, index) => (index === blockPosition ? agent : other)) }
        : item,
    ),
  };

  const problem = refusalProblemOf(
    pipelineState,
    rules,
    flowPosition,
    (document) => ({
      ...document,
      blocks: (document.blocks as Record<string, unknown>[]).map((item, index) =>
        index === blockPosition ? { ...item, [edit.field]: value } : item,
      ),
    }),
    `pipeline.flows.${flowPosition}.blocks.${blockPosition}.${edit.field}`,
  );
  if (problem !== undefined) {
    const reason = edit.field === 'name' && isNameClash(problem, edited) ? NAME_CLASH_REASON : problem.message;
    return { ok: false, field: edit.field, reason };
  }
  return { ok: true, pipeline: edited };
}
