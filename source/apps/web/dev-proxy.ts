import type { ProxyOptions } from 'vite';

// The dev server forwards only the two API calls. Vite matches a key that starts with `^` as a regular expression
// and any other key as a path prefix, so the anchored keys below reach `/analyze` and `/generate` only,
// not `/analyzer` or `/generate/x`. The query string, if any, is allowed.
const FORWARDED_PATHS = ['^/analyze(\\?.*)?$', '^/generate(\\?.*)?$'] as const;

// Long enough for a generation that takes minutes; the same as the API's generation timeout.
const PROXY_TIMEOUT_MS = 300_000;
const DEFAULT_API_PORT = '3000';

// Follows F-16 AC-004: unset or blank gives 3000, any other value is trimmed and used as given. The API's `readPort`
// (`apps/api/src/settings.ts`) gives the same port for unset, blank and space-padded values. The one difference left:
// the proxy does not check a non-numeric or out-of-range value (AC-004 says "used as given"); the API refuses it.
// Recorded in the F-16 progress file (Deferred Findings).
function apiPort(env: Readonly<Record<string, string | undefined>>): string {
  const port = env['PORT']?.trim();
  return port === undefined || port === '' ? DEFAULT_API_PORT : port;
}

export function devProxy(env: Readonly<Record<string, string | undefined>>): Record<string, ProxyOptions> {
  const entry: ProxyOptions = {
    target: `http://localhost:${apiPort(env)}`,
    timeout: PROXY_TIMEOUT_MS,
    proxyTimeout: PROXY_TIMEOUT_MS,
  };
  return Object.fromEntries(FORWARDED_PATHS.map((path) => [path, { ...entry }]));
}
