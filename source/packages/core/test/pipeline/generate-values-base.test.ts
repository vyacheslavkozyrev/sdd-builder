import { describe, expect, it } from 'vitest';
import type { Flow, ProjectConfig, Rule } from '../../src/pipeline/model.js';
import { baseValues } from '../../src/pipeline/generate/values-base.js';
import { pipelineValues } from '../../src/pipeline/generate/values-pipeline.js';
import { validConfig } from './analyze-fixture.js';

// The name of each fixture flow by its GUID id (F-16 AC-028): the process list writes the name, then the id. An id
// that is not listed here is its own name.
const NAME_OF: ReadonlyMap<string, string> = new Map([
  ['ea365500-e6ec-5064-90ea-fb6cc4bb49d6', 'build'],
  ['b856df1d-a407-5fdf-9694-e743d3a9770a', 'test'],
  ['5325268c-4ed0-50ab-a5cb-c195679ff445', 'head'],
]);

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
    name: NAME_OF.get(id) ?? id,
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

// The two approval sentences of a flow, as the process list writes them (F-05, AC-029), and the stop step the pipeline
// command writes after a flow with approval on (F-05, AC-003).
const STOPS = 'The process stops for a person at the end of this flow.';
const DOES_NOT_STOP = 'The process does not stop at the end of this flow.';
const PIPELINE_STOP = "Stop and wait for the person's approval before the next flow.";
const PIPELINE_STOP_LAST = "Stop and wait for the person's approval at the end of the process.";

