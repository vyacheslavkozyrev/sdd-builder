import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import type { Pipeline } from '../src/builder/connect.js';
import { afterDeleteFlow, panelFor } from '../src/builder/panel.js';
import type { PanelState, Selection } from '../src/builder/panel.js';
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

const demo = pipelineOf(flow('intake', 'build', 'Intake'), flow('build', 'ship', 'Build'), flow('ship', undefined, 'Ship'));

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
    const panel = panelFor(demo, flowSelection('build'));
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
    const panel = panelFor(demo, arrowSelection('intake', 'build'));
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
    expect(panelFor(demo, arrowSelection('build', 'ship'))).toEqual({
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
    panelFor(demo, arrowSelection('intake', 'build'));
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
