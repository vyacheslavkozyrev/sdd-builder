import { describe, expect, it } from 'vitest';
import type { Flow, ProjectConfig, Rule } from '../../src/pipeline/model.js';
import { baseValues } from '../../src/pipeline/generate/values-base.js';
import { pipelineValues } from '../../src/pipeline/generate/values-pipeline.js';
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

// The flows with their `next` links set in the order given: each flow names the flow after it, and the last has none.
function linked(flows: readonly Flow[]): Flow[] {
  return flows.map((flow, i) => {
    const next = flows[i + 1]?.id;
    return next === undefined ? flow : { ...flow, next };
  });
}

// The two approval sentences of a flow, as the pipeline command writes them in `pipelineFlows` (F-05, AC-029).
const STOPS = 'The process stops for a person at the end of this flow.';
const DOES_NOT_STOP = 'The process does not stop at the end of this flow.';

const RULES: readonly Rule[] = [
  { index: 0, id: 'style', title: 'Plain style', text: 'Write short sentences.' },
  { index: 1, id: 'names', title: 'Names\nin files', text: 'Use kebab case.' },
];

describe('F-04 AC-037 the process list has one line per flow in pipeline order', () => {
  it('lists each flow by its name and id, with its description when it has one', () => {
    const config = configWith(
      linked([flowWith('build', 'Builds the project.', ['builder']), flowWith('test', undefined, ['tester'])]),
      [],
    );
    expect(baseValues(config)['processFlows']).toBe(
      `\n- build (\`build\`): Builds the project. ${DOES_NOT_STOP}\n- test (\`test\`): ${DOES_NOT_STOP}`,
    );
  });

  it('keeps the flows in the order of the next links, not in id order', () => {
    const test = { ...flowWith('test', undefined, []), next: 'build' };
    const config = configWith([flowWith('build', undefined, []), test], []);
    expect(baseValues(config)['processFlows']).toBe(
      `\n- test (\`test\`): ${DOES_NOT_STOP}\n- build (\`build\`): ${DOES_NOT_STOP}`,
    );
  });
});

describe('F-05 AC-029 the process list lists each flow once, in the order of the next links', () => {
  it('lists the flows by the next links from the first flow, not in array order', () => {
    // `build` is the first flow (no flow names it), then `test`; the array holds `test` first.
    const build = { ...flowWith('build', undefined, []), next: 'test' };
    const config = configWith([flowWith('test', undefined, []), build], []);
    expect(baseValues(config)['processFlows']).toBe(
      `\n- build (\`build\`): ${DOES_NOT_STOP}\n- test (\`test\`): ${DOES_NOT_STOP}`,
    );
  });

  it('lists a flow once when a next link loops back to a flow already listed', () => {
    const head = { ...flowWith('head', undefined, []), next: 'build' };
    const build = { ...flowWith('build', undefined, []), next: 'test' };
    const test = { ...flowWith('test', undefined, []), next: 'build' };
    const lines = baseValues(configWith([head, build, test], []))['processFlows']?.split('\n') ?? [];
    expect(lines).toEqual([
      '',
      `- head (\`head\`): ${DOES_NOT_STOP}`,
      `- build (\`build\`): ${DOES_NOT_STOP}`,
      `- test (\`test\`): ${DOES_NOT_STOP}`,
    ]);
  });

  it('gives the stop sentence of a flow with approval on, the same sentence the pipeline command writes', () => {
    const flow = { ...flowWith('build', 'Builds the project.', []), approval: true };
    const config = configWith([flow], []);
    expect(baseValues(config)['processFlows']).toBe(`\n- build (\`build\`): Builds the project. ${STOPS}`);
    expect(pipelineValues(config.pipeline)['pipelineFlows']).toContain(STOPS);
  });

  it('gives the does-not-stop sentence of a flow with approval off, as the pipeline command writes it', () => {
    const config = configWith([flowWith('build', undefined, [])], []);
    expect(baseValues(config)['processFlows']).toBe(`\n- build (\`build\`): ${DOES_NOT_STOP}`);
    expect(pipelineValues(config.pipeline)['pipelineFlows']).toContain(DOES_NOT_STOP);
  });

  it('gives the stop sentence after the item text of a flow with approval on and no description', () => {
    const flow = { ...flowWith('build', undefined, []), approval: true };
    expect(baseValues(configWith([flow], []))['processFlows']).toBe(`\n- build (\`build\`): ${STOPS}`);
  });

  it('gives the conditions and the retry routes of a flow as text under its item', () => {
    const flow: Flow = {
      ...flowWith('build', undefined, []),
      blocks: [
        { index: 0, id: 'build-start', kind: 'start', next: 'build-check' },
        {
          index: 1,
          id: 'build-check',
          kind: 'condition',
          description: 'Is the build green?',
          true: { to: 'build-end' },
          false: { to: 'build-start', roundLimit: 2 },
        },
        { index: 2, id: 'build-end', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
      ],
    };
    expect(baseValues(configWith([flow], []))['processFlows']).toBe(
      [
        '',
        `- build (\`build\`): ${DOES_NOT_STOP}`,
        '  Conditions:',
        '  1. Is the build green?',
        '     - True: go to the end of the flow',
        '     - False: return to the start of the flow, with at most 2 rounds',
      ].join('\n'),
    );
  });

  it('writes a stop route of a condition as the flow command does', () => {
    const flow: Flow = {
      ...flowWith('build', undefined, []),
      blocks: [
        { index: 0, id: 'build-start', kind: 'start', next: 'build-check' },
        {
          index: 1,
          id: 'build-check',
          kind: 'condition',
          description: 'Is it done?',
          true: { to: 'build-end' },
          false: { stop: true },
        },
        { index: 2, id: 'build-end', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
      ],
    };
    const line = baseValues(configWith([flow], []))['processFlows']?.split('\n')[5] ?? '';
    expect(line).toBe(
      '     - False: stop and ask the person what to do: "The check did not pass: Is it done? What should happen next?"',
    );
  });

  it('names the flow by its name, and keeps its id in backticks', () => {
    const flow = { ...flowWith('build', undefined, []), name: 'Build now' };
    expect(baseValues(configWith([flow], []))['processFlows']).toBe(`\n- Build now (\`build\`): ${DOES_NOT_STOP}`);
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
    expect(baseValues(configWith([], []))['processFlows']).toBe('');
  });

  it('lists only the pipeline command when there are no flows', () => {
    expect(baseValues(configWith([], []))['commandList']).toBe('\n- `.claude/commands/pipeline.md`');
  });

  it('keeps a description with a line break on one item line', () => {
    const config = configWith([flowWith('build', 'Builds\nthe project.', [])], []);
    const lines = baseValues(config)['processFlows']?.split('\n') ?? [];
    expect(lines).toEqual(['', `- build (\`build\`): Builds the project. ${DOES_NOT_STOP}`]);
  });
});

describe('F-04 AC-038 the base values are the lists and the process diagram, a pure function of the config', () => {
  it('supplies the four lists and the processDiagram (F-05 T007, T009)', () => {
    const values = baseValues(configWith([flowWith('build', undefined, ['builder'])], RULES));
    expect(Object.keys(values).sort()).toEqual([
      'agentList',
      'commandList',
      'processDiagram',
      'processFlows',
      'ruleList',
    ]);
    expect(values['processDiagram']).toBe('flowchart\nF1["build"]');
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
