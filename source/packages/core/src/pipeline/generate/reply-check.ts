// The check of the model's reply against the plan (architecture.md §3 step 6, decision 11; US-005). The reply is a
// map from output path to text, parsed by the API; the reply and its values are unknown at this boundary and are
// narrowed here. The check is pure: it returns findings, never throws, because a bad reply is a user-side problem
// (the caller retries once). Every finding is a blocker and names the path it is about. The findings are sorted by
// path, then by message, so the same reply always gives the same list.

import type { Finding } from '../analyze/index.js';
import type { Plan, PlannedFile } from './plan.js';
import { compareCodePoints, isFileSafe } from './plan.js';

// The plan of a config that has no blocker. A refused plan has no files to check a reply against.
export type PlannedFiles = Extract<Plan, { readonly ok: true }>;

// The reply as the API parses it, once narrowed: a map from output path to the text the model wrote for that path.
export type Reply = Readonly<Record<string, unknown>>;

// A `{{...}}` placeholder left in a text, the same shape the renderer fills (source/templates/README.md).
const PLACEHOLDER = /\{\{[^{}]*\}\}/;

// Names a generated text must not refer to (AC-028), exactly as the story names them. A text holds one of them when
// the name occurs in it as a plain substring with the same case. The match is case-sensitive on purpose: these are
// product and path names, and a lower-case word in ordinary prose (`sddbuilder`) is not a reference to them. The
// trade-off is that a lower-case or re-cased reference is not caught.
const SELF_REFERENCES: readonly string[] = ['SDDBuilder', 'source/apps/web', 'source/apps/api', 'source/packages/core'];

// Returns one blocker per problem of the reply, sorted by path, then by message. A planned path with no reply entry
// is a finding; a reply path that is unsafe or not in the plan is a finding and its text is not looked at; a text
// that is not a string has nothing to check and is a single finding. Every other text gets each applicable check:
// empty, placeholder, each `##` heading its layout requires that no line of it is, and each self-reference name.
// One finding is given per rule and path, and a heading or name finding names its heading or name. A complete reply
// returns no findings. A reply that is not a map has no entries, so every planned path is reported missing.
export function checkReply(plan: PlannedFiles, reply: unknown): readonly Finding[] {
  const map: Reply = isReply(reply) ? reply : {};
  const planned = new Map(plan.files.map((file) => [file.path, file]));
  const findings: Finding[] = [];

  for (const file of plan.files) {
    if (!Object.hasOwn(map, file.path)) {
      findings.push(blocker(file.path, `The planned file "${file.path}" is missing from the reply.`));
    }
  }

  for (const path of Object.keys(map)) {
    findings.push(...replyEntryFindings(planned, path, map[path]));
  }

  return findings.sort(compareFindings);
}

// True for a plain map: a non-null object that is not an array.
function isReply(value: unknown): value is Reply {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The findings of one reply entry: none when the path is planned and its text is usable and complete. The path and
// the non-string case end the check; a string text gets every applicable finding, so a text can report both an empty
// or placeholder problem and its missing headings or names.
function replyEntryFindings(
  planned: ReadonlyMap<string, PlannedFile>,
  path: string,
  text: unknown,
): readonly Finding[] {
  const file = planned.get(path);
  if (!isFileSafe(path)) {
    return [blocker(path, `The reply path "${path}" is not a file-safe relative path.`)];
  }
  if (file === undefined) {
    return [blocker(path, `The reply path "${path}" is not in the plan.`)];
  }
  if (typeof text !== 'string') {
    return [blocker(path, `The reply text for "${path}" is not a string.`)];
  }
  return [
    ...(text.trim() === '' ? [blocker(path, `The reply text for "${path}" is empty.`)] : []),
    ...(PLACEHOLDER.test(text)
      ? [blocker(path, `The reply text for "${path}" still holds a {{...}} placeholder.`)]
      : []),
    ...missingHeadings(file, text),
    ...selfReferences(path, text),
  ];
}

// One finding per `##` heading of the planned file that no line of the text is. A line matches a heading when it is
// exactly the heading after its trailing spaces are removed; leading spaces and other levels do not match.
function missingHeadings(file: PlannedFile, text: string): readonly Finding[] {
  const lines = new Set(text.split(/\r?\n/).map((line) => line.replace(/ +$/, '')));
  return file.headings
    .filter((heading) => !lines.has(heading))
    .map((heading) => blocker(file.path, `The reply text for "${file.path}" has no line "${heading}".`));
}

// One finding per self-reference name the text holds, in the order of SELF_REFERENCES.
function selfReferences(path: string, text: string): readonly Finding[] {
  return SELF_REFERENCES.filter((name) => text.includes(name)).map((name) =>
    blocker(path, `The reply text for "${path}" names "${name}", which a generated project must not refer to.`),
  );
}

// Orders two findings by path, then by message, by code point.
function compareFindings(a: Finding, b: Finding): number {
  return compareCodePoints(a.path, b.path) || compareCodePoints(a.message, b.message);
}

// A blocker about one path.
function blocker(path: string, message: string): Finding {
  return { severity: 'blocker', path, message };
}
