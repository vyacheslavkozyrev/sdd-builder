import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { generateProject } from '../src/generate/service.js';
import { buildGenerationPrompt } from '../src/generate/prompt.js';
import type { GenerationModel, GenerationReply } from '../src/generate/generation-model.js';
import type { LogPort } from '../src/log.js';
import { loadTemplates } from '../src/templates.js';
import { pipelineConfig } from './pipeline-config.js';

/** The repository's templates/ directory, found from this file's location; the plan is built from its real layouts. */
const REPO_TEMPLATES = fileURLToPath(new URL('../../../templates', import.meta.url));
const templates = loadTemplates(REPO_TEMPLATES);

/** A marker in every reply the model writes; it must never reach a failed result or a log line. */
const SECRET_TEXT = 'SECRET-TEXT-PIPELINE-SERVICE';

/** A model fake: one step per call, each a fixed reply or a call that rejects. Records every prompt; rejects a call past its steps. */
type Step = GenerationReply | (() => Promise<GenerationReply>);

function scriptedModel(steps: readonly Step[]): GenerationModel & { prompts: string[] } {
  const model = {
    prompts: [] as string[],
    complete(prompt: string): Promise<GenerationReply> {
      model.prompts.push(prompt);
      const step = steps[model.prompts.length - 1];
      if (step === undefined) {
        return Promise.reject(new Error('unexpected extra model call'));
      }
      return typeof step === 'function' ? step() : Promise.resolve(step);
    },
  };
  return model;
}

/** A log fake that keeps every line it is given. */
function fakeLog(): LogPort & { lines: string[] } {
  const lines: string[] = [];
  return { lines, write: (line: string) => lines.push(line) };
}

/** A reply that is not an error: the text as the reply carries it, not cut short. */
function reply(text: string): GenerationReply {
  return { text, truncated: false };
}

/** The text the fake model writes for a planned file: its path, then its planned layout, so the headings check passes. */
function textFor(path: string, layout: string): string {
  return `${SECRET_TEXT} ${path}.\n\n${layout}`;
}

/** A reply that maps every planned path to its text, as a JSON object in plan order. */
function fullReply(plan: readonly pipeline.PipelinePlanEntry[]): Record<string, string> {
  return Object.fromEntries(plan.map((entry) => [entry.path, textFor(entry.path, entry.layout)]));
}

/** A reply object with every path of the plan except the given ones. */
function replyWithout(plan: readonly pipeline.PipelinePlanEntry[], omitted: readonly string[]): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fullReply(plan)).filter(([path]) => !omitted.includes(path)),
  );
}

function planOf(config: pipeline.ProjectConfig): pipeline.PipelinePlanEntry[] {
  return pipeline.planGeneration(config, templates);
}

/** The first Start-to-End flow of the pipeline (enabled in the default config), and its first agent block. */
function firstFlow(config: pipeline.ProjectConfig): pipeline.FlowBlock {
  const flow = config.pipeline.blocks.find((block): block is pipeline.FlowBlock => block.kind === 'flow');
  if (flow === undefined) {
    throw new Error('the default pipeline must hold a flow');
  }
  return flow;
}

function firstAgent(config: pipeline.ProjectConfig): pipeline.AgentBlock {
  const agent = firstFlow(config).blocks.find((block): block is pipeline.AgentBlock => block.kind === 'agent');
  if (agent === undefined) {
    throw new Error('the first default flow must hold an agent block');
  }
  return agent;
}

function firstCondition(config: pipeline.ProjectConfig) {
  const condition = config.pipeline.blocks.find((block) => block.kind === 'condition');
  if (condition?.kind !== 'condition') {
    throw new Error('the default pipeline must hold a condition');
  }
  return condition;
}

