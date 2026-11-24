import { describe, expect, it } from 'vitest';
import { analysisError, type AnalysisState } from '../src/analyze/analysisState.js';
import { postJson, type FetchFn } from '../src/analyze/request.js';

interface Call {
  readonly url: string;
  readonly init: RequestInit;
}

// A fake fetch that records its calls and answers with a fixed response or a fixed failure.
function fakeFetch(answer: { response: Response } | { error: Error }): { fetchFn: FetchFn; calls: Call[] } {
  const calls: Call[] = [];
  const fetchFn: FetchFn = (url, init) => {
    calls.push({ url, init });
    if ('error' in answer) return Promise.reject(answer.error);
    return Promise.resolve(answer.response.clone());
  };
  return { fetchFn, calls };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const CONFIG = { schemaVersion: 2, name: 'Shop' };

describe('F-13 AC-005 postJson sends one POST with the configuration as JSON', () => {
  it('F-13 AC-005 sends exactly one request to the path given', async () => {
    const { fetchFn, calls } = fakeFetch({ response: jsonResponse(200, { findings: [] }) });
    await postJson('/analyze', CONFIG, fetchFn);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('/analyze');
  });

  it('F-13 AC-005 uses the POST method with a JSON content type and an Accept header for JSON', async () => {
    const { fetchFn, calls } = fakeFetch({ response: jsonResponse(200, {}) });
    await postJson('/generate', CONFIG, fetchFn);
    const init = calls[0]?.init;
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json', Accept: 'application/json' });
  });

  it('F-13 AC-005 sends the body as the JSON of the configuration, the same body for the same configuration', async () => {
    const first = fakeFetch({ response: jsonResponse(200, {}) });
    const second = fakeFetch({ response: jsonResponse(200, {}) });
    await postJson('/analyze', CONFIG, first.fetchFn);
    await postJson('/analyze', { ...CONFIG }, second.fetchFn);
    expect(first.calls[0]?.init.body).toBe(JSON.stringify(CONFIG));
    expect(second.calls[0]?.init.body).toBe(first.calls[0]?.init.body);
  });
});

describe('F-13 AC-010 postJson gives the outcome of the reply', () => {
  it('F-13 AC-010 gives ok with the parsed body for a 2xx reply', async () => {
    const { fetchFn } = fakeFetch({ response: jsonResponse(200, { findings: [] }) });
    expect(await postJson('/analyze', CONFIG, fetchFn)).toEqual({ kind: 'ok', body: { findings: [] } });
  });

  it.each([400, 404, 422, 429, 500, 502])(
    'F-13 AC-010 gives http-error with the status %i and the parsed body',
    async (status) => {
      const body = { error: 'reason' };
      const { fetchFn } = fakeFetch({ response: jsonResponse(status, body) });
      expect(await postJson('/analyze', CONFIG, fetchFn)).toEqual({ kind: 'http-error', status, body });
    },
  );

  it('F-13 AC-010 gives network-error with a null status when the request rejects', async () => {
    const { fetchFn } = fakeFetch({ error: new TypeError('Failed to fetch') });
    expect(await postJson('/analyze', CONFIG, fetchFn)).toEqual({
      kind: 'network-error',
      status: null,
      body: null,
    });
  });

  it('F-13 AC-010 gives a null body for an error reply that is not JSON, keeping the status', async () => {
    const { fetchFn } = fakeFetch({ response: new Response('Not Found', { status: 404 }) });
    expect(await postJson('/analyze', CONFIG, fetchFn)).toEqual({ kind: 'http-error', status: 404, body: null });
  });

  it('F-13 AC-010 gives network-error when the body cannot be read after the request was sent', async () => {
    const fetchFn: FetchFn = () =>
      Promise.resolve({
        ok: false,
        status: 502,
        text: () => Promise.reject(new TypeError('connection reset')),
      } as unknown as Response);
    expect(await postJson('/analyze', CONFIG, fetchFn)).toEqual({ kind: 'network-error', status: null, body: null });
  });
});

describe('F-13 AC-010 a failure outcome maps directly to the error state', () => {
  it('F-13 AC-010 maps an http error to the error state with the same status and body', async () => {
    const { fetchFn } = fakeFetch({ response: jsonResponse(429, { error: 'busy' }) });
    const outcome = await postJson('/analyze', CONFIG, fetchFn);
    if (outcome.kind === 'ok') throw new Error('expected a failure outcome');
    const state: AnalysisState = analysisError('key', outcome.status, outcome.body);
    expect(state).toEqual({ kind: 'error', key: 'key', status: 429, body: { error: 'busy' } });
  });

  it('F-13 AC-010 maps a network failure to the error state with a null status', async () => {
    const { fetchFn } = fakeFetch({ error: new TypeError('Failed to fetch') });
    const outcome = await postJson('/analyze', CONFIG, fetchFn);
    if (outcome.kind === 'ok') throw new Error('expected a failure outcome');
    const state: AnalysisState = analysisError('key', outcome.status, outcome.body);
    expect(state).toEqual({ kind: 'error', key: 'key', status: null, body: null });
  });
});
