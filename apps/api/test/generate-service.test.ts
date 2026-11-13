import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONNECTIONS,
  DEFAULT_WORKFLOWS,
  planGeneration,
  type ProjectConfig,
  type TemplateSource,
} from '@sddbuilder/core';
import { generateProject } from '../src/generate/service.js';
import { buildGenerationPrompt } from '../src/generate/prompt.js';
import type { GenerationModel, GenerationReply } from '../src/generate/generation-model.js';

const IDEA = 'A tool that turns a product idea into a spec-driven project framework.';

/** A valid configuration: the default workflows and connections, so the required-workflow rules hold. */
function sampleConfig(): ProjectConfig {
  return {
    schemaVersion: 1,
    name: 'Sample Project',
    idea: IDEA,
    stack: { language: 'TypeScript', framework: 'React', testFramework: 'Vitest' },
    architecture: {
      style: 'layered',
      modules: [{ name: 'core', layer: 0, responsibility: 'Domain rules', dependsOn: [] }],
      notes: 'Core has no I/O.',
    },
    codeRules: ['Validate input at the boundary.'],
    testRules: ['Use Vitest for unit tests.'],
    customSteps: [],
    workflows: structuredClone([...DEFAULT_WORKFLOWS]),
    connections: structuredClone([...DEFAULT_CONNECTIONS]),
    targets: ['claude'],
  };
}

/** A small fixed templates source: every path gets the same plain text, with no placeholders or headings. */
function sampleTemplates(): TemplateSource {
  return { get: () => 'Template text for the test.' };
}

/** A model fake that counts its calls and returns the same fixed reply each time. */
function fakeModel(reply: GenerationReply): GenerationModel & { calls: number } {
  const model = {
    calls: 0,
    async complete(): Promise<GenerationReply> {
      model.calls += 1;
      return reply;
    },
  };
  return model;
}

/** One model step: a reply, or a call that fails (by rejecting or by throwing before it returns). */
type Step = GenerationReply | (() => Promise<GenerationReply>);

/** A model fake that gives the next step for each call, records every prompt, and rejects any call past its steps. */
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
function fakeLog(): { lines: string[]; write(line: string): void } {
  const lines: string[] = [];
  return { lines, write: (line: string) => lines.push(line) };
}

/** The text the fake model writes for a planned file: its path, then its planned layout (so the headings check passes). */
function textFor(path: string, layout: string): string {
  return `Text of ${path}.\n\n${layout}`;
}

/** A reply with text for every planned file, keyed in the reverse of plan order. */
function replyFor(config: ProjectConfig): string {
  const reply: Record<string, string> = {};
  for (const entry of [...planGeneration(config, sampleTemplates())].reverse()) {
    reply[entry.path] = textFor(entry.path, entry.layout);
  }
  return JSON.stringify(reply);
}

describe('F-07 AC-008 generation returns the planned files in plan order with the reply text', () => {
  it('F-07 AC-008 returns each planned path in plan order, with the text the model wrote for it', async () => {
    const config = sampleConfig();
    const plan = planGeneration(config, sampleTemplates());
    const model = fakeModel({ text: replyFor(config), truncated: false });

    const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

    expect(plan.length).toBeGreaterThan(1);
    expect(result).toEqual({
      ok: true,
      files: plan.map((entry) => ({ path: entry.path, content: textFor(entry.path, entry.layout) })),
    });
    expect(model.calls).toBe(1);
  });
});

describe('F-07 AC-010 generation refuses an invalid configuration without calling the model', () => {
  it('F-07 AC-010 refuses with every structural problem and makes no model call', async () => {
    const step = (id: string) => ({
      id,
      name: id,
      summary: '',
      kind: 'command' as const,
      origin: 'custom' as const,
      required: false,
      consumes: [],
      produces: [],
      ruleTags: [],
      body: '',
    });
    const config = { ...sampleConfig(), customSteps: [step('define-feature'), step('refine')] };
    const model = fakeModel({ text: replyFor(sampleConfig()), truncated: false });

    const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result).toEqual({
      ok: false,
      reason: 'refused',
      problems: [
        'duplicate id "define-feature": defined as catalog step and custom step',
        'duplicate id "refine": defined as catalog step and custom step',
      ],
    });
    expect(model.calls).toBe(0);
  });
});