describe('F-07 pipeline generation service: refusals', () => {
  const refusals: Array<[string, (config: pipeline.ProjectConfig) => void, string]> = [
    ['a rule tag that names no rule', (config) => {
      firstFlow(config).ruleTags = ['no-such-rule'];
    }, '"no-such-rule" names no rule'],
    ['a Condition whose fail route names no block', (config) => {
      firstCondition(config).failRoute = { kind: 'back', blockId: 'no-such-block' };
    }, 'back route to "no-such-block" is not a flow of the pipeline'],
    ['a block with no description', (config) => {
      firstAgent(config).description = '';
    }, 'has no description; its stub text would be empty'],
  ];

  for (const [label, mutate, message] of refusals) {
    it(`F-07 AC-006 refuses ${label} with path and message, and makes no model call`, async () => {
      const config = pipelineConfig();
      mutate(config);
      const expected = pipeline.configProblems(config).map((problem) => `${problem.path}: ${problem.message}`);
      expect(expected).toContainEqual(expect.stringContaining(message));

      const model = scriptedModel([reply('{}')]);
      const log = fakeLog();
      const result = await generateProject(config, { templates, model, log });

      expect(result).toEqual({ ok: false, reason: 'refused', problems: expected });
      expect(model.prompts).toHaveLength(0);
      expect(log.lines).toEqual([]);
    });
  }
});

describe('F-07 pipeline generation service: one call and the reply', () => {
  it('F-07 AC-008 makes exactly one model call whose input holds every planned path', async () => {
    const config = pipelineConfig();
    const plan = planOf(config);
    const model = scriptedModel([reply(JSON.stringify(fullReply(plan)))]);

    const result = await generateProject(config, { templates, model, log: fakeLog() });

    expect(result.ok).toBe(true);
    expect(model.prompts).toHaveLength(1);
    for (const entry of plan) {
      expect(model.prompts[0]).toContain(entry.path);
    }
  });

  it('F-07 AC-009 returns the files in plan order with the text of a valid reply', async () => {
    const config = pipelineConfig();
    const plan = planOf(config);
    const model = scriptedModel([reply(JSON.stringify(fullReply(plan)))]);

    const result = await generateProject(config, { templates, model, log: fakeLog() });

    expect(result).toEqual({
      ok: true,
      files: plan.map((entry) => ({ path: entry.path, content: textFor(entry.path, entry.layout) })),
    });
  });

  it('F-07 AC-009 returns plan order even when the reply lists its keys in reverse order', async () => {
    const config = pipelineConfig();
    const plan = planOf(config);
    const reversed = Object.fromEntries(Object.entries(fullReply(plan)).reverse());
    const model = scriptedModel([reply(JSON.stringify(reversed))]);

    const result = await generateProject(config, { templates, model, log: fakeLog() });

    expect(result.ok && result.files.map((file) => file.path)).toEqual(plan.map((entry) => entry.path));
  });

  it('F-07 AC-009 generates the same file list twice from the same config and reply', async () => {
    const config = pipelineConfig();
    const plan = planOf(config);
    const text = JSON.stringify(fullReply(plan));

    const first = await generateProject(config, { templates, model: scriptedModel([reply(text)]), log: fakeLog() });
    const second = await generateProject(config, { templates, model: scriptedModel([reply(text)]), log: fakeLog() });

    expect(second).toEqual(first);
  });
});

describe('F-07 pipeline generation service: retry', () => {
  it('F-07 AC-010 retries once when the first reply is not JSON, with the first findings, and a valid retry gives ok', async () => {
    const config = pipelineConfig();
    const plan = planOf(config);
    const model = scriptedModel([reply('not json at all'), reply(JSON.stringify(fullReply(plan)))]);

    const result = await generateProject(config, { templates, model, log: fakeLog() });

    expect(model.prompts).toHaveLength(2);
    expect(model.prompts[1]).toBe(buildGenerationPrompt(config, plan, ['reply is not JSON']));
    expect(result.ok).toBe(true);
  });

  it('F-07 AC-010 retries once when the first reply is cut off by the length limit, and a valid retry gives ok', async () => {
    const config = pipelineConfig();
    const plan = planOf(config);
    const text = JSON.stringify(fullReply(plan));
    const model = scriptedModel([{ text, truncated: true }, reply(text)]);

    const result = await generateProject(config, { templates, model, log: fakeLog() });

    expect(model.prompts).toHaveLength(2);
    expect(model.prompts[1]).toBe(buildGenerationPrompt(config, plan, ['reply was cut off by the length limit']));
    expect(result.ok).toBe(true);
  });

  it('F-07 AC-010 retries once when the first reply fails checkReply, and the retry prompt names the finding', async () => {
    const config = pipelineConfig();
    const plan = planOf(config);
    const missing = plan[0]?.path ?? '';
    const model = scriptedModel([reply(JSON.stringify(replyWithout(plan, [missing]))), reply(JSON.stringify(fullReply(plan)))]);

    const result = await generateProject(config, { templates, model, log: fakeLog() });

    expect(model.prompts).toHaveLength(2);
    expect(model.prompts[1]).toContain(`planned file "${missing}" is missing from the reply`);
    expect(result.ok).toBe(true);
  });

  it('F-07 AC-010 puts every finding of the first reply in the retry prompt, with no cap', async () => {
    const config = pipelineConfig();
    const plan = planOf(config);
    expect(plan.length).toBeGreaterThan(5);
    const findings = pipeline.checkReply(plan, {});
    expect(findings).toHaveLength(plan.length);

    const model = scriptedModel([reply('{}'), reply(JSON.stringify(fullReply(plan)))]);
    await generateProject(config, { templates, model, log: fakeLog() });

    expect(model.prompts[1]).toBe(buildGenerationPrompt(config, plan, findings));
    for (const finding of findings) {
      expect(model.prompts[1]).toContain(`- ${finding}`);
    }
  });
});

