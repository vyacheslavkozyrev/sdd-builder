// F-04 AC-014, AC-015: checkReview on the pipeline side. A valid array keeps its entries as findings, a model blocker
// comes back as warning, an invalid entry is dropped and counted, and a reply that is not an array fails.
import { describe, expect, it } from 'vitest';
import { checkReview } from '../src/pipeline/index.js';

describe('F-04 AC-014: a valid review reply gives its findings', () => {
  it('F-04 AC-014 returns status ok with the entries as findings, in reply order', () => {
    const result = checkReview([
      { severity: 'info', subject: 'pipeline.blocks[0]', message: 'Start is clear.' },
      { severity: 'warning', subject: 'rules', message: 'No rules are listed.' },
    ]);
    expect(result).toEqual({
      status: 'ok',
      findings: [
        { severity: 'info', subject: 'pipeline.blocks[0]', message: 'Start is clear.' },
        { severity: 'warning', subject: 'rules', message: 'No rules are listed.' },
      ],
      dropped: 0,
    });
  });

  it('F-04 AC-014 returns a model blocker as warning', () => {
    const result = checkReview([{ severity: 'blocker', subject: 'idea', message: 'The idea is empty.' }]);
    expect(result).toEqual({
      status: 'ok',
      findings: [{ severity: 'warning', subject: 'idea', message: 'The idea is empty.' }],
      dropped: 0,
    });
  });

  it('F-04 AC-014 an empty array is an ok reply with no findings', () => {
    expect(checkReview([])).toEqual({ status: 'ok', findings: [], dropped: 0 });
  });

  it('F-04 AC-014 returns subjects and messages exactly as the model wrote them, not trimmed', () => {
    const result = checkReview([
      { severity: 'info', subject: '  rules  ', message: '  Keep the rules short.\n' },
    ]);
    expect(result).toEqual({
      status: 'ok',
      findings: [{ severity: 'info', subject: '  rules  ', message: '  Keep the rules short.\n' }],
      dropped: 0,
    });
  });

  it('F-04 AC-014 keeps extra keys out of the finding', () => {
    const result = checkReview([{ severity: 'info', subject: 'idea', message: 'Clear.', extra: 1 }]);
    expect(result).toEqual({
      status: 'ok',
      findings: [{ severity: 'info', subject: 'idea', message: 'Clear.' }],
      dropped: 0,
    });
  });
});

describe('F-04 AC-015: invalid entries are dropped and counted', () => {
  const valid = { severity: 'info', subject: 'idea', message: 'Clear.' };

  const invalidEntries: Array<[string, unknown]> = [
    ['unknown severity', { severity: 'error', subject: 'idea', message: 'Bad.' }],
    ['missing severity', { subject: 'idea', message: 'Bad.' }],
    ['uppercase severity', { severity: 'Warning', subject: 'idea', message: 'Bad.' }],
    ['blank message', { severity: 'info', subject: 'idea', message: '   ' }],
    ['empty message', { severity: 'info', subject: 'idea', message: '' }],
    ['blank subject', { severity: 'info', subject: '\t\n', message: 'Bad.' }],
    ['missing subject', { severity: 'info', message: 'Bad.' }],
    ['non-string subject', { severity: 'info', subject: 3, message: 'Bad.' }],
    ['non-string message', { severity: 'info', subject: 'idea', message: 42 }],
    ['null entry', null],
    ['string entry', 'a finding'],
    ['number entry', 7],
    ['array entry', [{ severity: 'info', subject: 'idea', message: 'Bad.' }]],
    ['empty array entry', []],
  ];

  it.each(invalidEntries)('F-04 AC-015 drops an entry with %s and counts it', (_name, entry) => {
    const result = checkReview([valid, entry, valid]);
    expect(result).toEqual({
      status: 'ok',
      findings: [valid, valid],
      dropped: 1,
    });
  });

  it('F-04 AC-015 counts every dropped entry and keeps the valid ones in order', () => {
    const first = { severity: 'warning', subject: 'a', message: 'First.' };
    const second = { severity: 'blocker', subject: 'b', message: 'Second.' };
    const result = checkReview([null, first, 'x', second, { severity: 'info', subject: 'c', message: ' ' }]);
    expect(result).toEqual({
      status: 'ok',
      findings: [
        { severity: 'warning', subject: 'a', message: 'First.' },
        { severity: 'warning', subject: 'b', message: 'Second.' },
      ],
      dropped: 3,
    });
  });

  it('F-04 AC-015 a reply that is not an array fails as a whole', () => {
    const replies: unknown[] = [
      undefined,
      null,
      'a review',
      42,
      true,
      { severity: 'info', subject: 'idea', message: 'Clear.' },
      { findings: [] },
    ];
    for (const reply of replies) {
      expect(checkReview(reply)).toEqual({ status: 'failed' });
    }
  });
});
