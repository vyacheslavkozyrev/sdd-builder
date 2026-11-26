import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import type { Pipeline } from '../src/builder/connect.js';
import { afterDeleteBlock, afterDeleteFlow, blockPanelFor, panelFor } from '../src/builder/panel.js';
import type { BlockSelection, PanelState, Selection } from '../src/builder/panel.js';
import type { Block } from '../src/builder/blocks.js';
import type { Tab } from '../src/builder/model.js';

type Flow = model.Flow;

// A flow with the required fields only. `name` defaults to the id; `next` is set only when given.
function flow(id: string, next?: string, name: string = id): Flow {
  const base: Flow = {
    index: 0,
    id,
    name,
    description: `The ${name} step.`,
    arguments: [],
    body: `Do the ${name} work.`,
    artifacts: [{ label: `${id}.md`, template: 'output.md' }],
    approval: true,
    blocks: [],
  };
  return next === undefined ? base : { ...base, next };
}

// A pipeline holding the given flows, numbered by their position in the list.
function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((f, i) => ({ ...f, index: i })),
  };
}

const PIPELINE: Selection = { kind: 'pipeline' };
const pipelineTab: Tab = { kind: 'pipeline' };
const flowSelection = (id: string): Selection => ({ kind: 'flow', id });
const arrowSelection = (source: string, target: string): Selection => ({
  kind: 'arrow',
  arrow: { source, target },
});

