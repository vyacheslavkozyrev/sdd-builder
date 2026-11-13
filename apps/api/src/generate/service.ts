import { checkReply, planGeneration, validateConfig } from '@sddbuilder/core';
import type { GenerationPlan, ProjectConfig, TemplateSource } from '@sddbuilder/core';
import type { LogPort } from '../app.js';
import { buildGenerationPrompt } from './prompt.js';
import { parseReply } from './parse-reply.js';
import type { GenerationModel, GenerationReply } from './generation-model.js';

/** One generated file: its path in the project and the text the model wrote for it. */
export interface GeneratedText {
  path: string;
  content: string;
}

/** The outcome of a generation. A refusal lists every structural problem; no model call is made for it. */
export type GenerateResult =
  | { ok: true; files: GeneratedText[] }
  | { ok: false; reason: 'refused'; problems: string[] }
  | { ok: false; reason: 'model' }
  | { ok: false; reason: 'reply'; problems: string[] };

export interface GenerateDeps {
  templates: TemplateSource;
  model: GenerationModel;
  log: LogPort;
}

/** The result of one model call: its reply passed the checks, failed them with findings, or the call itself failed. */
type Attempt =
  | { kind: 'passed'; texts: Readonly<Record<string, string>> }
  | { kind: 'failed'; findings: string[] }
  | { kind: 'model' };

/**
 * Makes one model call and checks its reply. A truncated reply is refused before it is parsed,
 * and a reply that is not a JSON object or whose values do not match the plan is failed with its
 * findings. The reply text is never returned in a failure.
 */
async function attempt(prompt: string, plan: GenerationPlan, { model, log }: Pick<GenerateDeps, 'model' | 'log'>): Promise<Attempt> {
  let raw: GenerationReply;
  try {
    raw = await model.complete(prompt);
  } catch (error) {
    const name = error instanceof Error ? error.name : 'UnknownError';
    log.write(`generation model call failed: ${name}`);
    return { kind: 'model' };
  }

  const parsed = parseReply(raw.text, { truncated: raw.truncated });
  if (!parsed.ok) {
    return { kind: 'failed', findings: parsed.findings };
  }

  const findings = checkReply(plan, parsed.reply);
  if (findings.length > 0) {
    return { kind: 'failed', findings };
  }
  return { kind: 'passed', texts: parsed.reply as Readonly<Record<string, string>> };
}

/**
 * Generates the framework files for a configuration: validates it, plans the files, asks the
 * model for their text, and checks the reply against the plan. A failed reply (a truncated one,
 * one that is not a JSON object, or one that does not match the plan) is retried once, with its
 * findings in the prompt. A second failure is returned with the findings and paths of the last
 * reply only. Files come back in plan order. The log receives only the name of a model error,
 * never content.
 *
 * A throw from planGeneration is a programmer error (a configuration that passed validateConfig
 * and still cannot be planned), so it is not caught here: it propagates to the route, which maps
 * it to a 500 (T015).
 */
export async function generateProject(config: ProjectConfig, { templates, model, log }: GenerateDeps): Promise<GenerateResult> {
  const problems = validateConfig(config);
  if (problems.length > 0) {
    return { ok: false, reason: 'refused', problems };
  }

  const plan = planGeneration(config, templates);
  let outcome = await attempt(buildGenerationPrompt(config, plan), plan, { model, log });
  if (outcome.kind === 'failed') {
    outcome = await attempt(buildGenerationPrompt(config, plan, outcome.findings), plan, { model, log });
  }

  if (outcome.kind === 'model') {
    return { ok: false, reason: 'model' };
  }
  if (outcome.kind === 'failed') {
    return { ok: false, reason: 'reply', problems: outcome.findings };
  }

  // checkReply has passed: every planned path is present and holds text.
  const texts = outcome.texts;
  const files = plan.map((entry): GeneratedText => {
    const content = texts[entry.path];
    if (content === undefined) {
      throw new Error(`checked reply has no text for planned file ${entry.path}`);
    }
    return { path: entry.path, content };
  });
  return { ok: true, files };
}
