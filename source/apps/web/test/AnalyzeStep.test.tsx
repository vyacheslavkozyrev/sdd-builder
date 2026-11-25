// @vitest-environment jsdom
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalyzeStep } from '../src/analyze/AnalyzeStep.js';
import { buildRequestBody } from '../src/analyze/config.js';
import type { FetchFn } from '../src/analyze/request.js';
import { loadGenerationTemplates } from '../src/analyze/templates.js';
import { theme } from '../src/theme.js';
import type { WizardValues } from '../src/wizard/state.js';
import { valuesWith } from './wizardValues.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const TEMPLATES = loadGenerationTemplates();
const WARNING_REPLY = {
  findings: [{ severity: 'warning', subject: 'Rules', message: 'Add a rule block.' }],
  review: { status: 'ok', findings: [], dropped: 0 },
};

interface Call {
  readonly url: string;
  readonly body: unknown;
}

// A fake fetch that records each call and answers with what `respond` returns.
function fakeFetch(respond: () => Promise<Response>): { fetchFn: FetchFn; calls: Call[] } {
  const calls: Call[] = [];
  const fetchFn: FetchFn = (url, init) => {
    const body: unknown = JSON.parse(String(init.body));
    calls.push({ url, body });
    return respond();
  };
  return { fetchFn, calls };
}

