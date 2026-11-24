import { describe, expect, it } from 'vitest';
import { buildProjectConfig } from '../src/analyze/config.js';
import { defaultPipelineValue, type WizardValues } from '../src/wizard/state.js';

function valuesWith(overrides: Partial<WizardValues>): WizardValues {
  return {
    name: 'Shop',
    idea: '  A shop for books.\n\nSecond line.  ',
    stack: { language: 'TypeScript', framework: 'React', platform: 'Web', buildTool: 'Vite', testFramework: 'Vitest' },
    architecture: 'Layers: web, api, core.',
    rules: [
      { name: 'Code Style', description: 'Use two spaces.' },
      { name: 'Error handling!', description: 'Throw for bugs.' },
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
      { index: 0, id: 'code-style', title: 'Code Style', text: 'Use two spaces.' },
      { index: 1, id: 'error-handling-', title: 'Error handling!', text: 'Throw for bugs.' },
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
