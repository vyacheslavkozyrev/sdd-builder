// The canvas layout of the Pipeline tab (F-11 AC-009, AC-010). A pure function: the box positions
// are computed from the pipeline order and are never saved, so a layout cannot change the pipeline
// value (no position key is written to the config).

import type { pipeline } from '@sddbuilder/core';
import { boxes } from './model.js';

type Pipeline = pipeline.Pipeline;

// Distance between two neighbouring boxes on the row, in pixels.
export const BOX_PITCH = 160;

export interface Position {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

// Places the boxes left to right in pipeline order on one row. The same pipeline always gives the
// same positions (AC-009).
export function layout(config: Pipeline): Position[] {
  return boxes(config).map((box, index): Position => ({ id: box.id, x: index * BOX_PITCH, y: 0 }));
}
