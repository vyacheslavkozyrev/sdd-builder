import { describe, expect, it } from 'vitest';
import { DEFAULT_CONNECTIONS, DEFAULT_WORKFLOWS, parseProjectConfig } from '@sddbuilder/core';
import type { ProjectConfig } from '@sddbuilder/core';
import { emptyBrief } from '../src/brief/state.js';
import type { BriefState } from '../src/brief/state.js';
import { parseLayer, toProjectConfig } from '../src/brief/to-config.js';

/** The brief as the wireframe 02-brief.svg shows it, with blank depends-on and no rules. */
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
      style: 'Layered; dependencies point one way',
      modules: [
        { name: 'core', layer: '0', responsibility: 'Domain types and generator', dependsOn: '' },
        { name: 'api', layer: '1', responsibility: 'HTTP, LLM review, limits', dependsOn: '' },
        { name: 'web', layer: '1', responsibility: 'Visual builder', dependsOn: '' },
      ],
    },
    codeRules: [],
    testRules: [],
    privacyAccepted: true,
  };
}

/** Returns the configuration, failing the test when the build reports bad layers. */
function configOf(brief: BriefState): ProjectConfig {
  const built = toProjectConfig(brief);
  if (!built.ok) {
    throw new Error(`expected a configuration, got bad layers at ${built.badLayers.join(', ')}`);
  }
  return built.config;
}

describe('F-05 AC-018 configuration body', () => {
  it('F-05 AC-018 builds the wireframe brief into the expected configuration', () => {
    expect(configOf(wireframeBrief())).toEqual({
      schemaVersion: 1,
      name: 'Hourly Tracker',
      idea: 'Hourly Tracker helps a household see when electricity is cheap.',
      stack: {
        language: 'TypeScript',
        framework: 'Node.js + Fastify',
        testFramework: 'Vitest',
        buildTool: 'npm workspaces',
      },
      architecture: {
        style: 'Layered; dependencies point one way',
        modules: [
          { name: 'core', layer: 0, responsibility: 'Domain types and generator', dependsOn: [] },
          { name: 'api', layer: 1, responsibility: 'HTTP, LLM review, limits', dependsOn: [] },
          { name: 'web', layer: 1, responsibility: 'Visual builder', dependsOn: [] },
        ],
      },
      codeRules: [],
      testRules: [],
      customSteps: [],
      workflows: DEFAULT_WORKFLOWS,
      connections: DEFAULT_CONNECTIONS,
      targets: ['claude'],
    });
  });

  it('F-05 AC-018 copies the core workflows and connections rather than sharing them', () => {
    const config = configOf(wireframeBrief());

    expect(config.workflows).toEqual(DEFAULT_WORKFLOWS);
    expect(config.connections).toEqual(DEFAULT_CONNECTIONS);
    expect(config.workflows).not.toBe(DEFAULT_WORKFLOWS);
    expect(config.connections).not.toBe(DEFAULT_CONNECTIONS);
  });

  it('F-05 AC-018 builds a body that the core model accepts (checked with parseProjectConfig)', () => {
    const result = parseProjectConfig(configOf(wireframeBrief()));

    expect(result.ok).toBe(true);
  });

  it('F-05 AC-018 builds an empty brief into a configuration with the fixed fields', () => {
    const config = configOf(emptyBrief());

    expect(config.schemaVersion).toBe(1);
    expect(config.customSteps).toEqual([]);
    expect(config.targets).toEqual(['claude']);
    expect(config.architecture.modules).toEqual([]);
  });

  it('F-05 AC-018 gives each brief its own state, so one submission cannot leak into the next', () => {
    const first = emptyBrief();
    first.stack.language = 'TypeScript';
    first.architecture.modules.push({ name: 'core', layer: '0', responsibility: '', dependsOn: '' });

    expect(emptyBrief()).toEqual({
      name: '',
      idea: '',
      stack: { language: '', framework: '', testFramework: '', buildTool: '' },
      architecture: { style: '', modules: [] },
      codeRules: [],
      testRules: [],
      privacyAccepted: false,
    });
  });

  it('F-05 AC-018 leaves the core default constants unchanged when a built configuration is mutated', () => {
    const workflowsBefore = structuredClone(DEFAULT_WORKFLOWS);
    const connectionsBefore = structuredClone(DEFAULT_CONNECTIONS);
    const config = configOf(wireframeBrief());

    const [firstWorkflow] = config.workflows;
    const [firstConnection] = config.connections;
    if (firstWorkflow === undefined || firstConnection === undefined) {
      throw new Error('the core defaults must not be empty');
    }
    firstWorkflow.name = 'changed';
    firstConnection.to = 'changed';
    config.workflows.length = 0;

    expect(DEFAULT_WORKFLOWS).toEqual(workflowsBefore);
    expect(DEFAULT_CONNECTIONS).toEqual(connectionsBefore);
  });
});

