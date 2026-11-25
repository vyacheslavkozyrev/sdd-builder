import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { addFlow } from '../src/builder/model.js';
import { addBlock } from '../src/builder/blocks.js';
import { disabledControls, structureMarks } from '../src/builder/marks.js';
import type { Pipeline, PlacedFinding, StructureMarks } from '../src/builder/marks.js';

type Flow = pipeline.Flow;

// A flow that the analyzer accepts: a Start that leads to one Agent, the Agent to one End, a body, and an
// artifact the End produces. `next` is set only when given.
function flowOf(id: string, next?: string): Flow {
  const artifact = `${id}.md`;
  const base: Flow = {
    index: 0,
    id,
    name: id,
    arguments: [],
    body: `Do the ${id} work.`,
    artifacts: [{ label: artifact, template: 'output.md' }],
    approval: false,
    blocks: [
      { index: 0, id: `${id}-start`, kind: 'start', next: `${id}-work` },
      {
        index: 1,
        id: `${id}-work`,
        kind: 'agent',
        name: `${id}-work`,
        description: `Does the ${id} work.`,
        arguments: [],
        next: `${id}-end`,
      },
      { index: 2, id: `${id}-end`, kind: 'end', outcome: 'done', producedArtifact: artifact },
    ],
  };
  return next === undefined ? base : { ...base, next };
}

// A pipeline holding the given flows, numbered by their position in the list.
function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((flow, i) => ({ ...flow, index: i })),
  };
}

// The analyzer's own findings for the pipeline, with the same rules the builder passes (none).
function analyzerFindings(pipelineState: Pipeline): readonly pipeline.Finding[] {
  return pipeline.analyzeStructure({ schemaVersion: 2, rules: [], pipeline: pipelineState });
}

// The placed finding whose message is `message`. A test fails when there is none.
function placed(marks: StructureMarks, message: string): PlacedFinding {
  const found = marks.findings.find((entry) => entry.finding.message === message);
  if (found === undefined) {
    throw new Error(`no finding with the message "${message}"`);
  }
  return found;
}

// The placed finding at `path`. A test fails when there is none.
function placedAt(marks: StructureMarks, path: string): PlacedFinding {
  const found = marks.findings.find((entry) => entry.finding.path === path);
  if (found === undefined) {
    throw new Error(`no finding at the path "${path}"`);
  }
  return found;
}

