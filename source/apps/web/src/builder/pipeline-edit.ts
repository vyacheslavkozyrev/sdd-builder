// Rule tags and the pipeline's own properties on the Map tab: the rule tags of an Agent block, a flow or the pipeline,
// the pipeline's name, description, model, tools and body, and the pipeline's arguments with unique names (F-06 AC-025,
// AC-042). Pure: no DOM, no storage, no network. Every edit returns a new configuration; a refused edit returns a message
// and leaves the caller's configuration as it was. An unknown flow or agent id, or a pipeline with no Start, is a
// programmer error and throws.
import { pipeline } from '@sddbuilder/core';
import type { ConfigEdit } from './flow-edit.js';
import { checkAgentBody, checkRuleTag, checkToolName } from './entry-checks.js';

type ProjectConfig = pipeline.ProjectConfig;
type Pipeline = pipeline.Pipeline;
type PipelineBlock = pipeline.PipelineBlock;
type PipelineStartBlock = pipeline.PipelineStartBlock;
type FlowBlock = pipeline.FlowBlock;
type AgentBlock = pipeline.AgentBlock;
type AgentModel = pipeline.AgentModel;
type Argument = pipeline.Argument;

/** The block that carries rule tags: the pipeline, a flow, or an Agent block in a flow. */
export type RuleTagOwner =
  | { kind: 'pipeline' }
  | { kind: 'flow'; flowId: string }
  | { kind: 'agent'; flowId: string; agentId: string };

/** One setting of the pipeline's panel. Each change is checked on its own and applied as made. */
export type PipelineChange =
  | { field: 'name'; value: string }
  | { field: 'description'; value: string }
  | { field: 'model'; value: AgentModel | undefined }
  | { field: 'tools'; value: string[] }
  | { field: 'body'; value: string };

/** One setting of an argument row. Rows are numbered from 1 in the messages, as the panel shows them. */
export type ArgumentChange = { field: 'name'; value: string } | { field: 'required'; value: boolean } | { field: 'hint'; value: string };

/** The name a new argument gets; the user renames it. */
const DEFAULT_ARGUMENT_NAME = 'argument';

/**
 * Sets the rule tags of an Agent block, a flow or the pipeline (F-06 AC-025). Each tag is a file-safe rule name without the
 * folder. A tag that is refused, or a tag repeated on the same block, refuses the whole list; the owner keeps its tags.
 * An empty list clears the tags, as the parser reads absent tags as none.
 */
export function setRuleTags(config: ProjectConfig, owner: RuleTagOwner, tags: string[]): ConfigEdit {
  requireOwner(config, owner);
  const names: string[] = [];
  for (const tag of tags) {
    const check = checkRuleTag(tag);
    if (!check.ok) return refuse(`${check.message} The ${owner.kind} keeps its rule tags.`);
    if (names.includes(check.value)) {
      return refuse(`Rule tag "${check.value}" is already on this ${owner.kind}. Remove the repeat. The ${owner.kind} keeps its rule tags.`);
    }
    names.push(check.value);
  }
  return { ok: true, config: withRuleTags(config, owner, names) };
}

/**
 * Changes one property of the pipeline (F-06 AC-042). A refused value is not applied. The name is trimmed and must not be
 * blank, since the generated pipeline command takes it as its heading; the body is capped as an agent body (F-06 AC-030).
 * An empty description, model or tool list clears the setting, as the generator writes only the settings that are set.
 */
export function editPipeline(config: ProjectConfig, change: PipelineChange): ConfigEdit {
  const current = config.pipeline;
  const next: Pipeline = { ...current };
  switch (change.field) {
    case 'name': {
      const name = change.value.trim();
      if (name === '') return refuse('The pipeline needs a name. The pipeline keeps its name.');
      next.name = name;
      break;
    }
    case 'description': {
      const text = change.value.trim();
      if (text === '') {
        delete next.description;
      } else {
        next.description = text;
      }
      break;
    }
    case 'model':
      if (change.value === undefined) {
        delete next.model;
      } else {
        next.model = change.value;
      }
      break;
    case 'tools': {
      const names: string[] = [];
      for (const tool of change.value) {
        const check = checkToolName(tool);
        if (!check.ok) return refuse(`${check.message} The pipeline keeps its tools.`);
        names.push(check.value);
      }
      if (names.length === 0) {
        delete next.tools;
      } else {
        next.tools = names;
      }
      break;
    }
    case 'body': {
      const check = checkAgentBody(change.value);
      if (!check.ok) return refuse(`${check.message} The pipeline keeps its body.`);
      next.body = check.value;
      break;
    }
  }
  return { ok: true, config: { ...config, pipeline: next } };
}

/**
 * Adds an argument row after the existing ones (F-06 AC-042). The row gets a name no other argument uses, optional, with an
 * empty hint.
 */
export function addArgument(config: ProjectConfig): ConfigEdit {
  const start = requirePipelineStart(config);
  const taken = new Set(start.arguments.map((arg) => arg.name));
  const argument: Argument = { name: freeArgumentName(taken), required: false, hint: '' };
  return { ok: true, config: withArguments(config, [...start.arguments, argument]) };
}

