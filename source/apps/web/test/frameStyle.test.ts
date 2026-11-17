import { describe, expect, it } from 'vitest';
import { FRAME_MIN_WIDTH_PX, frameStyle } from '../src/layout/frameStyle.js';

describe('F-07 frame style', () => {
  it('F-07 AC-009 sets width to 100% of the window', () => {
    expect(frameStyle().width).toBe('100%');
  });

  it('F-07 AC-009 sets a minimum width of 1024 px', () => {
    expect(frameStyle().minWidth).toBe('1024px');
    expect(FRAME_MIN_WIDTH_PX).toBe(1024);
  });

  it('F-07 AC-009 sets a minimum height of the full window height', () => {
    expect(frameStyle().minHeight).toBe('100vh');
  });

  it('F-07 AC-010 does not hide overflow', () => {
    const style: Record<string, unknown> = { ...frameStyle() };
    expect(style).not.toHaveProperty('overflow');
    expect(style).not.toHaveProperty('overflowX');
    expect(style).not.toHaveProperty('overflowY');
  });

  it('F-07 AC-010 does not set a narrow maximum width', () => {
    const style: Record<string, unknown> = { ...frameStyle() };
    expect(style).not.toHaveProperty('maxWidth');
    expect(style).not.toHaveProperty('maxInlineSize');
  });

  it('returns the same values on every call (deterministic)', () => {
    expect(frameStyle()).toEqual(frameStyle());
  });
});
