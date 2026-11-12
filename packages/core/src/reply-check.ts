import type { GenerationPlan } from './plan.js';
import { pathProblem } from './file-list.js';

/** Template markers that must not survive into a generated file. */
const LEFTOVER_MARKERS = ['{{#step:', '{{', '}}'] as const;

/** True for a plain object whose values are not checked yet: not null, not an array. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks a reply, the files a model returned, against the generation plan.
 * Returns findings and never throws, whatever the reply is. Findings are not
 * sorted here. A path refused for safety is reported and left out of the
 * check; the caller must not write any reply file while findings remain.
 */
export function checkReply(plan: GenerationPlan, reply: unknown): string[] {
  if (!isPlainObject(reply)) {
    return ['reply must be an object mapping file paths to text'];
  }

  const findings: string[] = [];
  const present = new Set<string>();
  const files = new Map<string, string>();
  for (const [path, text] of Object.entries(reply)) {
    const problem = pathProblem(path);
    if (problem) {
      findings.push(problem);
      continue;
    }
    present.add(path);
    if (typeof text !== 'string') {
      findings.push(`file "${path}" must be text`);
      continue;
    }
    files.set(path, text);
  }

  const planned = new Set(plan.map((entry) => entry.path));
  for (const entry of plan) {
    if (!present.has(entry.path)) {
      findings.push(`planned file "${entry.path}" is missing from the reply`);
    }
  }
  for (const path of present) {
    if (!planned.has(path)) {
      findings.push(`file "${path}" is not in the plan`);
    }
  }

  for (const [path, text] of files) {
    const markers = LEFTOVER_MARKERS.filter((marker) => text.includes(marker));
    if (markers.length > 0) {
      findings.push(`file "${path}" still contains ${markers.map((marker) => `"${marker}"`).join(', ')}`);
    }
  }

  return findings;
}
