import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { canvasLayout, flowPitch } from '../src/builder/layout.js';
import type { Pipeline } from '../src/builder/layout.js';

type Flow = model.Flow;

// A flow with the required fields only. `next` is set only when given.
function flow(id: string, next?: string): Flow {
  const base: Flow = {
    index: 0,
    id,
    name: id,
    arguments: [],
    body: 'Do the work.',
    artifacts: [],
    approval: false,
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

describe('F-11 AC-005 canvas boxes', () => {
  it('places boxes left to right in list order at the 110 px pitch', () => {
    const layout = canvasLayout(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')));
    expect(flowPitch).toBe(110);
    expect(layout.boxes).toEqual([
      { flowId: '2d8eebb4-9a34-5eae-ae8d-88813520de08', x: 0 },
      { flowId: '47d4f7c9-a236-5d9b-b5a7-3f4724285515', x: 110 },
      { flowId: 'ea3211a4-b64b-5204-9451-6fe12fd7c655', x: 220 },
    ]);
  });

  it('follows the list order, not the index or the id', () => {
    // List order: zeta, alpha. Index order and id order both put alpha first.
    const pipeline: Pipeline = {
      ...pipelineOf(),
      flows: [{ ...flow('zeta'), index: 1 }, { ...flow('alpha'), index: 0 }],
    };
    expect(canvasLayout(pipeline).boxes.map((b) => b.flowId)).toEqual(['zeta', 'alpha']);
    expect(canvasLayout(pipeline).boxes.map((b) => b.x)).toEqual([0, 110]);
  });

  it('ignores a box position stored on a flow, so a dragged box does not move the layout', () => {
    // A flow carrying a drag position (an extra field) lays out as if the field were absent.
    const dragged = { ...flow('a', 'b'), position: { x: 500, y: 40 } };
    const layout = canvasLayout(pipelineOf(dragged, flow('b')));
    expect(layout.boxes).toEqual([
      { flowId: 'a', x: 0 },
      { flowId: 'b', x: 110 },
    ]);
  });

  it('gives the same positions for the same pipeline', () => {
    const pipeline = pipelineOf(flow('a', 'b'), flow('b'));
    expect(canvasLayout(pipelineOf(flow('a', 'b'), flow('b')))).toEqual(canvasLayout(pipeline));
  });

  it('does not change the input pipeline', () => {
    const pipeline = pipelineOf(flow('a', 'b'), flow('b'));
    const before = structuredClone(pipeline);
    canvasLayout(pipeline);
    expect(pipeline).toEqual(before);
  });
});

describe('F-11 AC-007 canvas arrows', () => {
  it('draws one arrow for each flow with a next, from that flow to the one it names', () => {
    const layout = canvasLayout(
      pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515', 'ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')),
    );
    expect(layout.arrows).toEqual([
      { source: '2d8eebb4-9a34-5eae-ae8d-88813520de08', target: '47d4f7c9-a236-5d9b-b5a7-3f4724285515' },
      { source: '47d4f7c9-a236-5d9b-b5a7-3f4724285515', target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' },
    ]);
  });

  it('draws no outgoing arrow from a flow without a next', () => {
    const layout = canvasLayout(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', '47d4f7c9-a236-5d9b-b5a7-3f4724285515'), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515')));
    expect(layout.arrows.map((a) => a.source)).toEqual(['2d8eebb4-9a34-5eae-ae8d-88813520de08']);
  });

  it('gives arrow data with only source and target, no label and no gate', () => {
    const layout = canvasLayout(pipelineOf(flow('a', 'b'), flow('b')));
    expect(Object.keys(layout.arrows[0] ?? {}).sort()).toEqual(['source', 'target']);
  });

  it('draws no arrows when no flow has a next', () => {
    const layout = canvasLayout(pipelineOf(flow('a'), flow('b')));
    expect(layout.arrows).toEqual([]);
    expect(layout.boxes).toHaveLength(2);
  });

  it('rejects a next that names no flow in the pipeline (programmer error)', () => {
    expect(() => canvasLayout(pipelineOf(flow('a', 'missing')))).toThrow(/"missing"/);
  });
});

describe('F-11 AC-009 empty canvas', () => {
  it('gives no boxes and no arrows for a pipeline with no flows', () => {
    expect(canvasLayout(pipelineOf())).toEqual({ boxes: [], arrows: [] });
  });

  it('gives no boxes and no arrows after the last flow is removed', () => {
    const one = pipelineOf(flow('last'));
    const layout = canvasLayout({ ...one, flows: one.flows.filter((f) => f.id !== 'last') });
    expect(layout.boxes).toEqual([]);
    expect(layout.arrows).toEqual([]);
  });
});
