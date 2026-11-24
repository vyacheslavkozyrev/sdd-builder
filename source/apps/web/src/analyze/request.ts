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

const NETWORK_ERROR: RequestFailure = { kind: 'network-error', status: null, body: null };

// A body that is not JSON (for example an empty reply) gives `null`; the reply parser refuses it later.
function parseBody(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    return null;
  }
}

function requestInit(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  };
}

export async function postJson(path: string, body: unknown, fetchFn: FetchFn): Promise<RequestOutcome> {
  let response: Response;
  let text: string;
  try {
    response = await fetchFn(path, requestInit(body));
    text = await response.text();
  } catch {
    return NETWORK_ERROR;
  }
  const parsed = parseBody(text);
  if (response.ok) return { kind: 'ok', body: parsed };
  return { kind: 'http-error', status: response.status, body: parsed };
}

// A failed request: its HTTP status and parsed body, or a network failure.
export type RequestFailure = Extract<RequestOutcome, { readonly kind: 'http-error' | 'network-error' }>;

// The outcome of /generate: a 2xx reply is the zip, read as bytes; any other reply is a failure read as JSON.
export type FileOutcome = { readonly kind: 'file'; readonly blob: Blob } | RequestFailure;

// The media type the API gives the zip (architecture decision 11). A 2xx reply of any other type is not a zip.
function isZipReply(response: Response): boolean {
  return response.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase() === 'application/zip';
}

// The same request as postJson (one POST, the same headers and body), for a reply that is a file (F-13 AC-026, AC-027).
export async function postFile(path: string, body: unknown, fetchFn: FetchFn): Promise<FileOutcome> {
  let response: Response;
  try {
    response = await fetchFn(path, requestInit(body));
    if (!response.ok) return { kind: 'http-error', status: response.status, body: parseBody(await response.text()) };
    if (isZipReply(response)) return { kind: 'file', blob: await response.blob() };
    return { kind: 'http-error', status: response.status, body: null };
  } catch {
    return NETWORK_ERROR;
  }
}
