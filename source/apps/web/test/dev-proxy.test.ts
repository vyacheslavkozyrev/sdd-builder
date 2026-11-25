import { describe, expect, it } from 'vitest';
import type { ProxyOptions } from 'vite';
import { devProxy } from '../dev-proxy.js';

type Env = Readonly<Record<string, string | undefined>>;

// Vite routes a request to a proxy entry: a key that starts with `^` is a regular expression, any other key is a prefix.
function forwardedKeys(proxy: Record<string, ProxyOptions>, path: string): string[] {
  return Object.keys(proxy).filter((key) => (key.startsWith('^') ? new RegExp(key).test(path) : path.startsWith(key)));
}

function targetOf(proxy: Record<string, ProxyOptions>, key: string): unknown {
  return proxy[key]?.target;
}

describe('F-16 AC-001 the dev server forwards both API calls to the API target', () => {
  it.each([
    ['/analyze'],
    ['/generate'],
    ['/analyze?debug=1'],
  ])('F-16 AC-001 forwards %s to the API', (path) => {
    expect(forwardedKeys(devProxy({ PORT: '4100' }), path)).toHaveLength(1);
  });

  it.each([
    [{}, 'http://localhost:3000'],
    [{ PORT: '3000' }, 'http://localhost:3000'],
    [{ PORT: '4100' }, 'http://localhost:4100'],
  ])('F-16 AC-001 targets http://localhost:<PORT> for env %j', (env: Env, target) => {
    const proxy = devProxy(env);
    expect(targetOf(proxy, '^/analyze(\\?.*)?$')).toBe(target);
    expect(targetOf(proxy, '^/generate(\\?.*)?$')).toBe(target);
  });
});

describe('F-16 AC-002 no other path is forwarded to the API', () => {
  it.each([['/'], ['/generate/x'], ['/analyzer'], ['/analyze/x'], ['/src/main.tsx'], ['/api/analyze']])(
    'F-16 AC-002 does not forward %s',
    (path) => {
      expect(forwardedKeys(devProxy({}), path)).toEqual([]);
    },
  );

  it('F-16 AC-002 negative case: the proxy has entries for /analyze and /generate only', () => {
    expect(Object.keys(devProxy({})).sort()).toEqual(['^/analyze(\\?.*)?$', '^/generate(\\?.*)?$']);
  });
});

describe('F-16 AC-003 both entries wait 300 seconds, as the API generation timeout does', () => {
  it.each([['^/analyze(\\?.*)?$'], ['^/generate(\\?.*)?$']])('F-16 AC-003 sets 300000 ms on %s', (key) => {
    const entry = devProxy({})[key];
    expect(entry?.timeout).toBe(300_000);
    expect(entry?.proxyTimeout).toBe(300_000);
  });
});

describe('F-16 AC-004 the proxy reads PORT the way the API does', () => {
  it.each([
    ['unset', {}, 'http://localhost:3000'],
    ['empty', { PORT: '' }, 'http://localhost:3000'],
    ['only spaces', { PORT: '   ' }, 'http://localhost:3000'],
    ['a port value', { PORT: '8080' }, 'http://localhost:8080'],
    ['a port with surrounding spaces', { PORT: ' 8080 ' }, 'http://localhost:8080'],
    ['a value used as given, not validated', { PORT: 'abc' }, 'http://localhost:abc'],
  ])('F-16 AC-004 gives the target for PORT %s', (_label, env: Env, target) => {
    expect(targetOf(devProxy(env), '^/analyze(\\?.*)?$')).toBe(target);
  });
});
