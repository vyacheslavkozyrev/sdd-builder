import { describe, expect, it } from 'vitest';
import {
  codePointCount,
  ideaCounterText,
  ideaForConfiguration,
  IDEA_LIMIT,
  limitToCodePoints,
  NAME_LIMIT,
} from '../src/wizard/project.js';

const EMOJI = '\u{1F600}'; // one code point, two UTF-16 units

describe('F-09 AC-003 name limit', () => {
  it('F-09 AC-003 keeps the first 100 code points of a name', () => {
    expect(NAME_LIMIT).toBe(100);
    const cases: ReadonlyArray<readonly [number, number]> = [
      [99, 99],
      [100, 100],
      [101, 100],
    ];
    for (const [length, kept] of cases) {
      const name = 'a'.repeat(length);
      expect(codePointCount(limitToCodePoints(name, NAME_LIMIT))).toBe(kept);
    }
  });

  it('F-09 AC-003 keeps the characters up to 100 for a paste that crosses the limit', () => {
    const typed = 'n'.repeat(95);
    const pasted = 'p'.repeat(20);
    const result = limitToCodePoints(typed + pasted, NAME_LIMIT);
    expect(result).toBe(typed + pasted.slice(0, 5));
    expect(codePointCount(result)).toBe(100);
  });

  it('F-09 AC-003 counts an emoji as one code point at the name limit', () => {
    const name = EMOJI.repeat(101);
    const limited = limitToCodePoints(name, NAME_LIMIT);
    expect(codePointCount(limited)).toBe(100);
    expect(limited).toBe(EMOJI.repeat(100));
  });
});

describe('F-09 AC-006 idea counter text', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['', '0 / 5,000'],
    ['abc', '3 / 5,000'],
    [EMOJI, '1 / 5,000'],
    ['a'.repeat(5000), '5,000 / 5,000'],
    ['a'.repeat(1000), '1,000 / 5,000'],
  ];
  it.each(cases)('F-09 AC-006 shows the counter for %j as %s', (idea, text) => {
    expect(ideaCounterText(idea)).toBe(text);
  });
});

describe('F-09 AC-007 idea limit when typing', () => {
  it('F-09 AC-007 keeps the first 5,000 code points and drops the 5,001st', () => {
    expect(IDEA_LIMIT).toBe(5000);
    const typed = 'b'.repeat(5001);
    const limited = limitToCodePoints(typed, IDEA_LIMIT);
    expect(codePointCount(limited)).toBe(5000);
    expect(ideaCounterText(limited)).toBe('5,000 / 5,000');
  });
});

describe('F-09 AC-008 idea limit when pasting', () => {
  it('F-09 AC-008 keeps the first code points up to 5,000 for a paste that crosses the limit', () => {
    const stored = 'c'.repeat(4990);
    const pasted = 'd'.repeat(20);
    const result = limitToCodePoints(stored + pasted, IDEA_LIMIT);
    expect(codePointCount(result)).toBe(5000);
    expect(result).toBe(stored + pasted.slice(0, 10));
  });

  it('F-09 AC-008 leaves a full idea unchanged for any paste', () => {
    const stored = 'c'.repeat(5000);
    expect(limitToCodePoints(stored + 'x'.repeat(50), IDEA_LIMIT)).toBe(stored);
    expect(limitToCodePoints(stored, IDEA_LIMIT)).toBe(stored);
  });

  it('F-09 AC-008 drops an emoji whole when it would cross the limit', () => {
    const stored = 'c'.repeat(4999);
    const result = limitToCodePoints(stored + EMOJI + EMOJI, IDEA_LIMIT);
    expect(result).toBe(stored + EMOJI);
    expect(codePointCount(result)).toBe(5000);
    expect(result.endsWith('\uD83D')).toBe(false);

    const full = 'c'.repeat(5000);
    expect(limitToCodePoints(full + EMOJI, IDEA_LIMIT)).toBe(full);
  });
});

describe('F-09 AC-011 idea for the configuration', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['  a b  ', 'a b'],
    ['\n\tidea\n', 'idea'],
    ['   ', ''],
    ['', ''],
    ['line one\nline two', 'line one\nline two'],
  ];
  it.each(cases)('F-09 AC-011 trims %j to %j', (idea, expected) => {
    expect(ideaForConfiguration(idea)).toBe(expected);
  });

  it('F-09 AC-011 gives the same trimmed text when called again on its own result', () => {
    const once = ideaForConfiguration('\n  a b \t');
    expect(once).toBe('a b');
    expect(ideaForConfiguration(once)).toBe(once);
  });
});
