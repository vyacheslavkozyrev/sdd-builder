// Field-level rules of the Start and Agent blocks: the scope of an Agent block (AC-010), its description
// (AC-029), the arguments of the pipeline's Start block (AC-011), and the Start of a child flow, which carries
// none (AC-012). The structure is checked in parse-structure.ts; this file types the blocks as
// the model types. Unknown keys are refused here, at the path of the key.
import { ID_MESSAGE, isValidId } from './ids.js';
import type { AgentBlock, AgentModel, AgentSettings, Argument, PipelineStartBlock, Scope, StartBlock } from './model.js';
import type { AgentStructure, StartStructure } from './parse-structure.js';
import {
  checkKeys,
  childPath,
  has,
  indexPath,
  readList,
  readObject,
  readString,
  requirePresent,
  type Obj,
  type PipelineProblem,
} from './parse-util.js';

const AGENT_KEYS: readonly string[] = [
  'kind',
  'id',
  'enabled',
  'name',
  'scope',
  'description',
  'ruleTags',
  'model',
  'tools',
  'body',
  'reads',
  'writes',
];
const AGENT_MODELS: readonly string[] = ['haiku', 'sonnet', 'opus', 'inherit'];
const ARTIFACT_KEYS = ['reads', 'writes'] as const;
/**
 * A tool name cannot hold a space, a comma or a control character: a line break would corrupt the frontmatter, and a comma
 * would split the comma-joined tools line (F-06 AC-026).
 */
const UNSAFE_TOOL_CHARACTER = /[\s,\p{Cc}]/u;
const CHILD_START_KEYS: readonly string[] = ['kind', 'id', 'enabled'];
const PIPELINE_START_KEYS: readonly string[] = ['kind', 'id', 'enabled', 'arguments'];
const ARGUMENT_KEYS: readonly string[] = ['name', 'required', 'hint'];

function isScope(value: unknown): value is Scope {
  return value === 'project' || value === 'feature' || value === 'task';
}

function isAgentModel(value: unknown): value is AgentModel {
  return typeof value === 'string' && AGENT_MODELS.includes(value);
}

/** Runs the key check and reports whether it added no problem. */
function keysAllowed(obj: Obj, allowed: readonly string[], path: string, problems: PipelineProblem[]): boolean {
  const before = problems.length;
  checkKeys(obj, allowed, path, problems);
  return problems.length === before;
}

function readScope(obj: Obj, path: string, problems: PipelineProblem[]): Scope | undefined {
  if (!requirePresent(obj, 'scope', path, problems)) return undefined;
  const value = obj['scope'];
  if (isScope(value)) return value;
  problems.push({ path: childPath(path, 'scope'), message: 'must be project, feature or task' });
  return undefined;
}

/**
 * The description of a block that carries one (a flow, an Agent block or a Condition): its text, which becomes the command
 * or stub text, or the rule text. It must be present, a string and not blank. The problem is recorded at the block's path,
 * since the description is the block's own content.
 */
export function readDescription(obj: Obj, path: string, problems: PipelineProblem[]): string | undefined {
  if (!has(obj, 'description')) {
    problems.push({ path, message: 'description is required' });
    return undefined;
  }
  const value = obj['description'];
  if (typeof value !== 'string') {
    problems.push({ path, message: 'description must be a string' });
    return undefined;
  }
  if (value.trim() === '') {
    problems.push({ path, message: 'description must not be blank' });
    return undefined;
  }
  return value;
}

/**
 * The rule tags of an Agent block or a flow (F-03 AC-029, AC-030): an optional list of non-empty strings, `[]` when the key
 * is absent. Each item that is not a non-empty string is refused at its own path. Whether a tag names a rule is checked
 * on the config, in generate/refusals-names.ts, since the rules are not known to the block.
 */
