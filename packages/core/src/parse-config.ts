import type { GateType, ProjectConfig, RouteTarget, Scope, TargetTool } from './model.js';

/** One problem with untrusted input: the field path and the reason. Never the submitted value. */
export interface ConfigProblem {
  path: string;
  reason: string;
}

export type ParseConfigResult =
  | { ok: true; config: ProjectConfig }
  | { ok: false; problems: ConfigProblem[] };

/** The target tools the service knows. Must cover every `TargetTool`. */
const KNOWN_TARGETS: readonly TargetTool[] = ['claude', 'cursor', 'copilot'];

/** The scopes a workflow can have. Must cover every `Scope`. */
const SCOPES: readonly Scope[] = ['project', 'feature', 'task'];

/** The gate types the service knows. Must cover every `GateType`. */
const GATE_TYPES: readonly GateType[] = ['approval', 'checks', 'review', 'diff-size'];

/** The route kinds a condition output can take. Must cover every `RouteTarget` kind. */
const ROUTE_KINDS: readonly RouteTarget['kind'][] = ['next', 'step', 'stop'];

/** A check on one value: true when the value is acceptable. */
type Check = (value: unknown) => boolean;

/** A check on one nested value: it adds its own problems at the given path. */
type Checker = (value: unknown, path: string, problems: ConfigProblem[]) => void;

/** True for a plain object: not null, not an array. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKnownTarget(value: unknown): value is TargetTool {
  return typeof value === 'string' && (KNOWN_TARGETS as readonly string[]).includes(value);
}

function isScope(value: unknown): value is Scope {
  return typeof value === 'string' && (SCOPES as readonly string[]).includes(value);
}

function isGateType(value: unknown): value is GateType {
  return typeof value === 'string' && (GATE_TYPES as readonly string[]).includes(value);
}

function isRouteKind(value: unknown): value is RouteTarget['kind'] {
  return typeof value === 'string' && (ROUTE_KINDS as readonly string[]).includes(value);
}

const isString: Check = (value) => typeof value === 'string';
const isBoolean: Check = (value) => typeof value === 'boolean';
const isNumber: Check = (value) => typeof value === 'number';

/**
 * Checks one required field of an object: it must be present and pass `isValid`.
 * The field's path is the object's path plus the field name.
 */
function checkRequired(
  object: Record<string, unknown>,
  key: string,
  base: string,
  problems: ConfigProblem[],
  isValid: Check,
  reason: string,
): void {
  const path = `${base}.${key}`;
  if (!(key in object)) {
    problems.push({ path, reason: 'is required' });
  } else if (!isValid(object[key])) {
    problems.push({ path, reason });
  }
}

/** Checks an optional field: when present it must pass `isValid`. Absent is no problem. */
function checkOptional(
  object: Record<string, unknown>,
  key: string,
  base: string,
  problems: ConfigProblem[],
  isValid: Check,
  reason: string,
): void {
  if (key in object && !isValid(object[key])) {
    problems.push({ path: `${base}.${key}`, reason });
  }
}

/** Checks one required nested value: it must be present and pass `check` at its path. */
function checkNested(
  object: Record<string, unknown>,
  key: string,
  base: string,
  problems: ConfigProblem[],
  check: Checker,
): void {
  const path = `${base}.${key}`;
  if (!(key in object)) {
    problems.push({ path, reason: 'is required' });
  } else {
    check(object[key], path, problems);
  }
}

/** Checks a list: it must be an array, and every item is checked by `checkItem` at its indexed path. */
function checkList(
  value: unknown,
  path: string,
  problems: ConfigProblem[],
  checkItem: (item: unknown, itemPath: string, problems: ConfigProblem[]) => void,
): void {
  if (!Array.isArray(value)) {
    problems.push({ path, reason: 'must be an array' });
    return;
  }
  const items: unknown[] = value;
  items.forEach((item, index) => checkItem(item, `${path}[${index}]`, problems));
}

function checkWorkflowStep(value: unknown, path: string, problems: ConfigProblem[]): void {
  if (!isPlainObject(value)) {
    problems.push({ path, reason: 'must be an object' });
    return;
  }
  checkRequired(value, 'stepId', path, problems, isString, 'must be a string');
  checkRequired(value, 'enabled', path, problems, isBoolean, 'must be a boolean');
}

/** A gate: its fixed type, an optional numeric threshold and whether it is required. */
function checkGate(value: unknown, path: string, problems: ConfigProblem[]): void {
  if (!isPlainObject(value)) {
    problems.push({ path, reason: 'must be an object' });
    return;
  }
  checkRequired(value, 'id', path, problems, isString, 'must be a string');
  checkRequired(value, 'type', path, problems, isGateType, `must be one of ${GATE_TYPES.join(', ')}`);
  checkOptional(value, 'threshold', path, problems, isNumber, 'must be a number');
  checkRequired(value, 'required', path, problems, isBoolean, 'must be a boolean');
}

/** A route: a known kind, and a `stepId` when the kind is `step`. Its meaning is not checked. */
function checkRoute(value: unknown, path: string, problems: ConfigProblem[]): void {
  if (!isPlainObject(value)) {
    problems.push({ path, reason: 'must be an object' });
    return;
  }
  checkRequired(value, 'kind', path, problems, isRouteKind, `must be one of ${ROUTE_KINDS.join(', ')}`);
  if (value['kind'] === 'step') {
    checkRequired(value, 'stepId', path, problems, isString, 'must be a string');
  }
}

