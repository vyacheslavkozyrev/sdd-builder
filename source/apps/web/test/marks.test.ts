import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { addFlow } from '../src/builder/model.js';
import { marksFor, rulesFor } from '../src/builder/marks.js';

type Pipeline = pipeline.Pipeline;
type Finding = pipeline.Finding;
type Flow = pipeline.Flow;
type Block = pipeline.Block;

const RULES = rulesFor([{ name: 'Testing', description: 'Tests come first.' }]);

function flow(id: string, extra: Partial<Flow> = {}): Flow {
  return { id, name: `Name ${id}`, description: '', arguments: '', blocks: [], ...extra };
}

function start(id: string, link?: pipeline.BlockLink): Block {
  return link === undefined ? { id, kind: 'start' } : { id, kind: 'start', connectedTo: link };
}

function end(id: string): Block {
  return { id, kind: 'end' } as Block;
}

function config(flows: Flow[]): Pipeline {
  return { name: 'pipeline', description: '', arguments: [], flows };
}

// A flow with a Start chained to an End, so it has no structural finding of its own.
function sound(id: string, extra: Partial<Flow> = {}): Flow {
  return flow(id, {
    blocks: [start(`${id}-start`, { to: `${id}-end`, label: 'next' }), end(`${id}-end`)],
    ...extra,
  });
}

function analyzer(p: Pipeline): Finding[] {
  return pipeline.analyzeStructure({ schemaVersion: 2, rules: RULES, pipeline: p });
}

describe('F-11 AC-035 a finding about a flow or an arrow is shown beside that item', () => {
  it('F-11 AC-035 places a flow finding on the box of that flow, with its severity', () => {
    const p = config([sound('specify', { connectedTo: { to: 'plan', label: 'spec.md' } }), flow('plan')]);
    const marks = marksFor(p, RULES);
    expect(marks.boxes[0]).toEqual([]);
    expect(marks.boxes[1]).toEqual([
      {
        severity: 'blocker',
        path: 'pipeline.flows[1]',
        message: 'The flow has no Start block. Add one Start block.',
      },
      {
        severity: 'blocker',
        path: 'pipeline.flows[1]',
        message: 'The flow has no End block. Add at least one End block.',
      },
    ]);
    expect(marks.notDrawn).toEqual([]);
  });

  it('F-11 AC-035 places a rule-tag finding on the box of the flow that carries the tag', () => {
    const p = config([sound('specify', { ruleTags: ['missing'] })]);
    const marks = marksFor(p, RULES);
    expect(marks.boxes[0]).toEqual([
      {
        severity: 'blocker',
        path: 'pipeline.flows[0].ruleTags[0]',
        message: 'The rule tag "missing" names no rule. Name an id of the rules.',
      },
    ]);
    expect(marks.notDrawn).toEqual([]);
  });

  it('F-11 AC-035 places a finding on flow connectedTo on the arrow leaving that flow', () => {
    const p = config([sound('specify', { connectedTo: { to: 'ghost', label: 'spec.md' } }), sound('plan')]);
    const marks = marksFor(p, RULES);
    expect(marks.arrows[0]).toHaveLength(1);
    expect(marks.arrows[0]?.[0]?.path).toBe('pipeline.flows[0].connectedTo');
    expect(marks.arrows[0]?.[0]?.severity).toBe('blocker');
    expect(marks.boxes[0]).toEqual([]);
    expect(marks.notDrawn).toEqual([]);
  });

  it('F-11 AC-035 places a reach finding on the box of the unreached flow', () => {
    const p = config([
      sound('specify', { connectedTo: { to: 'plan', label: 'spec.md' } }),
      sound('plan'),
      sound('notes'),
    ]);
    const marks = marksFor(p, RULES);
    expect(marks.boxes[2]).toEqual([
      {
        severity: 'blocker',
        path: 'pipeline.flows[2]',
        message: 'The flow "notes" is not reached from the first flow. Connect it with a flow Connection from a reached flow, or remove it.',
      },
    ]);
    expect(marks.boxes[0]).toEqual([]);
    expect(marks.boxes[1]).toEqual([]);
  });

  it('F-11 AC-035 keeps the analyzer order of the findings on one box', () => {
    const p = config([flow('plan', { ruleTags: ['a', 'b'] })]);
    const marks = marksFor(p, RULES);
    expect(marks.boxes[0]?.map((finding) => finding.path)).toEqual(
      analyzer(p)
        .filter((finding) => finding.path.startsWith('pipeline.flows[0]') && !finding.path.includes('blocks'))
        .map((finding) => finding.path),
    );
  });
});

