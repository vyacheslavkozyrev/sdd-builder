import { isSafePath } from './paths.js';
import type { GeneratedPlan } from './plan.js';

// The check of the model's reply against the plan (F-04, AC-025 to AC-032). The reply is already parsed into a map from
// path to value; a value is not trusted to be a string. The check returns findings and never throws for a bad reply:
// a finding names the path it is about. A reply path that is unsafe is never used to write a file, and a reply path
// that is not in the plan has its text ignored. The check changes neither the plan nor the reply.

export interface ReplyFinding {
  readonly path: string;
  readonly message: string;
}

const PLACEHOLDER = /\{\{[\s\S]*?\}\}/;

export function checkReply(plan: GeneratedPlan, reply: ReadonlyMap<string, unknown>): ReplyFinding[] {
  const findings: ReplyFinding[] = [];
  const planned = new Set(plan.files.map((file) => file.path));
  for (const file of plan.files) {
    if (!reply.has(file.path)) {
      findings.push({ path: file.path, message: 'is missing from the reply' });
    } else {
      findings.push(...textFindings(file.path, reply.get(file.path)));
    }
  }
  for (const path of reply.keys()) {
    if (!isSafePath(path)) {
      findings.push({ path, message: 'is not a safe path' });
    } else if (!planned.has(path)) {
      findings.push({ path, message: 'is not in the plan' });
    }
  }
  return findings;
}

// The findings of one planned file's value: a value that is not a string, an empty text, or a placeholder left in it.
function textFindings(path: string, text: unknown): ReplyFinding[] {
  if (typeof text !== 'string') return [{ path, message: 'is not a string' }];
  if (text.trim() === '') return [{ path, message: 'has an empty text' }];
  if (PLACEHOLDER.test(text)) return [{ path, message: 'holds a {{...}} placeholder' }];
  return [];
}