describe('F-11 AC-033 every structural finding goes to a flow box, an arrow, or none', () => {
  it('places the analyzer findings in the analyzer order, with the analyzer messages and no wording of its own', () => {
    const state = pipelineOf({ ...flowOf('plan'), body: '', next: 'ghost' }, flowOf('build'));
    const marks = structureMarks(state, []);
    expect(marks.findings.map((entry) => entry.finding)).toEqual(analyzerFindings(state));
  });

  it('places a flow-level finding on the box of its flow', () => {
    const endOnly: Flow = {
      ...flowOf('plan'),
      blocks: [{ index: 0, id: 'plan-end', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' }],
    };
    const state = pipelineOf(endOnly);
    const marks = structureMarks(state, []);
    expect(placed(marks, 'must have one Start block, got none').placement).toEqual({ kind: 'flow', flowId: 'plan' });
  });

  it('places a finding on a flow next on the arrow whose source is that flow', () => {
    const state = pipelineOf({ ...flowOf('plan'), next: 'ghost' });
    const marks = structureMarks(state, []);
    const entry = placed(marks, 'must name a flow of this pipeline, got ghost');
    expect(entry.finding.path).toBe('pipeline.flows.0.next');
    expect(entry.placement).toEqual({ kind: 'arrow', source: 'plan' });
    expect(marks.blockedFlowIds).toEqual(['plan']);
  });

  it('gives no finding for a single flow with no next, so no arrow is marked', () => {
    const marks = structureMarks(pipelineOf(flowOf('plan')), []);
    expect(marks.findings).toEqual([]);
  });

  it('places a finding inside a flow at a field of the flow on none', () => {
    const state = pipelineOf({ ...flowOf('plan'), body: '' });
    expect(placedAt(structureMarks(state, []), 'pipeline.flows.0.body').placement).toEqual({ kind: 'none' });
  });

  it('places a finding with no drawn item on none', () => {
    const state = pipelineOf({ ...flowOf('plan'), name: '' });
    const marks = structureMarks(state, []);
    expect(placed(marks, 'must not be blank').placement).toEqual({ kind: 'none' });
  });
});

describe('F-11 AC-034 a flow with a blocker is marked on its box', () => {
  it('marks the box of a flow with a blocker', () => {
    const state = pipelineOf({ ...flowOf('plan'), body: '' });
    const marks = structureMarks(state, []);
    expect(marks.blockedFlowIds).toEqual(['plan']);
  });

  it('does not mark a flow that has no blocker', () => {
    const state = pipelineOf(flowOf('plan', 'build'), { ...flowOf('build'), index: 1, body: '' });
    const marks = structureMarks(state, []);
    expect(marks.blockedFlowIds).toEqual(['build']);
  });

  it('marks no box when the pipeline has no blocker', () => {
    const state = pipelineOf(flowOf('plan', 'build'), flowOf('build'));
    const marks = structureMarks(state, []);
    expect(marks.blockedFlowIds).toEqual([]);
  });

  it('marks an isolated flow as a blocker on its box in a pipeline of more than one flow', () => {
    const state = pipelineOf(flowOf('plan'), flowOf('build'));
    const isolated = analyzerFindings(state).find(
      (finding) => finding.rule === 'flow-link' && finding.path === 'pipeline.flows.1',
    );
    expect(isolated).toBeDefined();
    const marks = structureMarks(state, []);
    expect(placedAt(marks, 'pipeline.flows.1').placement).toEqual({ kind: 'flow', flowId: 'build' });
    expect(marks.blockedFlowIds).toEqual(['plan', 'build']);
  });

  it('does not mark a single flow with no next, since the pipeline has one flow', () => {
    const state = pipelineOf(flowOf('plan'));
    expect(structureMarks(state, []).blockedFlowIds).toEqual([]);
  });
});

describe('F-11 AC-036 a finding with no drawn item is listed, with its path and message', () => {
  it('keeps a flow missing its body on none, and still marks its box', () => {
    const state = pipelineOf({ ...flowOf('plan'), body: '' });
    const marks = structureMarks(state, []);
    const entry = placedAt(marks, 'pipeline.flows.0.body');
    expect(entry.finding.message).toBe('must not be blank');
    expect(entry.placement).toEqual({ kind: 'none' });
    expect(marks.blockedFlowIds).toEqual(['plan']);
  });

  it('lists every finding that is on none, so none is lost', () => {
    const state = pipelineOf({ ...flowOf('plan'), body: '', name: '' });
    const marks = structureMarks(state, []);
    const unplaced = marks.findings.filter((entry) => entry.placement.kind === 'none');
    expect(unplaced.map((entry) => entry.finding.path)).toEqual([
      'pipeline.flows.0.name',
      'pipeline.flows.0.body',
    ]);
  });
});

describe('F-11 AC-037 blockers disable no control', () => {
  it('reports no disabled control while a blocker exists', () => {
    const state = pipelineOf({ ...flowOf('plan'), body: '' }, flowOf('build'));
    const marks = structureMarks(state, []);
    expect(marks.blockedFlowIds.length).toBeGreaterThan(0);
    expect(disabledControls()).toEqual([]);
  });

  it('reports no disabled control when there is no blocker either', () => {
    expect(disabledControls()).toEqual([]);
  });
});

describe('F-11 AC-038 a new flow shows its marks at once', () => {
  it('shows the blank body and the missing Start of a new flow', () => {
    const base = pipelineOf(flowOf('plan'));
    const { pipeline: withNew, flowId } = addFlow(base);
    const marks = structureMarks(withNew, []);

    const start = placed(marks, 'must have one Start block, got none');
    expect(start.finding.path).toBe('pipeline.flows.1');
    expect(start.placement).toEqual({ kind: 'flow', flowId });

    const end = placed(marks, 'must have at least one End block, got none');
    expect(end.finding.path).toBe('pipeline.flows.1');
    expect(end.placement).toEqual({ kind: 'flow', flowId });

    const body = placed(marks, 'must not be blank');
    expect(body.finding.path).toBe('pipeline.flows.1.body');
    expect(body.placement).toEqual({ kind: 'none' });
  });

  it('marks the new flow box as blocked at once', () => {
    const base = pipelineOf(flowOf('plan'));
    const { pipeline: withNew, flowId } = addFlow(base);
    expect(structureMarks(withNew, []).blockedFlowIds).toEqual(['plan', flowId]);
  });
});

// The same flow with the first Agent's description blank.
function withBlankAgentDescription(flow: Flow): Flow {
  return {
    ...flow,
    blocks: flow.blocks.map((block) => (block.kind === 'agent' ? { ...block, description: '' } : block)),
  };
}

// A flow with a Start, an Agent, a Condition whose true route is set by the caller, a forward false route to
// the End, and the End. The Condition sits after the Agent, so a true route to the Agent is a return.
function conditionFlow(trueTo: string, roundLimit?: number): Flow {
  const trueRoute = roundLimit === undefined ? { to: trueTo } : { to: trueTo, roundLimit };
  return {
    ...flowOf('plan'),
    blocks: [
      { index: 0, id: 'plan-start', kind: 'start', next: 'plan-work' },
      {
        index: 1,
        id: 'plan-work',
        kind: 'agent',
        name: 'plan-work',
        description: 'Does the plan work.',
        arguments: [],
        next: 'plan-check',
      },
      {
        index: 2,
        id: 'plan-check',
        kind: 'condition',
        description: 'Is the plan done?',
        true: trueRoute,
        false: { to: 'plan-end' },
      },
      { index: 3, id: 'plan-end', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
    ],
  };
}

describe('F-12 AC-045 a finding that names a block is shown on that block, and one that names an arrow on the arrow', () => {
  it('places a finding at a block path on that block', () => {
    const dangling: Flow = {
      ...flowOf('plan'),
      blocks: [
        { index: 0, id: 'plan-start', kind: 'start', next: 'nowhere' },
        { index: 1, id: 'plan-end', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
      ],
    };
    const marks = structureMarks(pipelineOf(dangling), []);
    expect(placedAt(marks, 'pipeline.flows.0.blocks.0.next').placement).toEqual({
      kind: 'block',
      flowId: 'plan',
      blockId: 'plan-start',
    });
  });

  it('places the finding of an Agent with an empty next on that block, since no arrow leaves it', () => {
    const noRouteOut: Flow = {
      ...flowOf('plan'),
      blocks: [
        { index: 0, id: 'plan-start', kind: 'start', next: 'plan-work' },
        { index: 1, id: 'plan-work', kind: 'agent', name: 'plan-work', description: 'Work.', arguments: [], next: '' },
        { index: 2, id: 'plan-end', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
      ],
    };
    const marks = structureMarks(pipelineOf(noRouteOut), []);
    expect(placedAt(marks, 'pipeline.flows.0.blocks.1.next').placement).toEqual({
      kind: 'block',
      flowId: 'plan',
      blockId: 'plan-work',
    });
  });

  it('places a route finding on the arrow the route draws, from its block', () => {
    const marks = structureMarks(pipelineOf(conditionFlow('plan-work')), []);
    expect(placedAt(marks, 'pipeline.flows.0.blocks.2.true.to').placement).toEqual({
      kind: 'block-arrow',
      flowId: 'plan',
      fromId: 'plan-check',
      output: 'true',
    });
  });

  it('places a block finding that is not a route on the block, not on its arrow', () => {
    const blank = withBlankAgentDescription(conditionFlow('plan-work'));
    const marks = structureMarks(pipelineOf(blank), []);
    expect(placedAt(marks, 'pipeline.flows.0.blocks.1.description').placement).toEqual({
      kind: 'block',
      flowId: 'plan',
      blockId: 'plan-work',
    });
  });

  it('places a route finding on its block when the route draws no arrow, so it is still drawn', () => {
    const marks = structureMarks(pipelineOf(conditionFlow('nowhere')), []);
    expect(placedAt(marks, 'pipeline.flows.0.blocks.2.true.to').placement).toEqual({
      kind: 'block',
      flowId: 'plan',
      blockId: 'plan-check',
    });
  });

  it('places a route finding of the second flow on an arrow of that flow', () => {
    const state = pipelineOf(flowOf('plan'), conditionFlow('plan-work'));
    const marks = structureMarks(state, []);
    expect(placedAt(marks, 'pipeline.flows.1.blocks.2.true.to').placement).toEqual({
      kind: 'block-arrow',
      flowId: 'plan',
      fromId: 'plan-check',
      output: 'true',
    });
  });
});

describe('F-12 AC-046 a flow with a structural problem in its blocks is marked as blocked', () => {
  const cases: ReadonlyArray<readonly [string, Flow]> = [
    [
      'no Start',
      {
        ...flowOf('plan'),
        blocks: [
          { index: 0, id: 'plan-work', kind: 'agent', name: 'plan-work', description: 'Work.', arguments: [], next: 'plan-end' },
          { index: 1, id: 'plan-end', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
        ],
      },
    ],
    [
      'no End',
      {
        ...flowOf('plan'),
        blocks: [
          { index: 0, id: 'plan-start', kind: 'start', next: 'plan-work' },
          { index: 1, id: 'plan-work', kind: 'agent', name: 'plan-work', description: 'Work.', arguments: [], next: 'plan-start' },
        ],
      },
    ],
    [
      'a block not reached from Start',
      {
        ...flowOf('plan'),
        blocks: [
          { index: 0, id: 'plan-start', kind: 'start', next: 'plan-end' },
          { index: 1, id: 'plan-orphan', kind: 'agent', name: 'plan-orphan', description: 'Work.', arguments: [], next: 'plan-end' },
          { index: 2, id: 'plan-end', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
        ],
      },
    ],
    [
      'a block with no route out',
      {
        ...flowOf('plan'),
        blocks: [
          { index: 0, id: 'plan-start', kind: 'start', next: 'plan-work' },
          { index: 1, id: 'plan-work', kind: 'agent', name: 'plan-work', description: 'Work.', arguments: [], next: '' },
          { index: 2, id: 'plan-end', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
        ],
      },
    ],
    ['a Condition with no true arrow', conditionFlow('')],
    ['an Agent with a blank description', withBlankAgentDescription(flowOf('plan'))],
    ['a return with no round limit', conditionFlow('plan-work')],
    [
      'an End with no produced artifact',
      {
        ...flowOf('plan'),
        blocks: [
          { index: 0, id: 'plan-start', kind: 'start', next: 'plan-end' },
          { index: 1, id: 'plan-end', kind: 'end', outcome: 'done', producedArtifact: '' },
        ],
      },
    ],
  ];

  it.each(cases)('marks the flow box as blocked for %s', (_name, flow) => {
    const marks = structureMarks(pipelineOf(flow), []);
    expect(marks.blockedFlowIds).toEqual(['plan']);
  });
});

describe('F-12 AC-047 a new unlinked block is not refused, and its marks say what is missing', () => {
  it('shows the findings of a new block on that block and keeps the flow editable', () => {
    const added = addBlock(flowOf('plan'), 'agent', [flowOf('plan')]);
    const marks = structureMarks(pipelineOf(added.flow), []);

    const onNew = marks.findings.filter(
      (entry) => entry.placement.kind === 'block' && entry.placement.blockId === added.blockId,
    );
    expect(onNew.length).toBeGreaterThan(0);
    expect(onNew.map((entry) => entry.finding.path)).toContain('pipeline.flows.0.blocks.2.description');
    expect(marks.blockedFlowIds).toEqual(['plan']);
    expect(disabledControls()).toEqual([]);
  });
});

describe('F-16 AC-021 a repeat id from an earlier session is not extended and stays marked', () => {
  it('gives the added block a fresh id and marks the repeated ids on their blocks', () => {
    const plan: Flow = {
      ...flowOf('plan'),
      blocks: [
        { index: 0, id: 'block-1', kind: 'start', next: '' },
        { index: 1, id: 'block-1', kind: 'end', outcome: 'done', producedArtifact: '' },
      ],
    };
    const added = addBlock(plan, 'agent', [plan]);
    expect(added.blockId).toBe('block-2');
    const marks = structureMarks(pipelineOf(added.flow), []);
    const repeated = marks.findings.filter((entry) => entry.finding.message.startsWith('must be unique'));
    expect(repeated.length).toBeGreaterThan(0);
    expect(repeated.every((entry) => entry.placement.kind === 'block')).toBe(true);
    expect(marks.blockedFlowIds).toEqual(['plan']);
    expect(disabledControls()).toEqual([]);
  });
});

describe('F-12 AC-048 marks are read-only', () => {
  it('adds no control and changes no property: the pipeline passed in is not changed by the marks', () => {
    const state = pipelineOf(conditionFlow('plan-work'));
    const before = JSON.stringify(state);
    structureMarks(state, []);
    expect(JSON.stringify(state)).toBe(before);
    expect(disabledControls()).toEqual([]);
  });
});