describe('F-07 AC-017 a model error gives a model failure after exactly one call', () => {
  it.each([
    ['the call rejects', (): Promise<GenerationReply> => Promise.reject(new TypeError('provider unreachable'))],
    [
      'the call throws before it returns',
      (): Promise<GenerationReply> => {
        throw new Error('provider unreachable');
      },
    ],
  ])('F-07 AC-017 gives reason model when %s, after one call and no retry', async (_label, failing) => {
    let calls = 0;
    const model: GenerationModel = {
      complete() {
        calls += 1;
        return failing();
      },
    };

    const result = await generateProject(sampleConfig(), { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result).toEqual({ ok: false, reason: 'model' });
    expect(calls).toBe(1);
  });

  it('F-07 AC-017 logs the error name only, never the message or any content', async () => {
    const model: GenerationModel = {
      complete: () => Promise.reject(new TypeError('secret brief text')),
    };
    const log = fakeLog();

    await generateProject(sampleConfig(), { templates: sampleTemplates(), model, log });

    expect(log.lines).toEqual(['generation model call failed: TypeError']);
    expect(log.lines.join('\n')).not.toContain('secret brief text');
  });
});

describe('F-07 AC-008 a reply that does not match the plan is refused after two calls', () => {
  it('F-07 AC-008 refuses a reply that leaves out a planned file, after the one retry', async () => {
    const config = sampleConfig();
    const plan = planGeneration(config, sampleTemplates());
    const reply: Record<string, string> = {};
    for (const entry of plan.slice(1)) {
      reply[entry.path] = textFor(entry.path, entry.layout);
    }
    const model = fakeModel({ text: JSON.stringify(reply), truncated: false });

    const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result).toMatchObject({ ok: false, reason: 'reply' });
    expect(result).toEqual({
      ok: false,
      reason: 'reply',
      problems: [`planned file "${plan[0]?.path}" is missing from the reply`],
    });
    expect(model.calls).toBe(2);
  });

  it('F-07 AC-008 refuses a reply cut off by the length limit without parsing it, after two calls', async () => {
    const config = sampleConfig();
    const model = fakeModel({ text: replyFor(config), truncated: true });

    const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result).toEqual({ ok: false, reason: 'reply', problems: ['reply was cut off by the length limit'] });
    expect(model.calls).toBe(2);
  });

  it('F-07 AC-008 refuses a reply that is not JSON, after two calls', async () => {
    const model = fakeModel({ text: 'Here are the files: ...', truncated: false });

    const result = await generateProject(sampleConfig(), { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result).toEqual({ ok: false, reason: 'reply', problems: ['reply is not JSON'] });
    expect(model.calls).toBe(2);
  });
});

describe('F-07 AC-008 a planning failure propagates to the caller and is not turned into a result', () => {
  it('F-07 AC-008 rejects when the templates cannot be read, and makes no model call', async () => {
    const templates: TemplateSource = {
      get: () => {
        throw new Error('template store unavailable');
      },
    };
    const model = fakeModel({ text: replyFor(sampleConfig()), truncated: false });

    await expect(generateProject(sampleConfig(), { templates, model, log: fakeLog() })).rejects.toThrow(
      'template store unavailable',
    );
    expect(model.calls).toBe(0);
  });
});

/** The reply object with the planned text for every file, in plan order. */
function passingObject(config: ProjectConfig): Record<string, string> {
  const reply: Record<string, string> = {};
  for (const entry of planGeneration(config, sampleTemplates())) {
    reply[entry.path] = textFor(entry.path, entry.layout);
  }
  return reply;
}

