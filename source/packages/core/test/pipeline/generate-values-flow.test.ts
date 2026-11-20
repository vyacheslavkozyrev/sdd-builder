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

  it('keeps the flow name and description on one line when the text holds line breaks', () => {
    const flow = { ...fixtureFlow(), name: 'Build\nnow', description: 'Builds\r\n  the project.' };
    expect(flowValues(flow)['flowName']).toBe('Build now');
    expect(flowValues(flow)['flowDescription']).toBe('Builds the project.');
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

describe('F-05 AC-010 the steps follow the route from the Start block to the End block', () => {
  it('F-05 AC-010 lists the Start first and the End last, one numbered step for each block on the route', () => {
    expect(flowValues(fixtureFlow())['flowSteps']).toBe(
      '\n' +
      [
        '1. Start the flow.',
        '2. Run the agent `.claude/agents/draft-agent.md`: Runs draft.',
        '3. Check to pass: Is review met?',
        '   - True: go to step 4 (the agent `.claude/agents/publish-agent.md`)',
        '   - False: return to step 2 (the agent `.claude/agents/draft-agent.md`), with at most 2 rounds',
        '4. Run the agent `.claude/agents/publish-agent.md`: Runs publish.',
        '5. Check to pass: Is gate met?',
        '   - True: go to the end of the flow',
        '   - False: stop and ask the person what to do: "The check did not pass: Is gate met? What should happen next?"',
        '6. End the flow, producing the artifact `out.md`.',
      ].join('\n'),
    );
  });

  it('F-05 AC-010 numbers each Condition as a step, and keeps it as a numbered rule too', () => {
    const values = flowValues(fixtureFlow());
    expect(values['flowSteps']).toContain('3. Check to pass: Is review met?');
    expect(values['flowSteps']).toContain('5. Check to pass: Is gate met?');
    expect(values['flowConditions']).toContain('1. Is review met?');
  });

  it('F-05 AC-010 moves an End reached before other blocks to the last step, and writes each block once', () => {
    // The true route of check goes to end, which is listed first; draft also leads to end, which is listed once.
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'check' },
      condition(1, 'check', { to: 'end' }, { to: 'draft' }),
      agent(2, 'draft', 'end'),
      END,
    ]);
    expect(flowValues(flow)['flowSteps']).toBe(
      '\n' +
      [
        '1. Start the flow.',
        '2. Check to pass: Is check met?',
        '   - True: go to the end of the flow',
        '   - False: go to step 3 (the agent `.claude/agents/draft-agent.md`)',
        '3. Run the agent `.claude/agents/draft-agent.md`: Runs draft.',
        '4. End the flow, producing the artifact `out.md`.',
      ].join('\n'),
    );
  });

  it('F-05 AC-010 numbers the route targets of a Condition with the same step numbers as the steps', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'check' },
      condition(1, 'check', { to: 'draft' }, { to: 'end' }),
      agent(2, 'draft', 'end'),
      END,
    ]);
    const values = flowValues(flow);
    expect(values['flowSteps']).toBe(
      '\n' +
      [
        '1. Start the flow.',
        '2. Check to pass: Is check met?',
        '   - True: go to step 3 (the agent `.claude/agents/draft-agent.md`)',
        '   - False: go to the end of the flow',
        '3. Run the agent `.claude/agents/draft-agent.md`: Runs draft.',
        '4. End the flow, producing the artifact `out.md`.',
      ].join('\n'),
    );
    expect(values['flowConditions']).toBe(
      '\n' +
      [
        '1. Is check met?',
        '   - True: go to step 3 (the agent `.claude/agents/draft-agent.md`)',
        '   - False: go to the end of the flow',
      ].join('\n'),
    );
  });

  it('F-05 AC-010 names a Condition that a route goes to by its step number and its check', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'c1' },
      condition(1, 'c1', { to: 'c2' }, { stop: true }),
      condition(2, 'c2', { to: 'end' }, { stop: true }),
      END,
    ]);
    expect(flowValues(flow)['flowSteps']).toBe(
      '\n' +
      [
        '1. Start the flow.',
        '2. Check to pass: Is c1 met?',
        '   - True: go to step 3 (the check: Is c2 met?)',
        '   - False: stop and ask the person what to do: "The check did not pass: Is c1 met? What should happen next?"',
        '3. Check to pass: Is c2 met?',
        '   - True: go to the end of the flow',
        '   - False: stop and ask the person what to do: "The check did not pass: Is c2 met? What should happen next?"',
        '4. End the flow, producing the artifact `out.md`.',
      ].join('\n'),
    );
  });
});

