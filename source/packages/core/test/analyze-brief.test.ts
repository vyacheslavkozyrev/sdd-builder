import { describe, expect, it } from 'vitest';
import { briefFindings, type AnalysisFinding, type ModuleSpec, type ProjectConfig } from '../src/index.js';
import { baseConfig } from './fixtures.js';

function module(name: string, layer: number, dependsOn: string[] = []): ModuleSpec {
  return { name, layer, responsibility: `${name} responsibility`, dependsOn };
}

/** A valid brief with one rule in each list and two modules, `ui` (layer 1) over `core` (layer 0). */
function briefWith(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return baseConfig({
    codeRules: ['Use strict types.'],
    testRules: ['Every feature has tests.'],
    architecture: {
      style: 'layered',
      modules: [module('core', 0), module('ui', 1, ['core'])],
    },
    ...overrides,
  });
}

const blocker = (subject: string, message: string): AnalysisFinding => ({ severity: 'blocker', subject, message });
const warning = (subject: string, message: string): AnalysisFinding => ({ severity: 'warning', subject, message });

describe('F-04 AC-007 required brief fields', () => {
  const rows: { name: string; overrides: Partial<ProjectConfig>; expected: AnalysisFinding[] }[] = [
    {
      name: 'an empty name gives a blocker naming the name field',
      overrides: { name: '' },
      expected: [blocker('name', 'name is required')],
    },
    {
      name: 'a name of only spaces gives a blocker',
      overrides: { name: '   ' },
      expected: [blocker('name', 'name is required')],
    },
    {
      name: 'an empty idea gives a blocker naming the idea field',
      overrides: { idea: '' },
      expected: [blocker('idea', 'idea is required')],
    },
    {
      name: 'an idea of only tabs and newlines gives a blocker',
      overrides: { idea: '\t\n ' },
      expected: [blocker('idea', 'idea is required')],
    },
    {
      name: 'an empty stack.language gives a blocker naming stack.language',
      overrides: { stack: { language: '' } },
      expected: [blocker('stack.language', 'stack.language is required')],
    },
    {
      name: 'a stack.language of only spaces gives a blocker',
      overrides: { stack: { language: '  ' } },
      expected: [blocker('stack.language', 'stack.language is required')],
    },
    {
      name: 'a filled name, idea and stack.language give no finding',
      overrides: {},
      expected: [],
    },
    {
      name: 'all three blank fields give one blocker each, in name, idea, stack.language order',
      overrides: { name: ' ', idea: '', stack: { language: '\n' } },
      expected: [
        blocker('name', 'name is required'),
        blocker('idea', 'idea is required'),
        blocker('stack.language', 'stack.language is required'),
      ],
    },
  ];

  it.each(rows)('F-04 AC-007 $name', ({ overrides, expected }) => {
    expect(briefFindings(briefWith(overrides))).toEqual(expected);
  });
});

describe('F-04 AC-008 optional brief warnings', () => {
  const rows: { name: string; overrides: Partial<ProjectConfig>; expected: AnalysisFinding[] }[] = [
    {
      name: 'empty codeRules gives a warning, not a blocker',
      overrides: { codeRules: [] },
      expected: [warning('codeRules', 'codeRules is empty')],
    },
    {
      name: 'codeRules holding only whitespace entries counts as empty',
      overrides: { codeRules: ['   ', ''] },
      expected: [warning('codeRules', 'codeRules is empty')],
    },
    {
      name: 'empty testRules gives a warning, not a blocker',
      overrides: { testRules: [] },
      expected: [warning('testRules', 'testRules is empty')],
    },
    {
      name: 'testRules holding only whitespace entries counts as empty',
      overrides: { testRules: [' \t '] },
      expected: [warning('testRules', 'testRules is empty')],
    },
    {
      name: 'no architecture modules gives a warning, not a blocker',
      overrides: { architecture: { style: 'layered', modules: [] } },
      expected: [warning('architecture.modules', 'architecture.modules is empty')],
    },
    {
      name: 'a rule list with one filled entry among blank ones gives no warning',
      overrides: { codeRules: ['  ', 'Name things well.'] },
      expected: [],
    },
    {
      name: 'empty codeRules, testRules and modules give one warning each, in that order',
      overrides: { codeRules: [], testRules: [], architecture: { style: 'layered', modules: [] } },
      expected: [
        warning('codeRules', 'codeRules is empty'),
        warning('testRules', 'testRules is empty'),
        warning('architecture.modules', 'architecture.modules is empty'),
      ],
    },
  ];

  it.each(rows)('F-04 AC-008 $name', ({ overrides, expected }) => {
    expect(briefFindings(briefWith(overrides))).toEqual(expected);
  });
});

