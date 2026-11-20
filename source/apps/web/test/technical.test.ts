import { describe, expect, it } from 'vitest';
import { codePointCount, limitToCodePoints, NAME_LIMIT } from '../src/wizard/project.js';
import {
  ARCHITECTURE_LIMIT,
  canAddRule,
  duplicateRuleNumbers,
  RULE_DESCRIPTION_LIMIT,
  RULE_ID_MAX_LENGTH,
  RULE_LIMIT,
  ruleFileLine,
  ruleId,
  ruleIdProblem,
  ruleIdProblemMessage,
} from '../src/wizard/technical.js';

const EMOJI = '\u{1F600}'; // one code point, two UTF-16 units

function hasLoneSurrogate(text: string): boolean {
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text);
}

describe('F-10 AC-004 single-line stack field limit', () => {
  it('F-10 AC-004 reuses the 100 code point limit of the project step', () => {
    expect(NAME_LIMIT).toBe(100);
  });

  const cases: ReadonlyArray<readonly [number, number]> = [
    [99, 99],
    [100, 100],
    [101, 100],
  ];
  it.each(cases)('F-10 AC-004 keeps %i typed characters as %i', (length, kept) => {
    const text = 'a'.repeat(length);
    expect(codePointCount(limitToCodePoints(text, NAME_LIMIT))).toBe(kept);
  });

  it('F-10 AC-004 counts an emoji as one code point at the limit', () => {
    const limited = limitToCodePoints(EMOJI.repeat(101), NAME_LIMIT);
    expect(limited).toBe(EMOJI.repeat(100));
  });
});

describe('F-10 AC-006 architecture limit', () => {
  it('F-10 AC-006 has a 5,000 code point architecture limit', () => {
    expect(ARCHITECTURE_LIMIT).toBe(5000);
  });

  it('F-10 AC-006 keeps 5,000 code points when 4,999 are stored and 2 are typed', () => {
    const typed = 'a'.repeat(4999) + 'bb';
    const limited = limitToCodePoints(typed, ARCHITECTURE_LIMIT);
    expect(codePointCount(limited)).toBe(5000);
    expect(limited).toBe('a'.repeat(4999) + 'b');
  });

  it('F-10 AC-006 leaves a full architecture unchanged on a paste', () => {
    const full = 'a'.repeat(5000);
    expect(limitToCodePoints(full + 'paste', ARCHITECTURE_LIMIT)).toBe(full);
  });

  it('F-10 AC-006 drops a surrogate pair that would cross the limit whole', () => {
    const text = 'a'.repeat(4999) + EMOJI + EMOJI;
    const limited = limitToCodePoints(text, ARCHITECTURE_LIMIT);
    expect(limited).toBe('a'.repeat(4999) + EMOJI);
    expect(hasLoneSurrogate(limited)).toBe(false);
  });
});

describe('F-10 AC-012 rule block limit', () => {
  it('F-10 AC-012 has a limit of 60 rule blocks', () => {
    expect(RULE_LIMIT).toBe(60);
  });

  const cases: ReadonlyArray<readonly [number, boolean]> = [
    [0, true],
    [59, true],
    [60, false],
    [61, false],
  ];
  it.each(cases)('F-10 AC-012 allows an add at %i blocks: %s', (count, allowed) => {
    expect(canAddRule(count)).toBe(allowed);
  });
});

describe('F-10 AC-013 rule name limit', () => {
  it('F-10 AC-013 cuts a 101-character rule name to 100 code points', () => {
    const name = 'r'.repeat(101);
    expect(codePointCount(limitToCodePoints(name, NAME_LIMIT))).toBe(100);
  });

  it('F-10 AC-013 keeps a 100-character rule name unchanged', () => {
    const name = 'r'.repeat(100);
    expect(limitToCodePoints(name, NAME_LIMIT)).toBe(name);
  });
});

describe('F-10 AC-014 rule id and file line', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['Code Style', 'code-style'],
    ['Code   Style', 'code-style'],
    ['Naming & Tests!', 'naming-tests-'],
    ['Rule 2', 'rule-2'],
    ['  Rule', '-rule'],
  ];
  it.each(cases)('F-10 AC-014 derives the id of %j as %j', (name, id) => {
    expect(ruleId(name)).toBe(id);
  });

  it('F-10 AC-014 shows the file line under .claude/rules', () => {
    expect(ruleFileLine('Code Style')).toBe('.claude/rules/code-style.md');
  });

  it('F-10 AC-014 keeps only file-safe characters for hostile names (negative case)', () => {
    const hostile = ['../../etc/passwd', 'a/b\\c', 'ÉCOLE', 'Ünïcode name', '\u0000x', 'name.md'];
    for (const name of hostile) {
      expect(ruleId(name)).toMatch(/^[a-z0-9-]*$/);
    }
  });
});