/** A condition: its gate, a required pass route, and a fail route that may be absent but not null. */
function checkCondition(value: unknown, path: string, problems: ConfigProblem[]): void {
  if (!isPlainObject(value)) {
    problems.push({ path, reason: 'must be an object' });
    return;
  }
  checkRequired(value, 'id', path, problems, isString, 'must be a string');
  checkRequired(value, 'afterStepId', path, problems, isString, 'must be a string');
  checkNested(value, 'gate', path, problems, checkGate);
  checkNested(value, 'pass', path, problems, checkRoute);
  if ('fail' in value) {
    checkRoute(value['fail'], `${path}.fail`, problems);
  }
  checkOptional(value, 'roundLimit', path, problems, isNumber, 'must be a number');
}

/** Checks the fields of one workflow, its steps, its conditions and its optional description. */
function checkWorkflow(value: unknown, path: string, problems: ConfigProblem[]): void {
  if (!isPlainObject(value)) {
    problems.push({ path, reason: 'must be an object' });
    return;
  }
  checkRequired(value, 'id', path, problems, isString, 'must be a string');
  checkRequired(value, 'name', path, problems, isString, 'must be a string');
  checkRequired(value, 'scope', path, problems, isScope, `must be one of ${SCOPES.join(', ')}`);
  checkRequired(value, 'iterationSource', path, problems, isString, 'must be a string');
  checkRequired(value, 'enabled', path, problems, isBoolean, 'must be a boolean');
  checkOptional(value, 'description', path, problems, isString, 'must be a string');
  if (!('steps' in value)) {
    problems.push({ path: `${path}.steps`, reason: 'is required' });
  } else {
    checkList(value['steps'], `${path}.steps`, problems, checkWorkflowStep);
  }
  if (!('conditions' in value)) {
    problems.push({ path: `${path}.conditions`, reason: 'is required' });
  } else {
    checkList(value['conditions'], `${path}.conditions`, problems, checkCondition);
  }
}

/**
 * Checks the top level of an untrusted `ProjectConfig`, and the workflows: their fields,
 * steps, conditions and descriptions. Every problem is collected.
 */
export function parseProjectConfig(value: unknown): ParseConfigResult {
  if (!isPlainObject(value)) {
    return { ok: false, problems: [{ path: '$', reason: 'must be a JSON object' }] };
  }

  const problems: ConfigProblem[] = [];

  if (!('schemaVersion' in value)) {
    problems.push({ path: 'schemaVersion', reason: 'is required' });
  } else if (value['schemaVersion'] !== 1) {
    problems.push({ path: 'schemaVersion', reason: 'must be 1' });
  }

  for (const field of ['name', 'idea'] as const) {
    if (!(field in value)) {
      problems.push({ path: field, reason: 'is required' });
    } else if (typeof value[field] !== 'string') {
      problems.push({ path: field, reason: 'must be a string' });
    }
  }

  for (const field of ['stack', 'architecture'] as const) {
    if (!(field in value)) {
      problems.push({ path: field, reason: 'is required' });
    } else if (!isPlainObject(value[field])) {
      problems.push({ path: field, reason: 'must be an object' });
    }
  }

  for (const field of ['codeRules', 'testRules'] as const) {
    const list = value[field];
    if (!(field in value)) {
      problems.push({ path: field, reason: 'is required' });
    } else if (!Array.isArray(list)) {
      problems.push({ path: field, reason: 'must be an array' });
    } else {
      list.forEach((item: unknown, index: number) => {
        if (typeof item !== 'string') {
          problems.push({ path: `${field}[${index}]`, reason: 'must be a string' });
        }
      });
    }
  }

  for (const field of ['customSteps', 'connections'] as const) {
    if (!(field in value)) {
      problems.push({ path: field, reason: 'is required' });
    } else if (!Array.isArray(value[field])) {
      problems.push({ path: field, reason: 'must be an array' });
    }
  }

  if (!('workflows' in value)) {
    problems.push({ path: 'workflows', reason: 'is required' });
  } else {
    checkList(value['workflows'], 'workflows', problems, checkWorkflow);
  }

  if (!('targets' in value)) {
    problems.push({ path: 'targets', reason: 'is required' });
  } else if (!Array.isArray(value['targets'])) {
    problems.push({ path: 'targets', reason: 'must be an array' });
  } else {
    value['targets'].forEach((target: unknown, index: number) => {
      if (!isKnownTarget(target)) {
        problems.push({ path: `targets[${index}]`, reason: `must be one of ${KNOWN_TARGETS.join(', ')}` });
      }
    });
  }

  if (problems.length > 0) {
    return { ok: false, problems };
  }
  // INTERIM (F-07 T003b): the top level, the workflows (fields, steps, conditions, gates,
  // routes and descriptions) are checked above. The contents of stack, architecture,
  // connections and custom steps are NOT checked yet, so this cast is unsafe for callers.
  // F-07 T003c completes those checks and removes the cast. Until then this module is not
  // exported from index.ts and must not be used by any caller.
  return { ok: true, config: value as unknown as ProjectConfig };
}
