// @vitest-environment jsdom
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  analysisError,
  analysisResult,
  startAnalysis,
  type AnalysisFinding,
  type AnalysisResult,
  type AnalysisState,
} from '../src/analyze/analysisState.js';
import { Findings, resultLine } from '../src/analyze/Findings.js';
import { theme } from '../src/theme.js';

afterEach(cleanup);

const KEY = 'current-configuration';

function finding(severity: AnalysisFinding['severity'], subject: string, message: string): AnalysisFinding {
  return { severity, subject, message };
}

function result(overrides: {
  findings?: AnalysisFinding[];
  status?: AnalysisResult['review']['status'];
  reviewFindings?: AnalysisFinding[];
}): AnalysisResult {
  return {
    findings: overrides.findings ?? [],
    review: { status: overrides.status ?? 'ok', findings: overrides.reviewFindings ?? [], dropped: 0 },
  };
}

function view(state: AnalysisState, configKey = KEY, stale = false) {
  return render(
    <ThemeProvider theme={theme}>
      <Findings state={state} configKey={configKey} stale={stale} />
    </ThemeProvider>,
  );
}

function rows(): HTMLElement[] {
  return screen.queryAllByRole('listitem');
}

describe('F-13 AC-007 findings in server order with severity, subject and message as plain text', () => {
  it('shows each finding with its severity word, subject and message, in the order returned', () => {
    view(
      analysisResult(
        KEY,
        result({
          findings: [
            finding('blocker', 'Brief · Idea', 'The idea is blank.'),
            finding('warning', 'Technical details · Rules', 'The rules list is empty.'),
            finding('info', 'Flow · verify', 'Human approval is on and the flow has no check.'),
          ],
        }),
      ),
    );
    const items = rows();
    expect(items).toHaveLength(3);
    expect(within(items[0] as HTMLElement).getByText('Blocker')).toBeTruthy();
    expect(within(items[0] as HTMLElement).getByText('Brief · Idea')).toBeTruthy();
    expect(within(items[0] as HTMLElement).getByText('The idea is blank.')).toBeTruthy();
    expect(within(items[1] as HTMLElement).getByText('Warning')).toBeTruthy();
    expect(within(items[2] as HTMLElement).getByText('Info')).toBeTruthy();
    expect(within(items[2] as HTMLElement).getByText('Human approval is on and the flow has no check.')).toBeTruthy();
  });

  it('shows a message that holds markup as typed text, not as an element', () => {
    const { container } = view(
      analysisResult(KEY, result({ findings: [finding('info', 'Agent · commit', 'Use <b>bold</b> text.')] })),
    );
    expect(screen.getByText('Use <b>bold</b> text.')).toBeTruthy();
    expect(container.querySelector('b')).toBeNull();
  });
});

describe('F-13 AC-008 structural findings first, then review findings', () => {
  it('lists the structural findings, then the review findings, each in server order', () => {
    view(
      analysisResult(
        KEY,
        result({
          findings: [finding('warning', 'Structure A', 'first structural'), finding('info', 'Structure B', 'second')],
          reviewFindings: [finding('info', 'Review A', 'first review'), finding('warning', 'Review B', 'second review')],
        }),
      ),
    );
    const subjects = rows().map((item) => within(item).getByText(/^(Structure|Review) [AB]$/).textContent);
    expect(subjects).toEqual(['Structure A', 'Structure B', 'Review A', 'Review B']);
  });
});

describe('F-13 AC-009 a review that did not finish is noted and keeps the structural findings', () => {
  it.each(['failed', 'skipped'] as const)(
    'shows the review note for a %s review and still lists the structural findings',
    (status) => {
      view(analysisResult(KEY, result({ status, findings: [finding('info', 'Flow · verify', 'Structural info.')] })));
      expect(screen.getByText('The analysis did not finish. Analyze again.')).toBeTruthy();
      expect(screen.getByText('Structural info.')).toBeTruthy();
    },
  );

  it('shows no review note for a review that finished', () => {
    view(analysisResult(KEY, result({ findings: [finding('info', 'Flow · verify', 'Structural info.')] })));
    expect(screen.queryByText('The analysis did not finish. Analyze again.')).toBeNull();
  });

  it('says on the result line that Generate stays off when the review did not finish', () => {
    view(analysisResult(KEY, result({ status: 'failed', findings: [finding('info', 'Flow · verify', 'Info.')] })));
    expect(screen.getByText('Result: 1 info. The analysis did not finish, so Generate stays off.')).toBeTruthy();
  });
});

describe('F-13 AC-010 an error reply shows its status or network error as text', () => {
  const cases: Array<{ name: string; status: number | null; text: string }> = [
    {
      name: 'a 429 with the approved wording',
      status: 429,
      text: 'Analysis could not run (429): too many requests. Try again later.',
    },
    { name: 'a 400', status: 400, text: 'Analysis could not run (400): the request was not valid.' },
    { name: 'a 404', status: 404, text: 'Analysis could not run (404): the service has no such endpoint.' },
    {
      name: 'a 500 with the default wording',
      status: 500,
      text: 'Analysis could not run (500): the service returned an error. Try again later.',
    },
    {
      name: 'a 502 with the default wording',
      status: 502,
      text: 'Analysis could not run (502): the service returned an error. Try again later.',
    },
    { name: 'a network failure', status: null, text: 'Analysis could not run: network error.' },
  ];

  it.each(cases)('F-13 AC-010 shows the text for $name', ({ status, text }) => {
    view(analysisError(KEY, status, null));
    expect(screen.getByRole('alert').textContent).toBe(text);
  });

  it('F-13 AC-010 shows no findings and no result line for an error', () => {
    view(analysisError(KEY, 429, null));
    expect(rows()).toHaveLength(0);
    expect(screen.queryByText('Findings')).toBeNull();
  });
});

