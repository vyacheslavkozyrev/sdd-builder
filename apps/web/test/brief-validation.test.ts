import { describe, expect, it } from 'vitest';
import { parseProjectConfig } from '@sddbuilder/core';
import { emptyBrief } from '../src/brief/state.js';
import type { BriefState } from '../src/brief/state.js';
import { toProjectConfig } from '../src/brief/to-config.js';
import { validateBrief } from '../src/brief/validate.js';
import { ideaCounter } from '../src/brief/counter.js';

/** The brief as the wireframe 02-brief.svg shows it: the module table, depends-on and both rule lists. */
function wireframeBrief(): BriefState {
  return {
    name: 'Hourly Tracker',
    idea: 'Hourly Tracker helps a household see when electricity is cheap.',
    stack: {
      language: 'TypeScript',
      framework: 'Node.js + Fastify',
      testFramework: 'Vitest',
      buildTool: 'npm workspaces',
    },
    architecture: {
      style: 'Layered; dependencies point one way (lower layer never imports higher)',
      modules: [
        { name: 'core', layer: '0', responsibility: 'Domain types and generator', dependsOn: '' },
        { name: 'api', layer: '1', responsibility: 'HTTP, LLM review, limits', dependsOn: 'core' },
        { name: 'web', layer: '1', responsibility: 'Visual builder', dependsOn: 'core' },
      ],
    },
    codeRules: [
      'Strict types; no any at boundaries',
      'Core has no file or network I/O',
      'Errors are never swallowed',
    ],
    testRules: [
      'Every criterion has a named test',
      'No real network or LLM in tests',
      'Output is byte-identical per input',
    ],
    privacyAccepted: true,
  };
}

/** A valid brief with one module row whose layer is the given text. */
function briefWithLayer(layer: string): BriefState {
  const brief = wireframeBrief();
  brief.architecture.modules = [
    { name: 'core', layer: '0', responsibility: 'Domain types', dependsOn: '' },
    { name: 'api', layer, responsibility: 'HTTP', dependsOn: '' },
  ];
  return brief;
}

describe('F-05 AC-001 idea is required', () => {
  it.each([
    ['an empty idea', ''],
    ['a single space', ' '],
    ['tabs and newlines only', '\t\n  \n'],
  ])('F-05 AC-001 gives a problem at idea for %s', (_label, idea) => {
    const brief = { ...wireframeBrief(), idea };
    expect(validateBrief(brief)).toEqual([{ path: 'idea', reason: 'is required' }]);
  });

  it('F-05 AC-001 accepts an idea with one letter', () => {
    expect(validateBrief({ ...wireframeBrief(), idea: 'A' })).toEqual([]);
  });

  it('F-05 AC-001 reports a whitespace-only idea once, as blank, even when it is over the cap', () => {
    const brief = { ...wireframeBrief(), idea: ' '.repeat(8001) };
    expect(validateBrief(brief)).toEqual([{ path: 'idea', reason: 'is required' }]);
  });
});

describe('F-05 AC-002 idea length limit', () => {
  it('F-05 AC-002 accepts an idea of exactly 8,000 characters', () => {
    expect(validateBrief({ ...wireframeBrief(), idea: 'x'.repeat(8000) })).toEqual([]);
  });

  it('F-05 AC-002 gives a problem at idea for 8,001 characters', () => {
    const problems = validateBrief({ ...wireframeBrief(), idea: 'x'.repeat(8001) });
    expect(problems).toEqual([{ path: 'idea', reason: 'must be at most 8,000 characters' }]);
  });

  it('F-05 AC-002 refuses a raw idea of 8,001 characters whose trimmed text fits in 8,000', () => {
    const trailing = { ...wireframeBrief(), idea: `${'x'.repeat(8000)} ` };
    expect(validateBrief(trailing)).toEqual([
      { path: 'idea', reason: 'must be at most 8,000 characters' },
    ]);
    const leading = { ...wireframeBrief(), idea: ` ${'x'.repeat(8000)}` };
    expect(validateBrief(leading)).toEqual([
      { path: 'idea', reason: 'must be at most 8,000 characters' },
    ]);
  });

  it('F-05 AC-002 does not echo the idea text in the problem', () => {
    const problems = validateBrief({ ...wireframeBrief(), idea: `SENTINEL${'x'.repeat(8000)}` });
    expect(JSON.stringify(problems)).not.toContain('SENTINEL');
  });
});

describe('F-05 AC-003 idea counter', () => {
  it.each([
    ['an empty text', '', '0 / 8,000'],
    ['312 characters', 'x'.repeat(312), '312 / 8,000'],
    ['exactly 8,000 characters', 'x'.repeat(8000), '8,000 / 8,000'],
    ['8,001 characters', 'x'.repeat(8001), '8,001 / 8,000'],
    ['spaces at both ends, counted', '  a  ', '5 / 8,000'],
    ['an emoji, counted as two JavaScript characters', '\u{1F600}', '2 / 8,000'],
  ])('F-05 AC-003 reads the counter for %s', (_label, text, expected) => {
    expect(ideaCounter(text)).toBe(expected);
  });
});

