// The request client of step 4 (F-13 AC-005, AC-010, AC-031). It sends one POST with a JSON body and gives the outcome.
// The fetch function is passed in, so tests use a fake and no test reaches the network.
//
// The failure outcomes carry `status` and `body` in the same shape as the error state of analysisState.ts, so the
// caller maps an outcome to that state directly: `analysisError(key, outcome.status, outcome.body)`. A network failure
// has no HTTP status, so its status is `null` (the same meaning as in the error state).

export type RequestOutcome =
  | { readonly kind: 'ok'; readonly body: unknown }
  | { readonly kind: 'http-error'; readonly status: number; readonly body: unknown }
  | { readonly kind: 'network-error'; readonly status: null; readonly body: null };

export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

const NETWORK_ERROR: RequestOutcome = { kind: 'network-error', status: null, body: null };

// A body that is not JSON (for example an empty reply) gives `null`; the reply parser refuses it later.
function parseBody(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    return null;
  }
}

export async function postJson(path: string, body: unknown, fetchFn: FetchFn): Promise<RequestOutcome> {
  let response: Response;
  let text: string;
  try {
    response = await fetchFn(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    text = await response.text();
  } catch {
    return NETWORK_ERROR;
  }
  const parsed = parseBody(text);
  if (response.ok) return { kind: 'ok', body: parsed };
  return { kind: 'http-error', status: response.status, body: parsed };
}
