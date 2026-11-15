import { pipeline, type GeneratedFile, type ListableTemplateSource } from '@sddbuilder/core';
import { errorNameOf, formatLogLine, type LogPort } from '../log.js';
import { buildGenerationPrompt } from './prompt.js';
import { parseReply } from './parse-reply.js';
import type { GenerationModel, GenerationReply } from './generation-model.js';

/** The outcome of a generation. A refusal lists every configuration problem; no model call is made for it. */
export type GenerateResult =
  | { ok: true; files: GeneratedFile[] }
  | { ok: false; reason: 'refused'; problems: string[] }
  | { ok: false; reason: 'model' }
  | { ok: false; reason: 'reply'; problems: string[] };

export interface GenerateDeps {
  templates: ListableTemplateSource;
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
 * findings. A provider error is logged by its name only and is not retried by the caller.
 * The reply text is never returned in a failure.
 */
async function attempt(
  prompt: string,
  plan: readonly pipeline.PipelinePlanEntry[],
  { model, log }: Pick<GenerateDeps, 'model' | 'log'>,
): Promise<Attempt> {
  let raw: GenerationReply;
  try {
    raw = await model.complete(prompt);
  } catch (error) {
    log.write(formatLogLine({ event: 'generation_model_failed', route: '/generate', error: errorNameOf(error) }));
    return { kind: 'model' };
  }

  const parsed = parseReply(raw.text, { truncated: raw.truncated });
  if (!parsed.ok) {
    return { kind: 'failed', findings: parsed.findings };
  }

  const findings = pipeline.checkReply(plan, parsed.reply);
  if (findings.length > 0) {
    return { kind: 'failed', findings };
  }
  return { kind: 'passed', texts: parsed.reply as Readonly<Record<string, string>> };
}

/**
 * Generates the framework files for a pipeline configuration: checks it, plans the files, asks the
 * model for their text, and checks the reply against the plan. A failed reply (a truncated one,
 * one that is not a JSON object, or one that does not match the plan) is retried once, and the
 * retry prompt carries every finding of the first reply. A second failure is returned with the
 * findings of the last reply only. A provider error is not retried. Files come back in plan order.
 * The log receives only the name of a model error, never content.
 *
 * A throw from planGeneration is a programmer error (a configuration that passed configProblems
 * and still cannot be planned, or a missing layout), so it is not caught here: it propagates to the
 * route, which maps it to a 500.
 */
export async function generateProject(
  config: pipeline.ProjectConfig,
  { templates, model, log }: GenerateDeps,
): Promise<GenerateResult> {
  const problems = pipeline.configProblems(config);
  if (problems.length > 0) {
    return { ok: false, reason: 'refused', problems: problems.map((problem) => `${problem.path}: ${problem.message}`) };
  }

  const plan = pipeline.planGeneration(config, templates);
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
  const files = plan.map((entry): GeneratedFile => {
    const content = texts[entry.path];
    if (content === undefined) {
      throw new Error(`checked reply has no text for planned file ${entry.path}`);
    }
    return { path: entry.path, content };
  });
  return { ok: true, files };
}
