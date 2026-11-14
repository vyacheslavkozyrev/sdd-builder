import type { ProjectConfig, ProjectStack } from './model.js';
import { parsePipelineStructure, type PipelineStructure } from './parse-structure.js';
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

/** A pipeline as parsed so far: its name, and its blocks that passed the structural checks. Field-level rules of Agent and Condition blocks are checked in T006 and T007. */
export interface ParsedPipeline {
  name: string;
  blocks: PipelineStructure[];
}

/** A config as parsed so far: every field is checked, the pipeline blocks at the structural level. */
export interface ParsedConfig extends Omit<ProjectConfig, 'pipeline'> {
  pipeline: ParsedPipeline;
}

export type ParsePipelineResult =
  | { ok: true; config: ParsedConfig }
  | { ok: false; problems: PipelineProblem[] };

const ROOT_KEYS: readonly string[] = ['schemaVersion', 'name', 'idea', 'stack', 'pipeline'];
const STACK_KEYS: readonly string[] = ['language', 'framework', 'platform', 'buildTool', 'testFramework'];
const PIPELINE_KEYS: readonly string[] = ['name', 'blocks'];

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
  const blocks = list === undefined ? undefined : parsePipelineStructure(list, childPath(path, 'blocks'), problems);
  if (name === undefined || blocks === undefined) return undefined;
  return { name, blocks };
}

/**
 * Parses an untrusted project config at the top level: schemaVersion, name, idea, stack and
 * pipeline, and the unknown keys. Returns every problem found, never throws on bad input.
 * The pipeline blocks are checked for kind, id, the enabled flag and structure; their own fields
 * are checked by the later parse steps.
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
