import { describe, expect, it } from 'vitest';
import { checkReview, type ReviewEntry } from '../../src/pipeline/analyze/review.js';

// A usable entry, as the model writes it. Tests change one field at a time to make a case.
function entry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { severity: 'warning', subject: 'Stack', message: 'Name the test framework.', ...overrides };
}

// The reply text of a list of values, as the model sends it.
function reply(...items: readonly unknown[]): string {
  return JSON.stringify(items);
}

describe('F-06 checkReview', () => {
  it.each([
    ['empty text', ''],
    ['prose', 'The brief looks fine to me.'],
    ['a truncated array', '[{"severity": "warning"'],
  ])('F-06 AC-017 gives failed for a reply that is not valid JSON (%s)', (_name, text) => {
    expect(checkReview(text)).toEqual({ status: 'failed' });
  });

  it.each([
    ['an object', '{"severity": "warning", "subject": "x", "message": "y"}'],
    ['a string', '"warning"'],
    ['a number', '3'],
    ['null', 'null'],
    ['a boolean', 'true'],
  ])('F-06 AC-018 gives failed for a reply that is valid JSON but not an array (%s)', (_name, text) => {
    expect(checkReview(text)).toEqual({ status: 'failed' });
  });

  it('F-06 AC-023 gives ok with no findings and dropped 0 for an empty array', () => {
    expect(checkReview('[]')).toEqual({ status: 'ok', findings: [], dropped: 0 });
  });

  it('F-06 AC-020 keeps a warning and an info entry with a subject and a message that are not blank', () => {
    const info = entry({ severity: 'info', subject: 'Rules', message: 'Add a rule for the commit style.' });
    expect(checkReview(reply(entry(), info))).toEqual({
      status: 'ok',
      findings: [
        { severity: 'warning', subject: 'Stack', message: 'Name the test framework.' },
        { severity: 'info', subject: 'Rules', message: 'Add a rule for the commit style.' },
      ],
      dropped: 0,
    });
  });

  it('F-06 AC-020 keeps the subject and the message as the model wrote them, without trimming', () => {
    const text = reply(entry({ subject: '  Stack  ', message: ' Name the test framework. ' }));
    expect(checkReview(text)).toEqual({
      status: 'ok',
      findings: [{ severity: 'warning', subject: '  Stack  ', message: ' Name the test framework. ' }],
      dropped: 0,
    });
  });

  it.each([
    ['severity is an unknown word', entry({ severity: 'critical' })],
    ['severity is missing', entry({ severity: undefined })],
    ['severity is not a string', entry({ severity: 2 })],
    ['subject is blank', entry({ subject: '   ' })],
    ['subject is empty', entry({ subject: '' })],
    ['subject is missing', entry({ subject: undefined })],
    ['subject is not a string', entry({ subject: 7 })],
    ['message is blank', entry({ message: '\n\t' })],
    ['message is missing', entry({ message: undefined })],
    ['message is not a string', entry({ message: ['text'] })],
    ['the entry is a string', 'a warning'],
    ['the entry is a number', 4],
    ['the entry is null', null],
    ['the entry is an array', [entry()]],
  ])('F-06 AC-020 drops and counts an entry when %s', (_name, bad) => {
    expect(checkReview(reply(bad))).toEqual({ status: 'ok', findings: [], dropped: 1 });
  });

  it('F-06 AC-020 keeps the valid entries of a mixed reply and counts the invalid ones', () => {
    const kept: ReviewEntry = { severity: 'warning', subject: 'Stack', message: 'Name the test framework.' };
    const text = reply(entry({ severity: 'critical' }), entry(), 'not an entry', entry({ message: ' ' }));
    expect(checkReview(text)).toEqual({ status: 'ok', findings: [kept], dropped: 3 });
  });

  it('F-06 AC-021 keeps a blocker entry as a warning, never as a blocker', () => {
    const text = reply(entry({ severity: 'blocker', subject: 'Idea', message: 'The idea is unclear.' }));
    expect(checkReview(text)).toEqual({
      status: 'ok',
      findings: [{ severity: 'warning', subject: 'Idea', message: 'The idea is unclear.' }],
      dropped: 0,
    });
  });

  it('F-06 AC-022 keeps the entries in reply order', () => {
    const text = reply(
      entry({ subject: 'third-in-reply' }),
      entry({ subject: 'first-in-reply', severity: 'info' }),
      entry({ subject: 'second-in-reply', severity: 'blocker' }),
    );
    expect(checkReview(text)).toEqual({
      status: 'ok',
      findings: [
        { severity: 'warning', subject: 'third-in-reply', message: 'Name the test framework.' },
        { severity: 'info', subject: 'first-in-reply', message: 'Name the test framework.' },
        { severity: 'warning', subject: 'second-in-reply', message: 'Name the test framework.' },
      ],
      dropped: 0,
    });
  });

  it('F-06 AC-022 keeps at most 10 entries and counts the valid entries beyond 10 as dropped', () => {
    const items = Array.from({ length: 12 }, (_unused, index) => entry({ subject: `subject ${index + 1}` }));
    const result = checkReview(reply(...items));
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    expect(result.findings.map((finding) => finding.subject)).toEqual(
      Array.from({ length: 10 }, (_unused, index) => `subject ${index + 1}`),
    );
    expect(result.dropped).toBe(2);
  });

  it('F-06 AC-022 counts invalid entries and valid entries beyond 10 together in dropped', () => {
    const valid = Array.from({ length: 11 }, () => entry());
    const invalid = [entry({ severity: 'critical' }), entry({ subject: '' })];
    const kept: ReviewEntry = { severity: 'warning', subject: 'Stack', message: 'Name the test framework.' };
    expect(checkReview(reply(...valid, ...invalid))).toEqual({
      status: 'ok',
      findings: Array.from({ length: 10 }, () => kept),
      dropped: 3,
    });
  });
});
