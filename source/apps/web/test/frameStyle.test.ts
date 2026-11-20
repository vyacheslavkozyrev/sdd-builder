import { describe, expect, it } from 'vitest';
import { FRAME_MIN_WIDTH_PX, frameStyle } from '../src/layout/frameStyle.js';

describe('F-07 AC-009 frame sizing', () => {
  it('F-07 AC-009 sets the width to 100% of the window', () => {
    expect(frameStyle().width).toBe('100%');
  });

  it('F-07 AC-009 sets a minimum width of 1024 px', () => {
    expect(FRAME_MIN_WIDTH_PX).toBe(1024);
    expect(frameStyle().minWidth).toBe('1024px');
  });

  it('F-07 AC-009 sets a minimum height of the full window height', () => {
    expect(frameStyle().minHeight).toBe('100vh');
  });
});

describe('F-07 AC-010 overflow and maximum width', () => {
  it('F-07 AC-010 sets only the three sizing properties, so it hides no overflow and sets no maximum width', () => {
    expect(Object.keys(frameStyle()).sort()).toEqual(['minHeight', 'minWidth', 'width']);
  });

  it('F-07 AC-010 negative case: the width is relative to the window, never a fixed narrow column in px', () => {
    expect(frameStyle().width).toBe('100%');
    expect(frameStyle().width).not.toMatch(/px$/);
  });
});
