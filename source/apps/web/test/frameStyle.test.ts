import { describe, expect, it } from 'vitest';
import { FRAME_MIN_WIDTH_PX, fillFrameStyle, frameStyle } from '../src/layout/frameStyle.js';

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

describe('F-11 AC-006 layout points 2 and 3: the fill frame has the window height and no page scroll', () => {
  it('F-11 AC-006 layout point 2 sets the height to the window height, so the page is not taller than the window', () => {
    expect(fillFrameStyle().height).toBe('100vh');
  });

  it('F-11 AC-006 layout point 2 hides vertical overflow, so no global vertical scrollbar appears', () => {
    expect(fillFrameStyle().overflowY).toBe('hidden');
  });

  it('F-11 AC-006 layout point 2 keeps the 1024 px minimum width and the full width', () => {
    expect(fillFrameStyle().minWidth).toBe('1024px');
    expect(fillFrameStyle().width).toBe('100%');
  });

  it('F-11 AC-006 layout point 3 negative case: the fill frame has no minimum height, so it never grows past the window', () => {
    expect(fillFrameStyle()).not.toHaveProperty('minHeight');
    expect(Object.keys(fillFrameStyle()).sort()).toEqual(['height', 'minWidth', 'overflowY', 'width']);
  });

  it('F-11 AC-006 negative case: the card layout of steps 1, 2 and 4 keeps its minimum height and hides no overflow', () => {
    expect(frameStyle().minHeight).toBe('100vh');
    expect(frameStyle()).not.toHaveProperty('overflowY');
  });
});
