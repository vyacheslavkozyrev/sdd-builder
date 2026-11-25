// @vitest-environment jsdom
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnalyzeStep } from '../src/analyze/AnalyzeStep.js';
import { buildRequestBody } from '../src/analyze/config.js';
import { PROJECT_ZIP_NAME, saveFile, type DownloadSeam } from '../src/analyze/download.js';
import { generateReply } from '../src/analyze/generate.js';
import type { FetchFn, RequestFailure } from '../src/analyze/request.js';
import { postFile } from '../src/analyze/request.js';
import { loadGenerationTemplates } from '../src/analyze/templates.js';
import { theme } from '../src/theme.js';
import type { WizardValues } from '../src/wizard/state.js';
import { valuesWith } from './wizardValues.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const TEMPLATES = loadGenerationTemplates();
const VALUES = valuesWith('Demo project', '  An idea for the demo.  ');
const GREEN_REPLY = {
  findings: [{ severity: 'info', subject: 'Flow · complete', message: 'No check is set on this flow.' }],
  review: { status: 'ok', findings: [], dropped: 0 },
};
const WARNING_REPLY = {
  findings: [{ severity: 'warning', subject: 'Rules', message: 'Add a rule block.' }],
  review: { status: 'ok', findings: [], dropped: 0 },
};
const CONSENT = 'I have read the notice. Send the brief for review.';
const ZIP_BYTES = 'PK zip bytes';

interface Call {
  readonly url: string;
  readonly body: unknown;
}

// A fake fetch that records each call and answers with what `respond` returns for the path.
function fakeFetch(respond: (url: string) => Promise<Response>): { fetchFn: FetchFn; calls: Call[] } {
  const calls: Call[] = [];
  const fetchFn: FetchFn = (url, init) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    return respond(url);
  };
  return { fetchFn, calls };
}

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

// A 200 reply with the zip media type, as the API sends it.
function zipResponse(): Response {
  return new Response(ZIP_BYTES, { status: 200, headers: { 'Content-Type': 'application/zip' } });
}

function zip(): Promise<Response> {
  return Promise.resolve(zipResponse());
}

// A /generate request that stays pending until the test resolves it; /analyze answers with `analysis`.
function generatePending(analysis: unknown): { fetchFn: FetchFn; calls: Call[]; finish: (response: Response) => void } {
  let finish: (response: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  const fake = fakeFetch((url) => (url === '/analyze' ? json(analysis) : pending));
  return { ...fake, finish };
}

interface Saved {
  readonly blob: Blob;
  readonly name: string;
}

function recorder(): { save: (blob: Blob, name: string) => void; saved: Saved[] } {
  const saved: Saved[] = [];
  return { save: (blob, name) => saved.push({ blob, name }), saved };
}

function renderStep(fetchFn: FetchFn, save: (blob: Blob, name: string) => void) {
  return render(
    <ThemeProvider theme={theme}>
      <AnalyzeStep values={VALUES} templates={TEMPLATES} fetchFn={fetchFn} save={save} />
    </ThemeProvider>,
  );
}

function tickAndAnalyze(): void {
  fireEvent.click(screen.getByRole('checkbox', { name: CONSENT }));
  fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));
}

function generateButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: /Generate and download|Writing the files with the model…/ }) as HTMLButtonElement;
}

// Runs Analyze and waits for the green result, so Generate is enabled.
async function greenStep(extra: (url: string) => Promise<Response>) {
  const { fetchFn, calls } = fakeFetch((url) => (url === '/analyze' ? json(GREEN_REPLY) : extra(url)));
  const recording = recorder();
  renderStep(fetchFn, recording.save);
  tickAndAnalyze();
  await screen.findByText('Result: no blocker and no warning. You can generate the project.');
  return { calls, ...recording };
}

describe('F-13 AC-025 Generate and download is enabled only on a green analysis', () => {
  it('is disabled before any analysis and sends nothing on click', () => {
    const { fetchFn, calls } = fakeFetch(() => zip());
    const recording = recorder();
    renderStep(fetchFn, recording.save);
    expect(generateButton().disabled).toBe(true);
    fireEvent.click(generateButton());
    expect(calls).toHaveLength(0);
    expect(recording.saved).toHaveLength(0);
  });

  it('is disabled on a result with a warning', async () => {
    const { fetchFn } = fakeFetch((url) => (url === '/analyze' ? json(WARNING_REPLY) : zip()));
    renderStep(fetchFn, recorder().save);
    tickAndAnalyze();
    await screen.findByText('Add a rule block.');
    expect(generateButton().disabled).toBe(true);
    expect(screen.getByText('Fix the warning to generate')).toBeTruthy();
  });

  it('is enabled on a green result', async () => {
    await greenStep(() => zip());
    expect(generateButton().disabled).toBe(false);
  });
});

