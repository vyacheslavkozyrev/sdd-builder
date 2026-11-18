// Pure tests of the canvas view-model (F-11 AC-007 to AC-009, AC-011, AC-012, AC-022).
import { describe, expect, it } from 'vitest';
import type { pipeline } from '@sddbuilder/core';
import {
  arrowLabel,
  arrowLook,
  arrowViews,
  BOX_HEIGHT,
  BOX_WIDTH,
  blockText,
  boxViews,
  captionFor,
  gateRequestFor,
  gateText,
  isGateTool,
  layoutKey,
  panFor,
  reconnectFor,
  rowWidth,
  stripThumb,
  toolFrom,
} from '../src/builder/drawing.js';
import { BOX_PITCH } from '../src/builder/layout.js';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;

function flow(id: string, extra: Partial<Flow> = {}): Flow {
  return { id, name: `Name ${id}`, description: '', arguments: '', blocks: [], ...extra };
}

function config(flows: Flow[]): Pipeline {
  return { name: 'pipeline', description: '', arguments: [], flows };
}

const APPROVAL = { kind: 'approval', description: 'Reviewed by a person' } as const;
const CHECK = { kind: 'check', description: 'Tests pass', type: 'checks' } as const;

describe('F-11 AC-007 box text', () => {
  it('F-11 AC-007 shows the block count as 0, 1 and 5', () => {
    expect(blockText(0)).toBe('0 blocks');
    expect(blockText(1)).toBe('1 block');
    expect(blockText(5)).toBe('5 blocks');
  });

  it('F-11 AC-007 gives each box its flow name and its block text', () => {
    const boxes = boxViews(config([flow('plan', { name: 'plan' })]));
    expect(boxes).toEqual([{ id: 'plan', x: 0, y: 0, name: 'plan', blocks: '0 blocks' }]);
  });
});

describe('F-11 AC-008 arrow label', () => {
  it('F-11 AC-008 gives each arrow its artifact label and no gate text when it has none', () => {
    const arrows = arrowViews(
      config([flow('plan', { connectedTo: { to: 'build', label: 'plan.md' } }), flow('build')]),
    );
    expect(arrows).toEqual([{ id: 'plan', source: 'plan', target: 'build', label: 'plan.md' }]);
  });

  it('F-11 AC-008 puts the approval gate on the arrow label', () => {
    const label = arrowLabel({ source: 'plan', target: 'build', label: 'plan.md', gate: APPROVAL });
    expect(label).toBe('plan.md · gate: approval (Reviewed by a person)');
  });

  it('F-11 AC-008 puts the check type and description on the arrow label', () => {
    expect(gateText(CHECK)).toBe('gate: check checks (Tests pass)');
  });

  it('F-11 AC-008 gives no arrow when no flow has a connection', () => {
    expect(arrowViews(config([flow('plan'), flow('build')]))).toEqual([]);
  });
});

describe('F-11 AC-009 box placement', () => {
  it('F-11 AC-009 places the boxes left to right and gives the same positions twice', () => {
    const pipe = config([flow('plan'), flow('build'), flow('verify')]);
    const first = boxViews(pipe).map((box) => [box.id, box.x, box.y]);
    const second = boxViews(pipe).map((box) => [box.id, box.x, box.y]);
    expect(first).toEqual(second);
    expect(first).toEqual([
      ['plan', 0, 0],
      ['build', BOX_PITCH, 0],
      ['verify', 2 * BOX_PITCH, 0],
    ]);
  });

  it('F-11 AC-009 does not change the pipeline it is given', () => {
    const pipe = config([flow('plan', { connectedTo: { to: 'build', label: 'plan.md' } }), flow('build')]);
    const before = JSON.stringify(pipe);
    boxViews(pipe);
    arrowViews(pipe);
    expect(JSON.stringify(pipe)).toBe(before);
  });
});

describe('F-11 AC-011 layout key', () => {
  it('F-11 AC-011 keeps the key when only a flow name changes, so a dragged box keeps its place', () => {
    const before = config([flow('plan'), flow('build')]);
    const after = config([flow('plan', { name: 'Plan' }), flow('build')]);
    expect(layoutKey(after)).toBe(layoutKey(before));
  });

  it('F-11 AC-011 changes the key when a flow is added, so the layout is recomputed', () => {
    expect(layoutKey(config([flow('plan'), flow('build')]))).not.toBe(
      layoutKey(config([flow('plan'), flow('build'), flow('flow-2')])),
    );
  });
});

describe('F-11 AC-012 reconnect', () => {
  const base = config([
    flow('plan', { connectedTo: { to: 'build', label: 'plan.md', gate: APPROVAL } }),
    flow('build'),
    flow('verify'),
  ]);

  it('F-11 AC-012 moves the target end onto another flow and keeps the label and the gate', () => {
    // React Flow reports the fixed end: a dragged target end is reported as 'source'.
    const result = reconnectFor(base, 'plan', 'source', 'verify');
    expect(result).toEqual({
      ok: true,
      pipeline: config([
        flow('plan', { connectedTo: { to: 'verify', label: 'plan.md', gate: APPROVAL } }),
        flow('build'),
        flow('verify'),
      ]),
    });
  });

  it('F-11 AC-012 refuses a target end dropped on the arrow own source', () => {
    const result = reconnectFor(base, 'plan', 'source', 'plan');
    expect(result.ok).toBe(false);
  });

  it('F-11 AC-012 moves the source end to another flow and moves the arrow with its gate', () => {
    // A dragged source end is reported as 'target': the fixed end is the target.
    const result = reconnectFor(base, 'plan', 'target', 'verify');
    expect(result).toEqual({
      ok: true,
      pipeline: config([
        flow('plan'),
        flow('build'),
        flow('verify', { connectedTo: { to: 'build', label: 'plan.md', gate: APPROVAL } }),
      ]),
    });
  });
});

