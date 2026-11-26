import { describe, expect, it } from 'vitest';
import { pipeline as core } from '@sddbuilder/core';
import { buildProjectConfig, buildRequestBody } from '../src/analyze/config.js';
import { defaultPipelineValue, type WizardValues } from '../src/wizard/state.js';

// The path of every `index` key in a JSON value, at any level; an empty list when there is none.
function indexKeysIn(value: unknown, path = '$'): string[] {
  if (Array.isArray(value)) return value.flatMap((item: unknown, position) => indexKeysIn(item, `${path}[${position}]`));
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, item]) => [
    ...(key === 'index' ? [`${path}.index`] : []),
    ...indexKeysIn(item, `${path}.${key}`),
  ]);
}

// The default pipeline as the parser holds it, with a pipeline argument and rule tags on the pipeline and on the
// first flow, so that the lists the body carries are not empty.
function filledPipeline(): core.Pipeline {
  const parsed = core.parseProjectConfig({
    schemaVersion: 2,
    rules: [{ id: '513d26bf-922f-546e-9d7f-5db6d267092c', title: 'Code Style', text: 'Use two spaces.' }],
    pipeline: structuredClone(core.defaultPipeline),
  });
  if (!parsed.ok) throw new Error('the default pipeline is refused');
  const base = parsed.config.pipeline;
  const [first, ...rest] = base.flows;
  if (first === undefined) throw new Error('the default pipeline has no flow');
  return {
    ...base,
    arguments: [{ index: 0, id: 'f6e48fc8-29f2-5a26-9b01-9d90e8d52038', required: true, hint: 'The topic.' }],
    ruleTags: [{ index: 0, ruleId: '513d26bf-922f-546e-9d7f-5db6d267092c' }],
    flows: [
      {
        ...first,
        arguments: [{ index: 0, id: '5d0e8b7a-3c1f-5a2b-9d4e-6f7a8b9c0d1e', required: false, hint: 'The depth.' }],
        ruleTags: [{ index: 0, ruleId: '513d26bf-922f-546e-9d7f-5db6d267092c' }],
      },
      ...rest,
    ],
  };
}

function valuesWith(overrides: Partial<WizardValues>): WizardValues {
  return {
    name: 'Shop',
    idea: '  A shop for books.\n\nSecond line.  ',
    stack: { language: 'TypeScript', framework: 'React', platform: 'Web', buildTool: 'Vite', testFramework: 'Vitest' },
    architecture: 'Layers: web, api, core.',
    rules: [
      { id: '513d26bf-922f-546e-9d7f-5db6d267092c', name: 'Code Style', description: 'Use two spaces.' },
      { id: '3a22e42a-b139-5990-b883-10aa38b155e1', name: 'Error handling!', description: 'Throw for bugs.' },
    ],
    pipeline: defaultPipelineValue(),
    ...overrides,
  };
}

describe('F-13 AC-005 analyze request body', () => {
  it('trims the idea as F-09 does and keeps the internal line break', () => {
    const config = buildProjectConfig(valuesWith({}));
    expect(config.idea).toBe('A shop for books.\n\nSecond line.');
  });

  it('gives an empty idea for spaces-only text', () => {
    const config = buildProjectConfig(valuesWith({ idea: '   \n  ' }));
    expect(config.idea).toBe('');
  });

  it('sends the name, the stack and the architecture as typed', () => {
    const config = buildProjectConfig(valuesWith({ name: '  Shop  ' }));
    expect(config.name).toBe('  Shop  ');
    expect(config.architecture).toBe('Layers: web, api, core.');
    expect(config.stack).toEqual({
      language: 'TypeScript',
      framework: 'React',
      platform: 'Web',
      buildTool: 'Vite',
      testFramework: 'Vitest',
    });
  });

  it('maps each rule block to index, id, title and text', () => {
    const config = buildProjectConfig(valuesWith({}));
    expect(config.rules).toEqual([
      { index: 0, id: '513d26bf-922f-546e-9d7f-5db6d267092c', title: 'Code Style', text: 'Use two spaces.' },
      { index: 1, id: '3a22e42a-b139-5990-b883-10aa38b155e1', title: 'Error handling!', text: 'Throw for bugs.' },
    ]);
  });

  it('sends the pipeline as the wizard holds it', () => {
    const pipeline = defaultPipelineValue();
    const config = buildProjectConfig(valuesWith({ pipeline }));
    expect(config.pipeline).toBe(pipeline);
    expect(config.schemaVersion).toBe(2);
  });

  it('gives the same body for the same wizard values', () => {
    const values = valuesWith({});
    const first = JSON.stringify(buildProjectConfig(values));
    const second = JSON.stringify(buildProjectConfig(values));
    expect(second).toBe(first);
  });

  it('sends an empty rule list when the wizard has no rule blocks', () => {
    const config = buildProjectConfig(valuesWith({ rules: [] }));
    expect(config.rules).toEqual([]);
  });
});

describe('F-16 AC-011 analyze request body has no index key', () => {
  it('F-16 AC-011 has no index key at any level for the default pipeline and two rule blocks', () => {
    expect(indexKeysIn(buildRequestBody(valuesWith({})))).toEqual([]);
  });

  it('F-16 AC-011 has no index key at any level for a filled-in state with arguments, flows and rule tags', () => {
    const values = valuesWith({
      rules: [{ id: '513d26bf-922f-546e-9d7f-5db6d267092c', name: 'Code Style', description: 'Use two spaces.' }],
      pipeline: filledPipeline(),
    });
    const body = buildRequestBody(values);
    expect(indexKeysIn(body)).toEqual([]);
    expect(JSON.stringify(body)).toContain('"ruleTags":["513d26bf-922f-546e-9d7f-5db6d267092c"]');
  });

  it('F-16 AC-011 keeps the list order and the other keys of the configuration', () => {
    const body = buildRequestBody(valuesWith({}));
    expect(body).toMatchObject({
      schemaVersion: 2,
      name: 'Shop',
      idea: 'A shop for books.\n\nSecond line.',
      architecture: 'Layers: web, api, core.',
      stack: { language: 'TypeScript', framework: 'React', platform: 'Web', buildTool: 'Vite', testFramework: 'Vitest' },
      rules: [
        { id: '513d26bf-922f-546e-9d7f-5db6d267092c', title: 'Code Style', text: 'Use two spaces.' },
        { id: '3a22e42a-b139-5990-b883-10aa38b155e1', title: 'Error handling!', text: 'Throw for bugs.' },
      ],
    });
  });
});

describe('F-16 AC-012 analyze request body is accepted by the parser', () => {
  it('F-16 AC-012 is accepted by parseProjectConfig for a filled-in state, with the same pipeline and rules back', () => {
    const values = valuesWith({
      rules: [{ id: '513d26bf-922f-546e-9d7f-5db6d267092c', name: 'Code Style', description: 'Use two spaces.' }],
      pipeline: filledPipeline(),
    });
    const parsed = core.parseProjectConfig(buildRequestBody(values));
    if (!parsed.ok) throw new Error(`the body is refused: ${JSON.stringify(parsed.problems)}`);
    expect(parsed.config.pipeline).toEqual(values.pipeline);
    expect(parsed.config.rules).toEqual(buildProjectConfig(values).rules);
  });

  it('F-16 AC-012 is accepted by parseProjectConfig for the default pipeline with no rule blocks', () => {
    const parsed = core.parseProjectConfig(buildRequestBody(valuesWith({ rules: [] })));
    expect(parsed.ok).toBe(true);
  });
});
