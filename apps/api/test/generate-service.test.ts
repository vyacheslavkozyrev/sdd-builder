import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONNECTIONS,
  DEFAULT_WORKFLOWS,
  planGeneration,
  type ProjectConfig,
  type TemplateSource,
} from '@sddbuilder/core';
import { generateProject } from '../src/generate/service.js';
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

describe('F-07 AC-008 a reply that does not match the plan is refused after one call', () => {
  it('F-07 AC-008 refuses a reply that leaves out a planned file, with no retry', async () => {
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
    expect(model.calls).toBe(1);
  });

  it('F-07 AC-008 refuses a reply cut off by the length limit without parsing it, after one call', async () => {
    const config = sampleConfig();
    const model = fakeModel({ text: replyFor(config), truncated: true });

    const result = await generateProject(config, { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result).toEqual({ ok: false, reason: 'reply', problems: ['reply was cut off by the length limit'] });
    expect(model.calls).toBe(1);
  });

  it('F-07 AC-008 refuses a reply that is not JSON, after one call', async () => {
    const model = fakeModel({ text: 'Here are the files: ...', truncated: false });

    const result = await generateProject(sampleConfig(), { templates: sampleTemplates(), model, log: fakeLog() });

    expect(result).toEqual({ ok: false, reason: 'reply', problems: ['reply is not JSON'] });
    expect(model.calls).toBe(1);
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