describe('F-05 AC-004 project name is required', () => {
  it.each([
    ['an empty name', ''],
    ['a whitespace-only name', '   '],
  ])('F-05 AC-004 gives a problem at name for %s', (_label, name) => {
    expect(validateBrief({ ...wireframeBrief(), name })).toEqual([
      { path: 'name', reason: 'is required' },
    ]);
  });
});

describe('F-05 AC-005 stack language is required', () => {
  it.each([
    ['an empty language', ''],
    ['a whitespace-only language', '  '],
  ])('F-05 AC-005 gives a problem at stack.language for %s', (_label, language) => {
    const brief = wireframeBrief();
    brief.stack.language = language;
    expect(validateBrief(brief)).toEqual([{ path: 'stack.language', reason: 'is required' }]);
  });
});

describe('F-05 AC-008 architecture style is required', () => {
  it.each([
    ['an empty style', ''],
    ['a whitespace-only style', ' \t '],
  ])('F-05 AC-008 gives a problem at architecture.style for %s', (_label, style) => {
    const brief = wireframeBrief();
    brief.architecture.style = style;
    expect(validateBrief(brief)).toEqual([{ path: 'architecture.style', reason: 'is required' }]);
  });
});

describe('F-05 AC-010 module layer is a whole number of 0 or more', () => {
  it.each([
    ['-1', 'a negative number'],
    ['1.5', 'a fraction'],
    ['', 'a blank text'],
    ['abc', 'a word'],
    ['1e2', 'an exponent'],
  ])('F-05 AC-010 gives a problem at the layer path for %s (%s)', (layer) => {
    expect(validateBrief(briefWithLayer(layer))).toEqual([
      {
        path: 'architecture.modules[1].layer',
        reason: 'module 2 layer must be a whole number of 0 or more',
      },
    ]);
  });

  it.each([
    ['3', 'a whole number'],
    ['0', 'zero'],
    [' 2 ', 'a whole number with spaces'],
  ])('F-05 AC-010 accepts the layer %s (%s)', (layer) => {
    expect(validateBrief(briefWithLayer(layer))).toEqual([]);
  });

  it('F-05 AC-010 reports the position of the row, not the value typed', () => {
    const brief = wireframeBrief();
    brief.architecture.modules[2] = {
      name: 'store',
      layer: '-7',
      responsibility: 'Storage',
      dependsOn: '',
    };
    const problems = validateBrief(brief);
    expect(problems).toEqual([
      {
        path: 'architecture.modules[2].layer',
        reason: 'module 3 layer must be a whole number of 0 or more',
      },
    ]);
    expect(JSON.stringify(problems)).not.toContain('-7');
  });

  it('F-05 AC-010 reports every bad layer by position, in list order', () => {
    const brief = wireframeBrief();
    brief.architecture.modules = [
      { name: 'core', layer: 'x', responsibility: 'Domain types', dependsOn: '' },
      { name: 'api', layer: '1', responsibility: 'HTTP', dependsOn: '' },
      { name: 'web', layer: '1.5', responsibility: 'Visual builder', dependsOn: '' },
    ];
    expect(validateBrief(brief).map((problem) => problem.path)).toEqual([
      'architecture.modules[0].layer',
      'architecture.modules[2].layer',
    ]);
  });
});

describe('F-05 AC-001 to AC-010 field problems together', () => {
  it('F-05 AC-001 AC-004 AC-005 AC-008 reports every failing field in form order', () => {
    const problems = validateBrief({ ...emptyBrief(), idea: '' });
    expect(problems.map((problem) => problem.path)).toEqual([
      'name',
      'idea',
      'stack.language',
      'architecture.style',
    ]);
  });

  it('F-05 AC-010 reports a bad layer after the field problems, in form order', () => {
    const brief = { ...briefWithLayer('-1'), name: '' };
    expect(validateBrief(brief).map((problem) => problem.path)).toEqual([
      'name',
      'architecture.modules[1].layer',
    ]);
  });
});

describe('F-05 AC-019 valid brief builds an accepted configuration', () => {
  it('F-05 AC-019 gives no problems for the wireframe brief', () => {
    expect(validateBrief(wireframeBrief())).toEqual([]);
  });

  it('F-05 AC-019 gives a configuration that parseProjectConfig accepts', () => {
    const built = toProjectConfig(wireframeBrief());
    if (!built.ok) {
      throw new Error(`expected a configuration, got bad layers at ${built.badLayers.join(', ')}`);
    }
    const result = parseProjectConfig(built.config);
    expect(result.ok).toBe(true);
  });
});
