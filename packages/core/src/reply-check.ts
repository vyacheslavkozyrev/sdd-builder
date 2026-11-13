import type { GenerationPlan } from './plan.js';
import { pathProblem } from './file-list.js';

/** Template markers that must not survive into a generated file. */
const LEFTOVER_MARKERS = ['{{#step:', '{{', '}}'] as const;

/** Words that name SDDBuilder's own paths; a generated project must not mention them. */
const SDDBUILDER_WORDS = ['apps/web', 'apps/api', 'packages/core', 'SDDBuilder'] as const;

/** One finding, kept with the file it is about so that findings can be sorted. */
interface Finding {
  /** The file path the finding is about, as the reply or the plan names it. */
  readonly path: string;
  readonly message: string;
}

/** The longest reply key a finding quotes in full; a longer one is shortened, so no file text is echoed (F-07 AC-019). */
const MAX_SHOWN_PATH = 120;

/** A reply key as a finding shows it: the key itself when short, otherwise its first characters and an ellipsis. */
function shownPath(path: string): string {
  return path.length > MAX_SHOWN_PATH ? `${path.slice(0, MAX_SHOWN_PATH)}...` : path;
}

/** True for a plain object whose values are not checked yet: not null, not an array. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The `##` section headings of a Markdown layout, trimmed. `###` and deeper are not sections. */
function sectionHeadings(layout: string): string[] {
  return layout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('## '));
}

/** Code-unit order, so the same findings sort the same way on every machine. */
function compareText(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

/**
 * Checks a reply, the files a model returned, against the generation plan.
 * Returns findings and never throws, whatever the reply is. Findings are sorted
 * by file path, then by message. A path refused for safety is reported and left
 * out of the check; the caller must not write any reply file while findings remain.
 */
export function checkReply(plan: GenerationPlan, reply: unknown): string[] {
  if (!isPlainObject(reply)) {
    return ['reply must be an object mapping file paths to text'];
  }

  const findings: Finding[] = [];
  const present = new Set<string>();
  const files = new Map<string, string>();
  for (const [path, text] of Object.entries(reply)) {
    const problem = pathProblem(path);
    if (problem) {
      findings.push({ path, message: problem.split(path).join(shownPath(path)) });
      continue;
    }
    present.add(path);
    if (typeof text !== 'string') {
      findings.push({ path, message: `file "${shownPath(path)}" must be text` });
      continue;
    }
    files.set(path, text);
  }

  const planned = new Set(plan.map((entry) => entry.path));
  for (const entry of plan) {
    if (!present.has(entry.path)) {
      findings.push({ path: entry.path, message: `planned file "${entry.path}" is missing from the reply` });
    }
  }
  for (const path of present) {
    if (!planned.has(path)) {
      findings.push({ path, message: `file "${shownPath(path)}" is not in the plan` });
    }
  }

  for (const [path, text] of files) {
    const markers = LEFTOVER_MARKERS.filter((marker) => text.includes(marker));
    if (markers.length > 0) {
      findings.push({
        path,
        message: `file "${shownPath(path)}" still contains ${markers.map((marker) => `"${marker}"`).join(', ')}`,
      });
    }
  }

  for (const entry of plan) {
    const text = files.get(entry.path);
    if (text === undefined || !entry.path.endsWith('.md')) {
      continue;
    }
    const lines = new Set(text.split('\n').map((line) => line.trim()));
    for (const heading of sectionHeadings(entry.layout)) {
      if (!lines.has(heading)) {
        findings.push({ path: entry.path, message: `file "${entry.path}" is missing the required heading "${heading}"` });
      }
    }
  }

  for (const [path, text] of files) {
    for (const word of SDDBUILDER_WORDS) {
      if (text.includes(word)) {
        findings.push({ path, message: `file "${shownPath(path)}" mentions "${word}"` });
      }
    }
  }

  findings.sort((a, b) => compareText(a.path, b.path) || compareText(a.message, b.message));
  return findings.map((finding) => finding.message);
}
