import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { addFlow } from '../src/builder/model.js';
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

  it('places a finding inside a flow, at a block or at a field, on none', () => {
    const dangling: Flow = {
      ...flowOf('plan'),
      blocks: [
        { index: 0, id: 'plan-start', kind: 'start', next: 'nowhere' },
        { index: 1, id: 'plan-end', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
      ],
    };
    const marks = structureMarks(pipelineOf(dangling), []);
    const blockFinding = marks.findings.find((entry) => entry.finding.path === 'pipeline.flows.0.blocks.0.next');
    expect(blockFinding).toBeDefined();
    expect(blockFinding?.placement).toEqual({ kind: 'none' });
    expect(marks.blockedFlowIds).toEqual(['plan']);
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