const RULES: readonly Rule[] = [
  { index: 0, id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Plain style', text: 'Write short sentences.' },
  { index: 1, id: '06ba84e8-8ecc-55ef-860b-9dc82cef3c5f', title: 'Names\nin files', text: 'Use kebab case.' },
];

describe('F-04 AC-037 the process list has one line per flow in pipeline order', () => {
  it('lists each flow by its name and id, with its description when it has one', () => {
    const config = configWith(
      linked([flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', 'Builds the project.', ['builder']), flowWith('b856df1d-a407-5fdf-9694-e743d3a9770a', undefined, ['tester'])]),
      [],
    );
    expect(baseValues(config)['processFlows']).toBe(
      `\n- build (\`ea365500-e6ec-5064-90ea-fb6cc4bb49d6\`): Builds the project. ${DOES_NOT_STOP}\n- test (\`b856df1d-a407-5fdf-9694-e743d3a9770a\`): ${DOES_NOT_STOP}`,
    );
  });

  it('keeps the flows in the order of the next links, not in id order', () => {
    const test = { ...flowWith('b856df1d-a407-5fdf-9694-e743d3a9770a', undefined, []), next: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' };
    const config = configWith([flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, []), test], []);
    expect(baseValues(config)['processFlows']).toBe(
      `\n- test (\`b856df1d-a407-5fdf-9694-e743d3a9770a\`): ${DOES_NOT_STOP}\n- build (\`ea365500-e6ec-5064-90ea-fb6cc4bb49d6\`): ${DOES_NOT_STOP}`,
    );
  });
});

describe('F-05 AC-029 the process list lists each flow once, in the order of the next links', () => {
  it('lists the flows by the next links from the first flow, not in array order', () => {
    // `ea365500-e6ec-5064-90ea-fb6cc4bb49d6` is the first flow (no flow names it), then `b856df1d-a407-5fdf-9694-e743d3a9770a`; the array holds `b856df1d-a407-5fdf-9694-e743d3a9770a` first.
    const build = { ...flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, []), next: 'b856df1d-a407-5fdf-9694-e743d3a9770a' };
    const config = configWith([flowWith('b856df1d-a407-5fdf-9694-e743d3a9770a', undefined, []), build], []);
    expect(baseValues(config)['processFlows']).toBe(
      `\n- build (\`ea365500-e6ec-5064-90ea-fb6cc4bb49d6\`): ${DOES_NOT_STOP}\n- test (\`b856df1d-a407-5fdf-9694-e743d3a9770a\`): ${DOES_NOT_STOP}`,
    );
  });

  it('lists a flow once when a next link loops back to a flow already listed', () => {
    const head = { ...flowWith('5325268c-4ed0-50ab-a5cb-c195679ff445', undefined, []), next: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' };
    const build = { ...flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, []), next: 'b856df1d-a407-5fdf-9694-e743d3a9770a' };
    const test = { ...flowWith('b856df1d-a407-5fdf-9694-e743d3a9770a', undefined, []), next: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6' };
    const lines = baseValues(configWith([head, build, test], []))['processFlows']?.split('\n') ?? [];
    expect(lines).toEqual([
      '',
      `- head (\`5325268c-4ed0-50ab-a5cb-c195679ff445\`): ${DOES_NOT_STOP}`,
      `- build (\`ea365500-e6ec-5064-90ea-fb6cc4bb49d6\`): ${DOES_NOT_STOP}`,
      `- test (\`b856df1d-a407-5fdf-9694-e743d3a9770a\`): ${DOES_NOT_STOP}`,
    ]);
  });

  it('gives the stop sentence of a flow with approval on, the same sentence the pipeline command writes', () => {
    const flow = { ...flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', 'Builds the project.', []), approval: true };
    const config = configWith([flow], []);
    expect(baseValues(config)['processFlows']).toBe(`\n- build (\`ea365500-e6ec-5064-90ea-fb6cc4bb49d6\`): Builds the project. ${STOPS}`);
    expect(pipelineValues(config.pipeline)['pipelineFlows']).toContain(PIPELINE_STOP_LAST);
  });

  it('gives the does-not-stop sentence of a flow with approval off, as the pipeline command writes it', () => {
    const config = configWith([flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, [])], []);
    expect(baseValues(config)['processFlows']).toBe(`\n- build (\`ea365500-e6ec-5064-90ea-fb6cc4bb49d6\`): ${DOES_NOT_STOP}`);
    expect(pipelineValues(config.pipeline)['pipelineFlows']).not.toContain(PIPELINE_STOP);
  });

  it('gives the stop sentence after the item text of a flow with approval on and no description', () => {
    const flow = { ...flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, []), approval: true };
    expect(baseValues(configWith([flow], []))['processFlows']).toBe(`\n- build (\`ea365500-e6ec-5064-90ea-fb6cc4bb49d6\`): ${STOPS}`);
  });

  it('gives the conditions and the retry routes of a flow as text under its item', () => {
    const flow: Flow = {
      ...flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, []),
      blocks: [
        { index: 0, id: '3fff52cc-43dd-53cf-9d5a-408b257fecce', kind: 'start', next: 'f9a1849a-5e3c-5832-8886-b981f5ca9724' },
        {
          index: 1,
          id: 'f9a1849a-5e3c-5832-8886-b981f5ca9724',
          kind: 'condition',
          description: 'Is the build green?',
          true: { to: '999d4907-686c-50c5-8270-cc2b38634833' },
          false: { to: '3fff52cc-43dd-53cf-9d5a-408b257fecce', roundLimit: 2 },
        },
        { index: 2, id: '999d4907-686c-50c5-8270-cc2b38634833', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
      ],
    };
    expect(baseValues(configWith([flow], []))['processFlows']).toBe(
      [
        '',
        `- build (\`ea365500-e6ec-5064-90ea-fb6cc4bb49d6\`): ${DOES_NOT_STOP}`,
        '  Conditions:',
        '  1. Is the build green?',
        '     - True: go to the end of the flow',
        '     - False: return to the start of the flow, with at most 2 rounds',
      ].join('\n'),
    );
  });

  it('writes a stop route of a condition as the flow command does', () => {
    const flow: Flow = {
      ...flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, []),
      blocks: [
        { index: 0, id: '3fff52cc-43dd-53cf-9d5a-408b257fecce', kind: 'start', next: 'f9a1849a-5e3c-5832-8886-b981f5ca9724' },
        {
          index: 1,
          id: 'f9a1849a-5e3c-5832-8886-b981f5ca9724',
          kind: 'condition',
          description: 'Is it done?',
          true: { to: '999d4907-686c-50c5-8270-cc2b38634833' },
          false: { stop: true },
        },
        { index: 2, id: '999d4907-686c-50c5-8270-cc2b38634833', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
      ],
    };
    const line = baseValues(configWith([flow], []))['processFlows']?.split('\n')[5] ?? '';
    expect(line).toBe(
      '     - False: stop and ask the person what to do: "The check did not pass: Is it done? What should happen next?"',
    );
  });

  it('names the flow by its name, and keeps its id in backticks', () => {
    const flow = { ...flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, []), name: 'Build now' };
    expect(baseValues(configWith([flow], []))['processFlows']).toBe(`\n- Build now (\`ea365500-e6ec-5064-90ea-fb6cc4bb49d6\`): ${DOES_NOT_STOP}`);
  });
});

describe('F-04 AC-037 the command list names the pipeline command and one command per flow', () => {
  it('lists pipeline.md first and then each flow command in pipeline order', () => {
    const config = configWith([flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, []), flowWith('b856df1d-a407-5fdf-9694-e743d3a9770a', undefined, [])], []);
    expect(baseValues(config)['commandList']).toBe(
      '\n- `.claude/commands/pipeline.md`\n- `.claude/commands/build.md`\n- `.claude/commands/test.md`',
    );
  });
});

