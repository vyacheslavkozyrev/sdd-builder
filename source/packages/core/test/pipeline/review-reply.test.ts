import { describe, expect, it } from 'vitest';
import { checkReview } from '../../src/pipeline/analyze/review.js';

const GOOD = { severity: 'warning', subject: 'stack.framework', message: 'Name the framework.' };

function reply(entries: unknown[]): string {
  return JSON.stringify(entries);
}

function entry(overrides: Record<string, unknown>): Record<string, unknown> {
  return { ...GOOD, ...overrides };
}

describe('F-06 AC-011 a reply that is not valid JSON fails with no review findings', () => {
  it.each([
    ['plain text', 'this is not json'],
    ['a truncated array', '[{"severity": "warning"'],
    ['an empty string', ''],
    ['only spaces', '   '],
    ['a trailing comma', '[{"severity": "info", "subject": "a", "message": "b"},]'],
  ])('%s', (_name, text) => {
    expect(checkReview(text)).toEqual({ status: 'failed', findings: [], dropped: 0 });
  });
});

describe('F-06 AC-012 a reply that is JSON but not an array fails with no review findings', () => {
  it.each([
    ['an object', '{"findings": []}'],
    ['a string', '"text"'],
    ['a number', '42'],
    ['null', 'null'],
    ['a boolean', 'true'],
    ['an object with an entry in it', JSON.stringify({ 0: GOOD })],
  ])('%s', (_name, text) => {
    expect(checkReview(text)).toEqual({ status: 'failed', findings: [], dropped: 0 });
  });
});

describe('F-06 AC-017 an empty array gives status ok with no findings and dropped 0', () => {
  it('returns ok, no findings and dropped 0', () => {
    expect(checkReview('[]')).toEqual({ status: 'ok', findings: [], dropped: 0 });
  });
});

describe('F-06 AC-011 a failed review gives each caller its own result', () => {
  it('returns a new findings array on each failed call', () => {
    const first = checkReview('not json');
    const second = checkReview('not json');
    expect(first.findings).not.toBe(second.findings);
  });
});

describe('F-06 AC-014 an entry is kept only with a valid severity, subject and message', () => {
  const dropped: Array<[string, unknown]> = [
    ['an unknown severity', entry({ severity: 'error' })],
    ['a missing severity', { subject: 'a', message: 'b' }],
    ['a severity in another case', entry({ severity: 'Warning' })],
    ['a numeric severity', entry({ severity: 1 })],
    ['a blank subject', entry({ subject: '' })],
    ['a subject of spaces only', entry({ subject: '   ' })],
    ['a subject of a line break only', entry({ subject: '\n\t' })],
    ['a missing subject', { severity: 'info', message: 'b' }],
    ['a non-string subject', entry({ subject: 7 })],
    ['a blank message', entry({ message: ' ' })],
    ['a missing message', { severity: 'info', subject: 'a' }],
    ['a non-string message', entry({ message: ['text'] })],
    ['a string instead of an object', 'warning'],
    ['a number instead of an object', 3],
    ['null', null],
    ['an array instead of an object', ['warning', 'a', 'b']],
  ];

  it.each(dropped)('drops %s and counts it', (_name, bad) => {
    expect(checkReview(reply([bad]))).toEqual({ status: 'ok', findings: [], dropped: 1 });
  });

  it('keeps a warning and an info entry', () => {
    const info = entry({ severity: 'info', subject: 'rules', message: 'Add a rule.' });
    expect(checkReview(reply([GOOD, info]))).toEqual({
      status: 'ok',
      findings: [GOOD, info],
      dropped: 0,
    });
  });

  it('counts each dropped entry and keeps the valid ones around it', () => {
    const info = entry({ severity: 'info' });
    const result = checkReview(reply([entry({ severity: 'error' }), GOOD, null, info, entry({ message: '' })]));
    expect(result).toEqual({ status: 'ok', findings: [GOOD, info], dropped: 3 });
  });
});

describe('F-06 AC-015 a blocker entry is kept as a warning', () => {
  it('turns a model blocker into a warning and keeps the text', () => {
    const blocker = entry({ severity: 'blocker', subject: 'idea', message: 'The idea is unclear.' });
    expect(checkReview(reply([blocker]))).toEqual({
      status: 'ok',
      findings: [{ severity: 'warning', subject: 'idea', message: 'The idea is unclear.' }],
      dropped: 0,
    });
  });

  it('never returns a blocker severity in the result', () => {
    const result = checkReview(reply([entry({ severity: 'blocker' }), entry({ severity: 'blocker' })]));
    expect(result.status).toBe('ok');
    const severities = result.findings.map((kept) => kept.severity);
    expect(severities).toEqual(['warning', 'warning']);
  });

  it('drops a blocker entry with a blank message like any other invalid entry', () => {
    expect(checkReview(reply([entry({ severity: 'blocker', message: '  ' })]))).toEqual({
      status: 'ok',
      findings: [],
      dropped: 1,
    });
  });

  it('drops a blocker entry with a blank subject and does not keep it as a warning', () => {
    expect(checkReview(reply([entry({ severity: 'blocker', subject: '\n' })]))).toEqual({
      status: 'ok',
      findings: [],
      dropped: 1,
    });
  });
});

describe('F-06 AC-016 kept entries keep reply order and are capped at 10', () => {
  it('keeps reply order', () => {
    const entries = ['c', 'a', 'b'].map((subject) => entry({ subject }));
    const result = checkReview(reply(entries));
    expect(result.findings.map((kept) => kept.subject)).toEqual(['c', 'a', 'b']);
  });

  it('keeps exactly 10 valid entries with dropped 0 at the cap', () => {
    const entries = Array.from({ length: 10 }, (_, index) => entry({ subject: `s${index}` }));
    const result = checkReview(reply(entries));
    expect(result.findings).toHaveLength(10);
    expect(result).toMatchObject({ status: 'ok', dropped: 0 });
  });

  it.each([
    [11, 1],
    [12, 2],
    [25, 15],
  ])('keeps the first 10 of %i valid entries and counts %i - 10 as dropped', (total, expectedDropped) => {
    const entries = Array.from({ length: total }, (_, index) => entry({ subject: `s${index}` }));
    const result = checkReview(reply(entries));
    expect(result.findings.map((kept) => kept.subject)).toEqual(
      Array.from({ length: 10 }, (_, index) => `s${index}`),
    );
    expect(result).toMatchObject({ status: 'ok', dropped: expectedDropped });
  });

  it('counts invalid entries and valid entries beyond the cap together', () => {
    const valid = Array.from({ length: 11 }, (_, index) => entry({ subject: `s${index}` }));
    const result = checkReview(reply([null, ...valid, 'x']));
    expect(result.findings).toHaveLength(10);
    expect(result).toMatchObject({ status: 'ok', dropped: 3 });
  });
});

describe('F-06 AC-014 a kept entry keeps its text as the reply gives it', () => {
  it('keeps the subject and message exactly as the reply gives them', () => {
    const spaced = entry({ subject: '  stack.framework  ', message: '  Name it.\n' });
    expect(checkReview(reply([spaced])).findings).toEqual([
      { severity: 'warning', subject: '  stack.framework  ', message: '  Name it.\n' },
    ]);
  });
});
