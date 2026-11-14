// Field-level rules of the Start and Agent blocks: the scope of an Agent block (AC-010), the
// arguments of the pipeline's Start block (AC-011), and the Start of a child flow, which carries
// none (AC-012). The structure is checked in parse-structure.ts; this file types the blocks as
// the model types. Unknown keys are refused here, at the path of the key.
import { ID_MESSAGE, isValidId } from './ids.js';
import type { AgentBlock, Argument, PipelineStartBlock, Scope, StartBlock } from './model.js';
import type { AgentStructure, StartStructure } from './parse-structure.js';
import {
  checkKeys,
  childPath,
  indexPath,
  readList,
  readObject,
  readString,
  requirePresent,
  type Obj,
  type PipelineProblem,
} from './parse-util.js';

const AGENT_KEYS: readonly string[] = ['kind', 'id', 'enabled', 'name', 'scope'];
const CHILD_START_KEYS: readonly string[] = ['kind', 'id', 'enabled'];
const PIPELINE_START_KEYS: readonly string[] = ['kind', 'id', 'enabled', 'arguments'];
const ARGUMENT_KEYS: readonly string[] = ['name', 'required', 'hint'];

function isScope(value: unknown): value is Scope {
  return value === 'project' || value === 'feature' || value === 'task';
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

/** An Agent block with its scope. The name and the id were checked in the structure. */
export function toAgentBlock(block: AgentStructure, problems: PipelineProblem[]): AgentBlock | undefined {
  const keysOk = keysAllowed(block.fields, AGENT_KEYS, block.path, problems);
  const scope = readScope(block.fields, block.path, problems);
  if (!keysOk || scope === undefined) return undefined;
  return { kind: 'agent', id: block.id, enabled: block.enabled, name: block.name, scope };
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
