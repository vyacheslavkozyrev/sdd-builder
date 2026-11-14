// Structure of the pipeline's blocks: block kinds, ids, the enabled flag, one nesting level,
// the Start and End rules, and the uniqueness of ids and agent names. The own fields of a block
// are kept as read here; the field-level rules of the other blocks are checked later
// (parse-scope.ts, parse-condition.ts, parse-connection-end.ts), which type them as the model types.
import { ID_MESSAGE, isValidId } from './ids.js';
import {
  childPath,
  describeList,
  indexPath,
  isPlainObject,
  readList,
  readObject,
  requirePresent,
  type ListIds,
  type Obj,
  type PipelineProblem,
} from './parse-util.js';

const ALL_KINDS = ['start', 'agent', 'condition', 'connection', 'end', 'flow'] as const;

type BlockKind = (typeof ALL_KINDS)[number];

const PIPELINE_KINDS: readonly BlockKind[] = ['flow', 'condition', 'connection', 'start', 'end'];
const CHILD_KINDS: readonly BlockKind[] = ['start', 'agent', 'condition', 'connection', 'end'];

/** The own fields of a block as read, including `kind`, `id` and `enabled`. */
export type Fields = Readonly<Obj>;

/** A block whose kind, id and enabled flag passed the structural checks. */
export interface Structure<K extends BlockKind> {
  kind: K;
  id: string;
  enabled: boolean;
  /** The dotted path of the block, for the problems its own fields add later. */
  path: string;
  fields: Fields;
}

export type StartStructure = Structure<'start'>;
export type ConditionStructure = Structure<'condition'>;
export type ConnectionStructure = Structure<'connection'>;
export type EndStructure = Structure<'end'>;
export interface AgentStructure extends Structure<'agent'> {
  /** The agent's name, which is also its file name; unique among agents. */
  name: string;
}

/** The blocks a child flow holds. */
export type ChildStructure = StartStructure | AgentStructure | ConditionStructure | ConnectionStructure | EndStructure;

/** A child flow placed in the pipeline, with the child blocks that passed the checks. */
export interface FlowStructure extends Structure<'flow'> {
  blocks: ChildStructure[];
  /** The ids of the flow's blocks as read, for the references between them. */
  ids: ListIds;
}

/** The blocks the pipeline holds that passed the checks. */
export type PipelineStructure = StartStructure | ConditionStructure | ConnectionStructure | EndStructure | FlowStructure;

/** The ids and agent names already used in the project, so a repeat is refused at the path of the second. */
interface Registry {
  ids: Set<string>;
  agentNames: Set<string>;
}

interface Head {
  kind: BlockKind;
  id: string | undefined;
  enabled: boolean | undefined;
  obj: Obj;
}

function isBlockKind(value: unknown): value is BlockKind {
  return ALL_KINDS.some((kind) => kind === value);
}

function readKind(
  obj: Obj,
  path: string,
  allowed: readonly BlockKind[],
  where: string,
  problems: PipelineProblem[],
): BlockKind | undefined {
  if (!requirePresent(obj, 'kind', path, problems)) return undefined;
  const kindPath = childPath(path, 'kind');
  const kind = obj['kind'];
  if (!isBlockKind(kind)) {
    problems.push({ path: kindPath, message: 'is not a known block kind' });
    return undefined;
  }
  if (!allowed.includes(kind)) {
    problems.push({ path: kindPath, message: `is not allowed in ${where}` });
    return undefined;
  }
  return kind;
}

/** Reads an id or a name that must follow the id rule and be unique within `taken`. */
function readUniqueId(
  obj: Obj,
  key: string,
  path: string,
  taken: Set<string>,
  repeatMessage: string,
  problems: PipelineProblem[],
): string | undefined {
  if (!requirePresent(obj, key, path, problems)) return undefined;
  const keyPath = childPath(path, key);
  const value = obj[key];
  if (typeof value !== 'string') {
    problems.push({ path: keyPath, message: 'must be a string' });
    return undefined;
  }
  if (!isValidId(value)) {
    problems.push({ path: keyPath, message: ID_MESSAGE });
    return undefined;
  }
  if (taken.has(value)) {
    problems.push({ path: keyPath, message: repeatMessage });
    return undefined;
  }
  taken.add(value);
  return value;
}

function readEnabled(obj: Obj, path: string, problems: PipelineProblem[]): boolean | undefined {
  if (!requirePresent(obj, 'enabled', path, problems)) return undefined;
  const value = obj['enabled'];
  if (typeof value === 'boolean') return value;
  problems.push({ path: childPath(path, 'enabled'), message: 'must be true or false' });
  return undefined;
}

