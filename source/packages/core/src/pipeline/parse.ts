import { ID_MESSAGE, isValidId } from './ids.js';
import type { ChildBlock, FlowBlock, Pipeline, PipelineBlock, ProjectConfig, ProjectStack, Rule } from './model.js';
import { parsePipelineStructure, type ChildStructure, type FlowStructure, type PipelineStructure } from './parse-structure.js';
import { toAgentBlock, toChildStart, toPipelineStart } from './parse-scope.js';
import { toCondition, toPipelineCondition } from './parse-condition.js';
import { toConnection, toEnd } from './parse-connection-end.js';
import {
  checkKeys,
  childPath,
  describeList,
  indexPath,
  readList,
  readObject,
  readOptionalString,
  readString,
  requirePresent,
  type ListIds,
  type Obj,
  type PipelineProblem,
} from './parse-util.js';

export type { PipelineProblem } from './parse-util.js';

export type ParsePipelineResult = { ok: true; config: ProjectConfig } | { ok: false; problems: PipelineProblem[] };

const ROOT_KEYS: readonly string[] = ['schemaVersion', 'name', 'idea', 'stack', 'pipeline', 'rules'];
const STACK_KEYS: readonly string[] = ['language', 'framework', 'platform', 'buildTool', 'testFramework'];
const PIPELINE_KEYS: readonly string[] = ['name', 'blocks'];
const FLOW_KEYS: readonly string[] = ['kind', 'id', 'name', 'enabled', 'blocks'];
const RULE_KEYS: readonly string[] = ['id', 'title', 'text'];

/** Converts one block of a child flow. Blocks that fail their own rules are dropped; the problem is already recorded. */
function convertChild(block: ChildStructure, ids: ListIds, problems: PipelineProblem[]): ChildBlock | undefined {
  switch (block.kind) {
    case 'start':
      return toChildStart(block, problems);
    case 'agent':
      return toAgentBlock(block, problems);
    case 'condition':
      return toCondition(block, ids, problems);
    case 'connection':
      return toConnection(block, ids, problems);
    case 'end':
      return toEnd(block, problems);
  }
}

/** Converts a child flow: its own name and keys, then its blocks. A flow whose name fails is dropped. */
function convertFlow(flow: FlowStructure, problems: PipelineProblem[]): FlowBlock | undefined {
  checkKeys(flow.fields, FLOW_KEYS, flow.path, problems);
  const name = readString(flow.fields, 'name', flow.path, problems);
  const blocks = flow.blocks.flatMap((block) => {
    const converted = convertChild(block, flow.ids, problems);
    return converted === undefined ? [] : [converted];
  });
  if (name === undefined) return undefined;
  return { kind: 'flow', id: flow.id, name, enabled: flow.enabled, blocks };
}

/** Converts one block of the pipeline. Blocks that fail their own rules are dropped; the problem is already recorded. */
function convertPipelineBlock(block: PipelineStructure, ids: ListIds, problems: PipelineProblem[]): PipelineBlock | undefined {
  switch (block.kind) {
    case 'start':
      return toPipelineStart(block, problems);
    case 'flow':
      return convertFlow(block, problems);
    case 'condition':
      return toPipelineCondition(block, ids, problems);
    case 'connection':
      return toConnection(block, ids, problems);
    case 'end':
      return toEnd(block, problems);
  }
}

function parseStack(value: unknown, path: string, problems: PipelineProblem[]): ProjectStack | undefined {
  const obj = readObject(value, path, problems);
  if (obj === undefined) return undefined;
  checkKeys(obj, STACK_KEYS, path, problems);
  const language = readString(obj, 'language', path, problems);
  const framework = readOptionalString(obj, 'framework', path, problems);
  const platform = readOptionalString(obj, 'platform', path, problems);
  const buildTool = readOptionalString(obj, 'buildTool', path, problems);
  const testFramework = readOptionalString(obj, 'testFramework', path, problems);
  if (language === undefined) return undefined;
  return {
    language,
    ...(framework === undefined ? {} : { framework }),
    ...(platform === undefined ? {} : { platform }),
    ...(buildTool === undefined ? {} : { buildTool }),
    ...(testFramework === undefined ? {} : { testFramework }),
  };
}

