import { describe, expect, it } from 'vitest';
import type { AgentBlock, Block, ConditionBlock, Flow, Route } from '../../src/pipeline/model.js';
import { GenerationError } from '../../src/pipeline/generate/error.js';
import { renderLayout } from '../../src/pipeline/generate/render.js';
import { flowValues } from '../../src/pipeline/generate/values-flow.js';
import { withFlow } from './analyze-fixture.js';

function agent(index: number, id: string, next: string): AgentBlock {
  return { index, id, kind: 'agent', name: `${id}-agent`, description: `Runs ${id}.`, arguments: [], next };
}

function condition(index: number, id: string, whenTrue: Route, whenFalse: Route): ConditionBlock {
  return { index, id, kind: 'condition', description: `Is ${id} met?`, true: whenTrue, false: whenFalse };
}

// A flow of the given blocks, built on the valid fixture so that every other part is well formed.
function flowWith(blocks: readonly Block[], change: (flow: Flow) => Flow = (flow) => flow): Flow {
  const config = withFlow((flow) => change({ ...flow, blocks }));
  const flow = config.pipeline.flows[0];
  if (flow === undefined) throw new Error('the fixture has no flow');
  return flow;
}

const END = { index: 99, id: 'end', kind: 'end', outcome: 'done', producedArtifact: 'out.md' } as const;

// Start → draft → review; review's true route goes on to publish → gate → end, its false route returns to draft
// (a return with a round limit of 2). The gate's false route stops the flow.
function fixtureFlow(): Flow {
  return flowWith([
    { index: 0, id: 'start', kind: 'start', next: 'draft' },
    agent(1, 'draft', 'review'),
    condition(2, 'review', { to: 'publish' }, { to: 'draft', roundLimit: 2 }),
    agent(3, 'publish', 'gate'),
    condition(4, 'gate', { to: 'end' }, { stop: true }),
    END,
  ]);
}

describe('F-04 AC-012 the flow id and the other flow values fill the placeholders', () => {
  it('gives the flow id for a {{flowId}} placeholder', () => {
    const flow = fixtureFlow();
    expect(renderLayout('Command {{flowId}}.', flowValues(flow), '.claude/commands/build.md')).toBe(
      'Command build.',
    );
  });

  it('gives the flow name and description, the description empty when the flow has none', () => {
    const flow = fixtureFlow();
    expect(flowValues(flow)['flowName']).toBe('Build');
    expect(flowValues(flow)['flowDescription']).toBe('');
    const described = { ...flow, description: 'Builds the project.' };
    expect(flowValues(described)['flowDescription']).toBe('Builds the project.');
  });

  it('gives one line per flow argument with its required mark and hint, empty when there are none', () => {
    const flow = fixtureFlow();
    expect(flowValues(flow)['flowArguments']).toBe('');
    const withArgs = {
      ...flow,
      arguments: [
        { index: 0, id: 'feature-id', required: true, hint: 'F-XX' },
        { index: 1, id: 'note', required: false, hint: '' },
      ],
    };
    expect(flowValues(withArgs)['flowArguments']).toBe('\n- `feature-id` (required, F-XX)\n- `note` (optional)');
  });
});

describe('F-04 AC-015 the steps list the Agent blocks in walk order', () => {
  it('numbers each Agent with its agent file and its description, Start and End not numbered', () => {
    expect(flowValues(fixtureFlow())['flowSteps']).toBe(
      '\n' +
      [
        '1. Run the agent `.claude/agents/draft-agent.md`: Runs draft.',
        '2. Run the agent `.claude/agents/publish-agent.md`: Runs publish.',
      ].join('\n'),
    );
  });

  it('names the arguments of an Agent, with its required and optional marks and hints', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'draft' },
      {
        ...agent(1, 'draft', 'end'),
        arguments: [
          { index: 0, id: 'feature-id', required: true, hint: 'F-XX' },
          { index: 1, id: 'note', required: false, hint: '' },
        ],
      },
      END,
    ]);
    expect(flowValues(flow)['flowSteps']).toBe(
      '\n1. Run the agent `.claude/agents/draft-agent.md` with the arguments `feature-id` (required, F-XX), `note` (optional): Runs draft.',
    );
  });

  it('gives no steps for a flow with no Agent block', () => {
    const flow = flowWith([{ index: 0, id: 'start', kind: 'start', next: 'end' }, END]);
    expect(flowValues(flow)['flowSteps']).toBe('');
  });

  it('gives the same steps whatever order the blocks are declared in', () => {
    const flow = fixtureFlow();
    const reversed = { ...flow, blocks: [...flow.blocks].reverse() };
    expect(flowValues(reversed)['flowSteps']).toBe(flowValues(flow)['flowSteps']);
  });
});