describe('F-10 AC-015 id without a letter or digit', () => {
  const cases: ReadonlyArray<string> = ['', '   ', '!!!', 'É', '漢字'];
  it.each(cases)('F-10 AC-015 refuses the name %j with no letter or digit', (name) => {
    expect(ruleIdProblem(name)).toBe('no-letter-or-digit');
    expect(ruleIdProblemMessage(ruleIdProblem(name))).toBe('Needs a letter or digit.');
  });
});

describe('F-10 AC-016 id must start with a letter', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['2 tests', 'must-start-with-letter'],
    ['  Rule', 'must-start-with-letter'],
    ['Rule 2', 'none'],
  ];
  it.each(cases)('F-10 AC-016 classifies %j as %s', (name, problem) => {
    expect(ruleIdProblem(name)).toBe(problem);
  });

  it('F-10 AC-016 shows the start message for a digit-first name', () => {
    expect(ruleIdProblemMessage(ruleIdProblem('2 tests'))).toBe(
      'The id must start with a letter.',
    );
  });
});

describe('F-10 AC-017 id longer than 60 characters', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['a'.repeat(RULE_ID_MAX_LENGTH), 'none'],
    ['a'.repeat(RULE_ID_MAX_LENGTH + 1), 'too-long'],
    ['a'.repeat(100), 'too-long'],
  ];
  it.each(cases)('F-10 AC-017 classifies a %j name by its length', (name, problem) => {
    expect(ruleIdProblem(name)).toBe(problem);
  });

  it('F-10 AC-017 shows the length message for a 61-character id', () => {
    expect(ruleIdProblemMessage(ruleIdProblem('a'.repeat(61)))).toBe(
      'The id is longer than 60 characters.',
    );
  });

  it('F-10 AC-017 has no message for a valid id', () => {
    expect(ruleIdProblemMessage(ruleIdProblem('Code Style'))).toBeUndefined();
  });

  it('F-10 AC-015 AC-016 AC-017 checks the no-letter, start and length problems in that order (negative case: a digit-first long name gives the start message)', () => {
    expect(ruleIdProblem('2'.repeat(61))).toBe('must-start-with-letter');
    expect(ruleIdProblem('!'.repeat(100))).toBe('no-letter-or-digit');
  });
});

describe('F-10 AC-019 duplicate ids among valid ids', () => {
  const cases: ReadonlyArray<readonly [ReadonlyArray<string>, ReadonlyArray<number | undefined>]> = [
    [[], []],
    [['Code Style', 'Rule'], [undefined, undefined]],
    [['Code Style', 'code style'], [2, 1]],
    [['Code Style', 'Code-Style'], [2, 1]],
    [['2 tests', 'Code Style', 'code style'], [undefined, 3, 2]],
    [['Code Style', 'code style', 'CODE STYLE'], [2, 1, 1]],
    [['!!!', '!!!'], [undefined, undefined]],
    [['2 tests', '2 tests'], [undefined, undefined]],
    [['!!!', '!!!', 'Testing'], [undefined, undefined, undefined]],
  ];
  it.each(cases)('F-10 AC-019 gives %j the numbers %j', (names, numbers) => {
    expect(duplicateRuleNumbers(names)).toEqual(numbers);
  });

  it('F-10 AC-019 clears the number on the other block once one of two is removed (negative case)', () => {
    expect(duplicateRuleNumbers(['Code Style', 'code style'])).toEqual([2, 1]);
    expect(duplicateRuleNumbers(['code style'])).toEqual([undefined]);
  });
});

describe('F-10 AC-020 rule description limit', () => {
  it('F-10 AC-020 has a 1,000 code point description limit', () => {
    expect(RULE_DESCRIPTION_LIMIT).toBe(1000);
  });

  const cases: ReadonlyArray<readonly [number, number]> = [
    [999, 999],
    [1000, 1000],
    [1001, 1000],
  ];
  it.each(cases)('F-10 AC-020 keeps %i description characters as %i', (length, kept) => {
    const text = 'd'.repeat(length);
    expect(codePointCount(limitToCodePoints(text, RULE_DESCRIPTION_LIMIT))).toBe(kept);
  });

  it('F-10 AC-020 counts an emoji as one code point in the description', () => {
    const limited = limitToCodePoints(EMOJI.repeat(1001), RULE_DESCRIPTION_LIMIT);
    expect(codePointCount(limited)).toBe(1000);
    expect(hasLoneSurrogate(limited)).toBe(false);
  });
});
