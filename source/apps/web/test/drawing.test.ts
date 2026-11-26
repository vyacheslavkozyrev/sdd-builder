import { describe, expect, it } from 'vitest';
import type { pipeline as model } from '@sddbuilder/core';
import { drawingOf, flowBoxHeight, flowBoxWidth, leftHandle, rightHandle } from '../src/builder/drawing.js';
import { flowPitch } from '../src/builder/layout.js';
import type { Pipeline } from '../src/builder/model.js';

// The drawing data is pure: no DOM, so this file runs without jsdom.

type Flow = model.Flow;

function flow(id: string, options: { next?: string; blocks?: number; name?: string } = {}): Flow {
  const base: Flow = {
    index: 0,
    id,
    name: options.name ?? id,
    arguments: [],
    body: 'Do the work.',
    artifacts: [],
    approval: false,
    blocks: Array.from({ length: options.blocks ?? 0 }, (_, n): model.Block => ({
      index: n,
      id: `block-${n}`,
      kind: 'end',
      outcome: 'done',
      producedArtifact: 'plan.md',
    })),
  };
  return options.next === undefined ? base : { ...base, next: options.next };
}

// A pipeline holding the given flows in list order, numbered by their position.
function pipelineOf(...flows: Flow[]): Pipeline {
  return {
    name: 'Demo',
    description: 'A demo pipeline.',
    arguments: [],
    flows: flows.map((f, i) => ({ ...f, index: i })),
  };
}

describe('F-11 AC-006 boxes in pipeline order', () => {
  it('F-11 AC-006 draws one box per flow in list order, one pitch apart on one row', () => {
    const drawing = drawingOf(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c')), []);
    expect(drawing.nodes.map((node) => node.id)).toEqual(['2d8eebb4-9a34-5eae-ae8d-88813520de08', 'ea3211a4-b64b-5204-9451-6fe12fd7c655', 'a0c3aad4-8765-5b23-8df5-7c03d481233c']);
    expect(drawing.nodes.map((node) => node.position)).toEqual([
      { x: 0, y: 0 },
      { x: flowPitch, y: 0 },
      { x: 2 * flowPitch, y: 0 },
    ]);
  });

  it('F-11 AC-006 gives every box the same size and a flow node type', () => {
    const drawing = drawingOf(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')), []);
    for (const node of drawing.nodes) {
      expect(node.type).toBe('flow');
      expect(node.width).toBe(flowBoxWidth);
      expect(node.height).toBe(flowBoxHeight);
    }
  });

  it('F-11 AC-006 names each box and counts its blocks', () => {
    const drawing = drawingOf(
      pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { name: 'Specify it', blocks: 3 }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', { blocks: 0 })),
      [],
    );
    expect(drawing.nodes.map((node) => node.data)).toEqual([
      {
        flowId: '2d8eebb4-9a34-5eae-ae8d-88813520de08',
        name: 'Specify it',
        blockCount: 3,
        blocked: false,
        selected: false,
        sourceOfSelectedArrow: false,
        targetOfSelectedArrow: false,
      },
      {
        flowId: 'ea3211a4-b64b-5204-9451-6fe12fd7c655',
        name: 'ea3211a4-b64b-5204-9451-6fe12fd7c655',
        blockCount: 0,
        blocked: false,
        selected: false,
        sourceOfSelectedArrow: false,
        targetOfSelectedArrow: false,
      },
    ]);
  });

  it('F-11 AC-005 boxes are draggable; they are not selectable by React Flow, and connecting is the canvas setting (AC-013)', () => {
    const drawing = drawingOf(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08')), []);
    expect(drawing.nodes[0]).toMatchObject({ draggable: true, selectable: false });
    expect(drawing.nodes[0]).not.toHaveProperty('connectable');
  });
});

describe('F-11 (no criterion: Verify device fix 2026-11-24) the ends of a selected arrow', () => {
  it('F-11 Verify device fix 2026-11-24 marks the source of the selected arrow and its target, and no other box', () => {
    const drawing = drawingOf(
      pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', { next: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' }), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c')),
      [],
      { kind: 'arrow', arrow: { source: 'ea3211a4-b64b-5204-9451-6fe12fd7c655', target: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' } },
    );
    expect(drawing.nodes.map((node) => [node.data.sourceOfSelectedArrow, node.data.targetOfSelectedArrow])).toEqual([
      [false, false],
      [true, false],
      [false, true],
    ]);
  });

  it('F-11 Verify device fix 2026-11-24 marks no end when nothing or a box is selected', () => {
    const pipeline = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const flows = [{ kind: 'pipeline' as const }, { kind: 'flow' as const, id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }];
    for (const selection of flows) {
      const drawing = drawingOf(pipeline, [], selection);
      expect(drawing.nodes.some((node) => node.data.sourceOfSelectedArrow || node.data.targetOfSelectedArrow)).toBe(
        false,
      );
    }
  });
});

describe('F-11 AC-042 selected flow box and arrow in the drawing', () => {
  it('F-11 AC-042 marks the selected flow box and no other', () => {
    const drawing = drawingOf(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')), [], {
      kind: 'flow',
      id: 'ea3211a4-b64b-5204-9451-6fe12fd7c655',
    });
    expect(drawing.nodes.map((node) => node.data.selected)).toEqual([false, true]);
  });

  it('F-11 AC-042 marks the selected arrow and no other', () => {
    const drawing = drawingOf(
      pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655', { next: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' }), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c')),
      [],
      { kind: 'arrow', arrow: { source: 'ea3211a4-b64b-5204-9451-6fe12fd7c655', target: 'a0c3aad4-8765-5b23-8df5-7c03d481233c' } },
    );
    expect(drawing.edges.map((edge) => edge.data?.selected)).toEqual([false, true]);
  });

  it('F-11 AC-042 with nothing selected (the pipeline selection) no box and no arrow is selected', () => {
    const pipeline = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const drawing = drawingOf(pipeline, [], { kind: 'pipeline' });
    expect(drawing.nodes.some((node) => node.data.selected)).toBe(false);
    expect(drawing.edges.some((edge) => edge.data?.selected === true)).toBe(false);
    expect(drawingOf(pipeline, [])).toEqual(drawing);
  });
});