describe('F-04 AC-015 AC-016 the conditions are numbered rules with their routes', () => {
  it('numbers each Condition in walk order, with its true and false routes', () => {
    expect(flowValues(fixtureFlow())['flowConditions']).toBe(
      '\n' +
      [
        '1. Is review met?',
        '   - True: go to step 2 (the agent `.claude/agents/publish-agent.md`)',
        '   - False: return to step 1 (the agent `.claude/agents/draft-agent.md`), with at most 2 rounds',
        '2. Is gate met?',
        '   - True: go to the end of the flow',
        '   - False: the flow stops, and the command asks the person: "The check did not pass: Is gate met? What should happen next?"',
      ].join('\n'),
    );
  });

  it('gives a return the round limit of each value from 1 to 5', () => {
    for (const roundLimit of [1, 5]) {
      const flow = flowWith([
        { index: 0, id: 'start', kind: 'start', next: 'draft' },
        agent(1, 'draft', 'check'),
        condition(2, 'check', { to: 'end' }, { to: 'draft', roundLimit }),
        END,
      ]);
      expect(flowValues(flow)['flowConditions']).toContain(
        `return to step 1 (the agent \`.claude/agents/draft-agent.md\`), with at most ${roundLimit} rounds`,
      );
    }
  });

  it('refuses a return whose round limit is outside 1 to 5, as a programmer error', () => {
    for (const roundLimit of [0, 6, 2.5]) {
      const flow = flowWith([
        { index: 0, id: 'start', kind: 'start', next: 'draft' },
        agent(1, 'draft', 'check'),
        condition(2, 'check', { to: 'end' }, { to: 'draft', roundLimit }),
        END,
      ]);
      expect(() => flowValues(flow)).toThrow(GenerationError);
      expect(() => flowValues(flow)).toThrow(`the round limit ${roundLimit}, outside 1 to 5`);
    }
  });

  it('gives the stop route a question built from the condition description, on either side', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'check' },
      { ...condition(1, 'check', { stop: true }, { to: 'end' }), description: 'Is the build green?' },
      END,
    ]);
    expect(flowValues(flow)['flowConditions']).toBe(
      '\n' +
      [
        '1. Is the build green?',
        '   - True: the flow stops, and the command asks the person: "The check did not pass: Is the build green? What should happen next?"',
        '   - False: go to the end of the flow',
      ].join('\n'),
    );
  });

  it('numbers conditions apart from Agent steps, so a rule after two agents is still rule 1', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'a' },
      agent(1, 'a', 'b'),
      agent(2, 'b', 'check'),
      condition(3, 'check', { to: 'end' }, { stop: true }),
      END,
    ]);
    expect(flowValues(flow)['flowConditions']).toContain('1. Is check met?');
    expect(flowValues(flow)['flowSteps']).toContain('2. Run the agent `.claude/agents/b-agent.md`');
  });

  it('gives no rules for a flow with no Condition block', () => {
    const flow = flowWith([{ index: 0, id: 'start', kind: 'start', next: 'draft' }, agent(1, 'draft', 'end'), END]);
    expect(flowValues(flow)['flowConditions']).toBe('');
  });

  it('copies a condition description with {{...}} text as written', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'check' },
      { ...condition(1, 'check', { to: 'end' }, { stop: true }), description: 'Does {{flowId}} pass?' },
      END,
    ]);
    expect(flowValues(flow)['flowConditions']).toContain('1. Does {{flowId}} pass?');
  });
});

describe('F-04 AC-018 the approval line is present only when the flow approval is on', () => {
  it('gives the approval line when the flow approval is on', () => {
    const flow = { ...fixtureFlow(), approval: true };
    expect(flowValues(flow)['flowApproval']).toBe(
      "\n\nThe process stops here for the person's approval at the end of this flow.",
    );
  });

  it('gives no approval text when the flow approval is off', () => {
    expect(flowValues(fixtureFlow())['flowApproval']).toBe('');
  });

  it('leaves no blank line when the approval is off, and a paragraph when it is on, at the end of a layout line', () => {
    const layout = 'Last line.{{flowApproval}}\n';
    expect(renderLayout(layout, flowValues(fixtureFlow()), '.claude/commands/build.md')).toBe('Last line.\n');
    const on = { ...fixtureFlow(), approval: true };
    expect(renderLayout(layout, flowValues(on), '.claude/commands/build.md')).toBe(
      "Last line.\n\nThe process stops here for the person's approval at the end of this flow.\n",
    );
  });
});

describe('F-04 AC-015 AC-012 an empty list leaves no blank line in a layout', () => {
  it('renders a steps section with no steps as its heading alone', () => {
    const flow = flowWith([{ index: 0, id: 'start', kind: 'start', next: 'end' }, END]);
    expect(renderLayout('## Steps{{flowSteps}}\n', flowValues(flow), '.claude/commands/build.md')).toBe('## Steps\n');
  });
});
