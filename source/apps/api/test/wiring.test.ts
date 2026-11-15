import { describe, expect, it, vi } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import type { ReviewModel } from '../src/analyze.js';
import { createApp } from '../src/app.js';
import { fixedLimits } from './fixed-limits.js';
import { pipelineConfig } from './pipeline-config.js';
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

/** A configuration the structural rules refuse: a blank idea is a blocker. */
function refusedConfig(): pipeline.ProjectConfig {
  return pipelineConfig({ idea: '' });
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

describe('analyzer wiring when the API key is missing', () => {
  const missingKeys: [string, string | undefined][] = [
    ['unset', undefined],
    ['empty', ''],
    ['whitespace only', KEY_SENTINEL],
  ];

  for (const [label, key] of missingKeys) {
    it(`answers 200 with review.status failed and the structural findings when the key is ${label}`, async () => {
      const config = refusedConfig();
      const log = recordingLog();
      const app = createApp({ limits: fixedLimits(), review: reviewModelFrom({ ANTHROPIC_API_KEY: key }, log), log, generation: null });

      const response = await postAnalyze(app, config);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(JSON.parse(text)).toEqual({
        findings: pipeline.analyzeStructure(config),
        review: { status: 'failed', findings: [], dropped: 0 },
      });
      expect(log.lines).toEqual(['event=review_key_missing', 'event=review_model_failed route=/analyze error=Error']);
    });
  }

  it('never logs or returns the key value', async () => {
    const config = refusedConfig();
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

  it('logs the error name, not its message, when creation fails for another reason', async () => {
    vi.mocked(createAnthropicReviewModel).mockImplementationOnce(() => {
      throw new TypeError(`bad value ${KEY_SENTINEL}`);
    });
    const log = recordingLog();
    const app = createApp({ limits: fixedLimits(), review: reviewModelFrom({ ANTHROPIC_API_KEY: 'sk-test' }, log), log, generation: null });

    const response = await postAnalyze(app, pipelineConfig());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ review: { status: 'failed' } });
    expect(log.lines).toEqual([
      'event=review_model_disabled error=TypeError',
      'event=review_model_failed route=/analyze error=Error',
    ]);
  });
});

describe('analyzer wiring when the API key is set', () => {
  it('uses the model that is created from the environment', async () => {
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

    const response = await postAnalyze(app, pipelineConfig());

    expect(response.status).toBe(200);
    expect(vi.mocked(createAnthropicReviewModel)).toHaveBeenLastCalledWith(env);
    expect(calls).toHaveLength(1);
    expect(await response.json()).toMatchObject({ review: { status: 'ok' } });
    expect(log.lines).toEqual([]);
  });
});