describe('F-04 AC-037 the agent list has one line per Agent block with its agent file', () => {
  it('lists each Agent block by its agent file with its description, in flow order', () => {
    const config = configWith(
      [flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, ['builder', 'checker']), flowWith('b856df1d-a407-5fdf-9694-e743d3a9770a', undefined, ['tester'])],
      [],
    );
    expect(baseValues(config)['agentList']).toBe(
      '\n- `.claude/agents/builder.md`: Runs builder.' +
        '\n- `.claude/agents/checker.md`: Runs checker.' +
        '\n- `.claude/agents/tester.md`: Runs tester.',
    );
  });

  it('gives no line for a flow with no Agent block', () => {
    const config = configWith([flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, [])], []);
    expect(baseValues(config)['agentList']).toBe('');
  });

  it('keeps an Agent description with a line break on one item line', () => {
    const flow = flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, ['builder']);
    const blocks = flow.blocks.map((block) =>
      block.kind === 'agent' ? { ...block, description: 'Runs\nthe builder.' } : block,
    );
    const lines = baseValues(configWith([{ ...flow, blocks }], []))['agentList']?.split('\n') ?? [];
    expect(lines).toEqual(['', '- `.claude/agents/builder.md`: Runs the builder.']);
  });
});

describe('F-04 AC-037 the rule list has one line per rule with its file and title', () => {
  it('F-16 AC-029 lists each rule by its file, named from its title, with its title on one line', () => {
    const config = configWith([flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, [])], RULES);
    expect(baseValues(config)['ruleList']).toBe(
      '\n- `.claude/rules/plain-style.md`: Plain style\n- `.claude/rules/names-in-files.md`: Names in files',
    );
  });

  it('is empty when there are no rules', () => {
    const config = configWith([flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, [])], []);
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
    const config = configWith([flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', 'Builds\nthe project.', [])], []);
    const lines = baseValues(config)['processFlows']?.split('\n') ?? [];
    expect(lines).toEqual(['', `- build (\`ea365500-e6ec-5064-90ea-fb6cc4bb49d6\`): Builds the project. ${DOES_NOT_STOP}`]);
  });
});

describe('F-04 AC-038 the base values are the lists and the process diagram, a pure function of the config', () => {
  it('supplies the four lists and the processDiagram (F-05 T007, T009)', () => {
    const values = baseValues(configWith([flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', undefined, ['builder'])], RULES));
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
      configWith([flowWith('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', 'Builds.', ['builder']), flowWith('b856df1d-a407-5fdf-9694-e743d3a9770a', undefined, [])], RULES);
    const config = build();
    const before = structuredClone(config);

    const first = baseValues(config);
    expect(first).toEqual(baseValues(build()));
    expect(baseValues(config)).toEqual(first);
    expect(config).toEqual(before);
  });
});
