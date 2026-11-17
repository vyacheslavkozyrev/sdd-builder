// The check of the model's reply against the plan (architecture.md §3 step 6, decision 11; US-005). The reply is a
// map from output path to text, parsed by the API; the reply and its values are unknown at this boundary and are
// narrowed here. The check is pure: it returns findings, never throws, because a bad reply is a user-side problem
// (the caller retries once). Every finding is a blocker and names the path it is about. Sorting the findings is a
// later step.

import type { Finding } from '../analyze/index.js';
import type { Plan } from './plan.js';
import { isFileSafe } from './plan.js';

// The plan of a config that has no blocker. A refused plan has no files to check a reply against.
export type PlannedFiles = Extract<Plan, { readonly ok: true }>;

// The reply as the API parses it, once narrowed: a map from output path to the text the model wrote for that path.
export type Reply = Readonly<Record<string, unknown>>;

// A `{{...}}` placeholder left in a text, the same shape the renderer fills (source/templates/README.md).
const PLACEHOLDER = /\{\{[^{}]*\}\}/;

// Returns one blocker per problem of the reply, in no particular order. A planned path with no reply entry is a
// finding; a reply path that is unsafe or not in the plan is a finding and its text is not looked at; a text that
// is not a string, is empty or holds a placeholder is a finding. A complete reply returns no findings. A reply that
// is not a map has no entries, so every planned path is reported missing.
export function checkReply(plan: PlannedFiles, reply: unknown): readonly Finding[] {
  const map: Reply = isReply(reply) ? reply : {};
  const planned = new Set(plan.files.map((file) => file.path));
  const findings: Finding[] = [];

  for (const file of plan.files) {
    if (!Object.hasOwn(map, file.path)) {
      findings.push(blocker(file.path, `The planned file "${file.path}" is missing from the reply.`));
    }
  }

  for (const path of Object.keys(map)) {
    const finding = replyEntryFinding(planned, path, map[path]);
    if (finding !== undefined) {
      findings.push(finding);
    }
  }

  return findings;
}

// True for a plain map: a non-null object that is not an array.
function isReply(value: unknown): value is Reply {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The finding of one reply entry, or nothing when the path is planned and its text is usable.
function replyEntryFinding(planned: ReadonlySet<string>, path: string, text: unknown): Finding | undefined {
  if (!isFileSafe(path)) {
    return blocker(path, `The reply path "${path}" is not a file-safe relative path.`);
  }
  if (!planned.has(path)) {
    return blocker(path, `The reply path "${path}" is not in the plan.`);
  }
  if (typeof text !== 'string') {
    return blocker(path, `The reply text for "${path}" is not a string.`);
  }
  if (text.trim() === '') {
    return blocker(path, `The reply text for "${path}" is empty.`);
  }
  if (PLACEHOLDER.test(text)) {
    return blocker(path, `The reply text for "${path}" still holds a {{...}} placeholder.`);
  }
  return undefined;
}

// A blocker about one path.
function blocker(path: string, message: string): Finding {
  return { severity: 'blocker', path, message };
}