export function readRuleTags(obj: Obj, path: string, problems: PipelineProblem[]): string[] | undefined {
  if (!has(obj, 'ruleTags')) return [];
  const list = readList(obj, 'ruleTags', path, problems);
  if (list === undefined) return undefined;
  const tagsPath = childPath(path, 'ruleTags');
  const tags = list.flatMap((item, index) => {
    const itemPath = indexPath(tagsPath, index);
    if (typeof item !== 'string') {
      problems.push({ path: itemPath, message: 'must be a string' });
      return [];
    }
    if (item === '') {
      problems.push({ path: itemPath, message: 'must not be empty' });
      return [];
    }
    return [item];
  });
  return tags.length === list.length ? tags : undefined;
}

/** An Agent block with its scope, description, rule tags, artifacts and settings. The name and the id were checked in the structure. */
export function toAgentBlock(block: AgentStructure, problems: PipelineProblem[]): AgentBlock | undefined {
  const keysOk = keysAllowed(block.fields, AGENT_KEYS, block.path, problems);
  const scope = readScope(block.fields, block.path, problems);
  const description = readDescription(block.fields, block.path, problems);
  const ruleTags = readRuleTags(block.fields, block.path, problems);
  const settings = readAgentSettings(block.fields, block.path, problems);
  const artifacts = readArtifactLists(block.fields, block.path, problems);
  if (
    !keysOk ||
    scope === undefined ||
    description === undefined ||
    ruleTags === undefined ||
    settings === undefined ||
    artifacts === undefined
  ) {
    return undefined;
  }
  return { kind: 'agent', id: block.id, enabled: block.enabled, name: block.name, scope, description, ruleTags, ...settings, ...artifacts };
}

/** The artifact lists of an Agent block (F-06 amendment 9). Each key that is present is set; an absent key is left out. */
export interface ArtifactLists {
  reads?: string[];
  writes?: string[];
}

/**
 * The reads and writes of an Agent block: each optional list holds artifact names, each non-blank and listed once.
 * Returns undefined when a present list is invalid; the problem is recorded at the item's own path.
 */
export function readArtifactLists(obj: Obj, path: string, problems: PipelineProblem[]): ArtifactLists | undefined {
  const lists: ArtifactLists = {};
  let valid = true;
  for (const key of ARTIFACT_KEYS) {
    if (!has(obj, key)) continue;
    const names = readArtifactNames(obj, key, path, problems);
    if (names === undefined) valid = false;
    else lists[key] = names;
  }
  return valid ? lists : undefined;
}

function readArtifactNames(obj: Obj, key: (typeof ARTIFACT_KEYS)[number], path: string, problems: PipelineProblem[]): string[] | undefined {
  const list = readList(obj, key, path, problems);
  if (list === undefined) return undefined;
  const listPath = childPath(path, key);
  const seen = new Set<string>();
  const names = list.flatMap((item, index) => {
    const itemPath = indexPath(listPath, index);
    if (typeof item !== 'string') {
      problems.push({ path: itemPath, message: 'must be a string' });
      return [];
    }
    if (item.trim() === '') {
      problems.push({ path: itemPath, message: 'must not be blank' });
      return [];
    }
    if (seen.has(item)) {
      problems.push({ path: itemPath, message: 'is listed more than once' });
      return [];
    }
    seen.add(item);
    return [item];
  });
  return names.length === list.length ? names : undefined;
}

/**
 * The optional settings of an agent file, also read for the pipeline (F-06 amendment 4): the model (one of the four
 * values), the tool names (non-blank strings) and the body (a string, not capped here). A key that is absent is left
 * out of the result. Returns undefined when a present key is invalid; the problem is recorded at its own path.
 */
export function readAgentSettings(obj: Obj, path: string, problems: PipelineProblem[]): AgentSettings | undefined {
  const settings: AgentSettings = {};
  let valid = true;
  if (has(obj, 'model')) {
    const model = readAgentModel(obj, path, problems);
    if (model === undefined) valid = false;
    else settings.model = model;
  }
  if (has(obj, 'tools')) {
    const tools = readTools(obj, path, problems);
    if (tools === undefined) valid = false;
    else settings.tools = tools;
  }
  if (has(obj, 'body')) {
    const body = readString(obj, 'body', path, problems);
    if (body === undefined) valid = false;
    else settings.body = body;
  }
  return valid ? settings : undefined;
}