function reply(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

// A request that stays pending until the test resolves it.
function deferred(): { fetchFn: FetchFn; calls: Call[]; finish: (response: Response) => void } {
  let finish: (response: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  return { ...fakeFetch(() => pending), finish: (response) => finish(response) };
}

function step(values: WizardValues, fetchFn: FetchFn) {
  return (
    <ThemeProvider theme={theme}>
      <AnalyzeStep values={values} templates={TEMPLATES} fetchFn={fetchFn} />
    </ThemeProvider>
  );
}

function renderStep(values: WizardValues, fetchFn: FetchFn) {
  return render(step(values, fetchFn));
}

const VALUES = valuesWith('Demo project', '  An idea for the demo.  ');
const CHANGED = valuesWith('Other project', '  An idea for the demo.  ');

function tick(): void {
  fireEvent.click(screen.getByRole('checkbox', { name: 'I have read the notice. Send the brief for review.' }));
}

function analyzeButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Analyze' }) as HTMLButtonElement;
}

describe('F-13 AC-001 the step opens with the box unticked and Analyze disabled', () => {
  it('shows no request and the line that no analysis has run', () => {
    const { fetchFn, calls } = fakeFetch(() => reply(WARNING_REPLY));
    renderStep(VALUES, fetchFn);
    expect(analyzeButton().disabled).toBe(true);
    expect(screen.getByText('No analysis has run on this brief yet.')).toBeTruthy();
    expect(calls).toHaveLength(0);
  });
});

describe('F-13 AC-003 with the box unticked, Analyze sends nothing', () => {
  it('does not send a request when Analyze is clicked while unticked', () => {
    const { fetchFn, calls } = fakeFetch(() => reply(WARNING_REPLY));
    renderStep(VALUES, fetchFn);
    fireEvent.click(analyzeButton());
    expect(calls).toHaveLength(0);
    expect(screen.getByText('No analysis has run on this brief yet.')).toBeTruthy();
  });
});

describe('F-13 AC-005 Analyze sends one POST /analyze with the configuration of the wizard values', () => {
  it('posts the configuration built by buildProjectConfig once', async () => {
    const { fetchFn, calls } = fakeFetch(() => reply(WARNING_REPLY));
    renderStep(VALUES, fetchFn);
    tick();
    fireEvent.click(analyzeButton());
    await screen.findByText('Add a rule block.');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('/analyze');
    expect(calls[0]?.body).toEqual(buildRequestBody(VALUES));
  });
});

describe('F-13 AC-006 while pending, Analyze is disabled and a second click sends no request', () => {
  it('shows the pending state and keeps the second click from sending a request', async () => {
    const pending = deferred();
    renderStep(VALUES, pending.fetchFn);
    tick();
    fireEvent.click(analyzeButton());
    expect(analyzeButton().disabled).toBe(true);
    expect(analyzeButton().getAttribute('aria-busy')).toBe('true');
    fireEvent.click(analyzeButton());
    expect(pending.calls).toHaveLength(1);
    pending.finish(new Response(JSON.stringify(WARNING_REPLY), { status: 200 }));
    await screen.findByText('Add a rule block.');
    expect(pending.calls).toHaveLength(1);
  });
});

describe('F-13 AC-014 a new analysis replaces the previous result when it starts', () => {
  it('removes the earlier findings while the new run is pending', async () => {
    // The first run answers; the second stays pending, so the check sees the state the new run starts in.
    const { fetchFn, calls } = fakeFetch(() =>
      calls.length === 1 ? reply(WARNING_REPLY) : new Promise<Response>(() => {}),
    );
    renderStep(VALUES, fetchFn);
    tick();
    fireEvent.click(analyzeButton());
    await screen.findByText('Add a rule block.');
    fireEvent.click(analyzeButton());
    expect(calls).toHaveLength(2);
    expect(screen.queryByText('Add a rule block.')).toBeNull();
    expect(analyzeButton().disabled).toBe(true);
  });
});

describe('F-13 AC-018 and AC-019 a change after the analysis makes it out of date', () => {
  it('shows the out-of-date note, the earlier result greyed, and Generate reason Run Analyze first', async () => {
    const { fetchFn } = fakeFetch(() => reply(WARNING_REPLY));
    const { rerender } = renderStep(VALUES, fetchFn);
    tick();
    fireEvent.click(analyzeButton());
    await screen.findByText('Add a rule block.');
    rerender(step(CHANGED, fetchFn));
    expect(screen.getByText('The project changed since the last analysis. Analyze again.')).toBeTruthy();
    expect(screen.getByText('Earlier result (not current)')).toBeTruthy();
    expect(screen.getByText('Run Analyze first')).toBeTruthy();
    expect(analyzeButton().disabled).toBe(false);
  });
});

describe('F-13 AC-010 an error reply is shown as text and keeps the box ticked', () => {
  it('shows the status sentence and leaves Analyze enabled', async () => {
    const { fetchFn } = fakeFetch(() => reply({}, 429));
    renderStep(VALUES, fetchFn);
    tick();
    fireEvent.click(analyzeButton());
    await screen.findByText('Analysis could not run (429): too many requests. Try again later.');
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
    expect(analyzeButton().disabled).toBe(false);
  });

  it('shows the network error sentence when the request fails', async () => {
    const { fetchFn } = fakeFetch(() => Promise.reject(new TypeError('offline')));
    renderStep(VALUES, fetchFn);
    tick();
    fireEvent.click(analyzeButton());
    await screen.findByText('Analysis could not run: network error.');
  });
});

describe('F-13 AC-011 a 422 reply lists every problem', () => {
  it('shows one line per problem under the 422 sentence', async () => {
    const { fetchFn } = fakeFetch(() => reply({ problems: ['idea: is blank', 'rules: duplicate name'] }, 422));
    renderStep(VALUES, fetchFn);
    tick();
    fireEvent.click(analyzeButton());
    await screen.findByText('idea: is blank');
    expect(screen.getByText('rules: duplicate name')).toBeTruthy();
  });
});

describe('F-13 AC-013 a 200 reply that is not an analysis result is an error', () => {
  it('shows the error sentence and lists no findings', async () => {
    const { fetchFn } = fakeFetch(() => reply({ unexpected: true }));
    renderStep(VALUES, fetchFn);
    tick();
    fireEvent.click(analyzeButton());
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toContain('Analysis could not run (200)');
    expect(screen.queryByText('Findings')).toBeNull();
  });
});

describe('F-13 AC-020 the tick and the analysis are held in memory only', () => {
  it('writes nothing to browser storage during an analysis', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { fetchFn } = fakeFetch(() => reply(WARNING_REPLY));
    renderStep(VALUES, fetchFn);
    tick();
    fireEvent.click(analyzeButton());
    await screen.findByText('Add a rule block.');
    expect(setItem).not.toHaveBeenCalled();
  });
});