/** A rule entry: its id follows the id rule and is unique among the rules; its title and text are strings. */
function toRule(value: unknown, path: string, ids: Set<string>, problems: PipelineProblem[]): Rule | undefined {
  const obj = readObject(value, path, problems);
  if (obj === undefined) return undefined;
  checkKeys(obj, RULE_KEYS, path, problems);
  const id = readRuleId(obj, path, ids, problems);
  const title = readString(obj, 'title', path, problems);
  const text = readString(obj, 'text', path, problems);
  if (id === undefined || title === undefined || text === undefined) return undefined;
  return { id, title, text };
}

function readRuleId(obj: Obj, path: string, ids: Set<string>, problems: PipelineProblem[]): string | undefined {
  const id = readString(obj, 'id', path, problems);
  if (id === undefined) return undefined;
  const idPath = childPath(path, 'id');
  if (!isValidId(id)) {
    problems.push({ path: idPath, message: ID_MESSAGE });
    return undefined;
  }
  if (ids.has(id)) {
    problems.push({ path: idPath, message: 'is already used by another rule' });
    return undefined;
  }
  ids.add(id);
  return id;
}

/** The project rules list. Each entry is converted; an entry with a problem is dropped and the list is then refused. */
function parseRules(obj: Obj, problems: PipelineProblem[]): Rule[] | undefined {
  const list = readList(obj, 'rules', '', problems);
  if (list === undefined) return undefined;
  const ids = new Set<string>();
  const rules = list.flatMap((item, index) => {
    const rule = toRule(item, indexPath('rules', index), ids, problems);
    return rule === undefined ? [] : [rule];
  });
  return rules.length === list.length ? rules : undefined;
}

function parsePipeline(value: unknown, path: string, problems: PipelineProblem[]): Pipeline | undefined {
  const obj = readObject(value, path, problems);
  if (obj === undefined) return undefined;
  checkKeys(obj, PIPELINE_KEYS, path, problems);
  // The pipeline name is free text: it is a display name, not a file name (architecture §4 writes `pipeline.md`).
  const name = readString(obj, 'name', path, problems);
  const list = readList(obj, 'blocks', path, problems);
  const structures = list === undefined ? undefined : parsePipelineStructure(list, childPath(path, 'blocks'), problems);
  if (name === undefined || list === undefined || structures === undefined) return undefined;
  const ids = describeList(list);
  const blocks = structures.flatMap((block) => {
    const converted = convertPipelineBlock(block, ids, problems);
    return converted === undefined ? [] : [converted];
  });
  return { name, blocks };
}

/**
 * Parses an untrusted project config at the top level: schemaVersion, name, idea, stack,
 * pipeline and rules, and the unknown keys. Returns every problem found, never throws on bad input.
 * Every block is checked for its own fields and returned as its model type; a block with a
 * problem is dropped, and the result is then refused.
 */
export function parsePipelineConfig(value: unknown): ParsePipelineResult {
  const problems: PipelineProblem[] = [];
  const obj = readObject(value, '', problems);
  if (obj === undefined) return { ok: false, problems };

  checkKeys(obj, ROOT_KEYS, '', problems);
  if (requirePresent(obj, 'schemaVersion', '', problems) && obj['schemaVersion'] !== 2) {
    problems.push({ path: 'schemaVersion', message: 'must be 2' });
  }
  const name = readString(obj, 'name', '', problems);
  const idea = readString(obj, 'idea', '', problems);
  const stack = requirePresent(obj, 'stack', '', problems)
    ? parseStack(obj['stack'], 'stack', problems)
    : undefined;
  const pipeline = requirePresent(obj, 'pipeline', '', problems)
    ? parsePipeline(obj['pipeline'], 'pipeline', problems)
    : undefined;
  const rules = parseRules(obj, problems);

  if (
    problems.length > 0 ||
    name === undefined ||
    idea === undefined ||
    stack === undefined ||
    pipeline === undefined ||
    rules === undefined
  ) {
    return { ok: false, problems };
  }
  return { ok: true, config: { schemaVersion: 2, name, idea, stack, pipeline, rules } };
}