function readAgentModel(obj: Obj, path: string, problems: PipelineProblem[]): AgentModel | undefined {
  const value = obj['model'];
  if (isAgentModel(value)) return value;
  problems.push({ path: childPath(path, 'model'), message: 'must be haiku, sonnet, opus or inherit' });
  return undefined;
}

/**
 * The tool names of an agent: a list of strings, none blank, none with a space, a comma or a control character (F-06 AC-026).
 * Each item that breaks a rule is refused at its own path.
 */
function readTools(obj: Obj, path: string, problems: PipelineProblem[]): string[] | undefined {
  const list = readList(obj, 'tools', path, problems);
  if (list === undefined) return undefined;
  const toolsPath = childPath(path, 'tools');
  const tools = list.flatMap((item, index) => {
    const itemPath = indexPath(toolsPath, index);
    if (typeof item !== 'string') {
      problems.push({ path: itemPath, message: 'must be a string' });
      return [];
    }
    if (item.trim() === '') {
      problems.push({ path: itemPath, message: 'must not be blank' });
      return [];
    }
    if (UNSAFE_TOOL_CHARACTER.test(item)) {
      problems.push({ path: itemPath, message: 'must not contain spaces, commas or control characters' });
      return [];
    }
    return [item];
  });
  return tools.length === list.length ? tools : undefined;
}

/** A Start block of a child flow. It carries no arguments: an `arguments` key is refused. */
export function toChildStart(block: StartStructure, problems: PipelineProblem[]): StartBlock | undefined {
  if (!keysAllowed(block.fields, CHILD_START_KEYS, block.path, problems)) return undefined;
  return { kind: 'start', id: block.id, enabled: block.enabled };
}

/** The Start block of the pipeline. It carries the arguments the pipeline takes. */
export function toPipelineStart(block: StartStructure, problems: PipelineProblem[]): PipelineStartBlock | undefined {
  const keysOk = keysAllowed(block.fields, PIPELINE_START_KEYS, block.path, problems);
  const args = readArguments(block.fields, block.path, problems);
  if (!keysOk || args === undefined) return undefined;
  return { kind: 'start', id: block.id, enabled: block.enabled, arguments: args };
}

function readArguments(obj: Obj, path: string, problems: PipelineProblem[]): Argument[] | undefined {
  const list = readList(obj, 'arguments', path, problems);
  if (list === undefined) return undefined;
  const argumentsPath = childPath(path, 'arguments');
  const names = new Set<string>();
  const args = list.flatMap((item, index) => {
    const arg = readArgument(item, indexPath(argumentsPath, index), names, problems);
    return arg === undefined ? [] : [arg];
  });
  return args.length === list.length ? args : undefined;
}

function readArgument(value: unknown, path: string, names: Set<string>, problems: PipelineProblem[]): Argument | undefined {
  const obj = readObject(value, path, problems);
  if (obj === undefined) return undefined;
  const keysOk = keysAllowed(obj, ARGUMENT_KEYS, path, problems);
  const name = readArgumentName(obj, path, names, problems);
  const required = readRequired(obj, path, problems);
  const hint = readString(obj, 'hint', path, problems);
  if (!keysOk || name === undefined || required === undefined || hint === undefined) return undefined;
  return { name, required, hint };
}

/** An argument name follows the id rule and is unique among the pipeline's arguments. */
function readArgumentName(obj: Obj, path: string, names: Set<string>, problems: PipelineProblem[]): string | undefined {
  const name = readString(obj, 'name', path, problems);
  if (name === undefined) return undefined;
  const namePath = childPath(path, 'name');
  if (!isValidId(name)) {
    problems.push({ path: namePath, message: ID_MESSAGE });
    return undefined;
  }
  if (names.has(name)) {
    problems.push({ path: namePath, message: 'is already used by another argument' });
    return undefined;
  }
  names.add(name);
  return name;
}

function readRequired(obj: Obj, path: string, problems: PipelineProblem[]): boolean | undefined {
  if (!requirePresent(obj, 'required', path, problems)) return undefined;
  const value = obj['required'];
  if (typeof value === 'boolean') return value;
  problems.push({ path: childPath(path, 'required'), message: 'must be true or false' });
  return undefined;
}
