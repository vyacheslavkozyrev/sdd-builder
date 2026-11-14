import { describe, expect, it } from 'vitest';
import { checkReview, type AnalysisFinding } from '../src/index.js';

const valid = { severity: 'info', subject: 'brief', message: 'Consider naming the layers.' };

describe('F-04 AC-016 valid model findings are kept, blockers become warnings', () => {
  const rows: { name: string; reply: unknown; expected: AnalysisFinding[] }[] = [
    {
      name: 'a valid finding is kept with its severity, subject and message',
      reply: [valid],
      expected: [{ severity: 'info', subject: 'brief', message: 'Consider naming the layers.' }],
    },
    {
      name: 'a blocker from the model is kept as warning',
      reply: [{ severity: 'blocker', subject: 'workflow "plan"', message: 'Looks broken.' }],
      expected: [{ severity: 'warning', subject: 'workflow "plan"', message: 'Looks broken.' }],
    },
    {
      name: 'a warning is kept as it is',
      reply: [{ severity: 'warning', subject: 'step "a"', message: 'Unclear output.' }],
      expected: [{ severity: 'warning', subject: 'step "a"', message: 'Unclear output.' }],
    },
    {
      name: 'subject and message are returned exactly as given, without trimming',
      reply: [{ severity: 'info', subject: ' brief ', message: '  spaced message ' }],
      expected: [{ severity: 'info', subject: ' brief ', message: '  spaced message ' }],
    },
    {
      name: 'extra fields on a valid entry are not returned',
      reply: [{ ...valid, extra: 'ignored' }],
      expected: [{ severity: 'info', subject: 'brief', message: 'Consider naming the layers.' }],
    },
  ];

  it.each(rows)('$name', ({ reply, expected }) => {
    const result = checkReview(reply);
    expect(result).toEqual({ status: 'ok', findings: expected, dropped: 0 });
  });
});

describe('F-04 AC-017 invalid model findings are dropped and counted', () => {
  const rows: { name: string; entry: unknown }[] = [
    { name: 'an unknown severity', entry: { severity: 'error', subject: 'a', message: 'b' } },
    {
      name: 'a severity in another letter case',
      entry: { severity: 'Blocker', subject: 'a', message: 'b' },
    },
    {
      name: 'a blocker with an empty subject',
      entry: { severity: 'blocker', subject: '', message: 'b' },
    },
    { name: 'a missing severity', entry: { subject: 'a', message: 'b' } },
    { name: 'a missing subject', entry: { severity: 'info', message: 'b' } },
    { name: 'an empty subject', entry: { severity: 'info', subject: '', message: 'b' } },
    { name: 'a whitespace-only subject', entry: { severity: 'info', subject: '  \t', message: 'b' } },
    { name: 'a missing message', entry: { severity: 'info', subject: 'a' } },
    { name: 'an empty message', entry: { severity: 'info', subject: 'a', message: '' } },
    { name: 'a whitespace-only message', entry: { severity: 'info', subject: 'a', message: '\n ' } },
    { name: 'a non-string subject', entry: { severity: 'info', subject: 3, message: 'b' } },
    { name: 'a non-string message', entry: { severity: 'info', subject: 'a', message: null } },
    { name: 'a string entry', entry: 'a finding' },
    { name: 'a number entry', entry: 42 },
    { name: 'a null entry', entry: null },
    { name: 'an array entry', entry: [{ severity: 'info', subject: 'a', message: 'b' }] },
    { name: 'an undefined entry', entry: undefined },
  ];

  it.each(rows)('drops $name and counts it', ({ entry }) => {
    expect(checkReview([entry])).toEqual({ status: 'ok', findings: [], dropped: 1 });
  });

  it('F-04 AC-017 keeps the valid findings in the same reply as an invalid one', () => {
    const reply = [
      valid,
      { severity: 'error', subject: 'a', message: 'b' },
      { severity: 'blocker', subject: 'workflow "plan"', message: 'Broken.' },
      'not an entry',
      { severity: 'warning', subject: ' ', message: 'blank subject' },
    ];
    expect(checkReview(reply)).toEqual({
      status: 'ok',
      findings: [
        { severity: 'info', subject: 'brief', message: 'Consider naming the layers.' },
        { severity: 'warning', subject: 'workflow "plan"', message: 'Broken.' },
      ],
      dropped: 3,
    });
  });
});

describe('F-04 AC-018 a reply that is not an array fails', () => {
  const rows: { name: string; reply: unknown }[] = [
    { name: 'an object', reply: { findings: [valid] } },
    { name: 'a string', reply: 'findings' },
    { name: 'a number', reply: 1 },
    { name: 'null', reply: null },
    { name: 'undefined', reply: undefined },
    { name: 'a boolean', reply: true },
  ];

  it.each(rows)('gives failed for $name', ({ reply }) => {
    expect(checkReview(reply)).toEqual({ status: 'failed' });
  });

  it('F-04 AC-018 an empty array is a valid reply with no findings', () => {
    expect(checkReview([])).toEqual({ status: 'ok', findings: [], dropped: 0 });
  });

});

describe('F-04 review reply check leaves the reply it is given unchanged', () => {
  it('does not mutate the parsed reply, including a blocker that is kept as warning', () => {
    const reply = [valid, { severity: 'blocker', subject: 'x', message: 'y' }, 7];
    const before = structuredClone(reply);
    const first = checkReview(reply);
    expect(reply).toEqual(before);
    expect(checkReview(reply)).toEqual(first);
  });
});