/**
 * Changes one setting of the argument in row `row` (0-based). A name must follow the id rule and must not be used by another
 * row (a repeated name is refused, and the row keeps its name). The refusal names the row and the fix.
 */
export function editArgument(config: ProjectConfig, row: number, change: ArgumentChange): ConfigEdit {
  const start = requirePipelineStart(config);
  const current = requireRow(start, row);
  const next: Argument = { ...current };
  const label = `Row ${row + 1}`;
  switch (change.field) {
    case 'name': {
      const name = change.value.trim();
      if (!pipeline.isValidId(name)) return refuse(`${label}: name ${pipeline.ID_MESSAGE}. Fix it, or the row keeps "${current.name}".`);
      if (start.arguments.some((arg, index) => index !== row && arg.name === name)) {
        return refuse(`${label}: name already used. Rename it. The row keeps "${current.name}".`);
      }
      next.name = name;
      break;
    }
    case 'required':
      next.required = change.value;
      break;
    case 'hint':
      next.hint = change.value.trim();
      break;
  }
  return { ok: true, config: withArguments(config, start.arguments.map((arg, index) => (index === row ? next : arg))) };
}

/** Removes the argument in row `row` (0-based). The remaining rows keep their order. */
export function removeArgument(config: ProjectConfig, row: number): ConfigEdit {
  const start = requirePipelineStart(config);
  requireRow(start, row);
  return { ok: true, config: withArguments(config, start.arguments.filter((_arg, index) => index !== row)) };
}

function refuse(message: string): ConfigEdit {
  return { ok: false, message };
}

/** A name for a new argument that no other argument uses: `argument`, then `argument-2`, `argument-3`, and so on. */
function freeArgumentName(taken: ReadonlySet<string>): string {
  if (!taken.has(DEFAULT_ARGUMENT_NAME)) return DEFAULT_ARGUMENT_NAME;
  let n = 2;
  while (taken.has(`${DEFAULT_ARGUMENT_NAME}-${n}`)) n += 1;
  return `${DEFAULT_ARGUMENT_NAME}-${n}`;
}

function requirePipelineStart(config: ProjectConfig): PipelineStartBlock {
  const start = config.pipeline.blocks.find((block): block is PipelineStartBlock => block.kind === 'start');
  if (start === undefined) {
    throw new Error('The pipeline has no Start block');
  }
  return start;
}

function requireRow(start: PipelineStartBlock, row: number): Argument {
  const argument = start.arguments[row];
  if (argument === undefined) {
    throw new Error(`No argument in row ${row + 1}`);
  }
  return argument;
}

function requireFlow(config: ProjectConfig, flowId: string): FlowBlock {
  const flow = config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === flowId);
  if (flow?.kind !== 'flow') {
    throw new Error(`Unknown flow id: ${flowId}`);
  }
  return flow;
}

/** Throws when the owner names no block of the pipeline: an unknown flow or an agent that is not in that flow. */
function requireOwner(config: ProjectConfig, owner: RuleTagOwner): void {
  if (owner.kind === 'pipeline') return;
  const flow = requireFlow(config, owner.flowId);
  if (owner.kind === 'agent' && flow.blocks.find((block) => block.id === owner.agentId)?.kind !== 'agent') {
    throw new Error(`Block ${owner.agentId} is not an Agent block of flow ${owner.flowId}`);
  }
}

function withRuleTags(config: ProjectConfig, owner: RuleTagOwner, names: string[]): ProjectConfig {
  switch (owner.kind) {
    case 'pipeline':
      return { ...config, pipeline: withRuleTagList(config.pipeline, names) };
    case 'flow':
      return withFlow(config, owner.flowId, (flow) => withRuleTagList(flow, names));
    case 'agent':
      return withAgent(config, owner.flowId, owner.agentId, (agent) => withRuleTagList(agent, names));
  }
}

/** Sets the tag list of an owner; an empty list is removed, so the key is absent as the parser reads it. */
function withRuleTagList<T extends { ruleTags?: string[] }>(item: T, names: string[]): T {
  const next: T = { ...item };
  if (names.length === 0) {
    delete next.ruleTags;
  } else {
    next.ruleTags = names;
  }
  return next;
}

function withArguments(config: ProjectConfig, args: Argument[]): ProjectConfig {
  const blocks = config.pipeline.blocks.map((block): PipelineBlock => {
    if (block.kind !== 'start') return block;
    return { ...block, arguments: args };
  });
  return { ...config, pipeline: { ...config.pipeline, blocks } };
}

function withFlow(config: ProjectConfig, flowId: string, edit: (flow: FlowBlock) => FlowBlock): ProjectConfig {
  requireFlow(config, flowId);
  const blocks = config.pipeline.blocks.map((block): PipelineBlock => {
    if (block.kind !== 'flow' || block.id !== flowId) return block;
    return edit(block);
  });
  return { ...config, pipeline: { ...config.pipeline, blocks } };
}

function withAgent(config: ProjectConfig, flowId: string, agentId: string, edit: (agent: AgentBlock) => AgentBlock): ProjectConfig {
  return withFlow(config, flowId, (flow) => ({
    ...flow,
    blocks: flow.blocks.map((child) => (child.kind === 'agent' && child.id === agentId ? edit(child) : child)),
  }));
}
