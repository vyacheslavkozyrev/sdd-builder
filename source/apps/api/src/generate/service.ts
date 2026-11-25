// The generation service (F-15 AC-005, AC-008 to AC-010, AC-015, AC-017 to AC-020, AC-022, AC-027). It plans the files,
// makes at most two model calls (the second only after a bad first reply), checks each reply against the plan and packs
// the files into a zip. Every outcome the route maps to a status is a result; only a GenerationError from the generator
// is thrown (the route answers it with 500). The results carry no reply text: a problem is a path and a message.
//
// The model is the smallest shape the wiring can supply: one method that makes one call for one request and returns the
// reply. The wiring passes `{ generate: (request) => callGeneration(client, generatorModel, request) }`; `null` means no
// API key is configured. The service writes no log line: the route writes the one line of each request.

import { pipeline } from '@sddbuilder/core';
import type { GenerationReply } from './anthropic.js';
import { parseReply } from './parse-reply.js';
import { generationRequest, retryRequest, type GeneratedPlan, type GenerationRequest, type ReplyFinding } from './prompt.js';
import type { GenerationTemplates } from './load-templates.js';
import { buildZip } from './zip.js';

export interface GenerationModel {
  generate(request: GenerationRequest): Promise<GenerationReply>;
}

export interface GenerationDeps {
  readonly templates: GenerationTemplates;
  readonly model: GenerationModel | null;
}

export type GenerationResult =
  | { readonly kind: 'zip'; readonly bytes: Uint8Array }
  | { readonly kind: 'refused'; readonly problems: readonly string[] }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'bad-reply'; readonly problems: readonly string[] }
  | { readonly kind: 'provider-error' };

// The path of a finding about the whole reply, not about one file. Parentheses keep it apart from any file path.
const REPLY_PATH = '(reply)';

type Attempt =
  | { readonly kind: 'ok'; readonly files: readonly { readonly path: string; readonly text: string }[] }
  | { readonly kind: 'bad'; readonly findings: readonly ReplyFinding[] }
  | { readonly kind: 'provider-error' };

export async function generateProject(
  config: pipeline.ProjectConfig,
  deps: GenerationDeps,
): Promise<GenerationResult> {
  const planned = pipeline.planGeneration(config, deps.templates);
  if (!planned.ok) return { kind: 'refused', problems: planned.problems.map(problemText) };
  const model = deps.model;
  if (model === null) return { kind: 'unavailable' };

  let attempt = await ask(model, planned, generationRequest(planned));
  if (attempt.kind === 'bad') {
    attempt = await ask(model, planned, retryRequest(planned, attempt.findings));
  }
  switch (attempt.kind) {
    case 'ok':
      return { kind: 'zip', bytes: await buildZip(attempt.files) };
    case 'provider-error':
      return { kind: 'provider-error' };
    case 'bad':
      return { kind: 'bad-reply', problems: attempt.findings.map(problemText) };
  }
}

// One call and its reply. A thrown error from the call is the provider error; the caller decides on a retry. A
// truncated reply, a reply that is not one JSON object and a reply that fails the check are bad replies.
async function ask(model: GenerationModel, plan: GeneratedPlan, request: GenerationRequest): Promise<Attempt> {
  let reply: GenerationReply;
  try {
    reply = await model.generate(request);
  } catch {
    return { kind: 'provider-error' };
  }
  if (reply.stopReason === 'max_tokens') {
    return { kind: 'bad', findings: [{ path: REPLY_PATH, message: 'was cut short at the token limit' }] };
  }
  const values = parseReply(reply.text);
  if (values === null) {
    return { kind: 'bad', findings: [{ path: REPLY_PATH, message: 'is not one JSON object' }] };
  }
  const findings = pipeline.checkReply(plan, values);
  if (findings.length > 0) return { kind: 'bad', findings: ownFindings(plan, findings) };
  return {
    kind: 'ok',
    files: plan.files.map((file) => ({ path: file.path, text: textOf(values, file.path) })),
  };
}

// A finding whose path is not a planned path names a key the model wrote, which is reply text: the check reports such a
// key as it is. It is kept out of the results and the retry prompt, and reported as a finding about the reply instead.
function ownFindings(plan: GeneratedPlan, findings: readonly ReplyFinding[]): ReplyFinding[] {
  const planned = new Set(plan.files.map((file) => file.path));
  return findings.map((finding) =>
    planned.has(finding.path) ? finding : { path: REPLY_PATH, message: finding.message },
  );
}

// The check has passed, so every planned path holds a non-empty string; any other value is a bug in the check.
function textOf(values: ReadonlyMap<string, unknown>, path: string): string {
  const text = values.get(path);
  if (typeof text !== 'string') {
    throw new Error(`the checked reply has no text for ${JSON.stringify(path)}`);
  }
  return text;
}

function problemText(problem: ReplyFinding | pipeline.Finding): string {
  return `${problem.path}: ${problem.message}`;
}