describe('F-05 AC-011 an Agent step names the agent file and gives the agent description', () => {
  it('F-05 AC-011 names the agent file from the agent name, not its block id', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'draft' },
      { ...agent(1, 'draft', 'end'), name: 'review-agent', description: 'Reviews the draft.' },
      END,
    ]);
    expect(flowValues(flow)['flowSteps']).toBe(
      '\n' +
      [
        '1. Start the flow.',
        '2. Run the agent `.claude/agents/review-agent.md`: Reviews the draft.',
        '3. End the flow, producing the artifact `out.md`.',
      ].join('\n'),
    );
  });

  it('F-05 AC-011 gives the file and the description of every Agent step in the route', () => {
    const steps = flowValues(fixtureFlow())['flowSteps'] ?? '';
    expect(steps).toContain('`.claude/agents/draft-agent.md`: Runs draft.');
    expect(steps).toContain('`.claude/agents/publish-agent.md`: Runs publish.');
  });
});

describe('F-05 AC-012 a Condition step gives its check and its routes', () => {
  it('F-05 AC-012 gives the description as the check to pass, with the true route as the next step', () => {
    const steps = flowValues(fixtureFlow())['flowSteps'] ?? '';
    expect(steps).toContain(
      '3. Check to pass: Is review met?\n   - True: go to step 4 (the agent `.claude/agents/publish-agent.md`)',
    );
  });

  it('F-05 AC-012 names a false route that stops the flow as stop and ask the person what to do', () => {
    const steps = flowValues(fixtureFlow())['flowSteps'] ?? '';
    expect(steps).toContain(
      '   - False: stop and ask the person what to do: "The check did not pass: Is gate met? What should happen next?"',
    );
  });
});

describe('F-05 AC-013 a retry is a numbered rule that names the agent and the round limit', () => {
  it('F-05 AC-013 writes the return of a Condition to an earlier Agent as a rule with its round limit', () => {
    const rules = flowValues(fixtureFlow())['flowConditions'] ?? '';
    expect(rules).toContain(
      '   - False: return to step 2 (the agent `.claude/agents/draft-agent.md`), with at most 2 rounds',
    );
  });
});

describe('F-04 AC-015 the steps list the blocks of the walk, the Start first and the End last', () => {
  it('numbers each step of the walk with its agent file and description, the Start first and the End last', () => {
    expect(flowValues(fixtureFlow())['flowSteps']).toBe(
      '\n' +
      [
        '1. Start the flow.',
        '2. Run the agent `.claude/agents/draft-agent.md`: Runs draft.',
        '3. Check to pass: Is review met?',
        '   - True: go to step 4 (the agent `.claude/agents/publish-agent.md`)',
        '   - False: return to step 2 (the agent `.claude/agents/draft-agent.md`), with at most 2 rounds',
        '4. Run the agent `.claude/agents/publish-agent.md`: Runs publish.',
        '5. Check to pass: Is gate met?',
        '   - True: go to the end of the flow',
        '   - False: stop and ask the person what to do: "The check did not pass: Is gate met? What should happen next?"',
        '6. End the flow, producing the artifact `out.md`.',
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
      '\n' +
      [
        '1. Start the flow.',
        '2. Run the agent `.claude/agents/draft-agent.md` with the arguments `feature-id` (required, F-XX), `note` (optional): Runs draft.',
        '3. End the flow, producing the artifact `out.md`.',
      ].join('\n'),
    );
  });

  it('gives only the Start and End steps for a flow with no Agent block', () => {
    const flow = flowWith([{ index: 0, id: 'start', kind: 'start', next: 'end' }, END]);
    expect(flowValues(flow)['flowSteps']).toBe('\n1. Start the flow.\n2. End the flow, producing the artifact `out.md`.');
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
        '   - True: go to step 4 (the agent `.claude/agents/publish-agent.md`)',
        '   - False: return to step 2 (the agent `.claude/agents/draft-agent.md`), with at most 2 rounds',
        '2. Is gate met?',
        '   - True: go to the end of the flow',
        '   - False: stop and ask the person what to do: "The check did not pass: Is gate met? What should happen next?"',
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
        `return to step 2 (the agent \`.claude/agents/draft-agent.md\`), with at most ${roundLimit} rounds`,
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
        '   - True: stop and ask the person what to do: "The check did not pass: Is the build green? What should happen next?"',
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
    expect(flowValues(flow)['flowSteps']).toContain('3. Run the agent `.claude/agents/b-agent.md`');
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
  it('renders a rules section with no rules as its heading alone', () => {
    const flow = flowWith([{ index: 0, id: 'start', kind: 'start', next: 'draft' }, agent(1, 'draft', 'end'), END]);
    expect(renderLayout('## Rules{{flowConditions}}\n', flowValues(flow), '.claude/commands/build.md')).toBe(
      '## Rules\n',
    );
  });
});

describe('F-04 AC-040 a line break in a description or a hint does not split a numbered line', () => {
  it('writes an Agent description, a Condition description and an argument hint on one line each', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'draft' },
      {
        ...agent(1, 'draft', 'check'),
        description: 'Runs\n  the draft.',
        arguments: [{ index: 0, id: 'feature-id', required: true, hint: 'F-XX\r\nnow' }],
      },
      { ...condition(2, 'check', { to: 'end' }, { stop: true }), description: 'Is it\r\nmet?' },
      END,
    ]);
    const values = flowValues(flow);
    expect(values['flowSteps']).toBe(
      '\n' +
      [
        '1. Start the flow.',
        '2. Run the agent `.claude/agents/draft-agent.md` with the arguments `feature-id` (required, F-XX now): Runs the draft.',
        '3. Check to pass: Is it met?',
        '   - True: go to the end of the flow',
        '   - False: stop and ask the person what to do: "The check did not pass: Is it met? What should happen next?"',
        '4. End the flow, producing the artifact `out.md`.',
      ].join('\n'),
    );
    expect(values['flowConditions']).toBe(
      '\n' +
      [
        '1. Is it met?',
        '   - True: go to the end of the flow',
        '   - False: stop and ask the person what to do: "The check did not pass: Is it met? What should happen next?"',
      ].join('\n'),
    );
  });

  it('writes a flow argument hint with a line break on one line', () => {
    const flow = { ...fixtureFlow(), arguments: [{ index: 0, id: 'note', required: false, hint: 'a\nb' }] };
    expect(flowValues(flow)['flowArguments']).toBe('\n- `note` (optional, a b)');
  });
});