describe('F-11 AC-011 canvas caption and strip', () => {
  const pipe = config([
    flow('plan', { connectedTo: { to: 'build', label: 'plan.md', gate: APPROVAL } }),
    flow('build', { connectedTo: { to: 'verify', label: 'build.md' } }),
    flow('verify'),
  ]);

  it('F-11 AC-011 captions the canvas with the order when nothing is selected', () => {
    expect(captionFor(pipe, undefined)).toBe('Flows in pipeline order.');
    expect(captionFor(pipe, { kind: 'pipeline' })).toBe('Flows in pipeline order.');
  });

  it('F-11 AC-011 captions a selected flow with its name', () => {
    expect(captionFor(pipe, { kind: 'flow', id: 'build' })).toBe('Flows in pipeline order. Selected: Name build.');
  });

  it('F-11 AC-011 captions a selected arrow with its ends, and says when it has no gate', () => {
    expect(captionFor(pipe, { kind: 'arrow', source: 'plan' })).toBe(
      'Flows in pipeline order. The selected arrow is plan → build.',
    );
    expect(captionFor(pipe, { kind: 'arrow', source: 'build' })).toBe(
      'Flows in pipeline order. The selected arrow is build → verify. This arrow has no gate yet.',
    );
  });

  it('F-11 AC-011 gives the row width from the first box to the last box edge', () => {
    expect(rowWidth(config([]))).toBe(0);
    expect(rowWidth(config([flow('plan')]))).toBe(BOX_WIDTH);
    expect(rowWidth(pipe)).toBe(2 * BOX_PITCH + BOX_WIDTH);
  });

  it('F-11 AC-011 places the strip thumb by the pan and sizes it by the visible part', () => {
    // Row 1000 px, visible 500 px, not panned: the thumb starts at 0 and is half the strip.
    expect(stripThumb(1000, 500, 0, 1)).toEqual({ left: 0, width: 0.5 });
    // Panned 250 px to the left: the thumb starts at a quarter of the strip.
    expect(stripThumb(1000, 500, -250, 1)).toEqual({ left: 0.25, width: 0.5 });
    // The row fits: the thumb fills the strip.
    expect(stripThumb(400, 500, 0, 1)).toEqual({ left: 0, width: 1 });
  });

  it('F-11 AC-011 keeps the pan inside the row when the strip is pressed at its ends', () => {
    expect(panFor(0, 1000, 500, 1)).toBe(0);
    expect(panFor(1, 1000, 500, 1)).toBe(-500);
    expect(panFor(0.5, 1000, 500, 1)).toBe(-250);
    // A row that fits is not panned.
    expect(panFor(0.8, 400, 500, 1)).toBe(0);
  });
});

describe('F-11 AC-022 gate drop', () => {
  it('F-11 AC-022 reads only the Approval and Check tools as gates', () => {
    expect(toolFrom('Approval')).toBe('Approval');
    expect(toolFrom('Check')).toBe('Check');
    expect(toolFrom('Connection')).toBe('Connection');
    expect(toolFrom('Start')).toBeUndefined();
    expect(toolFrom('')).toBeUndefined();
    expect(isGateTool('Approval')).toBe(true);
    expect(isGateTool('Connection')).toBe(false);
  });

  it('F-11 AC-022 asks for an approval with its description only', () => {
    expect(gateRequestFor('Approval', { description: 'Reviewed', type: 'checks', threshold: '3' })).toEqual({
      kind: 'approval',
      description: 'Reviewed',
    });
  });

  it('F-11 AC-018 passes a threshold on to a checks gate, so the parser refuses it (negative case)', () => {
    expect(gateRequestFor('Check', { description: 'Tests pass', type: 'checks', threshold: '3' })).toEqual({
      kind: 'check',
      description: 'Tests pass',
      type: 'checks',
      threshold: '3',
    });
  });

  it('F-11 AC-022 keeps the threshold of a diff size gate', () => {
    expect(gateRequestFor('Check', { description: 'Small', type: 'diff size', threshold: '40' })).toEqual({
      kind: 'check',
      description: 'Small',
      type: 'diff size',
      threshold: '40',
    });
  });
});

describe('F-11 AC-008 and AC-009 box size and arrow look as on screens 01 to 03', () => {
  it('F-11 AC-009 draws a box 100 by 76 px with a 60 px gap to the next box', () => {
    expect(BOX_WIDTH).toBe(100);
    expect(BOX_HEIGHT).toBe(76);
    expect(BOX_PITCH - BOX_WIDTH).toBe(60);
  });

  it('F-11 AC-008 draws an arrow slate and 1.5 px wide, and the selected arrow blue and 2.5 px wide', () => {
    expect(arrowLook(false)).toEqual({ colour: '#64748b', width: 1.5 });
    expect(arrowLook(true)).toEqual({ colour: '#2563eb', width: 2.5 });
  });
});