describe('F-05 AC-006 optional stack fields', () => {
  it.each([
    ['framework', ''],
    ['framework', '   '],
    ['testFramework', '\t'],
    ['buildTool', '  '],
  ] as const)('F-05 AC-006 leaves %s out of stack when it is blank (%j)', (field, value) => {
    const brief = wireframeBrief();
    brief.stack[field] = value;

    expect(field in configOf(brief).stack).toBe(false);
  });

  it('F-05 AC-006 keeps every optional stack key when each is filled', () => {
    expect(configOf(wireframeBrief()).stack).toEqual({
      language: 'TypeScript',
      framework: 'Node.js + Fastify',
      testFramework: 'Vitest',
      buildTool: 'npm workspaces',
    });
  });
});

describe('F-05 AC-007 trimmed values', () => {
  it('F-05 AC-007 stores the framework "  Node.js + Fastify " as "Node.js + Fastify"', () => {
    const brief = wireframeBrief();
    brief.stack.framework = '  Node.js + Fastify ';

    expect(configOf(brief).stack.framework).toBe('Node.js + Fastify');
  });

  it.each([
    {
      label: 'name',
      change: (b: BriefState) => { b.name = '  Hourly Tracker\t'; },
      read: (c: ProjectConfig) => c.name,
      expected: 'Hourly Tracker',
    },
    {
      label: 'idea',
      change: (b: BriefState) => { b.idea = '  Plain idea.  \n'; },
      read: (c: ProjectConfig) => c.idea,
      expected: 'Plain idea.',
    },
    {
      label: 'language',
      change: (b: BriefState) => { b.stack.language = ' TypeScript '; },
      read: (c: ProjectConfig) => c.stack.language,
      expected: 'TypeScript',
    },
    {
      label: 'architecture style',
      change: (b: BriefState) => { b.architecture.style = ' Layered '; },
      read: (c: ProjectConfig) => c.architecture.style,
      expected: 'Layered',
    },
    {
      label: 'module name',
      change: (b: BriefState) => {
        b.architecture.modules = [{ name: ' core ', layer: '0', responsibility: 'Domain', dependsOn: '' }];
      },
      read: (c: ProjectConfig) => c.architecture.modules[0]?.name,
      expected: 'core',
    },
    {
      label: 'module responsibility',
      change: (b: BriefState) => {
        b.architecture.modules = [{ name: 'core', layer: '0', responsibility: ' Domain ', dependsOn: '' }];
      },
      read: (c: ProjectConfig) => c.architecture.modules[0]?.responsibility,
      expected: 'Domain',
    },
  ])('F-05 AC-007 trims the $label before it goes into the configuration', ({ change, read, expected }) => {
    const brief = wireframeBrief();
    change(brief);

    expect(read(configOf(brief))).toBe(expected);
  });
});

describe('F-05 AC-010 layer parsing', () => {
  it.each([
    ['0', 0],
    ['1', 1],
    ['12', 12],
    ['03', 3],
    [' 2 ', 2],
    ['9007199254740991', 9007199254740991],
  ])('F-05 AC-010 parses the layer text %j as %i', (text, expected) => {
    expect(parseLayer(text)).toBe(expected);
  });

  it.each([
    ['a blank text', ''],
    ['a space only', '  '],
    ['a negative number', '-1'],
    ['a fraction', '1.5'],
    ['a decimal with zeros', '2.0'],
    ['an exponent', '1e2'],
    ['a word', 'two'],
    ['a plus sign', '+1'],
    ['a number beyond the safe integer range', '9007199254740992'],
  ])('F-05 AC-010 rejects the layer text for %s', (_label, text) => {
    expect(parseLayer(text)).toBeNull();
  });

  it('F-05 AC-010 reports the list positions of the rows with a bad layer and builds no configuration', () => {
    const brief = wireframeBrief();
    brief.architecture.modules = [
      { name: 'core', layer: '0', responsibility: 'Domain', dependsOn: '' },
      { name: 'api', layer: 'one', responsibility: 'HTTP', dependsOn: '' },
      { name: 'web', layer: '-1', responsibility: 'UI', dependsOn: '' },
    ];

    expect(toProjectConfig(brief)).toEqual({ ok: false, badLayers: [1, 2] });
  });

  it('F-05 AC-010 builds a configuration when every layer is a whole number of 0 or more', () => {
    expect(toProjectConfig(wireframeBrief()).ok).toBe(true);
  });
});