describe('F-04 AC-009 module layer dependencies', () => {
  const layered = (dependent: ModuleSpec, dependency: ModuleSpec): ProjectConfig =>
    briefWith({ architecture: { style: 'layered', modules: [dependent, dependency] } });

  const rows: { name: string; config: ProjectConfig; expected: AnalysisFinding[] }[] = [
    {
      name: 'a module on a lower layer depending on a higher one gives a blocker naming both',
      config: layered(module('core', 0, ['ui']), module('ui', 1)),
      expected: [
        blocker('module "core"', 'module "core" (layer 0) depends on "ui" (layer 1), a higher layer'),
      ],
    },
    {
      name: 'a module depending on a higher layer by more than one step gives a blocker',
      config: layered(module('domain', 0, ['adapter']), module('adapter', 3)),
      expected: [
        blocker('module "domain"', 'module "domain" (layer 0) depends on "adapter" (layer 3), a higher layer'),
      ],
    },
    {
      name: 'a dependency on a module in the same layer gives no finding',
      config: layered(module('api', 2, ['web']), module('web', 2)),
      expected: [],
    },
    {
      name: 'a dependency on a lower layer gives no finding',
      config: layered(module('ui', 1, ['core']), module('core', 0)),
      expected: [],
    },
    {
      name: 'a module with no dependencies gives no finding',
      config: layered(module('core', 0), module('ui', 1)),
      expected: [],
    },
  ];

  it.each(rows)('F-04 AC-009 $name', ({ config, expected }) => {
    expect(briefFindings(config)).toEqual(expected);
  });

  it('F-04 AC-009 gives one blocker per higher-layer dependency, in module and dependsOn order', () => {
    const config = briefWith({
      architecture: {
        style: 'layered',
        modules: [
          module('core', 0, ['ui', 'api']),
          module('api', 1),
          module('ui', 2),
        ],
      },
    });
    expect(briefFindings(config)).toEqual([
      blocker('module "core"', 'module "core" (layer 0) depends on "ui" (layer 2), a higher layer'),
      blocker('module "core"', 'module "core" (layer 0) depends on "api" (layer 1), a higher layer'),
    ]);
  });
});

describe('F-04 AC-010 unknown dependsOn entries', () => {
  it('F-04 AC-010 a dependsOn that names no module gives a blocker naming the unknown id', () => {
    const config = briefWith({ architecture: { style: 'layered', modules: [module('ui', 1, ['missing'])] } });
    expect(briefFindings(config)).toEqual([
      blocker('module "ui"', 'module "ui" depends on unknown module "missing"'),
    ]);
  });

  it('F-04 AC-010 a dependsOn that names the module itself is known and gives no unknown-module finding', () => {
    const config = briefWith({ architecture: { style: 'layered', modules: [module('core', 0, ['core'])] } });
    expect(briefFindings(config)).toEqual([]);
  });

  it('F-04 AC-010 gives one finding per unknown entry, in module and dependsOn order', () => {
    const config = briefWith({
      architecture: {
        style: 'layered',
        modules: [module('ui', 1, ['gone', 'core']), module('core', 0, ['lost'])],
      },
    });
    expect(briefFindings(config)).toEqual([
      blocker('module "ui"', 'module "ui" depends on unknown module "gone"'),
      blocker('module "core"', 'module "core" depends on unknown module "lost"'),
    ]);
  });

  it('F-04 AC-010 gives the same findings on every call for the same configuration', () => {
    const config = briefWith({ architecture: { style: 'layered', modules: [module('ui', 1, ['gone'])] } });
    const first = briefFindings(config);
    expect(briefFindings(config)).toEqual(first);
    expect(first).toHaveLength(1);
  });
});
