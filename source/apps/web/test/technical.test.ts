import { describe, expect, it } from 'vitest';
import { codePointCount } from '../src/wizard/project.js';
import {
  ARCHITECTURE_LIMIT,
  canAddRule,
  duplicateIdFlags,
  hasLetterOrDigit,
  limitArchitecture,
  limitRuleDescription,
  limitSingleLine,
  RULE_BLOCK_LIMIT,
  RULE_DESCRIPTION_LIMIT,
  ruleIdFromName,
  SINGLE_LINE_LIMIT,
} from '../src/wizard/technical.js';

const EMOJI = '\u{1F600}'; // one code point, two UTF-16 units

describe('F-10 AC-004 single-line limit', () => {
  it('F-10 AC-004 keeps the first 100 code points of a single-line field', () => {
    expect(SINGLE_LINE_LIMIT).toBe(100);
    const cases: ReadonlyArray<readonly [number, number]> = [
      [99, 99],
      [100, 100],
      [101, 100],
    ];
    for (const [length, kept] of cases) {
      expect(codePointCount(limitSingleLine('a'.repeat(length)))).toBe(kept);
    }
  });

  it('F-10 AC-004 counts an emoji as one code point', () => {
    const text = 'e'.repeat(99) + EMOJI + 'x';
    expect(limitSingleLine(text)).toBe('e'.repeat(99) + EMOJI);
  });

  it('F-10 AC-004 keeps the characters up to 100 for a paste that crosses the limit', () => {
    const typed = 'n'.repeat(95);
    const pasted = 'p'.repeat(20);
    expect(limitSingleLine(typed + pasted)).toBe(typed + 'p'.repeat(5));
  });
});

describe('F-10 AC-006 architecture limit', () => {
  it('F-10 AC-006 keeps the first 5,000 code points of the architecture text', () => {
    expect(ARCHITECTURE_LIMIT).toBe(5000);
    expect(codePointCount(limitArchitecture('a'.repeat(4999) + 'bb'))).toBe(5000);
    expect(limitArchitecture('a'.repeat(4999) + 'bb')).toBe('a'.repeat(4999) + 'b');
  });

  it('F-10 AC-006 drops a surrogate pair that would cross the limit whole', () => {
    const text = 'a'.repeat(4999) + EMOJI + 'b';
    expect(limitArchitecture(text)).toBe('a'.repeat(4999) + EMOJI);
  });

  it('F-10 AC-006 leaves a full architecture text unchanged on a further paste', () => {
    const full = 'c'.repeat(5000);
    expect(limitArchitecture(full + 'pasted')).toBe(full);
  });
});

describe('F-10 AC-018 rule description limit', () => {
  it('F-10 AC-018 keeps the first 1,000 code points of a description', () => {
    expect(RULE_DESCRIPTION_LIMIT).toBe(1000);
    const cases: ReadonlyArray<readonly [number, number]> = [
      [999, 999],
      [1000, 1000],
      [1001, 1000],
    ];
    for (const [length, kept] of cases) {
      expect(codePointCount(limitRuleDescription('d'.repeat(length)))).toBe(kept);
    }
  });

  it('F-10 AC-018 counts an emoji as one code point', () => {
    expect(limitRuleDescription('d'.repeat(999) + EMOJI + 'x')).toBe('d'.repeat(999) + EMOJI);
  });

  it('F-10 AC-018 keeps line breaks inside the description', () => {
    expect(limitRuleDescription('first\nsecond')).toBe('first\nsecond');
  });
});

describe('F-10 AC-013 rule name limit', () => {
  it('F-10 AC-013 limits a rule name to 100 code points with the same cut', () => {
    expect(codePointCount(limitSingleLine('n'.repeat(100)))).toBe(100);
    expect(codePointCount(limitSingleLine('n'.repeat(101)))).toBe(100);
  });
});

describe('F-10 AC-012 rule block limit', () => {
  it('F-10 AC-012 allows an Add rule block at 59 blocks and not at 60', () => {
    expect(RULE_BLOCK_LIMIT).toBe(60);
    const cases: ReadonlyArray<readonly [number, boolean]> = [
      [0, true],
      [59, true],
      [60, false],
      [61, false],
    ];
    for (const [count, allowed] of cases) {
      expect(canAddRule(count)).toBe(allowed);
    }
  });
});

describe('F-10 AC-014 rule file name', () => {
  it('F-10 AC-014 derives the id from the name in table-driven cases', () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ['Code Style', 'code-style'],
      ['Naming & Tests!', 'naming-tests-'],
      ['  Rule  2 ', '-rule-2-'],
      ['already-lower-1', 'already-lower-1'],
    ];
    for (const [name, id] of cases) {
      expect(ruleIdFromName(name)).toBe(id);
    }
  });

  it('F-10 AC-014 never yields a path separator or a dot in the id (negative case)', () => {
    const names = ['../../etc/passwd', 'a/b\\c', 'x.y.z', '..', 'KK', 'Ünïcode/Rule'];
    for (const name of names) {
      expect(ruleIdFromName(name)).toMatch(/^[a-z0-9-]*$/);
    }
  });
});

describe('F-10 AC-015 name with no letter or digit', () => {
  it('F-10 AC-015 reports a name with no letter or digit', () => {
    const cases: ReadonlyArray<readonly [string, boolean]> = [
      ['', false],
      ['   ', false],
      ['!!!', false],
      ['Rule 2', true],
      ['7', true],
    ];
    for (const [name, ok] of cases) {
      expect(hasLetterOrDigit(name)).toBe(ok);
    }
  });
});

describe('F-10 AC-017 duplicate id flags', () => {
  it('F-10 AC-017 flags both blocks whose names give the same id', () => {
    expect(duplicateIdFlags(['Code Style', 'code style'])).toEqual([true, true]);
    expect(duplicateIdFlags(['Code Style', 'Code-Style'])).toEqual([true, true]);
  });

  it('F-10 AC-017 gives no flag for a unique id', () => {
    expect(duplicateIdFlags(['Code Style', 'Tests'])).toEqual([false, false]);
  });

  it('F-10 AC-017 clears the flag when the clash is removed', () => {
    expect(duplicateIdFlags(['Code Style'])).toEqual([false]);
    expect(duplicateIdFlags(['Code Style', 'Code Style', 'Tests'])).toEqual([true, true, false]);
  });

  it('F-10 AC-017 never flags names without a usable id', () => {
    expect(duplicateIdFlags(['!!!', '???', ''])).toEqual([false, false, false]);
    expect(duplicateIdFlags(['!!!', 'Rule'])).toEqual([false, false]);
  });
});
