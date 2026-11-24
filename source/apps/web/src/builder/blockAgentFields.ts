// The list and choice fields of an Agent block on the flow tab (F-12 AC-022, AC-025 to AC-027): argument rows,
// tools, model and rule tags. Each edit is applied to a copy of the pipeline and the parser (`parseProjectConfig`
// in core) decides, for the row or field that changed; a refused edit keeps the saved value and returns the reason
// beneath that list. The one rule the parser does not hold is that a tool is listed once, so it is checked here
// before the parser (device fix 2026-11-24). Only the edited Agent changes (AC-029). Pure functions: no React and
// no I/O.

import type { pipeline as model } from '@sddbuilder/core';
import { agentAt, withAgent, type AgentLocation } from './blockFields.js';
import { isModel, refusalProblemOf, type ArgumentRow, type Argument, type Pipeline, type Rule } from './fields.js';

export type AgentBlock = model.AgentBlock;
type RuleTag = model.RuleTag;

// The Agent lists and choices this module edits. A refusal names the one that was refused.
export type AgentListField = 'arguments' | 'model' | 'tools' | 'ruleTags';

export type AgentListResult =
  | { readonly ok: true; readonly pipeline: Pipeline }
  | { readonly ok: false; readonly field: AgentListField; readonly reason: string };

// The argument row as the document holds it: its position is not a document key.
function argumentDocument(row: Argument | ArgumentRow): Record<string, unknown> {
  return { id: row.id, required: row.required, hint: row.hint };
}

// The block's path in the document, as the parser names it.
function blockPathOf(location: AgentLocation): string {
  return `pipeline.flows.${location.flowPosition}.blocks.${location.blockPosition}`;
}

// The change to one key of the block's document; an undefined value removes the key.
function withField(item: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  const next = { ...item };
  if (value === undefined) {
    delete next[key];
  } else {
    next[key] = value;
  }
  return next;
}

// Checks one edit through the parser. `value` is the field's new value in document form; `rowPosition` is the
// row that was changed, or undefined for a field. `next` builds the typed Agent and runs only when the parser
// accepts the edit.
function commit(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  location: AgentLocation,
  field: AgentListField,
  value: unknown,
  rowPosition: number | undefined,
  next: () => AgentBlock,
): AgentListResult {
  const placePath =
    rowPosition === undefined ? `${blockPathOf(location)}.${field}` : `${blockPathOf(location)}.${field}.${rowPosition}`;
  const problem = refusalProblemOf(
    pipelineState,
    rules,
    location.flowPosition,
    (document) => ({
      ...document,
      blocks: (document.blocks as Record<string, unknown>[]).map((item, index) =>
        index === location.blockPosition ? withField(item, field, value) : item,
      ),
    }),
    placePath,
  );
  if (problem !== undefined) return { ok: false, field, reason: problem.message };
  return { ok: true, pipeline: withAgent(pipelineState, location, next()) };
}

// Stops a row operation on a row that is not there: a programmer error, as in fields.ts.
function checkRow(count: number, rowPosition: number, owner: string, noun: string): void {
  if (!Number.isInteger(rowPosition) || rowPosition < 0 || rowPosition >= count) {
    throw new Error(`F-12: ${owner} has no ${noun} at position ${rowPosition}`);
  }
}

// The Agent with its model set; an undefined model unsets it. The parser has accepted the model before this is
// called, so a value that is not a model is a programmer error.
function withModel(agent: AgentBlock, value: string | undefined): AgentBlock {
  if (value === undefined) {
    const { model: _unset, ...rest } = agent;
    return rest;
  }
  if (!isModel(value)) {
    throw new Error(`F-12: the parser accepted the model "${value}", which is not a model`);
  }
  return { ...agent, model: value };
}

// Appends an argument row to the Agent `blockId` of the flow `flowId` (AC-022). The row rules are the flow's:
// a file-safe id unique in the pipeline, a required flag and a hint of at most 100 characters.
export function addAgentArgument(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  blockId: string,
  row: ArgumentRow,
): AgentListResult {
  const location = agentAt(pipelineState, flowId, blockId);
  const rows = location.agent.arguments;
  const rowPosition = rows.length;
  const next = [...rows, { index: rowPosition, ...row }];
  return commit(pipelineState, rules, location, 'arguments', next.map(argumentDocument), rowPosition, () => ({
    ...location.agent,
    arguments: next,
  }));
}

