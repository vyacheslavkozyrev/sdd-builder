import type {
  GateType,
  ProjectConfig,
  RouteTarget,
  Scope,
  StepDefinition,
  StepKind,
  TargetTool,
} from './model.js';

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

/** The step kinds a custom step can have. Must cover every `StepKind`. */
const STEP_KINDS: readonly StepKind[] = ['command', 'agent', 'skill', 'script'];

/** The origins a step definition can have. Must cover every `StepDefinition['origin']`. */
const STEP_ORIGINS: readonly StepDefinition['origin'][] = ['catalog', 'custom'];

/** A check on one value: true when the value is acceptable. */
type Check = (value: unknown) => boolean;

/** A check on one nested value: it adds its own problems at the given path. */
type Checker = (value: unknown, path: string, problems: ConfigProblem[]) => void;

/** True for a plain object: not null, not an array. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** True when the value is one of the allowed literals. Equality is checked per item, so no cast is needed. */
function isOneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return allowed.some((item) => item === value);
}

function isKnownTarget(value: unknown): value is TargetTool {
  return isOneOf(KNOWN_TARGETS, value);
}

function isScope(value: unknown): value is Scope {
  return isOneOf(SCOPES, value);
}

function isGateType(value: unknown): value is GateType {
  return isOneOf(GATE_TYPES, value);
}

function isRouteKind(value: unknown): value is RouteTarget['kind'] {
  return isOneOf(ROUTE_KINDS, value);
}

function isStepKind(value: unknown): value is StepKind {
  return isOneOf(STEP_KINDS, value);
}

function isStepOrigin(value: unknown): value is StepDefinition['origin'] {
  return isOneOf(STEP_ORIGINS, value);
}

const isString: Check = (value) => typeof value === 'string';
const isBoolean: Check = (value) => typeof value === 'boolean';
const isNumber: Check = (value) => typeof value === 'number';

/**
 * Refuses a field the config does not define. One problem is added for the object, never for the
 * field: an unknown field's name is submitted text, so it is not echoed back.
 */
function checkKnownKeys(
  object: Record<string, unknown>,
  known: readonly string[],
  path: string,
  problems: ConfigProblem[],
): void {
  if (Object.keys(object).some((key) => !known.includes(key))) {
    problems.push({ path, reason: 'has a field the config does not define' });
  }
}

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

/** Checks one required top-level field: it must be present and pass `check` at its own name. */
function checkField(
  object: Record<string, unknown>,
  field: string,
  problems: ConfigProblem[],
  check: Checker,
): void {
  if (!(field in object)) {
    problems.push({ path: field, reason: 'is required' });
  } else {
    check(object[field], field, problems);
  }
}

/** A checker for a list: it must be an array, and every item is checked by `checkItem` at its indexed path. */
function listOf(checkItem: Checker): Checker {
  return (value, path, problems) => {
    if (!Array.isArray(value)) {
      problems.push({ path, reason: 'must be an array' });
      return;
    }
    const items: unknown[] = value;
    items.forEach((item, index) => checkItem(item, `${path}[${index}]`, problems));
  };
}

/** A checker for one list item that must be a string. */
const checkStringItem: Checker = (value, path, problems) => {
  if (typeof value !== 'string') {
    problems.push({ path, reason: 'must be a string' });
  }
};

/** A checker for one target tool: one of the known set. */
const checkTarget: Checker = (value, path, problems) => {
  if (!isKnownTarget(value)) {
    problems.push({ path, reason: `must be one of ${KNOWN_TARGETS.join(', ')}` });
  }
};

/** Checks one required field that is a list of strings. */
function checkStringList(object: Record<string, unknown>, key: string, base: string, problems: ConfigProblem[]): void {
  checkNested(object, key, base, problems, listOf(checkStringItem));
}

function checkWorkflowStep(value: unknown, path: string, problems: ConfigProblem[]): void {
  if (!isPlainObject(value)) {
    problems.push({ path, reason: 'must be an object' });
    return;
  }
  checkKnownKeys(value, ['stepId', 'enabled'], path, problems);
  checkRequired(value, 'stepId', path, problems, isString, 'must be a string');
  checkRequired(value, 'enabled', path, problems, isBoolean, 'must be a boolean');
}

/** A gate: its fixed type, an optional numeric threshold and whether it is required. */
function checkGate(value: unknown, path: string, problems: ConfigProblem[]): void {
  if (!isPlainObject(value)) {
    problems.push({ path, reason: 'must be an object' });
    return;
  }
  checkKnownKeys(value, ['id', 'type', 'threshold', 'required'], path, problems);
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
  checkKnownKeys(value, ['kind', 'stepId'], path, problems);
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
  checkKnownKeys(value, ['id', 'afterStepId', 'gate', 'pass', 'fail', 'roundLimit'], path, problems);
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
  checkKnownKeys(
    value,
    ['id', 'name', 'scope', 'iterationSource', 'enabled', 'description', 'steps', 'conditions'],
    path,
    problems,
  );
  checkRequired(value, 'id', path, problems, isString, 'must be a string');
  checkRequired(value, 'name', path, problems, isString, 'must be a string');
  checkRequired(value, 'scope', path, problems, isScope, `must be one of ${SCOPES.join(', ')}`);
  checkRequired(value, 'iterationSource', path, problems, isString, 'must be a string');
  checkRequired(value, 'enabled', path, problems, isBoolean, 'must be a boolean');
  checkOptional(value, 'description', path, problems, isString, 'must be a string');
  checkNested(value, 'steps', path, problems, listOf(checkWorkflowStep));
  checkNested(value, 'conditions', path, problems, listOf(checkCondition));
}

