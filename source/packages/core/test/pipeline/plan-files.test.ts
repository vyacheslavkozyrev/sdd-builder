import { describe, expect, it } from 'vitest';
import type { Agent, Block, Flow, ProjectConfig, Rule } from '../../src/pipeline/model.js';
import { analyzeStructure } from '../../src/pipeline/analyze/index.js';
import { GenerationError } from '../../src/pipeline/generate/errors.js';
import { planGeneration } from '../../src/pipeline/generate/plan.js';
import type { Plan } from '../../src/pipeline/generate/plan.js';
import type { Templates } from '../../src/pipeline/generate/templates.js';
import { buildConfig } from './analyze-fixture.js';

// Fixture templates, given as data. The texts are small and invented; they only prove which file gets which layout.
const fixtureTemplates: Templates = {
  base: [
    { path: 'CLAUDE.md', text: '# {{projectName}}\n', headings: [] },
    { path: 'spec/documents/process.md', text: '{{processList}}\n', headings: [] },
    { path: 'spec/specifications/F-00-template/stories.md', text: '# Stories\n', headings: [] },
    { path: 'spec/specifications/F-00-template/plan.md', text: '# Plan\n', headings: [] },
  ],
  pipelineCommand: { text: 'pipeline layout {{argumentList}}\n', headings: [] },
  command: { text: 'flow layout {{flowId}}\n', headings: [] },
  agent: { text: 'agent layout {{name}}\n', headings: [] },
  rule: { text: 'rule layout {{ruleTitle}}\n', headings: [] },
};

// The four base paths of the fixture, in code-point order.
const BASE_PATHS = [
  'CLAUDE.md',
  'spec/documents/process.md',
  'spec/specifications/F-00-template/plan.md',
  'spec/specifications/F-00-template/stories.md',
];

// A flow that runs its agents in order from Start to End. Each agent is an Agent block named by `agentNames`.
function flowWith(id: string, agentNames: readonly string[]): Flow {
  const startId = `${id}-start`;
  const endId = `${id}-end`;
  const agents = agentNames.map(
    (name, index): Agent => ({
      id: `${id}-agent-${index}`,
      kind: 'agent',
      name,
      description: `Runs ${name}.`,
      arguments: 'feature-id',
      connectedTo: {
        to: index + 1 < agentNames.length ? `${id}-agent-${index + 1}` : endId,
        label: 'code',
      },
    }),
  );
  const blocks: Block[] = [
    { id: startId, kind: 'start', connectedTo: { to: agents[0]?.id ?? endId, label: 'feature-id' } },
    ...agents,
    { id: endId, kind: 'end', outcome: 'done' },
  ];
  return {
    id,
    name: `Flow ${id}`,
    description: `Flow ${id} runs.`,
    arguments: 'feature-id',
    blocks,
  };
}

// The valid config of the tests: the given flows and rules on top of the one-flow fixture. Each flow is
// connected to the next one, so every flow is reached from the first.
function configWith(flows: Flow[], rules: Rule[] = []): ProjectConfig {
  const config = buildConfig();
  config.rules = rules;
  config.pipeline.flows = flows.map((flow, index) => {
    const next = flows[index + 1];
    return next ? { ...flow, connectedTo: { to: next.id, label: 'next' } } : flow;
  });
  return config;
}

// The templates with `base` replaced by the given base files.
function templatesWithBase(base: Templates['base']): Templates {
  return { ...fixtureTemplates, base };
}

// Plans the config and returns the planned paths; fails the test when the config is refused.
function plannedPaths(config: ProjectConfig, templates: Templates = fixtureTemplates): string[] {
  const plan = planGeneration(config, templates);
  if (!plan.ok) {
    throw new Error('expected the config to be planned');
  }
  return plan.files.map((file) => file.path);
}

describe('F-04 AC-001 planning lists every output file of a one-flow config', () => {
  it.each([
    [
      'one flow with one agent and one rule',
      configWith([flowWith('build', ['build'])], [{ id: 'style', title: 'Style', text: 'Short.' }]),
      [
        '.claude/agents/build.md',
        '.claude/commands/build.md',
        '.claude/commands/pipeline.md',
        '.claude/rules/style.md',
        ...BASE_PATHS,
      ],
    ],
  ])('F-04 AC-001 plans exactly the output paths for %s', (_name, config, expected) => {
    expect(plannedPaths(config)).toEqual([...expected].sort(byCodePoint));
  });

  it('F-04 AC-001 carries each layout headings on its planned file for the reply check', () => {
    const templates: Templates = {
      ...fixtureTemplates,
      base: [{ path: 'CLAUDE.md', text: '# Head\n## Rules\n', headings: ['## Rules'] }],
      command: { text: 'flow\n', headings: ['## Steps'] },
    };
    const plan = planGeneration(configWith([flowWith('build', ['build'])]), templates);
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }
    const byPath = new Map(plan.files.map((file) => [file.path, file.headings]));
    expect(byPath.get('CLAUDE.md')).toEqual(['## Rules']);
    expect(byPath.get('.claude/commands/build.md')).toEqual(['## Steps']);
  });

  it('F-04 AC-001 plans the base files at their fixed paths, the pipeline command and the flow command', () => {
    const plan = planGeneration(configWith([flowWith('build', ['build'])]), fixtureTemplates);
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }
    const byPath = new Map(plan.files.map((file) => [file.path, file.text]));
    expect(byPath.get('.claude/commands/pipeline.md')).toBe(fixtureTemplates.pipelineCommand.text);
    expect(byPath.get('.claude/commands/build.md')).toBe(fixtureTemplates.command.text);
    expect(byPath.get('CLAUDE.md')).toBe(fixtureTemplates.base[0]?.text);
  });
});

