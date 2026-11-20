import { compareCodePoints } from './file-list.js';
import { headingsOf } from './headings.js';
import { isSafePath } from './paths.js';
import type { GeneratedPlan, PlannedFile } from './plan.js';

// The check of the model's reply against the plan (F-04, AC-025 to AC-033). The reply is already parsed into a map from
// path to value; a value is not trusted to be a string. The check returns findings and never throws for a bad reply:
// a finding names the path it is about. A reply path that is unsafe is never used to write a file, and a reply path
// that is not in the plan has its text ignored. The findings are sorted by path, then by message (AC-033). The check
// changes neither the plan nor the reply.

export interface ReplyFinding {
  readonly path: string;
  readonly message: string;
}

const PLACEHOLDER = /\{\{[\s\S]*?\}\}/;

// Names of SDDBuilder's own files; a generated project must not refer to them (AC-031). A path name must end where the
// path does: `source/apps/website` is not a reference to `source/apps/web`.
const OWN_REFERENCES: readonly { readonly term: string; readonly pattern: RegExp }[] = [
  { term: 'SDDBuilder', pattern: /SDDBuilder/ },
  { term: 'source/apps/web', pattern: /source\/apps\/web(?![\w-])/ },
  { term: 'source/apps/api', pattern: /source\/apps\/api(?![\w-])/ },
  { term: 'source/packages/core', pattern: /source\/packages\/core(?![\w-])/ },
];

export function checkReply(plan: GeneratedPlan, reply: ReadonlyMap<string, unknown>): ReplyFinding[] {
  const findings: ReplyFinding[] = [];
  const planned = new Set(plan.files.map((file) => file.path));
  for (const file of plan.files) {
    if (!reply.has(file.path)) {
      findings.push({ path: file.path, message: 'is missing from the reply' });
    } else {
      findings.push(...textFindings(file, reply.get(file.path)));
    }
  }
  for (const path of reply.keys()) {
    if (!isSafePath(path)) {
      findings.push({ path, message: 'is not a safe path' });
    } else if (!planned.has(path)) {
      findings.push({ path, message: 'is not in the plan' });
    }
  }
  return findings.sort(
    (a, b) => compareCodePoints(a.path, b.path) || compareCodePoints(a.message, b.message),
  );
}

// The findings of one planned file's value: a value that is not a string, an empty text, or else a placeholder left in
// it, a Markdown heading of the layout that the text lacks, or a reference to SDDBuilder's own files.
function textFindings(file: PlannedFile, text: unknown): ReplyFinding[] {
  const path = file.path;
  if (typeof text !== 'string') return [{ path, message: 'is not a string' }];
  if (text.trim() === '') return [{ path, message: 'has an empty text' }];
  const findings: ReplyFinding[] = [];
  if (PLACEHOLDER.test(text)) findings.push({ path, message: 'holds a {{...}} placeholder' });
  if (path.endsWith('.md')) findings.push(...headingFindings(file, text));
  for (const { term, pattern } of OWN_REFERENCES) {
    if (pattern.test(text)) findings.push({ path, message: `refers to SDDBuilder's own files ("${term}")` });
  }
  return findings;
}

// Each `##` heading of the layout must be a whole line of the text (AC-030); a `###` line does not count.
function headingFindings(file: PlannedFile, text: string): ReplyFinding[] {
  const lines = text.split(/\r?\n/).map((line) => line.trimEnd());
  return headingsOf(file.layout)
    .map((heading) => heading.trimEnd())
    .filter((heading) => !lines.includes(heading))
    .map((heading) => ({ path: file.path, message: `is missing the heading "${heading}"` }));
}