describe('F-11 AC-036 a finding that names no drawn item is listed as not drawn', () => {
  it('F-11 AC-036 puts a block finding under not drawn, with its path', () => {
    const p = config([
      sound('specify', {
        blocks: [start('specify-start', { to: 'ghost', label: 'next' }), end('specify-end')],
      }),
    ]);
    const marks = marksFor(p, RULES);
    expect(marks.boxes[0]).toEqual([]);
    expect(marks.notDrawn.map((finding) => finding.path)).toEqual([
      'pipeline.flows[0].blocks[0].connectedTo',
      'pipeline.flows[0].blocks[1]',
    ]);
    expect(marks.notDrawn[0]?.message).toContain('ghost');
  });

  it('F-11 AC-036 puts a rule tag of the pipeline as a whole under not drawn, with its path', () => {
    const p: Pipeline = { ...config([sound('specify')]), ruleTags: ['missing'] };
    const marks = marksFor(p, RULES);
    expect(marks.boxes[0]).toEqual([]);
    expect(marks.notDrawn).toEqual([
      {
        severity: 'blocker',
        path: 'pipeline.ruleTags[0]',
        message: 'The rule tag "missing" names no rule. Name an id of the rules.',
      },
    ]);
  });

  it('F-11 AC-036 puts a pipeline-level finding under not drawn, with its path', () => {
    const p = config([]);
    const marks = marksFor(p, RULES);
    expect(marks.boxes).toEqual([]);
    expect(marks.arrows).toEqual([]);
    expect(marks.notDrawn).toEqual([
      {
        severity: 'blocker',
        path: 'pipeline.flows',
        message: 'The pipeline has no flow. Add at least one flow.',
      },
    ]);
  });
});

describe('F-11 AC-037 the marks follow each edit and never block one', () => {
  it('F-11 AC-037 recomputes the marks from the pipeline it is given, and does not change that pipeline', () => {
    const before = config([sound('specify'), flow('plan')]);
    const snapshot = JSON.stringify(before);
    const withBlocker = marksFor(before, RULES);
    expect(withBlocker.boxes[1]?.length).toBeGreaterThan(0);
    expect(JSON.stringify(before)).toBe(snapshot);

    const fixed = config([sound('specify', { connectedTo: { to: 'plan', label: 'spec.md' } }), sound('plan')]);
    const after = marksFor(fixed, RULES);
    expect(after.boxes.flat()).toEqual([]);
    expect(after.notDrawn).toEqual([]);
  });

  it('F-11 AC-037 a blocker does not stop a further edit of the same pipeline', () => {
    const blocked = config([flow('plan')]);
    expect(marksFor(blocked, RULES).boxes[0]?.length).toBeGreaterThan(0);
    const added = addFlow(blocked);
    expect(added.pipeline.flows).toHaveLength(2);
  });
});

describe('F-11 AC-038 brief problems are not on the Pipeline tab', () => {
  // A brief with every problem analyzeBrief reports: no name, no idea, no stack, no rules.
  const blankBrief = (p: Pipeline) => ({ schemaVersion: 2 as const, rules: [], pipeline: p, name: '', idea: '' });

  it('F-11 AC-038 reports a blank name and a blank idea in the brief checks, and not in the marks', () => {
    const p = config([sound('specify')]);
    const briefMessages = pipeline.analyzeBrief(blankBrief(p)).map((finding) => finding.path);
    expect(briefMessages).toEqual(expect.arrayContaining(['name', 'idea', 'stack.language', 'rules']));
    const marks = marksFor(p, []);
    const drawn = [...marks.boxes.flat(), ...marks.arrows.flat(), ...marks.notDrawn];
    expect(drawn).toEqual([]);
  });

  it('F-11 AC-038 leaves the brief out of the marks: marks are the same whatever the brief says', () => {
    const p = config([sound('specify')]);
    const withBrief = marksFor(p, RULES);
    expect(withBrief.notDrawn).toEqual([]);
    expect(withBrief.boxes.flat()).toEqual([]);
    expect(withBrief.arrows.flat()).toEqual([]);
    expect(pipeline.analyzeStructure(blankBrief(p))).toEqual(analyzer(p));
  });
});

describe('F-11 AC-039 the marks are the analyzer findings, with no rule of the builder', () => {
  it('F-11 AC-039 places every analyzer finding exactly once, and no other', () => {
    const cases: Pipeline[] = [
      config([]),
      config([flow('plan', { ruleTags: ['missing'] })]),
      config([
        sound('specify', { connectedTo: { to: 'ghost', label: 'spec.md' } }),
        sound('plan', { connectedTo: { to: 'specify', label: 'plan.md' } }),
      ]),
      config([sound('specify', { blocks: [start('a'), start('b'), end('c')] })]),
    ];
    for (const p of cases) {
      const marks = marksFor(p, RULES);
      const placed = [...marks.boxes.flat(), ...marks.arrows.flat(), ...marks.notDrawn];
      const key = (finding: Finding): string => JSON.stringify(finding);
      expect(placed.map(key).sort()).toEqual(analyzer(p).map(key).sort());
    }
  });

  it('F-11 AC-039 gives the same findings for a fixed config each time', () => {
    const p = config([sound('specify', { connectedTo: { to: 'ghost', label: 'spec.md' } })]);
    expect(analyzer(p)).toEqual(analyzer(p));
    expect(marksFor(p, RULES)).toEqual(marksFor(p, RULES));
  });

  it('F-11 AC-039 maps a rule block to a rule with the F-10 id, the name as title and the description as text', () => {
    expect(rulesFor([{ name: 'Clean Code!', description: 'Keep it small.' }])).toEqual([
      { id: 'clean-code-', title: 'Clean Code!', text: 'Keep it small.' },
    ]);
  });

  it('F-11 AC-039 a rule tag names a rule the step 2 blocks supply, so it is not flagged', () => {
    const p = config([sound('specify', { ruleTags: ['testing'] })]);
    expect(marksFor(p, RULES).boxes.flat()).toEqual([]);
    expect(marksFor(p, []).boxes[0]).toHaveLength(1);
  });
});
