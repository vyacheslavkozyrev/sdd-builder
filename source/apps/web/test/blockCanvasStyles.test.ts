import { describe, expect, it } from 'vitest';
import { getBlockCanvasStyles } from '../src/builder/blockCanvasStyles.js';
import { theme } from '../src/theme.js';

describe('F-12 (no criterion: Verify device fix 2026-11-23) the drawing keeps its own size in the canvas card', () => {
  it('fills the scroll area with the measured stage, which the drawing is laid out in', () => {
    expect(getBlockCanvasStyles(theme).stage).toMatchObject({
      position: 'relative',
      width: '100%',
      height: '100%',
    });
  });

  it('does not stretch or shrink the svg, and centres it with its margins so an overflow scrolls from the left', () => {
    const drawing = getBlockCanvasStyles(theme).drawing;
    expect(drawing).toMatchObject({ display: 'block', margin: 'auto' });
    expect(drawing).not.toHaveProperty('width');
    expect(drawing).not.toHaveProperty('height');
    expect(drawing).not.toHaveProperty('flexShrink');
  });
});