/** A connection on the map: its id and both ends, an optional artifact and an optional gate. */
function checkConnection(value: unknown, path: string, problems: ConfigProblem[]): void {
  if (!isPlainObject(value)) {
    problems.push({ path, reason: 'must be an object' });
    return;
  }
  checkKnownKeys(value, ['id', 'from', 'to', 'artifact', 'gate'], path, problems);
  checkRequired(value, 'id', path, problems, isString, 'must be a string');
  checkRequired(value, 'from', path, problems, isString, 'must be a string');
  checkRequired(value, 'to', path, problems, isString, 'must be a string');
  checkOptional(value, 'artifact', path, problems, isString, 'must be a string');
  if ('gate' in value) {
    checkGate(value['gate'], `${path}.gate`, problems);
  }
}

/** A step written by the user: its kind and origin, whether it is required, its string lists and optional texts. */
function checkCustomStep(value: unknown, path: string, problems: ConfigProblem[]): void {
  if (!isPlainObject(value)) {
    problems.push({ path, reason: 'must be an object' });
    return;
  }
  checkKnownKeys(
    value,
    ['id', 'name', 'summary', 'description', 'kind', 'origin', 'required', 'consumes', 'produces', 'ruleTags', 'body'],
    path,
    problems,
  );
  checkRequired(value, 'id', path, problems, isString, 'must be a string');
  checkRequired(value, 'name', path, problems, isString, 'must be a string');
  checkRequired(value, 'summary', path, problems, isString, 'must be a string');
  checkOptional(value, 'description', path, problems, isString, 'must be a string');
  checkRequired(value, 'kind', path, problems, isStepKind, `must be one of ${STEP_KINDS.join(', ')}`);
  checkRequired(value, 'origin', path, problems, isStepOrigin, `must be one of ${STEP_ORIGINS.join(', ')}`);
  checkRequired(value, 'required', path, problems, isBoolean, 'must be a boolean');
  checkStringList(value, 'consumes', path, problems);
  checkStringList(value, 'produces', path, problems);
  checkStringList(value, 'ruleTags', path, problems);
  checkOptional(value, 'body', path, problems, isString, 'must be a string');
}

/** The stack: a language, and optional framework, platform, build tool and test framework. */
function checkStack(value: unknown, path: string, problems: ConfigProblem[]): void {
  if (!isPlainObject(value)) {
    problems.push({ path, reason: 'must be an object' });
    return;
  }
  checkKnownKeys(value, ['language', 'framework', 'platform', 'buildTool', 'testFramework'], path, problems);
  checkRequired(value, 'language', path, problems, isString, 'must be a string');
  for (const key of ['framework', 'platform', 'buildTool', 'testFramework'] as const) {
    checkOptional(value, key, path, problems, isString, 'must be a string');
  }
}

/** A module in the architecture: its layer is a number, and it lists the modules it depends on. */
function checkModule(value: unknown, path: string, problems: ConfigProblem[]): void {
  if (!isPlainObject(value)) {
    problems.push({ path, reason: 'must be an object' });
    return;
  }
  checkKnownKeys(value, ['name', 'layer', 'responsibility', 'dependsOn'], path, problems);
  checkRequired(value, 'name', path, problems, isString, 'must be a string');
  checkRequired(value, 'layer', path, problems, isNumber, 'must be a number');
  checkRequired(value, 'responsibility', path, problems, isString, 'must be a string');
  checkStringList(value, 'dependsOn', path, problems);
}

/** The architecture: a style, its modules and optional notes. */
function checkArchitecture(value: unknown, path: string, problems: ConfigProblem[]): void {
  if (!isPlainObject(value)) {
    problems.push({ path, reason: 'must be an object' });
    return;
  }
  checkKnownKeys(value, ['style', 'modules', 'notes'], path, problems);
  checkRequired(value, 'style', path, problems, isString, 'must be a string');
  checkNested(value, 'modules', path, problems, listOf(checkModule));
  checkOptional(value, 'notes', path, problems, isString, 'must be a string');
}

/**
 * Collects every problem of an untrusted `ProjectConfig`: the top level, then the workflows,
 * connections, custom steps, stack and architecture. An empty list means the value is valid.
 */
function findProblems(value: unknown): ConfigProblem[] {
  if (!isPlainObject(value)) {
    return [{ path: '$', reason: 'must be a JSON object' }];
  }

  const problems: ConfigProblem[] = [];
  checkKnownKeys(
    value,
    [
      'schemaVersion',
      'name',
      'idea',
      'stack',
      'architecture',
      'codeRules',
      'testRules',
      'customSteps',
      'workflows',
      'connections',
      'targets',
    ],
    '$',
    problems,
  );

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

  checkField(value, 'stack', problems, checkStack);
  checkField(value, 'architecture', problems, checkArchitecture);
  checkField(value, 'codeRules', problems, listOf(checkStringItem));
  checkField(value, 'testRules', problems, listOf(checkStringItem));
  checkField(value, 'customSteps', problems, listOf(checkCustomStep));
  checkField(value, 'connections', problems, listOf(checkConnection));
  checkField(value, 'workflows', problems, listOf(checkWorkflow));
  checkField(value, 'targets', problems, listOf(checkTarget));

  return problems;
}

/**
 * The type guard: true when every field of the value passed its check. The checks above are
 * the only place this claim is made, so every field of an accepted config has been checked.
 */
function isProjectConfig(value: unknown): value is ProjectConfig {
  return findProblems(value).length === 0;
}

/**
 * Checks an untrusted `ProjectConfig` at the boundary (API input, saved JSON). Every problem is
 * collected; a valid value is returned as the typed config, unchanged.
 */
export function parseProjectConfig(value: unknown): ParseConfigResult {
  if (isProjectConfig(value)) {
    return { ok: true, config: value };
  }
  return { ok: false, problems: findProblems(value) };
}
