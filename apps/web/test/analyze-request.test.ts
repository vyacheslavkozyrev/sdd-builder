import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONNECTIONS, DEFAULT_WORKFLOWS } from '@sddbuilder/core';
import type { AnalysisResult, ProjectConfig } from '@sddbuilder/core';
import { emptyBrief } from '../src/brief/state.js';
import type { BriefState } from '../src/brief/state.js';
import { toProjectConfig } from '../src/brief/to-config.js';
import { ANALYZE_FAILED_MESSAGE, analyzeBrief } from '../src/analyze/request.js';
import type { AnalyzeOutcome, AnalyzeRequest, FetchFn } from '../src/analyze/request.js';
import { createInFlightGuard } from '../src/analyze/in-flight.js';
import type { InFlightGuard } from '../src/analyze/in-flight.js';
import { startState } from '../src/builder/map-state.js';

/** The brief as the wireframe 02-brief.svg shows it, with blank depends-on and no rules. */
function wireframeBrief(): BriefState {
  return {
    ...emptyBrief(),
    name: 'Hourly Tracker',
    idea: 'Hourly Tracker helps a household see when electricity is cheap.',
    stack: {
      language: 'TypeScript',
      framework: 'Node.js + Fastify',
      testFramework: 'Vitest',
      buildTool: 'npm workspaces',
    },
    architecture: {
      style: 'Layered; dependencies point one way',
      modules: [
        { name: 'core', layer: '0', responsibility: 'Domain types and generator', dependsOn: '' },
        { name: 'api', layer: '1', responsibility: 'HTTP, LLM review, limits', dependsOn: '' },
        { name: 'web', layer: '1', responsibility: 'Visual builder', dependsOn: '' },
      ],
    },
    privacyAccepted: true,
  };
}

/** Returns the configuration, failing the test when the build reports bad layers. */
function configOf(brief: BriefState): ProjectConfig {
  const built = toProjectConfig(brief, startState());
  if (!built.ok) {
    throw new Error(`expected a configuration, got bad layers at ${built.badLayers.join(', ')}`);
  }
  return built.config;
}

const RESULT: AnalysisResult = {
  findings: [{ severity: 'warning', subject: 'architecture.modules', message: 'example finding' }],
  review: { status: 'ok', findings: [], dropped: 0 },
};

function okReply(): Response {
  return new Response(JSON.stringify(RESULT), { status: 200 });
}

interface FetchCall {
  url: string;
  init: AnalyzeRequest;
}

/** A fake fetch that records each call and answers with the given reply. */
function fakeFetch(reply: () => Promise<Response>): { fetchFn: FetchFn; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchFn: FetchFn = (url, init) => {
    calls.push({ url, init });
    return reply();
  };
  return { fetchFn, calls };
}

/** A promise the test settles by hand, so the request can stay pending. */
function deferred(): { promise: Promise<Response>; settle: (reply: Response) => void } {
  let settle: (reply: Response) => void = () => {};
  const promise = new Promise<Response>((resolve) => {
    settle = resolve;
  });
  return { promise, settle: (reply) => settle(reply) };
}