describe('F-11 AC-008 arrows from next', () => {
  it('F-11 AC-008 draws an arrow from the right point of the source to the left point of its next', () => {
    const drawing = drawingOf(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')), []);
    expect(drawing.edges).toEqual([
      expect.objectContaining({
        id: '2d8eebb4-9a34-5eae-ae8d-88813520de08->ea3211a4-b64b-5204-9451-6fe12fd7c655',
        source: '2d8eebb4-9a34-5eae-ae8d-88813520de08',
        target: 'ea3211a4-b64b-5204-9451-6fe12fd7c655',
        sourceHandle: rightHandle,
        targetHandle: leftHandle,
      }),
    ]);
  });

  it('F-11 AC-008 gives every arrow an arrow head and no label', () => {
    const drawing = drawingOf(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')), []);
    for (const edge of drawing.edges) {
      expect(edge.markerEnd).toEqual({ type: 'arrowclosed' });
      expect(edge.label).toBeUndefined();
    }
  });

  it('F-11 AC-008 draws no arrow from a flow that has no next', () => {
    const drawing = drawingOf(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c')), []);
    expect(drawing.edges.map((edge) => edge.source)).toEqual(['2d8eebb4-9a34-5eae-ae8d-88813520de08']);
  });

  it('F-11 AC-008 keeps one arrow per source, in list order of the sources', () => {
    const drawing = drawingOf(
      pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: '47d4f7c9-a236-5d9b-b5a7-3f4724285515' }), flow('47d4f7c9-a236-5d9b-b5a7-3f4724285515', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655')),
      [],
    );
    expect(drawing.edges.map((edge) => edge.id)).toEqual(['2d8eebb4-9a34-5eae-ae8d-88813520de08->47d4f7c9-a236-5d9b-b5a7-3f4724285515', '47d4f7c9-a236-5d9b-b5a7-3f4724285515->ea3211a4-b64b-5204-9451-6fe12fd7c655']);
  });
});

describe('F-11 AC-035 blocked flow box', () => {
  it('F-11 AC-035 marks only the blocked flows as blocked', () => {
    const drawing = drawingOf(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08'), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'), flow('a0c3aad4-8765-5b23-8df5-7c03d481233c')), ['ea3211a4-b64b-5204-9451-6fe12fd7c655']);
    expect(drawing.nodes.map((node) => node.data.blocked)).toEqual([false, true, false]);
  });

  it('F-11 AC-035 ignores a blocked id that names no flow in the pipeline', () => {
    const drawing = drawingOf(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08')), ['6d30e6e8-651b-5a3a-b776-f53a9af76746']);
    expect(drawing.nodes.map((node) => node.data.blocked)).toEqual([false]);
  });
});

describe('F-11 AC-009 empty pipeline', () => {
  it('F-11 AC-009 gives no boxes and no arrows when there are no flows', () => {
    expect(drawingOf(pipelineOf(), [])).toEqual({ nodes: [], edges: [] });
  });
});

describe('drawing data is deterministic', () => {
  it('builds the same drawing from the same pipeline and blocked ids', () => {
    const pipelineState = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655', blocks: 2 }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    expect(drawingOf(pipelineState, ['ea3211a4-b64b-5204-9451-6fe12fd7c655'])).toEqual(drawingOf(pipelineState, ['ea3211a4-b64b-5204-9451-6fe12fd7c655']));
  });

  it('does not change the pipeline it was given', () => {
    const pipelineState = pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: 'ea3211a4-b64b-5204-9451-6fe12fd7c655' }), flow('ea3211a4-b64b-5204-9451-6fe12fd7c655'));
    const before = JSON.stringify(pipelineState);
    drawingOf(pipelineState, ['ea3211a4-b64b-5204-9451-6fe12fd7c655']);
    expect(JSON.stringify(pipelineState)).toBe(before);
  });
});

describe('drawing data refuses a programmer error', () => {
  it('throws when a next names a flow that is not in the pipeline', () => {
    expect(() => drawingOf(pipelineOf(flow('2d8eebb4-9a34-5eae-ae8d-88813520de08', { next: '6d30e6e8-651b-5a3a-b776-f53a9af76746' })), [])).toThrow(
      'flow "2d8eebb4-9a34-5eae-ae8d-88813520de08" points to "6d30e6e8-651b-5a3a-b776-f53a9af76746", which is not in the pipeline',
    );
  });
});
