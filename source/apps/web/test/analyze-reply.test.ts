import { describe, expect, it } from 'vitest';
import { errorMessage, parseAnalysisReply, problemLines } from '../src/analyze/reply.js';

const FINDING = { severity: 'warning', subject: 'Rules', message: 'A rule is empty.' };
const INFO = { severity: 'info', subject: 'Stack', message: 'Consider a test runner.' };

function reply(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    findings: [FINDING],
    review: { status: 'ok', findings: [INFO], dropped: 0 },
    ...overrides,
  };
}

describe('F-13 AC-013 parseAnalysisReply accepts a reply of the analysis result shape', () => {
  it('F-13 AC-013 gives the findings and the review of a valid reply', () => {
    expect(parseAnalysisReply(reply())).toEqual({
      findings: [FINDING],
      review: { status: 'ok', findings: [INFO], dropped: 0 },
    });
  });

  it.each(['blocker', 'warning', 'info'])('F-13 AC-013 accepts the severity %s', (severity) => {
    expect(parseAnalysisReply(reply({ findings: [{ ...FINDING, severity }] }))).not.toBeNull();
  });

  it.each(['ok', 'failed', 'skipped'])('F-13 AC-013 accepts the review status %s', (status) => {
    expect(parseAnalysisReply(reply({ review: { status, findings: [], dropped: 2 } }))).not.toBeNull();
  });

  it('F-13 AC-013 keeps only the known fields of each finding', () => {
    const parsed = parseAnalysisReply(reply({ findings: [{ ...FINDING, extra: 'x' }] }));
    expect(parsed?.findings).toEqual([FINDING]);
  });
});

describe('F-13 AC-013 parseAnalysisReply refuses anything that is not the result shape', () => {
  const refused: [string, unknown][] = [
    ['null (a body that is not JSON)', null],
    ['a string', 'ok'],
    ['an array', [reply()]],
    ['no findings list', { review: reply().review }],
    ['findings that is not a list', reply({ findings: 'none' })],
    ['a finding that is a string', reply({ findings: ['a warning'] })],
    ['a finding with an unknown severity', reply({ findings: [{ ...FINDING, severity: 'error' }] })],
    ['a finding without a subject', reply({ findings: [{ severity: 'info', message: 'm' }] })],
    ['a finding whose message is not text', reply({ findings: [{ ...FINDING, message: 3 }] })],
    ['no review', { findings: [] }],
    ['a review that is not an object', reply({ review: 'ok' })],
    ['a review with an unknown status', reply({ review: { status: 'done', findings: [], dropped: 0 } })],
    ['a review without findings', reply({ review: { status: 'ok', dropped: 0 } })],
    [
      'a review finding with an unknown severity',
      reply({ review: { status: 'ok', findings: [{ ...INFO, severity: 'x' }], dropped: 0 } }),
    ],
    ['a review without a dropped count', reply({ review: { status: 'ok', findings: [] } })],
    ['a negative dropped count', reply({ review: { status: 'ok', findings: [], dropped: -1 } })],
    ['a fractional dropped count', reply({ review: { status: 'ok', findings: [], dropped: 1.5 } })],
  ];

  it.each(refused)('F-13 AC-013 refuses %s', (_name, value) => {
    expect(parseAnalysisReply(value)).toBeNull();
  });
});

describe('F-13 AC-010 errorMessage gives the status of a failed request', () => {
  it('F-13 AC-012 gives the status and the too many requests wording for 429', () => {
    expect(errorMessage({ kind: 'http-error', status: 429, body: null })).toBe(
      'Analysis could not run (429): too many requests. Try again later.',
    );
  });

  it('F-13 AC-010 gives the status and the configuration wording for 422', () => {
    expect(errorMessage({ kind: 'http-error', status: 422, body: { problems: [] } })).toBe(
      'Analysis could not run (422): the configuration is over a limit.',
    );
  });

  it.each([400, 404, 500, 502])('F-13 AC-010 gives the status %i in the same sentence form', (status) => {
    expect(errorMessage({ kind: 'http-error', status, body: null })).toMatch(
      new RegExp(`^Analysis could not run \\(${status}\\): .+\\.$`),
    );
  });

  it('F-13 AC-010 gives network error for a failed connection', () => {
    expect(errorMessage({ kind: 'network-error', status: null, body: null })).toBe(
      'Analysis could not run: network error.',
    );
  });
});

describe('F-13 AC-011 problemLines gives one line per problem of a 422 body', () => {
  it('F-13 AC-011 gives every problem, in order, one line each', () => {
    const body = { problems: ['idea: too long', 'architecture: empty', 'rules/code-style: invalid id'] };
    expect(problemLines(body)).toEqual(['idea: too long', 'architecture: empty', 'rules/code-style: invalid id']);
  });

  it('F-13 AC-011 gives no lines for an empty problem list', () => {
    expect(problemLines({ problems: [] })).toEqual([]);
  });

  it.each([
    ['a body without problems', { error: 'over a limit' }],
    ['a problems value that is not a list', { problems: 'idea: too long' }],
    ['a problem that is not text', { problems: ['idea: too long', 4] }],
    ['a body that is not an object', 'over a limit'],
    ['null', null],
  ])('F-13 AC-011 gives no lines for %s', (_name, body) => {
    expect(problemLines(body)).toEqual([]);
  });
});
