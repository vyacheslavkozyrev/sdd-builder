import type { ProjectConfig, TargetTool } from './model.js';

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

/** True for a plain object: not null, not an array. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKnownTarget(value: unknown): value is TargetTool {
  return typeof value === 'string' && (KNOWN_TARGETS as readonly string[]).includes(value);
}

/**
 * Checks the top level of an untrusted `ProjectConfig`. Only the shape of the
 * top-level fields is checked here; the workflow, connection and custom step
 * contents are checked by the full parser. Every problem is collected.
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

  for (const field of ['customSteps', 'workflows', 'connections'] as const) {
    if (!(field in value)) {
      problems.push({ path: field, reason: 'is required' });
    } else if (!Array.isArray(value[field])) {
      problems.push({ path: field, reason: 'must be an array' });
    }
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
  // INTERIM (F-07 T002): only the top level is checked above. The nested contents
  // (stack, architecture, workflows, connections, custom steps) are NOT checked yet,
  // so this cast is unsafe for callers. F-07 T003 completes the nested checks and
  // removes the cast. Until then this module is not exported from index.ts and
  // must not be used by any caller.
  return { ok: true, config: value as unknown as ProjectConfig };
}