/** The planned paths of a configuration, in plan order. */
function plannedPaths(config: ProjectConfig): string[] {
  return planGeneration(config, sampleTemplates()).map((entry) => entry.path);
}

/** A reply as the model sends it: the JSON text of the value, not truncated. */
function jsonReply(value: unknown): GenerationReply {
  return { text: JSON.stringify(value), truncated: false };
}

/** A copy of a reply object without one path. */
function without(reply: Record<string, string>, path: string): Record<string, string> {
  const copy = { ...reply };
  delete copy[path];
  return copy;
}

/** Replies that fail the checks, each with the findings the service reports for it when it is the last reply. */
const FAILING_REPLIES: ReadonlyArray<[label: string, reply: (config: ProjectConfig) => GenerationReply, findings: string[]]> = [
  ['is not JSON', () => ({ text: 'Here are the files: ...', truncated: false }), ['reply is not JSON']],
  [
    'is cut off by the length limit',
    (config) => ({ text: JSON.stringify(passingObject(config)), truncated: true }),
    ['reply was cut off by the length limit'],
  ],
  ['is a JSON array', () => jsonReply(['a', 'b']), ['reply must be a JSON object mapping file paths to text']],
  ['is a JSON string', () => jsonReply('just text'), ['reply must be a JSON object mapping file paths to text']],
  ['is JSON null', () => jsonReply(null), ['reply must be a JSON object mapping file paths to text']],
  [
    'holds a value that is not text',
    (config) => jsonReply({ ...passingObject(config), [plannedPaths(config)[0] ?? '']: 42 }),
    [`file "${plannedPaths(sampleConfig())[0]}" must be text`],
  ],
  [
    'leaves out a planned file',
    (config) => jsonReply(without(passingObject(config), plannedPaths(config)[0] ?? '')),
    [`planned file "${plannedPaths(sampleConfig())[0]}" is missing from the reply`],
  ],
];

describe('F-07 AC-012 the retry prompt holds each finding of the first reply', () => {
  it('F-07 AC-012 sends the first prompt, then a retry prompt built from the findings of the first reply', async () => {
    const config = sampleConfig();
    const plan = planGeneration(config, sampleTemplates());
    const [first, second] = plannedPaths(config);
    const badFirst = { ...without(passingObject(config), first ?? ''), [second ?? '']: 42 };
    const findings = [`planned file "${first}" is missing from the reply`, `file "${second}" must be text`];
    const model = scriptedModel([jsonReply(badFirst), jsonReply(passingObject(config))]);

    const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result.ok).toBe(true);
    expect(model.prompts).toHaveLength(2);
    expect(model.prompts[0]).toBe(buildGenerationPrompt(config, plan));
    expect(model.prompts[1]).toBe(buildGenerationPrompt(config, plan, findings));
    for (const finding of findings) {
      expect(model.prompts[1]).toContain(`- ${finding}`);
    }
  });
});

describe('F-07 AC-013 a second failure is refused with the last reply findings after two calls', () => {
  it.each(FAILING_REPLIES)('F-07 AC-013 refuses when the retry reply %s, with its findings and two calls', async (_label, reply, findings) => {
    const config = sampleConfig();
    const model = scriptedModel([reply(config), reply(config)]);

    const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result).toEqual({ ok: false, reason: 'reply', problems: findings });
    expect(model.prompts).toHaveLength(2);
  });

  it('F-07 AC-013 reports only the findings of the second reply, not those of the first', async () => {
    const config = sampleConfig();
    const [first] = plannedPaths(config);
    const model = scriptedModel([
      jsonReply(without(passingObject(config), first ?? '')),
      { text: 'Still not JSON', truncated: false },
    ]);

    const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result).toEqual({ ok: false, reason: 'reply', problems: ['reply is not JSON'] });
    expect(model.prompts).toHaveLength(2);
  });

  it.each([
    ['the call rejects', (): Promise<GenerationReply> => Promise.reject(new TypeError('provider unreachable'))],
    [
      'the call throws before it returns',
      (): Promise<GenerationReply> => {
        throw new Error('provider unreachable');
      },
    ],
  ])('F-07 AC-013 gives reason model when %s on the retry, after two calls and no third', async (_label, failing) => {
    const config = sampleConfig();
    const model = scriptedModel([{ text: 'Not JSON', truncated: false }, failing]);

    const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result).toEqual({ ok: false, reason: 'model' });
    expect(model.prompts).toHaveLength(2);
  });
});

