import { describe, expect, it } from 'vitest';
import type { Flow, ProjectConfig, Rule } from '../../src/pipeline/model.js';
import { baseValues } from '../../src/pipeline/generate/values-base.js';
import { validConfig } from './analyze-fixture.js';

// A flow with the given id, description and agent block names. Its blocks are Start, one Agent for each name and End.
function flowWith(id: string, description: string | undefined, agentNames: readonly string[]): Flow {
  const agents = agentNames.map((name, i) => ({
    index: i + 1,
    id: `${id}-${name}`,
    kind: 'agent' as const,
    name,
    description: `Runs ${name}.`,
    arguments: [],
    next: i + 1 < agentNames.length ? `${id}-${agentNames[i + 1]}` : `${id}-end`,
  }));
  const start = { index: 0, id: `${id}-start`, kind: 'start' as const, next: agents[0]?.id ?? `${id}-end` };
  const end = {
    index: agents.length + 1,
    id: `${id}-end`,
    kind: 'end' as const,
    outcome: 'done' as const,
    producedArtifact: 'out.md',
  };
  return {
    index: 0,
    id,
    name: id,
    ...(description === undefined ? {} : { description }),
    arguments: [],
    body: '',
    artifacts: [{ label: 'out.md', template: 'The output' }],
    approval: false,
    blocks: [start, ...agents, end],
  };
}

function configWith(flows: readonly Flow[], rules: readonly Rule[]): ProjectConfig {
  const base = validConfig();
  return { ...base, rules, pipeline: { ...base.pipeline, flows: flows.map((flow, i) => ({ ...flow, index: i })) } };
}

const RULES: readonly Rule[] = [
  { index: 0, id: 'style', title: 'Plain style', text: 'Write short sentences.' },
  { index: 1, id: 'names', title: 'Names\nin files', text: 'Use kebab case.' },
];

describe('F-04 AC-037 the process list has one line per flow in pipeline order', () => {
  it('lists each flow by its id, with its description when it has one', () => {
    const config = configWith(
      [flowWith('build', 'Builds the project.', ['builder']), flowWith('test', undefined, ['tester'])],
      [],
    );
    expect(baseValues(config)['processList']).toBe('\n- `build`: Builds the project.\n- `test`');
  });

  it('keeps the flows in the order of the pipeline, not in id order', () => {
    const config = configWith([flowWith('test', undefined, []), flowWith('build', undefined, [])], []);
    expect(baseValues(config)['processList']).toBe('\n- `test`\n- `build`');
  });
});

describe('F-04 AC-037 the command list names the pipeline command and one command per flow', () => {
  it('lists pipeline.md first and then each flow command in pipeline order', () => {
    const config = configWith([flowWith('build', undefined, []), flowWith('test', undefined, [])], []);
    expect(baseValues(config)['commandList']).toBe(
      '\n- `.claude/commands/pipeline.md`\n- `.claude/commands/build.md`\n- `.claude/commands/test.md`',
    );
  });
});

describe('F-04 AC-037 the agent list has one line per Agent block with its agent file', () => {
  it('lists each Agent block by its agent file with its description, in flow order', () => {
    const config = configWith(
      [flowWith('build', undefined, ['builder', 'checker']), flowWith('test', undefined, ['tester'])],
      [],
    );
    expect(baseValues(config)['agentList']).toBe(
      '\n- `.claude/agents/builder.md`: Runs builder.' +
        '\n- `.claude/agents/checker.md`: Runs checker.' +
        '\n- `.claude/agents/tester.md`: Runs tester.',
    );
  });

  it('gives no line for a flow with no Agent block', () => {
    const config = configWith([flowWith('build', undefined, [])], []);
    expect(baseValues(config)['agentList']).toBe('');
  });

  it('keeps an Agent description with a line break on one item line', () => {
    const flow = flowWith('build', undefined, ['builder']);
    const blocks = flow.blocks.map((block) =>
      block.kind === 'agent' ? { ...block, description: 'Runs\nthe builder.' } : block,
    );
    const lines = baseValues(configWith([{ ...flow, blocks }], []))['agentList']?.split('\n') ?? [];
    expect(lines).toEqual(['', '- `.claude/agents/builder.md`: Runs the builder.']);
  });
});

describe('F-04 AC-037 the rule list has one line per rule with its file and title', () => {
  it('lists each rule by its file, with its title on one line', () => {
    const config = configWith([flowWith('build', undefined, [])], RULES);
    expect(baseValues(config)['ruleList']).toBe(
      '\n- `.claude/rules/style.md`: Plain style\n- `.claude/rules/names.md`: Names in files',
    );
  });

  it('is empty when there are no rules', () => {
    const config = configWith([flowWith('build', undefined, [])], []);
    expect(baseValues(config)['ruleList']).toBe('');
  });
});

describe('F-04 AC-037 each list is empty when it has no item, and the lists hold no line break in an item', () => {
  it('gives an empty process list when there are no flows', () => {
    expect(baseValues(configWith([], []))['processList']).toBe('');
  });

  it('lists only the pipeline command when there are no flows', () => {
    expect(baseValues(configWith([], []))['commandList']).toBe('\n- `.claude/commands/pipeline.md`');
  });

  it('keeps a description with a line break on one item line', () => {
    const config = configWith([flowWith('build', 'Builds\nthe project.', [])], []);
    const lines = baseValues(config)['processList']?.split('\n') ?? [];
    expect(lines).toEqual(['', '- `build`: Builds the project.']);
  });
});

describe('F-04 AC-038 the base values give no process diagram and are a pure function of the config', () => {
  it('supplies the four lists and no processDiagram', () => {
    const values = baseValues(configWith([flowWith('build', undefined, ['builder'])], RULES));
    expect(Object.keys(values).sort()).toEqual(['agentList', 'commandList', 'processList', 'ruleList']);
    expect(Object.hasOwn(values, 'processDiagram')).toBe(false);
  });

  it('gives the same values for two equal configs built apart, and does not change the config', () => {
    const build = (): ProjectConfig =>
      configWith([flowWith('build', 'Builds.', ['builder']), flowWith('test', undefined, [])], RULES);
    const config = build();
    const before = structuredClone(config);

    const first = baseValues(config);
    expect(first).toEqual(baseValues(build()));
    expect(baseValues(config)).toEqual(first);
    expect(config).toEqual(before);
  });
});
