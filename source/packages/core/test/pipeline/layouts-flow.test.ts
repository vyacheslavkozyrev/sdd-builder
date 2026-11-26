import { describe, expect, it } from 'vitest';
import type { AgentBlock, Argument, Block, ConditionBlock, Flow, Route, Rule } from '../../src/pipeline/model.js';
import { GenerationError } from '../../src/pipeline/generate/error.js';
import { renderLayout } from '../../src/pipeline/generate/render.js';
import { flowValues } from '../../src/pipeline/generate/values-flow.js';
import { validConfig } from './analyze-fixture.js';
import { readLayout } from './layouts-loader.js';

const LAYOUT_PATH = 'claude-code/flow.md';

// The real layout of `source/templates/claude-code/flow.md`, rendered with the real values of the flow.
// The rules the tags name (F-16, AC-029): a tag is written as the file name of its rule.
const RULES: readonly Rule[] = [
  { index: 0, id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Style guide', text: 'Keep it short.' },
  { index: 1, id: 'fc7318c7-863c-5a34-9269-e28c8dd30284', title: 'Naming', text: 'Name it well.' },
];

function render(flow: Flow): string {
  return renderLayout(readLayout(LAYOUT_PATH), flowValues(flow, RULES), LAYOUT_PATH);
}

// The valid one-flow fixture (Start → Agent → End), with its flow changed by `change`; every other part is kept.
function flowOf(change: Partial<Flow> = {}): Flow {
  const flow = validConfig().pipeline.flows[0];
  if (flow === undefined) throw new Error('the fixture has no flow');
  return { ...flow, ...change };
}

function argument(index: number, id: string, required: boolean, hint = ''): Argument {
  return { index, id, required, hint };
}

// Block ids are GUIDs (F-16 AC-028). The helpers take a label: its GUID comes from this table (a GUID passes through),
// and the label names the agent file and reads in the description.
const IDS: Readonly<Record<string, string>> = {
  draft: 'ec22bab1-2420-5e5e-93ac-e548cae9ed63',
  review: '82c969a4-365a-5525-8168-6ae1093b1867',
  publish: '9ed0bdfe-f040-5934-9233-bdec297f9995',
  end: '128fea8a-2e63-5352-bd64-02ceddc0d0cb',
};

function idOf(label: string): string {
  return IDS[label] ?? label;
}

function agent(index: number, label: string, next: string, args: readonly Argument[] = []): AgentBlock {
  return {
    index,
    id: idOf(label),
    kind: 'agent',
    name: `${label}-agent`,
    description: `Runs ${label}.`,
    arguments: [...args],
    next: idOf(next),
  };
}

function condition(index: number, label: string, whenTrue: Route, whenFalse: Route): ConditionBlock {
  return { index, id: idOf(label), kind: 'condition', description: `Is ${label} met?`, true: whenTrue, false: whenFalse };
}

const START: Block = { index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: 'ec22bab1-2420-5e5e-93ac-e548cae9ed63' };
const END: Block = { index: 99, id: '128fea8a-2e63-5352-bd64-02ceddc0d0cb', kind: 'end', outcome: 'done', producedArtifact: 'out.md' };

// Start → draft → review; the true route of review goes on to publish, its false route returns to draft with a
// round limit of 2. Publish goes on to the End.
function loopFlow(): Flow {
  return flowOf({
    blocks: [
      START,
      agent(1, 'draft', 'review'),
      condition(2, 'review', { to: '9ed0bdfe-f040-5934-9233-bdec297f9995' }, { to: 'ec22bab1-2420-5e5e-93ac-e548cae9ed63', roundLimit: 2 }),
      agent(3, 'publish', 'end'),
      END,
    ],
  });
}

// The lines of one section of a rendered command: those after its heading, up to the next heading.
function section(text: string, heading: string): string[] {
  const lines = text.split('\n');
  const start = lines.indexOf(heading);
  if (start === -1) throw new Error(`the text has no ${heading} heading`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return end === -1 ? rest : rest.slice(0, end);
}

describe('F-05 layouts: the flow command layout', () => {
  it('F-05 AC-006 writes the flow name as the title, its description under Purpose, and its body as Context with the line breaks kept', () => {
    const body = 'First line.\n\nSecond line,\n  indented.';
    const text = render(flowOf({ name: 'Build the thing', description: 'Builds the project.', body }));
    expect(text).toContain(
      '# Build the thing\n\n## Purpose\n\nBuilds the project.\n\n## Context\n\nFirst line.\n\nSecond line,\n  indented.\n\n## Arguments',
    );
  });

  it('F-05 AC-006 writes the description in the frontmatter as a quoted YAML string, escaping a quote and keeping `: ` inside it, and as plain text under Purpose', () => {
    const text = render(flowOf({ description: 'Builds "it": the project.' }));
    expect(text.split('\n').slice(0, 4)).toEqual([
      '---',
      'description: "Builds \\"it\\": the project."',
      'rules: none',
      '---',
    ]);
    expect(section(text, '## Purpose')).toEqual(['', 'Builds "it": the project.', '']);
  });

  it('F-05 AC-006 writes an empty quoted description in the frontmatter when the flow has none', () => {
    const flow = { ...flowOf() };
    delete flow.description;
    expect(render(flow).split('\n')[1]).toBe('description: ""');
  });

  it('F-05 AC-006 leaves the Context heading with nothing under it when the body is blank', () => {
    const text = render(flowOf({ body: '  \n ' }));
    expect(text).toContain('## Context\n\n## Arguments');
  });

  it('F-05 AC-007 writes the rule tags of the flow in the frontmatter, as one comma-separated list in their order', () => {
    const ruleTags = [
      { index: 0, ruleId: '8f99cc27-78ab-5895-8637-5c13d7429593' },
      { index: 1, ruleId: 'fc7318c7-863c-5a34-9269-e28c8dd30284' },
    ];
    expect(render(flowOf({ ruleTags })).split('\n')[2]).toBe('rules: style-guide, naming');
  });

  it('F-05 AC-007 writes none in the frontmatter when the flow has no rule tags', () => {
    expect(render(flowOf()).split('\n')[2]).toBe('rules: none');
    expect(render(flowOf({ ruleTags: [] })).split('\n')[2]).toBe('rules: none');
  });

  it('F-05 AC-008 writes each argument on its own line, with its id, whether it is required, and its hint', () => {
    const text = render(flowOf({ arguments: [argument(0, 'ccc656eb-7dbe-5012-9af8-c2559c43ae31', true, 'the subject'), argument(1, '80398aba-a45b-51b8-971a-54782c4bdfde', false)] }));
    expect(section(text, '## Arguments')).toEqual(['- `ccc656eb-7dbe-5012-9af8-c2559c43ae31` (required, the subject)', '- `80398aba-a45b-51b8-971a-54782c4bdfde` (optional)', '']);
  });

  it('F-05 AC-008 writes No arguments under the Arguments heading when the flow has none', () => {
    expect(section(render(flowOf()), '## Arguments')).toEqual(['No arguments', '']);
  });

  it('F-05 AC-009 writes each artifact under the Artifacts heading with its label and its template text', () => {
    const artifacts = [
      { label: 'plan.md', template: '\n# Plan\n\nSteps.\n\n' },
      { label: 'notes.md', template: 'Notes.' },
    ];
    expect(section(render(flowOf({ artifacts })), '## Artifacts')).toEqual([
      '### plan.md',
      '',
      '# Plan',
      '',
      'Steps.',
      '',
      '### notes.md',
      '',
      'Notes.',
      '',
    ]);
  });

  it('F-05 AC-009 writes No artifacts under the Artifacts heading when the flow has none', () => {
    expect(section(render(flowOf({ artifacts: [] })), '## Artifacts')).toEqual(['No artifacts', '']);
  });

  it('F-05 AC-010 writes the route from Start to End as numbered steps, Start first and End last, with no block written twice', () => {
    const steps = section(render(loopFlow()), '## Steps').filter((line) => /^\d+\. /.test(line));
    expect(steps).toEqual([
      '1. Start the flow.',
      '2. Run the agent `.claude/agents/draft-agent.md`: Runs draft.',
      '3. Check to pass: Is review met?',
      '4. Run the agent `.claude/agents/publish-agent.md`: Runs publish.',
      '5. End the flow, producing the artifact `out.md`.',
    ]);
    expect(steps.filter((line) => line.includes('draft-agent.md'))).toHaveLength(1);
  });

  it('F-05 AC-011 names the agent file of an Agent step and gives the agent description, with its arguments when it has some', () => {
    const flow = flowOf({
      blocks: [START, agent(1, 'draft', 'end', [argument(0, 'ccc656eb-7dbe-5012-9af8-c2559c43ae31', true)]), END],
    });
    expect(section(render(flow), '## Steps')).toContain(
      '2. Run the agent `.claude/agents/draft-agent.md` with the arguments `ccc656eb-7dbe-5012-9af8-c2559c43ae31` (required): Runs draft.',
    );
  });

  it('F-05 AC-012 gives the check of a Condition step, names its true route as the next step, and writes stop and ask when the false route stops the flow', () => {
    const flow = flowOf({
      blocks: [
        { ...START, next: '82c969a4-365a-5525-8168-6ae1093b1867' },
        condition(1, 'review', { to: '9ed0bdfe-f040-5934-9233-bdec297f9995' }, { stop: true }),
        agent(2, 'publish', 'end'),
        END,
      ],
    });
    expect(section(render(flow), '## Steps')).toEqual([
      '1. Start the flow.',
      '2. Check to pass: Is review met?',
      '   - True: go to step 3 (the agent `.claude/agents/publish-agent.md`)',
      '   - False: stop and ask the person what to do: "The check did not pass: Is review met? What should happen next?"',
      '3. Run the agent `.claude/agents/publish-agent.md`: Runs publish.',
      '4. End the flow, producing the artifact `out.md`.',
      '',
    ]);
  });

  it('F-05 AC-013 writes a retry as a numbered rule that names the agent to return to and the round limit', () => {
    expect(section(render(loopFlow()), '## Rules')).toEqual([
      '1. Is review met?',
      '   - True: go to step 4 (the agent `.claude/agents/publish-agent.md`)',
      '   - False: return to step 2 (the agent `.claude/agents/draft-agent.md`), with at most 2 rounds',
      '',
    ]);
  });

  it('F-05 AC-013 rejects a retry whose round limit is outside 1 to 5', () => {
    const flow = flowOf({
      blocks: [
        START,
        agent(1, 'draft', 'review'),
        condition(2, 'review', { to: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' }, { to: 'ec22bab1-2420-5e5e-93ac-e548cae9ed63', roundLimit: 6 }),
        END,
      ],
    });
    expect(() => render(flow)).toThrow(GenerationError);
  });

  it('F-05 AC-014 names the produced artifact in the End step, and writes no artifact when the End has none', () => {
    expect(section(render(loopFlow()), '## Steps').at(-2)).toBe('5. End the flow, producing the artifact `out.md`.');
    const plain = flowOf({ blocks: [{ ...START, next: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' }, { ...END, producedArtifact: '' }] });
    const text = render(plain);
    expect(section(text, '## Steps')).toEqual(['1. Start the flow.', '2. End the flow.', '']);
    expect(text).not.toContain('producing');
  });

  it('F-05 AC-015 writes the Start and End steps and no rule for a flow with only those two blocks, and does not fail', () => {
    const flow = flowOf({ blocks: [{ ...START, next: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' }, { ...END, producedArtifact: '' }] });
    const text = render(flow);
    expect(text).toContain('## Steps\n1. Start the flow.\n2. End the flow.\n\n## Rules\n\n## Approval');
  });

  it('F-05 AC-006 writes the whole command of a one-flow fixture, with no blank line left by the empty values', () => {
    expect(render(flowOf({ description: 'Builds the project.' }))).toBe(
      [
        '---',
        'description: "Builds the project."',
        'rules: none',
        '---',
        '',
        '# Build',
        '',
        '## Purpose',
        '',
        'Builds the project.',
        '',
        '## Context',
        '',
        'Runs the build agent.',
        '',
        '## Arguments',
        'No arguments',
        '',
        '## Artifacts',
        '### out.md',
        '',
        'The output',
        '',
        '## Steps',
        '1. Start the flow.',
        '2. Run the agent `.claude/agents/build-agent.md`: Builds the project.',
        '3. End the flow, producing the artifact `out.md`.',
        '',
        '## Rules',
        '',
        '## Approval',
        '',
      ].join('\n'),
    );
  });

  it('F-05 AC-006 writes the approval paragraph under Approval when the flow has approval on, and nothing under it when off', () => {
    expect(section(render(flowOf({ approval: true })), '## Approval')).toEqual([
      '',
      "The process stops here for the person's approval at the end of this flow.",
      '',
    ]);
    expect(section(render(flowOf()), '## Approval')).toEqual(['']);
  });
});