// Replaces the argument row at `rowPosition` of the Agent (AC-022). A refused row keeps the saved row.
export function editAgentArgument(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  blockId: string,
  rowPosition: number,
  row: ArgumentRow,
): AgentListResult {
  const location = agentAt(pipelineState, flowId, blockId);
  const rows = location.agent.arguments;
  checkRow(rows.length, rowPosition, `the Agent "${blockId}" of the flow "${flowId}"`, 'argument');
  const next = rows.map((item, index) => (index === rowPosition ? { index, ...row } : item));
  return commit(pipelineState, rules, location, 'arguments', next.map(argumentDocument), rowPosition, () => ({
    ...location.agent,
    arguments: next,
  }));
}

// Removes the argument row at `rowPosition` of the Agent (AC-022). Removing a row cannot make the pipeline
// invalid, so it is not refused; the rows after it are renumbered.
export function removeAgentArgument(
  pipelineState: Pipeline,
  flowId: string,
  blockId: string,
  rowPosition: number,
): Pipeline {
  const location = agentAt(pipelineState, flowId, blockId);
  const rows = location.agent.arguments;
  checkRow(rows.length, rowPosition, `the Agent "${blockId}" of the flow "${flowId}"`, 'argument');
  const kept = rows
    .filter((_item, index) => index !== rowPosition)
    .map((item, index) => ({ ...item, index }));
  return withAgent(pipelineState, location, { ...location.agent, arguments: kept });
}

// Sets the model of the Agent (AC-025). `undefined` unsets it; any other text is given to the parser, which
// accepts only `haiku`, `sonnet`, `opus` and `inherit`.
export function setAgentModel(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  blockId: string,
  value: string | undefined,
): AgentListResult {
  const location = agentAt(pipelineState, flowId, blockId);
  return commit(pipelineState, rules, location, 'model', value, undefined, () => withModel(location.agent, value));
}

// Appends a tool to the Agent (AC-022). The text is trimmed; a blank tool adds nothing, as on the pipeline's
// tools. A tool the Agent already lists is refused, with the reason "repeats <tool>; each tool must be listed
// once" (device fix 2026-11-24). The parser checks the rest: a tool of at most 100 characters.
export function addAgentTool(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  blockId: string,
  text: string,
): AgentListResult {
  const location = agentAt(pipelineState, flowId, blockId);
  const tool = text.trim();
  if (tool === '') return { ok: true, pipeline: pipelineState };
  const tools = location.agent.tools ?? [];
  if (tools.includes(tool)) {
    return { ok: false, field: 'tools', reason: `repeats ${tool}; each tool must be listed once` };
  }
  const next = [...tools, tool];
  return commit(pipelineState, rules, location, 'tools', next, tools.length, () => ({
    ...location.agent,
    tools: next,
  }));
}

// Removes the tool at `position` of the Agent (AC-022). The tools after it keep their order.
export function removeAgentTool(pipelineState: Pipeline, flowId: string, blockId: string, position: number): Pipeline {
  const location = agentAt(pipelineState, flowId, blockId);
  const tools = location.agent.tools ?? [];
  checkRow(tools.length, position, `the Agent "${blockId}" of the flow "${flowId}"`, 'tool');
  return withAgent(pipelineState, location, {
    ...location.agent,
    tools: tools.filter((_tool, index) => index !== position),
  });
}

// Adds the rule tag `ruleId` to the Agent (AC-027). The parser refuses a rule that the project does not have,
// and a tag the Agent already has.
export function addAgentRuleTag(
  pipelineState: Pipeline,
  rules: readonly Rule[],
  flowId: string,
  blockId: string,
  ruleId: string,
): AgentListResult {
  const location = agentAt(pipelineState, flowId, blockId);
  const tags = location.agent.ruleTags ?? [];
  const next: RuleTag[] = [...tags, { index: tags.length, ruleId }];
  return commit(
    pipelineState,
    rules,
    location,
    'ruleTags',
    next.map((tag) => tag.ruleId),
    tags.length,
    () => ({ ...location.agent, ruleTags: next }),
  );
}

// Removes the rule tag at `position` of the Agent (AC-027). The tags after it are renumbered.
export function removeAgentRuleTag(pipelineState: Pipeline, flowId: string, blockId: string, position: number): Pipeline {
  const location = agentAt(pipelineState, flowId, blockId);
  const tags = location.agent.ruleTags ?? [];
  checkRow(tags.length, position, `the Agent "${blockId}" of the flow "${flowId}"`, 'rule tag');
  const kept = tags
    .filter((_tag, index) => index !== position)
    .map((tag, index) => ({ ...tag, index }));
  return withAgent(pipelineState, location, { ...location.agent, ruleTags: kept });
}