describe('F-05 AC-009 each artifact of the flow is written with its label and template text', () => {
  it('F-05 AC-009 writes each artifact in order, with its label as a heading and its template text under it', () => {
    const flow = {
      ...fixtureFlow(),
      artifacts: [
        { label: 'plan.md', template: 'Task list, in order.\nOne task per line.' },
        { label: 'notes.md', template: 'Open questions.' },
      ],
    };
    expect(flowValues(flow)['flowArtifacts']).toBe(
      '\n' +
      [
        '### plan.md',
        '',
        'Task list, in order.',
        'One task per line.',
        '',
        '### notes.md',
        '',
        'Open questions.',
      ].join('\n'),
    );
  });

  it('F-05 AC-009 writes No artifacts when the flow has no artifacts', () => {
    expect(flowValues({ ...fixtureFlow(), artifacts: [] })['flowArtifacts']).toBe('\nNo artifacts');
  });

  it('F-05 AC-009 writes an artifact with an empty template as its label alone, and drops trailing blank lines', () => {
    const flow = {
      ...fixtureFlow(),
      artifacts: [
        { label: 'empty.md', template: '  \n' },
        { label: 'trimmed.md', template: 'Text.\n\n' },
      ],
    };
    expect(flowValues(flow)['flowArtifacts']).toBe('\n### empty.md\n\n### trimmed.md\n\nText.');
  });

  it('F-05 AC-009 drops leading blank lines of a template but keeps the indentation of its first text line', () => {
    const flow = {
      ...fixtureFlow(),
      artifacts: [
        { label: 'lead.md', template: '\n  \nLead.' },
        { label: 'indent.md', template: '  Indented.' },
      ],
    };
    expect(flowValues(flow)['flowArtifacts']).toBe('\n### lead.md\n\nLead.\n\n### indent.md\n\n  Indented.');
  });

  it('F-05 AC-009 keeps a label that holds line breaks on one heading line', () => {
    const flow = { ...fixtureFlow(), artifacts: [{ label: 'plan\r\n.md', template: 'Text.' }] };
    expect(flowValues(flow)['flowArtifacts']).toBe('\n### plan .md\n\nText.');
  });
});

describe('F-05 AC-014 the End step names the produced artifact, or writes no artifact line', () => {
  it('F-05 AC-014 names the producedArtifact on the End step', () => {
    expect(flowValues(fixtureFlow())['flowSteps']).toContain('6. End the flow, producing the artifact `out.md`.');
  });

  it('F-05 AC-014 writes the plain End step when the producedArtifact is empty', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'draft' },
      agent(1, 'draft', 'end'),
      { ...END, producedArtifact: '' },
    ]);
    expect(flowValues(flow)['flowSteps']).toBe(
      '\n' +
      [
        '1. Start the flow.',
        '2. Run the agent `.claude/agents/draft-agent.md`: Runs draft.',
        '3. End the flow.',
      ].join('\n'),
    );
  });

  it('F-05 AC-014 writes the plain End step when the producedArtifact is blank', () => {
    const flow = flowWith([
      { index: 0, id: 'start', kind: 'start', next: 'end' },
      { ...END, producedArtifact: ' \n ' },
    ]);
    expect(flowValues(flow)['flowSteps']).toBe('\n1. Start the flow.\n2. End the flow.');
  });
});