describe('F-07 pipeline generation service: failures', () => {
  it('F-07 AC-011 returns reply findings of the last reply only, with no file text, when both replies fail', async () => {
    const config = pipelineConfig();
    const plan = planOf(config);
    const firstMissing = plan[0]?.path ?? '';
    const secondMissing = plan[1]?.path ?? '';
    const model = scriptedModel([
      reply(JSON.stringify(replyWithout(plan, [firstMissing]))),
      reply(JSON.stringify(replyWithout(plan, [secondMissing]))),
    ]);

    const result = await generateProject(config, { templates, model, log: fakeLog() });

    expect(model.prompts).toHaveLength(2);
    expect(result).toEqual({
      ok: false,
      reason: 'reply',
      problems: [`planned file "${secondMissing}" is missing from the reply`],
    });
    expect(JSON.stringify(result)).not.toContain(SECRET_TEXT);
  });

  it('F-07 AC-011 returns the not-JSON finding when the retry reply is not JSON, and no file text', async () => {
    const config = pipelineConfig();
    const plan = planOf(config);
    const model = scriptedModel([reply(JSON.stringify(fullReply(plan)).slice(0, -1)), reply(`${SECRET_TEXT} not json`)]);

    const result = await generateProject(config, { templates, model, log: fakeLog() });

    expect(result).toEqual({ ok: false, reason: 'reply', problems: ['reply is not JSON'] });
    expect(JSON.stringify(result)).not.toContain(SECRET_TEXT);
  });

  it('F-07 AC-012 gives model after exactly one call on a provider error, with no retry, and logs the error name only', async () => {
    const config = pipelineConfig();
    const failure = new Error(`${SECRET_TEXT} provider detail`);
    failure.name = 'TimeoutError';
    const model = scriptedModel([() => Promise.reject(failure)]);
    const log = fakeLog();

    const result = await generateProject(config, { templates, model, log });

    expect(result).toEqual({ ok: false, reason: 'model' });
    expect(model.prompts).toHaveLength(1);
    expect(log.lines).toEqual(['event=generation_model_failed route=/generate error=TimeoutError']);
    expect(log.lines.join('\n')).not.toContain(SECRET_TEXT);
  });

  it('F-07 AC-012 logs UnknownError when the provider throws something that is not an Error', async () => {
    const config = pipelineConfig();
    const model = scriptedModel([() => Promise.reject(SECRET_TEXT)]);
    const log = fakeLog();

    const result = await generateProject(config, { templates, model, log });

    expect(result).toEqual({ ok: false, reason: 'model' });
    expect(log.lines).toEqual(['event=generation_model_failed route=/generate error=UnknownError']);
  });

  it('F-07 AC-012 gives model after the retry call when the provider fails on the second call, and makes no third call', async () => {
    const config = pipelineConfig();
    const plan = planOf(config);
    const failure = new Error('provider down');
    failure.name = 'ProviderError';
    const model = scriptedModel([reply('not json'), () => Promise.reject(failure)]);
    const log = fakeLog();

    const result = await generateProject(config, { templates, model, log });

    expect(result).toEqual({ ok: false, reason: 'model' });
    expect(model.prompts).toHaveLength(2);
    expect(model.prompts[1]).toBe(buildGenerationPrompt(config, plan, ['reply is not JSON']));
    expect(log.lines).toEqual(['event=generation_model_failed route=/generate error=ProviderError']);
  });
});
