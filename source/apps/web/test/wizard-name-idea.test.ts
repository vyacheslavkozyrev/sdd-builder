import { describe, expect, it } from 'vitest';
import { ideaCounter } from '../src/wizard/counter.js';
import { setIdea, setName } from '../src/wizard/name-idea.js';
import type { NameIdeaValues } from '../src/wizard/name-idea.js';

const blank: NameIdeaValues = { name: '', idea: '' };
const filled: NameIdeaValues = { name: 'Demo', idea: 'A small tool' };

describe('F-05 AC-007 the name is stored as typed', () => {
  it('F-05 AC-007 the typed name becomes the name value', () => {
    expect(setName(blank, 'Time tracker').name).toBe('Time tracker');
  });

  it('F-05 AC-007 spaces only are kept as typed, not trimmed', () => {
    expect(setName(blank, '   ').name).toBe('   ');
  });

  it('F-05 AC-007 leading and trailing spaces are kept as typed', () => {
    expect(setName(blank, '  Demo  ').name).toBe('  Demo  ');
  });

  it('F-05 AC-007 an empty name is kept as empty, not rejected', () => {
    expect(setName(filled, '').name).toBe('');
  });

  it('F-05 AC-007 setting the name leaves the idea unchanged', () => {
    expect(setName(filled, 'Other').idea).toBe('A small tool');
  });
});

describe('F-05 AC-008 the idea is capped at 8,000 characters, with the counter', () => {
  it('F-05 AC-008 a short idea is kept as typed, without trimming', () => {
    expect(setIdea(blank, '  padded idea  ').idea).toBe('  padded idea  ');
  });

  it('F-05 AC-008 a paste of 9,000 characters keeps the first 8,000', () => {
    const pasted = 'a'.repeat(8000) + 'b'.repeat(1000);
    const kept = setIdea(blank, pasted).idea;
    expect(kept).toHaveLength(8000);
    expect(kept).toBe('a'.repeat(8000));
  });

  it('F-05 AC-008 setting the idea leaves the name unchanged', () => {
    expect(setIdea(filled, 'New idea').name).toBe('Demo');
  });

  it('F-05 AC-008 the counter reads 8,000 / 8,000 at the limit', () => {
    expect(ideaCounter('x'.repeat(8000))).toBe('8,000 / 8,000');
  });

  it('F-05 AC-008 the counter counts the text in code points, without trimming', () => {
    expect(ideaCounter('  ab  ')).toBe('6 / 8,000');
  });

  it('F-05 AC-008 the counter counts an emoji as one character', () => {
    expect(ideaCounter('\u{1F600}')).toBe('1 / 8,000');
  });

  it('F-05 AC-008 the counter reads 8,000 / 8,000 for 8,000 emoji', () => {
    expect(ideaCounter('\u{1F600}'.repeat(8000))).toBe('8,000 / 8,000');
  });

  it('F-05 AC-008 an emoji that ends exactly at the cut is kept whole, not split', () => {
    const typed = 'x'.repeat(7999) + '\u{1F600}' + 'z';
    const kept = setIdea(blank, typed).idea;
    expect(kept).toBe('x'.repeat(7999) + '\u{1F600}');
    expect(kept.length).toBe(8001);
    expect([...kept]).toHaveLength(8000);
  });

  it('F-05 AC-008 a paste of 9,000 emoji keeps the first 8,000 emoji', () => {
    const kept = setIdea(blank, '\u{1F600}'.repeat(9000)).idea;
    expect(kept).toBe('\u{1F600}'.repeat(8000));
  });
});

describe('F-05 AC-009 the idea boundary is 8,000 characters', () => {
  it('F-05 AC-009 at 7,999 characters the field accepts one more character', () => {
    const atSevenNinetyNineNine = setIdea(blank, 'x'.repeat(7999));
    const grown = setIdea(atSevenNinetyNineNine, atSevenNinetyNineNine.idea + 'y');
    expect(grown.idea).toHaveLength(8000);
    expect(grown.idea.endsWith('y')).toBe(true);
  });

  it('F-05 AC-009 at 8,000 characters the field accepts none', () => {
    const full = setIdea(blank, 'x'.repeat(8000));
    const extended = setIdea(full, full.idea + 'y');
    expect(extended.idea).toBe('x'.repeat(8000));
  });

  it.each([
    { length: 0, counter: '0 / 8,000' },
    { length: 1, counter: '1 / 8,000' },
    { length: 7999, counter: '7,999 / 8,000' },
    { length: 8000, counter: '8,000 / 8,000' },
  ])('F-05 AC-009 the counter shows $counter at $length characters', ({ length, counter }) => {
    expect(ideaCounter('x'.repeat(length))).toBe(counter);
  });
});