describe('F-07 AC-014 a first failure followed by a passing reply gives the files after two calls', () => {
  it.each(FAILING_REPLIES)('F-07 AC-014 accepts the retry when the first reply %s', async (_label, reply) => {
    const config = sampleConfig();
    const model = scriptedModel([reply(config), jsonReply(passingObject(config))]);

    const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result).toEqual({
      ok: true,
      files: planGeneration(config, sampleTemplates()).map((entry) => ({
        path: entry.path,
        content: textFor(entry.path, entry.layout),
      })),
    });
    expect(model.prompts).toHaveLength(2);
  });
});

/** The failing replies that are JSON but not an object, or an object with a value that is not text (AC-015). */
const NON_OBJECT_OR_NON_TEXT_REPLIES = FAILING_REPLIES.filter(
  ([label]) => label === 'is a JSON array' || label === 'is a JSON string' || label === 'is JSON null' || label === 'holds a value that is not text',
);

describe('F-07 AC-015 a non-object or non-text value counts as a failed reply', () => {
  it.each(NON_OBJECT_OR_NON_TEXT_REPLIES)(
    'F-07 AC-015 treats a first reply that %s as failed, then accepts the retry',
    async (_label, reply) => {
      const config = sampleConfig();
      const model = scriptedModel([reply(config), jsonReply(passingObject(config))]);

      const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

      expect(result.ok).toBe(true);
      expect(model.prompts).toHaveLength(2);
    },
  );

  it('F-07 AC-015 checks a non-text value through checkReply: it is refused on both replies with that finding', async () => {
    const config = sampleConfig();
    const [first] = plannedPaths(config);
    const bad = jsonReply({ ...passingObject(config), [first ?? '']: 42 });
    const model = scriptedModel([bad, bad]);

    const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result).toEqual({ ok: false, reason: 'reply', problems: [`file "${first}" must be text`] });
    expect(model.prompts).toHaveLength(2);
  });
});

describe('F-07 AC-016 a truncated reply is failed without its text being parsed or packaged', () => {
  it('F-07 AC-016 retries past a truncated reply and packages only the text of the retry', async () => {
    const config = sampleConfig();
    const truncatedText = Object.fromEntries(plannedPaths(config).map((path) => [path, 'TRUNCATED TEXT']));
    const model = scriptedModel([
      { text: JSON.stringify(truncatedText), truncated: true },
      jsonReply(passingObject(config)),
    ]);

    const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

    expect(JSON.stringify(result)).not.toContain('TRUNCATED TEXT');
    expect(result.ok).toBe(true);
    expect(model.prompts[1]).toContain('- reply was cut off by the length limit');
    expect(model.prompts).toHaveLength(2);
  });
});

describe('F-07 AC-019 a failure body carries findings and paths only, never file text', () => {
  it('F-07 AC-019 has no text of either reply in the problems when both replies fail', async () => {
    const config = sampleConfig();
    const [first, second] = plannedPaths(config);
    const firstReply = jsonReply({ [first ?? '']: 'FIRST SECRET FILE TEXT' });
    const secondReply = jsonReply({ ...without(passingObject(config), first ?? ''), [second ?? '']: 'SECOND SECRET FILE TEXT' });
    const model = scriptedModel([firstReply, secondReply]);

    const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('SECRET FILE TEXT');
    expect(result).toMatchObject({
      reason: 'reply',
      problems: expect.arrayContaining([`planned file "${first}" is missing from the reply`]),
    });
    expect(model.prompts).toHaveLength(2);
  });
});