const demo = pipelineOf(flow('intake', 'a0c3aad4-8765-5b23-8df5-7c03d481233c', 'Intake'), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c', 'ship', 'Build'), flow('ship', undefined, 'Ship'));

describe('F-11 AC-042 the pipeline panel shows when nothing is selected', () => {
  it('F-11 AC-042 the pipeline selection gives the pipeline panel', () => {
    const panel = panelFor(demo, PIPELINE);
    expect(panel.kind).toBe('pipeline');
    expect(panel).toEqual({ kind: 'pipeline', pipeline: demo });
  });

  it('F-11 AC-042 the pipeline panel holds the pipeline it was given, unchanged', () => {
    const before = structuredClone(demo);
    panelFor(demo, PIPELINE);
    expect(demo).toEqual(before);
  });

  it('F-11 AC-042 the pipeline panel of an empty pipeline is still shown', () => {
    const empty = pipelineOf();
    expect(panelFor(empty, PIPELINE)).toEqual({ kind: 'pipeline', pipeline: empty });
  });
});

describe('F-11 AC-042 a selected flow shows its flow panel', () => {
  it('F-11 AC-042 a selected flow gives the flow panel with that flow', () => {
    const panel = panelFor(demo, flowSelection('a0c3aad4-8765-5b23-8df5-7c03d481233c'));
    expect(panel.kind).toBe('flow');
    expect(panel).toEqual({ kind: 'flow', flow: demo.flows[1] });
  });

  it('F-11 AC-042 a selected flow that is not in the pipeline throws', () => {
    expect(() => panelFor(demo, flowSelection('missing'))).toThrow(/no flow "missing"/);
  });

  it('F-11 AC-042 a selected flow with no pipeline flows throws', () => {
    expect(() => panelFor(pipelineOf(), flowSelection('intake'))).toThrow(/no flow "intake"/);
  });
});

describe('F-11 AC-042 a selected arrow shows the connection panel', () => {
  it('F-11 AC-042 a selected arrow gives the arrow panel with the two flow names', () => {
    const panel = panelFor(demo, arrowSelection('intake', 'a0c3aad4-8765-5b23-8df5-7c03d481233c'));
    expect(panel).toEqual({
      kind: 'arrow',
      arrow: { sourceName: 'Intake', targetName: 'Build' },
    });
  });

  it('F-11 AC-042 an arrow that is not in the pipeline throws', () => {
    expect(() => panelFor(demo, arrowSelection('intake', 'ship'))).toThrow(/no arrow from "intake" to "ship"/);
  });
});

describe('F-11 AC-042 one item is selected at a time', () => {
  it('F-11 AC-042 selecting an arrow after a flow shows only the arrow panel', () => {
    expect(panelFor(demo, arrowSelection('a0c3aad4-8765-5b23-8df5-7c03d481233c', 'ship'))).toEqual({
      kind: 'arrow',
      arrow: { sourceName: 'Build', targetName: 'Ship' },
    });
  });

  it('F-11 AC-042 returning to the pipeline selection shows the pipeline panel again', () => {
    expect(panelFor(demo, flowSelection('intake')).kind).toBe('flow');
    expect(panelFor(demo, PIPELINE).kind).toBe('pipeline');
  });

  it('F-11 AC-042 choosing a flow or an arrow does not change the pipeline', () => {
    const before = structuredClone(demo);
    panelFor(demo, flowSelection('intake'));
    panelFor(demo, arrowSelection('intake', 'a0c3aad4-8765-5b23-8df5-7c03d481233c'));
    expect(demo).toEqual(before);
  });
});

describe('F-11 AC-031 a confirmed delete clears the selection and moves the open tab to the Pipeline tab', () => {
  it('F-11 AC-031 the state after a confirmed delete is the Pipeline tab with the pipeline selected', () => {
    expect(afterDeleteFlow()).toEqual({ tab: pipelineTab, selection: PIPELINE });
  });

  it('F-11 AC-031 the result leaves no flow or arrow selected or open, so none can dangle', () => {
    const result: PanelState = afterDeleteFlow();
    expect(result.tab.kind).toBe('pipeline');
    expect(result.selection.kind).toBe('pipeline');
  });
});

// A flow with blocks: Start, the Planner Agent, a Condition whose false route returns to the Agent
// with a round limit of 3, and the End. The arrows are Start to Planner, Planner to the Condition,
// the Condition's true route to the End and its false route back to the Planner.
const START: Block = { index: 0, id: 'start', kind: 'start', next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' };
const PLANNER: Block = {
  index: 1,
  id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655',
  kind: 'agent',
  name: 'Planner',
  description: 'Plans the work.',
  arguments: [],
  next: 'check',
};
const CHECK: Block = {
  index: 2,
  id: 'check',
  kind: 'condition',
  description: 'Is the plan ready?',
  true: { to: 'done' },
  false: { to: 'ea3211a4-b64b-5204-9451-6fe12fd7c655', roundLimit: 3 },
};
const DONE: Block = { index: 3, id: 'done', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' };
const blocked: Flow = { ...flow('a0c3aad4-8765-5b23-8df5-7c03d481233c', undefined, 'Build'), blocks: [START, PLANNER, CHECK, DONE] };

const noSelection: BlockSelection = { kind: 'none' };
const blockSelection = (blockId: string): BlockSelection => ({ kind: 'block', blockId });
const blockArrowSelection = (fromId: string, output: 'next' | 'true' | 'false'): BlockSelection => ({
  kind: 'blockArrow',
  fromId,
  output,
});

describe('F-12 AC-011 selecting a block opens the panel of its kind', () => {
  it('F-12 AC-011 a selected Start gives the Start panel with that block', () => {
    expect(blockPanelFor(blocked, blockSelection('start'))).toEqual({ kind: 'start', block: START });
  });

  it('F-12 AC-011 a selected Agent gives the Agent panel with that block', () => {
    expect(blockPanelFor(blocked, blockSelection('ea3211a4-b64b-5204-9451-6fe12fd7c655'))).toEqual({ kind: 'agent', block: PLANNER });
  });

  it('F-12 AC-011 a selected Condition gives the Condition panel with that block', () => {
    expect(blockPanelFor(blocked, blockSelection('check'))).toEqual({ kind: 'condition', block: CHECK });
  });

  it('F-12 AC-011 a selected End gives the End panel with that block', () => {
    expect(blockPanelFor(blocked, blockSelection('done'))).toEqual({ kind: 'end', block: DONE });
  });

  it('F-12 AC-011 a block id that the flow does not have throws', () => {
    expect(() => blockPanelFor(blocked, blockSelection('missing'))).toThrow(/has no block "missing"/);
  });

  it('F-12 AC-011 a block id is looked up in the flow given, so a block of another flow is not found', () => {
    expect(() => blockPanelFor(flow('ship'), blockSelection('ea3211a4-b64b-5204-9451-6fe12fd7c655'))).toThrow(/has no block "ea3211a4-b64b-5204-9451-6fe12fd7c655"/);
  });
});

describe('F-12 AC-011 selecting an arrow of a block opens the arrow panel with its two names', () => {
  it('F-12 AC-011 the arrow from the Agent gives its source and target names', () => {
    expect(blockPanelFor(blocked, blockArrowSelection('ea3211a4-b64b-5204-9451-6fe12fd7c655', 'next'))).toEqual({
      kind: 'blockArrow',
      arrow: { source: 'Planner', target: 'Condition: Is the plan ready?' },
    });
  });

  it('F-12 AC-011 the false arrow of a Condition gives the return to the Agent', () => {
    expect(blockPanelFor(blocked, blockArrowSelection('check', 'false'))).toEqual({
      kind: 'blockArrow',
      arrow: { source: 'Condition: Is the plan ready?', target: 'Planner' },
    });
  });

  it('F-12 AC-011 an arrow the block does not have throws', () => {
    expect(() => blockPanelFor(blocked, blockArrowSelection('done', 'next'))).toThrow(
      /has no next arrow from block done/,
    );
  });

  it('F-12 AC-011 a Condition with no false arrow has no false arrow to select', () => {
    const noReturn: Flow = {
      ...blocked,
      blocks: [START, PLANNER, { ...CHECK, false: { stop: true } }, DONE],
    };
    expect(() => blockPanelFor(noReturn, blockArrowSelection('check', 'false'))).toThrow(
      /has no false arrow from block check/,
    );
  });
});

describe('F-12 AC-011 nothing selected on a flow tab shows the flow panel', () => {
  it('F-12 AC-011 the none selection gives the flow panel with that flow', () => {
    expect(blockPanelFor(blocked, noSelection)).toEqual({ kind: 'flow', flow: blocked });
  });

  it('F-12 AC-011 selecting a block or an arrow does not change the flow', () => {
    const before = structuredClone(blocked);
    blockPanelFor(blocked, blockSelection('check'));
    blockPanelFor(blocked, blockArrowSelection('check', 'false'));
    expect(blocked).toEqual(before);
  });
});

describe('F-12 AC-044 a confirmed block delete keeps the flow tab and empties the selection', () => {
  it('F-12 AC-044 the state after a block delete is the same flow tab with nothing selected', () => {
    expect(afterDeleteBlock('a0c3aad4-8765-5b23-8df5-7c03d481233c')).toEqual({ tab: { kind: 'flow', id: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' }, selection: noSelection });
  });

  it('F-12 AC-044 the tab after a block delete is a flow tab, not the Pipeline tab', () => {
    expect(afterDeleteBlock('a0c3aad4-8765-5b23-8df5-7c03d481233c').tab.kind).toBe('flow');
  });
});