describe('F-04 AC-002 planning gives every child flow its command file', () => {
  it.each([
    [
      'three flows, one with no agent',
      [flowWith('alpha', []), flowWith('beta', ['review']), flowWith('gamma', ['check', 'draft'])],
      [
        '.claude/agents/check.md',
        '.claude/agents/draft.md',
        '.claude/agents/review.md',
        '.claude/commands/alpha.md',
        '.claude/commands/beta.md',
        '.claude/commands/gamma.md',
        '.claude/commands/pipeline.md',
        ...BASE_PATHS,
      ],
    ],
    [
      'one flow with no agent block',
      [flowWith('alpha', [])],
      ['.claude/commands/alpha.md', '.claude/commands/pipeline.md', ...BASE_PATHS],
    ],
  ])('F-04 AC-002 plans one command file per flow for %s', (_name, flows, expected) => {
    expect(plannedPaths(configWith(flows))).toEqual([...expected].sort(byCodePoint));
  });
});

describe('F-04 AC-003 planning gives one agent file per Agent block of every flow', () => {
  it.each([
    [
      'two agents in one flow and one in another',
      [flowWith('alpha', ['build', 'review']), flowWith('beta', ['draft'])],
      ['.claude/agents/build.md', '.claude/agents/draft.md', '.claude/agents/review.md'],
    ],
    ['a flow with no Agent block', [flowWith('alpha', [])], []],
  ])('F-04 AC-003 plans the agent files for %s', (_name, flows, agentPaths) => {
    const paths = plannedPaths(configWith(flows));
    expect(paths.filter((path) => path.startsWith('.claude/agents/'))).toEqual(agentPaths);
  });

  it('F-04 AC-003 gives each agent file the agent layout', () => {
    const plan = planGeneration(configWith([flowWith('alpha', ['build'])]), fixtureTemplates);
    expect(plan.ok && plan.files.find((file) => file.path === '.claude/agents/build.md')?.text).toBe(
      fixtureTemplates.agent.text,
    );
  });
});

describe('F-04 AC-004 planning gives one rule file per rule', () => {
  it.each([
    ['no rules', [], []],
    [
      'two rules',
      [
        { id: 'tone', title: 'Tone', text: 'Plain.' },
        { id: 'style', title: 'Style', text: 'Short.' },
      ],
      ['.claude/rules/style.md', '.claude/rules/tone.md'],
    ],
  ] as const)('F-04 AC-004 plans the rule files for %s', (_name, rules, rulePaths) => {
    const paths = plannedPaths(configWith([flowWith('build', ['build'])], [...rules]));
    expect(paths.filter((path) => path.startsWith('.claude/rules/'))).toEqual(rulePaths);
  });
});

describe('F-04 AC-006 every planned path is file-safe', () => {
  it.each([
    ['../CLAUDE.md'],
    ['spec/../CLAUDE.md'],
    ['..'],
    ['spec\\plan.md'],
    ['/CLAUDE.md'],
    [''],
    ['spec//plan.md'],
    ['spec/'],
    ['spec/..'],
  ])('F-04 AC-006 refuses the unsafe path %j', (path) => {
    const templates = templatesWithBase([{ path, text: 'x', headings: [] }]);
    expect(() => planGeneration(configWith([flowWith('build', ['build'])]), templates)).toThrow(
      GenerationError,
    );
  });

  it.each([['CLAUDE.md'], ['spec/a..b.md'], ['.claude/x.md'], ['a/b/c.md'], ['..hidden.md']])(
    'F-04 AC-006 plans the safe path %j',
    (path) => {
      const templates = templatesWithBase([{ path, text: 'x', headings: [] }]);
      const plan = planGeneration(configWith([flowWith('build', ['build'])]), templates);
      expect(plan.ok && plan.files.some((file) => file.path === path)).toBe(true);
    },
  );
});

