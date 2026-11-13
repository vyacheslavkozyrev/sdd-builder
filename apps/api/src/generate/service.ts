import { checkReply, planGeneration, validateConfig } from '@sddbuilder/core';
import type { ProjectConfig, TemplateSource } from '@sddbuilder/core';
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

/**
 * Generates the framework files for a configuration: validates it, plans the files, asks the
 * model once for their text, and checks the reply against the plan. Files come back in plan
 * order. The log receives only the name of a model error, never content.
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
  const prompt = buildGenerationPrompt(config, plan);

  let raw: GenerationReply;
  try {
    raw = await model.complete(prompt);
  } catch (error) {
    const name = error instanceof Error ? error.name : 'UnknownError';
    log.write(`generation model call failed: ${name}`);
    return { ok: false, reason: 'model' };
  }

  const parsed = parseReply(raw.text, { truncated: raw.truncated });
  if (!parsed.ok) {
    return { ok: false, reason: 'reply', problems: parsed.findings };
  }

  const findings = checkReply(plan, parsed.reply);
  if (findings.length > 0) {
    return { ok: false, reason: 'reply', problems: findings };
  }

  // checkReply has passed: every planned path is present and holds text.
  const texts = parsed.reply as Readonly<Record<string, string>>;
  const files = plan.map((entry): GeneratedText => {
    const content = texts[entry.path];
    if (content === undefined) {
      throw new Error(`checked reply has no text for planned file ${entry.path}`);
    }
    return { path: entry.path, content };
  });
  return { ok: true, files };
}
