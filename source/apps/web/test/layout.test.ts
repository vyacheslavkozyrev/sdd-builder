import { describe, expect, it } from 'vitest';
import type { pipeline } from '@sddbuilder/core';
import { BOX_PITCH, layout } from '../src/builder/layout.js';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;

function flow(id: string): Flow {
  return { id, name: `Name ${id}`, description: '', arguments: '', blocks: [] };
}

function config(flows: Flow[]): Pipeline {
  return { name: 'pipeline', description: '', arguments: [], flows };
}

describe('F-11 AC-009 box layout', () => {
  it('F-11 AC-009 places the boxes left to right in pipeline order on one row', () => {
    const positions = layout(config([flow('specify'), flow('plan'), flow('build')]));
    expect(positions).toEqual([
      { id: 'specify', x: 0, y: 0 },
      { id: 'plan', x: BOX_PITCH, y: 0 },
      { id: 'build', x: 2 * BOX_PITCH, y: 0 },
    ]);
  });

  it('F-11 AC-009 uses a 160 px pitch', () => {
    expect(BOX_PITCH).toBe(160);
  });

  it('F-11 AC-009 gives the same positions when the same pipeline is laid out twice', () => {
    const saved = config([flow('specify'), flow('plan')]);
    expect(layout(config([flow('specify'), flow('plan')]))).toEqual(layout(saved));
  });

  it('F-11 AC-009 returns no positions for a pipeline with no flow', () => {
    expect(layout(config([]))).toEqual([]);
  });

  it('F-11 AC-009 follows the pipeline order, not the id order', () => {
    const positions = layout(config([flow('build'), flow('specify')]));
    expect(positions.map((p) => p.id)).toEqual(['build', 'specify']);
    expect(positions[1]?.x).toBe(BOX_PITCH);
  });
});

describe('F-11 AC-010 layout does not change the pipeline', () => {
  it('F-11 AC-010 leaves the pipeline value equal before and after the layout', () => {
    const saved = config([flow('specify'), flow('plan')]);
    const before = structuredClone(saved);
    layout(saved);
    expect(saved).toEqual(before);
  });
});