describe('F-04 AC-007 planned files are sorted by path in code-point order', () => {
  it('F-04 AC-007 gives the same order whatever the order of the flows and rules in the config', () => {
    const rules: Rule[] = [
      { id: 'tone', title: 'Tone', text: 'Plain.' },
      { id: 'style', title: 'Style', text: 'Short.' },
    ];
    const forward = configWith([flowWith('alpha', ['build']), flowWith('beta', ['review'])], rules);
    const backward = configWith([flowWith('beta', ['review']), flowWith('alpha', ['build'])], [...rules].reverse());
    const expected = [
      '.claude/agents/build.md',
      '.claude/agents/review.md',
      '.claude/commands/alpha.md',
      '.claude/commands/beta.md',
      '.claude/commands/pipeline.md',
      '.claude/rules/style.md',
      '.claude/rules/tone.md',
      ...BASE_PATHS,
    ];
    expect(plannedPaths(forward)).toEqual(expected);
    expect(plannedPaths(backward)).toEqual(expected);
  });

  it.each([
    [
      'a base path with a character above U+FFFF after one below it',
      ['CLAUDE.md', '\u{1F600}.md', '�.md'],
      ['CLAUDE.md', '�.md', '\u{1F600}.md'],
    ],
    ['a shorter path before a longer one with the same start', ['a/b.md', 'a.md'], ['a.md', 'a/b.md']],
  ])('F-04 AC-007 orders %s by code point', (_name, basePaths, expected) => {
    const templates = templatesWithBase(basePaths.map((path) => ({ path, text: 'x', headings: [] })));
    const paths = plannedPaths(configWith([flowWith('build', [])]), templates).filter((path) =>
      basePaths.includes(path),
    );
    expect(paths).toEqual(expected);
  });
});

describe('F-04 AC-017 a config with a blocker is refused with its problems', () => {
  it.each([
    [
      'a Start block that connects to a block that does not exist',
      (config: ProjectConfig) => {
        const start = config.pipeline.flows[0]?.blocks[0];
        if (start?.kind === 'start' && start.connectedTo) {
          start.connectedTo.to = 'nowhere';
        }
      },
    ],
    [
      'an unknown rule tag on the pipeline and an unknown flow tag',
      (config: ProjectConfig) => {
        config.pipeline.ruleTags = ['missing'];
        const flow = config.pipeline.flows[0];
        if (flow) {
          flow.ruleTags = ['missing'];
        }
      },
    ],
  ])('F-04 AC-017 refuses %s with every blocker and plans no file', (_name, change) => {
    const config = buildConfig(change);
    const blockers = analyzeStructure(config).filter((finding) => finding.severity === 'blocker');
    expect(blockers.length).toBeGreaterThan(0);
    const plan: Plan = planGeneration(config, fixtureTemplates);
    expect(plan.ok).toBe(false);
    if (plan.ok) {
      return;
    }
    expect(plan.problems).toEqual(blockers);
    expect('files' in plan).toBe(false);
  });
});

describe('F-04 AC-021 a path planned twice is a generator error, not a refusal', () => {
  it.each([
    [
      'a base file at the path of a rule',
      templatesWithBase([
        { path: '.claude/rules/style.md', text: 'x', headings: [] },
        { path: 'CLAUDE.md', text: 'x', headings: [] },
      ]),
    ],
    [
      'the same base path twice',
      templatesWithBase([
        { path: 'CLAUDE.md', text: 'x', headings: [] },
        { path: 'CLAUDE.md', text: 'y', headings: [] },
      ]),
    ],
  ])('F-04 AC-021 throws GenerationError for %s', (_name, templates) => {
    const config = configWith([flowWith('build', ['build'])], [{ id: 'style', title: 'Style', text: 'Short.' }]);
    expect(() => planGeneration(config, templates)).toThrow(GenerationError);
  });

});

describe('F-04 AC-019 a flow named pipeline is refused at its own path', () => {
  it('F-04 AC-019 refuses a flow named pipeline instead of planning two pipeline.md files', () => {
    const plan = planGeneration(configWith([flowWith('pipeline', ['build'])]), fixtureTemplates);
    expect(plan.ok).toBe(false);
    if (plan.ok) {
      return;
    }
    expect(plan.problems.filter((p) => p.severity === 'blocker').map((p) => p.path)).toEqual([
      'pipeline.flows[0]',
    ]);
  });
});

// Orders texts by code point, for the expected lists in this file.
function byCodePoint(a: string, b: string): number {
  const x = Array.from(a, (char) => char.codePointAt(0) ?? 0);
  const y = Array.from(b, (char) => char.codePointAt(0) ?? 0);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const delta = (x[i] ?? 0) - (y[i] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }
  return x.length - y.length;
}