describe('F-13 AC-026 Generate sends one POST /generate with the same configuration and shows its pending state', () => {
  it('posts the configuration of Analyze once, locks the step while pending, and unlocks after the reply', async () => {
    const pending = generatePending(GREEN_REPLY);
    const recording = recorder();
    renderStep(pending.fetchFn, recording.save);
    tickAndAnalyze();
    await screen.findByText('Result: no blocker and no warning. You can generate the project.');

    fireEvent.click(generateButton());
    expect(generateButton().disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Writing the files with the model…' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Writing the files with the model…' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Analyze' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('checkbox', { name: CONSENT }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Show full tree' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(generateButton());
    const generateCalls = pending.calls.filter((call) => call.url === '/generate');
    expect(generateCalls).toHaveLength(1);
    expect(generateCalls[0]?.body).toEqual(buildRequestBody(VALUES));
    expect(pending.calls[0]?.body).toEqual(generateCalls[0]?.body);

    pending.finish(zipResponse());
    await screen.findByRole('button', { name: 'Generate and download' });
    expect(recording.saved).toHaveLength(1);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('F-13 AC-027 a zip reply is saved as sddbuilder-project.zip', () => {
  it('saves the zip bytes under the file name', async () => {
    const recording = recorder();
    const { fetchFn } = fakeFetch((url) => (url === '/analyze' ? json(GREEN_REPLY) : zip()));
    renderStep(fetchFn, recording.save);
    tickAndAnalyze();
    await screen.findByText('Result: no blocker and no warning. You can generate the project.');
    fireEvent.click(generateButton());
    await screen.findByRole('button', { name: 'Generate and download' });
    expect(recording.saved).toHaveLength(1);
    expect(recording.saved[0]?.name).toBe('sddbuilder-project.zip');
    expect(PROJECT_ZIP_NAME).toBe('sddbuilder-project.zip');
    expect(await recording.saved[0]?.blob.text()).toBe(ZIP_BYTES);
  });
});

describe('F-13 AC-028 an error or network failure is shown as text and saves no file', () => {
  it('shows the status of an error reply and saves nothing', async () => {
    const recording = recorder();
    const { fetchFn } = fakeFetch((url) => (url === '/analyze' ? json(GREEN_REPLY) : json({ error: 'busy' }, 429)));
    renderStep(fetchFn, recording.save);
    tickAndAnalyze();
    await screen.findByText('Result: no blocker and no warning. You can generate the project.');
    fireEvent.click(generateButton());
    expect(await screen.findByText('Analysis could not run (429): too many requests. Try again later.')).toBeTruthy();
    expect(recording.saved).toHaveLength(0);
    expect(generateButton().disabled).toBe(false);
    expect((screen.getByRole('checkbox', { name: CONSENT }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('button', { name: 'Analyze' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows a network failure as text and saves nothing', async () => {
    const recording = recorder();
    const { fetchFn } = fakeFetch((url) =>
      url === '/analyze' ? json(GREEN_REPLY) : Promise.reject(new TypeError('Failed to fetch')),
    );
    renderStep(fetchFn, recording.save);
    tickAndAnalyze();
    await screen.findByText('Result: no blocker and no warning. You can generate the project.');
    fireEvent.click(generateButton());
    expect(await screen.findByText('Analysis could not run: network error.')).toBeTruthy();
    expect(recording.saved).toHaveLength(0);
  });

  it('shows a 2xx reply with no content as the same error and saves nothing', async () => {
    const recording = recorder();
    const { fetchFn } = fakeFetch((url) =>
      url === '/analyze' ? json(GREEN_REPLY) : Promise.resolve(new Response('', { status: 200 })),
    );
    renderStep(fetchFn, recording.save);
    tickAndAnalyze();
    await screen.findByText('Result: no blocker and no warning. You can generate the project.');
    fireEvent.click(generateButton());
    expect(await screen.findByText('Analysis could not run (200): the service returned an error. Try again later.')).toBeTruthy();
    expect(recording.saved).toHaveLength(0);
  });
});

describe('F-13 AC-029 a 422 lists every problem and keeps the entered values', () => {
  it('lists one line per problem and leaves the wizard values as they were', async () => {
    const recording = recorder();
    const problems = ['The idea is too long.', 'Add a rule block.'];
    const { fetchFn } = fakeFetch((url) =>
      url === '/analyze' ? json(GREEN_REPLY) : json({ problems }, 422),
    );
    const before = JSON.stringify(VALUES);
    renderStep(fetchFn, recording.save);
    tickAndAnalyze();
    await screen.findByText('Result: no blocker and no warning. You can generate the project.');
    fireEvent.click(generateButton());
    expect(await screen.findByText('Analysis could not run (422): the configuration is over a limit.')).toBeTruthy();
    for (const problem of problems) expect(screen.getByText(problem)).toBeTruthy();
    expect(recording.saved).toHaveLength(0);
    expect(JSON.stringify(VALUES)).toBe(before);
  });
});

describe('F-13 AC-026 a second click while pending sends no second request', () => {
  it('sends one /generate while the first is in flight', async () => {
    const pending = generatePending(GREEN_REPLY);
    renderStep(pending.fetchFn, recorder().save);
    tickAndAnalyze();
    await screen.findByText('Result: no blocker and no warning. You can generate the project.');
    fireEvent.click(generateButton());
    fireEvent.click(generateButton());
    expect(pending.calls.filter((call) => call.url === '/generate')).toHaveLength(1);
    pending.finish(zipResponse());
  });
});

describe('F-13 AC-027 the download seam saves the blob under the name', () => {
  function seam(): { seam: DownloadSeam; log: string[] } {
    const log: string[] = [];
    return {
      log,
      seam: {
        createUrl: (blob) => {
          log.push(`create:${blob.size}`);
          return 'blob:fake';
        },
        revokeUrl: (url) => {
          log.push(`revoke:${url}`);
        },
        clickLink: (url, name) => {
          log.push(`click:${url}:${name}`);
        },
      },
    };
  }

  it('creates a URL, clicks a link with the name, and then releases the URL', () => {
    const fake = seam();
    saveFile(new Blob(['abc']), PROJECT_ZIP_NAME, fake.seam);
    expect(fake.log).toEqual(['create:3', `click:blob:fake:${PROJECT_ZIP_NAME}`, 'revoke:blob:fake']);
  });

  it('releases the URL even when the click throws', () => {
    const fake = seam();
    const failing: DownloadSeam = {
      ...fake.seam,
      clickLink: () => {
        throw new Error('blocked');
      },
    };
    expect(() => saveFile(new Blob(['abc']), PROJECT_ZIP_NAME, failing)).toThrow('blocked');
    expect(fake.log).toEqual(['create:3', 'revoke:blob:fake']);
  });
});

describe('F-13 AC-028 postFile reads a zip as bytes and a failure as JSON', () => {
  it('gives the file for a 2xx reply, with the bytes', async () => {
    const { fetchFn } = fakeFetch(() => zip());
    const outcome = await postFile('/generate', { a: 1 }, fetchFn);
    if (outcome.kind !== 'file') throw new Error('expected a file');
    expect(await outcome.blob.text()).toBe(ZIP_BYTES);
  });

  it('gives the http error with its status and parsed body', async () => {
    const { fetchFn } = fakeFetch(() => json({ problems: ['x'] }, 422));
    expect(await postFile('/generate', {}, fetchFn)).toEqual({ kind: 'http-error', status: 422, body: { problems: ['x'] } });
  });

  it('gives a network error when the request rejects', async () => {
    const fetchFn: FetchFn = () => Promise.reject(new TypeError('Failed to fetch'));
    expect(await postFile('/generate', {}, fetchFn)).toEqual({ kind: 'network-error', status: null, body: null });
  });

  it('refuses a 2xx reply that is not the zip media type, even with a body (AC-027, AC-028)', async () => {
    const { fetchFn } = fakeFetch(() => json({ findings: [] }, 200));
    expect(await postFile('/generate', {}, fetchFn)).toEqual({ kind: 'http-error', status: 200, body: null });
  });

  it('recognises the zip media type with a parameter and any letter case', async () => {
    const fetchFn: FetchFn = () =>
      Promise.resolve(new Response(ZIP_BYTES, { status: 200, headers: { 'Content-Type': 'Application/Zip; charset=binary' } }));
    const outcome = await postFile('/generate', {}, fetchFn);
    expect(outcome.kind).toBe('file');
  });
});

describe('F-13 AC-027 generateReply saves a non-empty file and refuses an empty one', () => {
  it('saves a non-empty file', () => {
    const blob = new Blob(['abc']);
    expect(generateReply({ kind: 'file', blob })).toEqual({ kind: 'save', blob });
  });

  it('refuses an empty file as a 200 failure with no body', () => {
    expect(generateReply({ kind: 'file', blob: new Blob([]) })).toEqual({
      kind: 'failed',
      failure: { kind: 'http-error', status: 200, body: null },
    });
  });

  it.each<[RequestFailure]>([
    [{ kind: 'http-error', status: 500, body: null }],
    [{ kind: 'network-error', status: null, body: null }],
  ])('passes a failure through unchanged (%o)', (failure) => {
    expect(generateReply(failure)).toEqual({ kind: 'failed', failure });
  });
});
