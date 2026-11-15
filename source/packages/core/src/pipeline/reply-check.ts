// F-03 AC-016, AC-017, AC-018, AC-019: checkReply compares a model's reply with the pipeline generation plan. It reports a
// planned file that is missing or has no text, a path that is not in the plan, an unsafe path (absolute, containing `..`
// or a backslash), and text that still holds a template marker or an enabled-step marker. Pure: the reply is untyped and
// is narrowed here, and a reply that is not an object gives a finding, never a throw.
import type { PipelinePlanEntry } from './plan.js';

/** Markers that must not survive into a generated file: template placeholders and enabled-step markers. */
const LEFTOVER_MARKERS = ['{{', '}}', '#enabled:', '/enabled:'] as const;

/** True for a plain object: not null, not an array. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Why a reply path is unsafe, or undefined for a relative, forward-slash path with no `..`. */
function unsafeReason(path: string): string | undefined {
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
    return 'it must be relative';
  }
  if (path.includes('\\')) {
    return 'it must use forward slashes';
  }
  if (path.includes('..')) {
    return 'it must not contain ".."';
  }
  return undefined;
}

/**
 * Checks a reply, the files a model returned, against the pipeline generation plan. Findings come in plan order for the
 * planned files (missing, no text, markers), then in reply order for the paths that are unsafe or not in the plan. A
 * reply that maps every planned path to text, and no other path, gives no findings. Never throws, whatever the reply is.
 */
export function checkReply(plan: readonly PipelinePlanEntry[], reply: unknown): string[] {
  if (!isPlainObject(reply)) {
    return ['reply must be an object mapping file paths to text'];
  }

  const findings: string[] = [];
  const planned = new Set(plan.map((entry) => entry.path));
  for (const entry of plan) {
    if (!Object.hasOwn(reply, entry.path)) {
      findings.push(`planned file "${entry.path}" is missing from the reply`);
      continue;
    }
    const text = reply[entry.path];
    if (typeof text !== 'string') {
      findings.push(`file "${entry.path}" in the reply has no text`);
      continue;
    }
    const markers = LEFTOVER_MARKERS.filter((marker) => text.includes(marker));
    if (markers.length > 0) {
      findings.push(`file "${entry.path}" still contains ${markers.map((marker) => `"${marker}"`).join(', ')}`);
    }
  }

  for (const path of Object.keys(reply)) {
    const reason = unsafeReason(path);
    if (reason !== undefined) {
      findings.push(`file path "${path}" is unsafe: ${reason}`);
    } else if (!planned.has(path)) {
      findings.push(`file "${path}" in the reply is not in the plan`);
    }
  }
  return findings;
}