/** One press of Analyze: takes the guard, sends, and releases the guard when the request settles. */
async function press(
  guard: InFlightGuard,
  fetchFn: FetchFn,
  config: ProjectConfig,
): Promise<AnalyzeOutcome | null> {
  if (!guard.start()) {
    return null;
  }
  try {
    return await analyzeBrief(fetchFn, config);
  } finally {
    guard.release();
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('F-05 AC-018 analyze request', () => {
  it('F-05 AC-018 sends POST /analyze with a JSON content type and the built configuration as the body', async () => {
    const config = configOf(wireframeBrief());
    const { fetchFn, calls } = fakeFetch(async () => okReply());

    await analyzeBrief(fetchFn, config);

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe('/analyze');
    expect(call?.init.method).toBe('POST');
    expect(call?.init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(call?.init.body ?? 'null')).toEqual(configOf(wireframeBrief()));
  });

  it('F-05 AC-018 sends the configuration from toProjectConfig for the wireframe brief', async () => {
    const config = configOf(wireframeBrief());
    const { fetchFn, calls } = fakeFetch(async () => okReply());

    await analyzeBrief(fetchFn, config);

    expect(JSON.parse(calls[0]?.init.body ?? 'null')).toEqual({
      schemaVersion: 1,
      name: 'Hourly Tracker',
      idea: 'Hourly Tracker helps a household see when electricity is cheap.',
      stack: {
        language: 'TypeScript',
        framework: 'Node.js + Fastify',
        testFramework: 'Vitest',
        buildTool: 'npm workspaces',
      },
      architecture: {
        style: 'Layered; dependencies point one way',
        modules: [
          { name: 'core', layer: 0, responsibility: 'Domain types and generator', dependsOn: [] },
          { name: 'api', layer: 1, responsibility: 'HTTP, LLM review, limits', dependsOn: [] },
          { name: 'web', layer: 1, responsibility: 'Visual builder', dependsOn: [] },
        ],
      },
      codeRules: [],
      testRules: [],
      customSteps: [],
      targets: ['claude'],
      workflows: DEFAULT_WORKFLOWS,
      connections: DEFAULT_CONNECTIONS,
    });
  });

  it('F-05 AC-018 gives the analysis result of a 200 reply as ok with the result', async () => {
    const { fetchFn } = fakeFetch(async () => okReply());

    expect(await analyzeBrief(fetchFn, configOf(wireframeBrief()))).toEqual({ ok: true, result: RESULT });
  });
});

describe('F-05 AC-020 in-flight guard', () => {
  it('F-05 AC-020 refuses a second start while the first request is pending and sends no second request', async () => {
    const gate = deferred();
    const { fetchFn, calls } = fakeFetch(() => gate.promise);
    const guard = createInFlightGuard();
    const config = configOf(wireframeBrief());

    const first = press(guard, fetchFn, config);
    const second = await press(guard, fetchFn, config);

    expect(second).toBeNull();
    expect(calls).toHaveLength(1);

    gate.settle(okReply());
    expect(await first).toEqual({ ok: true, result: RESULT });
  });

  it('F-05 AC-020 releases the guard when the request succeeds, so a later press is sent', async () => {
    const { fetchFn, calls } = fakeFetch(async () => okReply());
    const guard = createInFlightGuard();
    const config = configOf(wireframeBrief());

    await press(guard, fetchFn, config);
    await press(guard, fetchFn, config);

    expect(calls).toHaveLength(2);
  });

  it('F-05 AC-020 releases the guard when the request fails, so a later press is sent', async () => {
    const { fetchFn, calls } = fakeFetch(async () => {
      throw new TypeError('fetch failed');
    });
    const guard = createInFlightGuard();
    const config = configOf(wireframeBrief());

    await press(guard, fetchFn, config);
    await press(guard, fetchFn, config);

    expect(calls).toHaveLength(2);
  });
});

describe('F-05 AC-023 failure message', () => {
  const failures: Array<{ name: string; reply: () => Promise<Response> }> = [
    {
      name: 'a network error',
      reply: async () => {
        throw new TypeError('fetch failed');
      },
    },
    {
      name: 'a 500 reply',
      reply: async () => new Response('internal detail from the server', { status: 500 }),
    },
    {
      name: 'a 422 reply',
      reply: async () =>
        new Response(JSON.stringify({ error: 'project config is invalid', problems: ['x'] }), { status: 422 }),
    },
    {
      name: 'a 200 reply that is not an analysis',
      reply: async () => new Response('{"unexpected":true}', { status: 200 }),
    },
    {
      name: 'a 200 reply that is not JSON',
      reply: async () => new Response('not json', { status: 200 }),
    },
  ];

  it.each(failures)('F-05 AC-023 gives ok false with the fixed message for $name', async ({ reply }) => {
    const { fetchFn } = fakeFetch(reply);

    const outcome = await analyzeBrief(fetchFn, configOf(wireframeBrief()));

    expect(outcome).toEqual({ ok: false, message: ANALYZE_FAILED_MESSAGE });
    expect(JSON.stringify(outcome)).not.toContain('internal detail');
    expect(JSON.stringify(outcome)).not.toContain('project config is invalid');
  });

  it.each([
    ['an unknown finding severity', { ...RESULT, findings: [{ severity: 'critical', subject: 'x', message: 'y' }] }],
    ['an unknown review status', { ...RESULT, review: { ...RESULT.review, status: 'maybe' } }],
    ['a dropped count that is not a number', { ...RESULT, review: { ...RESULT.review, dropped: '2' } }],
    ['a finding without a message', { ...RESULT, findings: [{ severity: 'info', subject: 'x' }] }],
    ['findings that are not a list', { ...RESULT, findings: 'none' }],
    ['no review', { findings: [] }],
    ['JSON null', null],
  ])('F-05 AC-023 gives ok false with the fixed message for a 200 reply with %s', async (_name, body) => {
    const { fetchFn } = fakeFetch(async () => new Response(JSON.stringify(body), { status: 200 }));

    expect(await analyzeBrief(fetchFn, configOf(wireframeBrief()))).toEqual({ ok: false, message: ANALYZE_FAILED_MESSAGE });
  });

  it('F-05 AC-023 leaves the brief and the configuration untouched after a failure', async () => {
    const brief = wireframeBrief();
    const before = structuredClone(brief);
    const config = configOf(brief);
    const configBefore = structuredClone(config);
    const { fetchFn } = fakeFetch(async () => new Response('', { status: 500 }));

    await analyzeBrief(fetchFn, config);

    expect(brief).toEqual(before);
    expect(config).toEqual(configBefore);
  });
});

describe('F-05 AC-024 nothing is stored', () => {
  it('F-05 AC-024 writes nothing to localStorage, sessionStorage or indexedDB when the brief is filled in and analyzed', async () => {
    const localStorageSpy = { setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() };
    const sessionStorageSpy = { setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() };
    const indexedDBSpy = { open: vi.fn() };
    vi.stubGlobal('localStorage', localStorageSpy);
    vi.stubGlobal('sessionStorage', sessionStorageSpy);
    vi.stubGlobal('indexedDB', indexedDBSpy);
    const { fetchFn } = fakeFetch(async () => okReply());

    await analyzeBrief(fetchFn, configOf(wireframeBrief()));

    for (const spy of [localStorageSpy, sessionStorageSpy]) {
      expect(spy.setItem).not.toHaveBeenCalled();
      expect(spy.removeItem).not.toHaveBeenCalled();
      expect(spy.clear).not.toHaveBeenCalled();
    }
    expect(indexedDBSpy.open).not.toHaveBeenCalled();
  });
});