/** Reads the kind, the id and the enabled flag shared by every block. */
function readHead(
  value: unknown,
  path: string,
  allowed: readonly BlockKind[],
  where: string,
  registry: Registry,
  problems: PipelineProblem[],
): Head | undefined {
  const obj = readObject(value, path, problems);
  if (obj === undefined) return undefined;
  const kind = readKind(obj, path, allowed, where, problems);
  if (kind === undefined) return undefined;
  const id = readUniqueId(obj, 'id', path, registry.ids, 'is already used by another block or flow', problems);
  const enabled = readEnabled(obj, path, problems);
  return { kind, id, enabled, obj };
}

/** The indexes of the items whose kind is `kind`, read from the raw list. */
function indexesOfKind(list: readonly unknown[], kind: BlockKind): number[] {
  return list.flatMap((item, index) => (isPlainObject(item) && item['kind'] === kind ? [index] : []));
}

/** Every list of blocks (the pipeline, each child flow) has exactly one Start and at least one End. */
function checkStartAndEnd(list: readonly unknown[], path: string, problems: PipelineProblem[]): void {
  const starts = indexesOfKind(list, 'start');
  if (starts.length === 0) {
    problems.push({ path, message: 'must contain exactly one start block' });
  }
  for (const index of starts.slice(1)) {
    problems.push({
      path: childPath(indexPath(path, index), 'kind'),
      message: 'is a second start block; a list has exactly one',
    });
  }
  if (indexesOfKind(list, 'end').length === 0) {
    problems.push({ path, message: 'must contain at least one end block' });
  }
}

function parseChild(value: unknown, path: string, registry: Registry, problems: PipelineProblem[]): ChildStructure | undefined {
  const head = readHead(value, path, CHILD_KINDS, 'a child flow', registry, problems);
  if (head === undefined || head.id === undefined || head.enabled === undefined) return undefined;
  const { kind, id, enabled, obj } = head;
  switch (kind) {
    case 'agent': {
      const name = readUniqueId(obj, 'name', path, registry.agentNames, 'is already used by another agent', problems);
      return name === undefined ? undefined : { kind, id, enabled, name, path, fields: obj };
    }
    case 'start':
    case 'condition':
    case 'connection':
    case 'end':
      return { kind, id, enabled, path, fields: obj };
    case 'flow':
      return undefined;
  }
}

function parseChildList(list: unknown[], path: string, registry: Registry, problems: PipelineProblem[]): ChildStructure[] {
  const passed = list.flatMap((item, index) => {
    const block = parseChild(item, indexPath(path, index), registry, problems);
    return block === undefined ? [] : [block];
  });
  checkStartAndEnd(list, path, problems);
  return passed;
}

function parseFlow(head: Head, path: string, registry: Registry, problems: PipelineProblem[]): FlowStructure | undefined {
  const list = readList(head.obj, 'blocks', path, problems);
  const blocks = list === undefined ? undefined : parseChildList(list, childPath(path, 'blocks'), registry, problems);
  if (list === undefined || head.id === undefined || head.enabled === undefined || blocks === undefined) return undefined;
  return { kind: 'flow', id: head.id, enabled: head.enabled, path, fields: head.obj, blocks, ids: describeList(list) };
}

function parsePipelineBlock(
  value: unknown,
  path: string,
  registry: Registry,
  problems: PipelineProblem[],
): PipelineStructure | undefined {
  const head = readHead(value, path, PIPELINE_KINDS, 'the pipeline', registry, problems);
  if (head === undefined) return undefined;
  if (head.kind === 'flow') return parseFlow(head, path, registry, problems);
  if (head.id === undefined || head.enabled === undefined) return undefined;
  const { kind, id, enabled, obj } = head;
  switch (kind) {
    case 'start':
    case 'condition':
    case 'connection':
    case 'end':
      return { kind, id, enabled, path, fields: obj };
    case 'agent':
      return undefined;
  }
}

/**
 * Parses the pipeline's blocks. Returns only the blocks that passed their own checks; the caller
 * treats any problem as a refusal, so the returned list is complete only when no problem was added.
 */
export function parsePipelineStructure(list: unknown[], path: string, problems: PipelineProblem[]): PipelineStructure[] {
  const registry: Registry = { ids: new Set(), agentNames: new Set() };
  const passed = list.flatMap((item, index) => {
    const block = parsePipelineBlock(item, indexPath(path, index), registry, problems);
    return block === undefined ? [] : [block];
  });
  checkStartAndEnd(list, path, problems);
  return passed;
}
