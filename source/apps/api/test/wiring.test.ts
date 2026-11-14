import { describe, expect, it, vi } from 'vitest';
import { analyzeStructure } from '@sddbuilder/core';
import type { ProjectConfig } from '@sddbuilder/core';
import type { ReviewModel } from '../src/analyze.js';
import { createApp } from '../src/app.js';
import { fixedLimits } from './fixed-limits.js';
import type { LogPort } from '../src/log.js';
import { reviewModelFrom } from '../src/wiring.js';
import { createAnthropicReviewModel } from '../src/review/anthropic-model.js';

// The adapter is wrapped so one case can replace the model it creates; otherwise it runs as built.
vi.mock('../src/review/anthropic-model.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/review/anthropic-model.js')>();
  return { ...actual, createAnthropicReviewModel: vi.fn(actual.createAnthropicReviewModel) };
});

const ANALYZE_URL = 'http://localhost/analyze';

// Whitespace only: it counts as a missing key, and it must never reach the log or a response.
const KEY_SENTINEL = ' \t \n ';

function sampleConfig(): ProjectConfig {
  return {
    schemaVersion: 1,
    name: 'Sample Project',
    idea: 'A tool that turns a product idea into a spec-driven project framework.',
    stack: { language: 'TypeScript', framework: 'React', testFramework: 'Vitest' },
    architecture: {
      style: 'layered',
      modules: [{ name: 'core', layer: 0, responsibility: 'Domain rules', dependsOn: [] }],
      notes: 'Core has no I/O.',
    },
    codeRules: ['Validate input at the boundary.'],
    testRules: ['Use Vitest for unit tests.'],
    customSteps: [],
    workflows: [
      {
        id: 'implement-cycle',
        name: 'Implement',
        scope: 'task',
        iterationSource: 'plan.md',
        enabled: true,
        steps: [{ stepId: 'implement', enabled: true }],
        conditions: [],
      },
    ],
    connections: [],
    targets: ['claude'],
  };
}

/** A configuration the structural rules refuse: two workflows share one id. */
function duplicateIdConfig(): ProjectConfig {
  const config = sampleConfig();
  const first = config.workflows[0];
  if (first === undefined) throw new Error('sample config has no workflow');
  return { ...config, workflows: [...config.workflows, { ...first }] };
}

/** A log port that keeps every line it receives. */
function recordingLog(): LogPort & { lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    write: (line: string) => {
      lines.push(line);
    },
  };
}

function postAnalyze(app: ReturnType<typeof createApp>, body: unknown): Response | Promise<Response> {
  return app.request(ANALYZE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('F-07 AC-006 analyzer wiring when the API key is missing', () => {
  const missingKeys: [string, string | undefined][] = [
    ['unset', undefined],
    ['empty', ''],
    ['whitespace only', KEY_SENTINEL],
  ];

  for (const [label, key] of missingKeys) {
    it(`F-07 AC-006 answers 200 with review.status failed and the structural findings when the key is ${label}`, async () => {
      const config = duplicateIdConfig();
      const log = recordingLog();
      const app = createApp({ limits: fixedLimits(), review: reviewModelFrom({ ANTHROPIC_API_KEY: key }, log), log, generation: null });

      const response = await postAnalyze(app, config);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(JSON.parse(text)).toEqual({
        findings: analyzeStructure(config),
        review: { status: 'failed', findings: [], dropped: 0 },
      });
      expect(log.lines).toEqual(['event=review_key_missing', 'event=review_model_failed route=/analyze error=Error']);
    });
  }

  it('F-07 AC-006 never logs or returns the key value', async () => {
    const config = duplicateIdConfig();
    const log = recordingLog();
    const app = createApp({ limits: fixedLimits(), review: reviewModelFrom({ ANTHROPIC_API_KEY: KEY_SENTINEL }, log), log, generation: null });

    const response = await postAnalyze(app, config);
    const text = await response.text();

    for (const line of log.lines) {
      expect(line).not.toContain(KEY_SENTINEL);
    }
    // JSON escapes the tab and newline, so a leak into the body shows up in escaped form, not raw.
    expect(text).not.toContain(KEY_SENTINEL);
    expect(text).not.toContain(JSON.stringify(KEY_SENTINEL).slice(1, -1));
  });

  it('F-07 AC-006 logs the error name, not its message, when creation fails for another reason', async () => {
    vi.mocked(createAnthropicReviewModel).mockImplementationOnce(() => {
      throw new TypeError(`bad value ${KEY_SENTINEL}`);
    });
    const log = recordingLog();
    const app = createApp({ limits: fixedLimits(), review: reviewModelFrom({ ANTHROPIC_API_KEY: 'sk-test' }, log), log, generation: null });

    const response = await postAnalyze(app, sampleConfig());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ review: { status: 'failed' } });
    expect(log.lines).toEqual([
      'event=review_model_disabled error=TypeError',
      'event=review_model_failed route=/analyze error=Error',
    ]);
  });
});

describe('F-07 AC-006 analyzer wiring when the API key is set', () => {
  it('F-07 AC-006 uses the model that is created from the environment', async () => {
    const calls: string[] = [];
    const fake: ReviewModel = {
      complete: (prompt: string) => {
        calls.push(prompt);
        return Promise.resolve({ text: '[]', truncated: false });
      },
    };
    vi.mocked(createAnthropicReviewModel).mockImplementationOnce(() => fake);
    const env = { ANTHROPIC_API_KEY: 'sk-test-key' };
    const log = recordingLog();
    const app = createApp({ limits: fixedLimits(), review: reviewModelFrom(env, log), log, generation: null });

    const response = await postAnalyze(app, sampleConfig());

    expect(response.status).toBe(200);
    expect(vi.mocked(createAnthropicReviewModel)).toHaveBeenLastCalledWith(env);
    expect(calls).toHaveLength(1);
    expect(await response.json()).toMatchObject({ review: { status: 'ok' } });
    expect(log.lines).toEqual([]);
  });
});
