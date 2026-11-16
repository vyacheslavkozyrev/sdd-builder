// Field-level rules of the Condition blocks: the check type (AC-005), the threshold of diff-size
// (AC-006), who decides (AC-007), the pass and fail routes (AC-008) and the round limit (AC-009).
// A pipeline Condition also names the Connection it sits on. Its description (what passing means) is required (F-06
// AC-016). Unknown keys are refused at their path.
import type { CheckType, ConditionBlock, DecidedBy, PipelineConditionBlock, Route } from './model.js';
import type { ConditionStructure } from './parse-structure.js';
import { readDescription } from './parse-scope.js';
import {
  checkKeys,
  childPath,
  has,
  readObject,
  readString,
  requirePresent,
  type ListIds,
  type Obj,
  type PipelineProblem,
} from './parse-util.js';

const CONDITION_KEYS: readonly string[] = ['kind', 'id', 'enabled', 'description', 'checkType', 'decidedBy', 'threshold', 'passRoute', 'failRoute', 'roundLimit'];
const PIPELINE_CONDITION_KEYS: readonly string[] = [...CONDITION_KEYS, 'onConnection'];
const NEXT_OR_STOP_KEYS: readonly string[] = ['kind'];
const BACK_KEYS: readonly string[] = ['kind', 'blockId'];
const WHOLE_MESSAGE = 'must be a whole number of at least 1';

/** The check type with the threshold it takes: diff-size takes one, the other check types take none. */
type CheckFields = { checkType: 'diff-size'; threshold: number } | { checkType: 'approval' | 'checks' };

function isCheckType(value: unknown): value is CheckType {
  return value === 'approval' || value === 'checks' || value === 'diff-size';
}

function isDecidedBy(value: unknown): value is DecidedBy {
  return value === 'human' || value === 'agent';
}

