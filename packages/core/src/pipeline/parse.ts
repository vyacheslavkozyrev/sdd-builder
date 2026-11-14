import type { PipelineStartBlock, ProjectConfig, ProjectStack, StartBlock, AgentBlock } from './model.js';
import {
  parsePipelineStructure,
  type ChildStructure,
  type ConditionStructure,
  type ConnectionStructure,
  type EndStructure,
  type FlowStructure,
  type PipelineStructure,
} from './parse-structure.js';
import { toAgentBlock, toChildStart, toPipelineStart } from './parse-scope.js';
import {
  checkKeys,
  childPath,
  readObject,
  readList,
  readOptionalString,
  readString,
  requirePresent,
  type PipelineProblem,
} from './parse-util.js';

export type { PipelineProblem } from './parse-util.js';

/** A block of a child flow as parsed so far: Start and Agent are model types; Condition, Connection and End stay structural until T007. */
export type ParsedChildBlock = StartBlock | AgentBlock | ConditionStructure | ConnectionStructure | EndStructure;

/** A child flow as parsed so far, with its blocks converted as far as the parse goes. */
export interface ParsedFlow extends Omit<FlowStructure, 'blocks'> {
  blocks: ParsedChildBlock[];
}

/** A block of the pipeline as parsed so far: Start is a model type; the rest stay structural until T007. */
export type ParsedPipelineBlock = PipelineStartBlock | ConditionStructure | ConnectionStructure | EndStructure | ParsedFlow;

/** A pipeline as parsed so far: its name, and its blocks that passed the checks. */
export interface ParsedPipeline {
  name: string;
  blocks: ParsedPipelineBlock[];
}

/** A config as parsed so far: every field is checked, the Start and Agent blocks are model types. */
export interface ParsedConfig extends Omit<ProjectConfig, 'pipeline'> {
  pipeline: ParsedPipeline;
}

export type ParsePipelineResult =
  | { ok: true; config: ParsedConfig }
  | { ok: false; problems: PipelineProblem[] };

const ROOT_KEYS: readonly string[] = ['schemaVersion', 'name', 'idea', 'stack', 'pipeline'];
const STACK_KEYS: readonly string[] = ['language', 'framework', 'platform', 'buildTool', 'testFramework'];
const PIPELINE_KEYS: readonly string[] = ['name', 'blocks'];

/** Converts one block of a child flow. Blocks that fail their own rules are dropped; the problem is already recorded. */
function convertChild(block: ChildStructure, problems: PipelineProblem[]): ParsedChildBlock | undefined {
  switch (block.kind) {
    case 'start':
      return toChildStart(block, problems);
    case 'agent':
      return toAgentBlock(block, problems);
    case 'condition':
    case 'connection':
    case 'end':
      return block;
  }
}

function convertFlow(flow: FlowStructure, problems: PipelineProblem[]): ParsedFlow {
  const blocks = flow.blocks.flatMap((block) => {
    const converted = convertChild(block, problems);
    return converted === undefined ? [] : [converted];
  });
  return { ...flow, blocks };
}

/** Converts one block of the pipeline. Blocks that fail their own rules are dropped; the problem is already recorded. */
function convertPipelineBlock(block: PipelineStructure, problems: PipelineProblem[]): ParsedPipelineBlock | undefined {
  switch (block.kind) {
    case 'start':
      return toPipelineStart(block, problems);
    case 'flow':
      return convertFlow(block, problems);
    case 'condition':
    case 'connection':
    case 'end':
      return block;
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

function parsePipeline(value: unknown, path: string, problems: PipelineProblem[]): ParsedPipeline | undefined {
  const obj = readObject(value, path, problems);
  if (obj === undefined) return undefined;
  checkKeys(obj, PIPELINE_KEYS, path, problems);
  // The pipeline name is free text: it is a display name, not a file name (architecture §4 writes `pipeline.md`).
  const name = readString(obj, 'name', path, problems);
  const list = readList(obj, 'blocks', path, problems);
  const structures = list === undefined ? undefined : parsePipelineStructure(list, childPath(path, 'blocks'), problems);
  if (name === undefined || structures === undefined) return undefined;
  const blocks = structures.flatMap((block) => {
    const converted = convertPipelineBlock(block, problems);
    return converted === undefined ? [] : [converted];
  });
  return { name, blocks };
}

/**
 * Parses an untrusted project config at the top level: schemaVersion, name, idea, stack and
 * pipeline, and the unknown keys. Returns every problem found, never throws on bad input.
 * The pipeline blocks are checked for kind, id, the enabled flag and structure; the Start and Agent
 * blocks are checked for their own fields and typed as the model types. Condition blocks are checked
 * by the later parse step (T007).
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

  if (problems.length > 0 || name === undefined || idea === undefined || stack === undefined || pipeline === undefined) {
    return { ok: false, problems };
  }
  return { ok: true, config: { schemaVersion: 2, name, idea, stack, pipeline } };
}