describe('F-13 AC-011 a 422 reply lists every problem, one line each', () => {
  it('shows one line per problem under the 422 sentence', () => {
    view(
      analysisError(KEY, 422, {
        problems: ['idea: at most 5,000 characters, counted in code points.', 'architecture: at most 5,000 characters.'],
      }),
    );
    expect(screen.getByText('Analysis could not run (422): the configuration is over a limit.')).toBeTruthy();
    expect(screen.getByText('idea: at most 5,000 characters, counted in code points.')).toBeTruthy();
    expect(screen.getByText('architecture: at most 5,000 characters.')).toBeTruthy();
  });

  it('shows the 422 sentence alone when the body has no problem list', () => {
    const { container } = view(analysisError(KEY, 422, { detail: 'not a list' }));
    expect(screen.getByText('Analysis could not run (422): the configuration is over a limit.')).toBeTruthy();
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });
});

describe('F-13 AC-016 a green analysis shows the no blocker and no warning line', () => {
  it('shows the green result line for a current result with only info findings', () => {
    view(analysisResult(KEY, result({ findings: [finding('info', 'Flow · complete', 'No check is set.')] })));
    expect(screen.getByText('Result: no blocker and no warning. You can generate the project.')).toBeTruthy();
  });

  it('computes the line for each case of the approved screens', () => {
    const cases: Array<{ name: string; state: AnalysisState; text: string | null; green: boolean }> = [
      {
        name: 'a green result',
        state: analysisResult(KEY, result({})),
        text: 'Result: no blocker and no warning. You can generate the project.',
        green: true,
      },
      {
        name: 'a blocker, a warning and an info',
        state: analysisResult(
          KEY,
          result({
            findings: [
              finding('blocker', 'a', 'a'),
              finding('warning', 'b', 'b'),
              finding('info', 'c', 'c'),
            ],
          }),
        ),
        text: 'Result: 1 blocker, 1 warning and 1 info. Fix the blocker, then Analyze again.',
        green: false,
      },
      {
        name: 'a warning only',
        state: analysisResult(KEY, result({ reviewFindings: [finding('warning', 'a', 'a')] })),
        text: 'Result: a warning is present. Fix it, then Analyze again to generate.',
        green: false,
      },
      {
        name: 'two blockers',
        state: analysisResult(KEY, result({ findings: [finding('blocker', 'a', 'a'), finding('blocker', 'b', 'b')] })),
        text: 'Result: 2 blockers. Fix the blocker, then Analyze again.',
        green: false,
      },
      {
        name: 'a result on another configuration',
        state: analysisResult('other-configuration', result({})),
        text: null,
        green: false,
      },
      {
        name: 'no result',
        state: startAnalysis(KEY),
        text: null,
        green: false,
      },
    ];
    for (const { name, state, text, green } of cases) {
      const line = resultLine(state, KEY);
      expect(line?.text ?? null, name).toBe(text);
      expect(line?.green ?? false, name).toBe(green);
    }
  });

  it('shows no green line when a blocker or a warning is present', () => {
    view(analysisResult(KEY, result({ findings: [finding('warning', 'Rules', 'Empty.')] })));
    expect(screen.queryByText(/no blocker and no warning/)).toBeNull();
  });
});

describe('F-13 AC-001 and AC-002 the line before any analysis', () => {
  it('says no analysis has run when the state is not run', () => {
    view({ kind: 'not-run' });
    expect(screen.getByText('No analysis has run on this brief yet.')).toBeTruthy();
    expect(rows()).toHaveLength(0);
  });
});

describe('F-13 AC-006 the view shows nothing under the button while the request is pending', () => {
  it('shows neither the no-run line nor any row while pending', () => {
    view(startAnalysis(KEY));
    expect(screen.queryByText('No analysis has run on this brief yet.')).toBeNull();
    expect(rows()).toHaveLength(0);
  });
});

describe('F-13 AC-018 and AC-019 an analysis on another configuration is out of date', () => {
  const STALE_NOTE = 'The project changed since the last analysis. Analyze again.';

  it('shows the note and the earlier findings as not current, with no result line', () => {
    view(analysisResult(KEY, result({ findings: [finding('info', 'Flow · verify', 'A flow has approval.')] })), 'later', true);
    expect(screen.getByRole('status').textContent).toBe(STALE_NOTE);
    expect(screen.getByText('Earlier result (not current)')).toBeTruthy();
    expect(screen.queryByText('Findings')).toBeNull();
    expect(screen.getByText('A flow has approval.')).toBeTruthy();
    expect(screen.queryByText(/^Result:/)).toBeNull();
  });

  it('shows the note above an error from the earlier configuration', () => {
    view(analysisError(KEY, 429, null), 'later', true);
    expect(screen.getByRole('status').textContent).toBe(STALE_NOTE);
    expect(screen.getByRole('alert').textContent).toContain('Analysis could not run (429)');
  });

  it('shows no note when the result is on the current configuration', () => {
    view(analysisResult(KEY, result({ findings: [] })), KEY, false);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Findings')).toBeTruthy();
  });
});