function isWholeAtLeastOne(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function readCheckType(obj: Obj, path: string, problems: PipelineProblem[]): CheckType | undefined {
  if (!requirePresent(obj, 'checkType', path, problems)) return undefined;
  const value = obj['checkType'];
  if (isCheckType(value)) return value;
  problems.push({ path: childPath(path, 'checkType'), message: 'must be approval, checks or diff-size' });
  return undefined;
}

function readDecidedBy(obj: Obj, path: string, problems: PipelineProblem[]): DecidedBy | undefined {
  if (!requirePresent(obj, 'decidedBy', path, problems)) return undefined;
  const value = obj['decidedBy'];
  if (isDecidedBy(value)) return value;
  problems.push({ path: childPath(path, 'decidedBy'), message: 'must be human or agent' });
  return undefined;
}

/** The threshold of diff-size: required, and a whole number of at least 1. */
function readDiffSizeThreshold(obj: Obj, path: string, problems: PipelineProblem[]): number | undefined {
  if (!requirePresent(obj, 'threshold', path, problems)) return undefined;
  const value = obj['threshold'];
  if (isWholeAtLeastOne(value)) return value;
  problems.push({ path: childPath(path, 'threshold'), message: WHOLE_MESSAGE });
  return undefined;
}

/** True when `target` is a block of the list that comes before `own`. */
function isEarlier(ids: ListIds, target: string, own: string): boolean {
  const at = ids.ids.indexOf(target);
  return at !== -1 && at < ids.ids.indexOf(own);
}

/** A route: `next` or `stop` alone, or `back` with the id of an earlier block of the same list. */
function readRoute(
  obj: Obj,
  key: 'passRoute' | 'failRoute',
  path: string,
  ids: ListIds,
  ownId: string,
  problems: PipelineProblem[],
): Route | undefined {
  if (!requirePresent(obj, key, path, problems)) return undefined;
  const routePath = childPath(path, key);
  const route = readObject(obj[key], routePath, problems);
  if (route === undefined || !requirePresent(route, 'kind', routePath, problems)) return undefined;
  const kind = route['kind'];
  if (kind === 'next' || kind === 'stop') {
    checkKeys(route, NEXT_OR_STOP_KEYS, routePath, problems);
    return kind === 'next' ? { kind: 'next' } : { kind: 'stop' };
  }
  if (kind !== 'back') {
    problems.push({ path: childPath(routePath, 'kind'), message: 'must be next, stop or back' });
    return undefined;
  }
  checkKeys(route, BACK_KEYS, routePath, problems);
  const blockId = readString(route, 'blockId', routePath, problems);
  if (blockId === undefined) return undefined;
  if (!isEarlier(ids, blockId, ownId)) {
    problems.push({ path: childPath(routePath, 'blockId'), message: 'must name an earlier block in the same list' });
    return undefined;
  }
  return { kind: 'back', blockId };
}

/** The round limit is optional; when given it is a whole number of at least 1. */
function readRoundLimit(obj: Obj, path: string, problems: PipelineProblem[]): { roundLimit?: number } | undefined {
  if (!has(obj, 'roundLimit')) return {};
  const value = obj['roundLimit'];
  if (isWholeAtLeastOne(value)) return { roundLimit: value };
  problems.push({ path: childPath(path, 'roundLimit'), message: WHOLE_MESSAGE });
  return undefined;
}

/** A diff-size check takes a threshold; every other check type refuses one. */
function readCheckFields(obj: Obj, checkType: CheckType, path: string, problems: PipelineProblem[]): CheckFields | undefined {
  if (checkType === 'diff-size') {
    const threshold = readDiffSizeThreshold(obj, path, problems);
    return threshold === undefined ? undefined : { checkType, threshold };
  }
  if (has(obj, 'threshold')) {
    problems.push({ path: childPath(path, 'threshold'), message: 'is only for diff-size' });
    return undefined;
  }
  return { checkType };
}

/** Reads a Condition's own fields. Every problem is recorded, so one parse reports them all. */
function readCondition(
  block: ConditionStructure,
  allowed: readonly string[],
  ids: ListIds,
  problems: PipelineProblem[],
): ConditionBlock | undefined {
  const { id, enabled, path, fields: obj } = block;
  checkKeys(obj, allowed, path, problems);
  const description = readDescription(obj, path, problems);
  const checkType = readCheckType(obj, path, problems);
  const check = checkType === undefined ? undefined : readCheckFields(obj, checkType, path, problems);
  const decidedBy = readDecidedBy(obj, path, problems);
  const passRoute = readRoute(obj, 'passRoute', path, ids, id, problems);
  const failRoute = readRoute(obj, 'failRoute', path, ids, id, problems);
  const roundLimit = readRoundLimit(obj, path, problems);
  if (
    description === undefined ||
    check === undefined ||
    decidedBy === undefined ||
    passRoute === undefined ||
    failRoute === undefined ||
    roundLimit === undefined
  ) {
    return undefined;
  }
  return { kind: 'condition', id, enabled, description, decidedBy, passRoute, failRoute, ...roundLimit, ...check };
}

/** A Condition inside a child flow. Its routes name blocks of the same flow. */
export function toCondition(block: ConditionStructure, ids: ListIds, problems: PipelineProblem[]): ConditionBlock | undefined {
  return readCondition(block, CONDITION_KEYS, ids, problems);
}

/** A Condition between two flows of the pipeline. It names the pipeline Connection it sits on. */
export function toPipelineCondition(
  block: ConditionStructure,
  ids: ListIds,
  problems: PipelineProblem[],
): PipelineConditionBlock | undefined {
  const condition = readCondition(block, PIPELINE_CONDITION_KEYS, ids, problems);
  const onConnection = readOnConnection(block.fields, block.path, ids, problems);
  if (condition === undefined || onConnection === undefined) return undefined;
  return { ...condition, onConnection };
}

function readOnConnection(obj: Obj, path: string, ids: ListIds, problems: PipelineProblem[]): string | undefined {
  const value = readString(obj, 'onConnection', path, problems);
  if (value === undefined) return undefined;
  if (ids.connections.includes(value)) return value;
  problems.push({ path: childPath(path, 'onConnection'), message: 'must name a connection block of the pipeline' });
  return undefined;
}
