import { describe, expect, it } from 'vitest';
import type { pipeline } from '@sddbuilder/core';
import { REVIEW_PROMPT, reviewRequest } from '../src/review/prompt.js';
import {
  REVIEW_MAX_RETRIES,
  REVIEW_MAX_TOKENS,
  REVIEW_TIMEOUT_MS,
  callReview,
  reviewCallParams,
} from '../src/review/anthropic.js';

type ReviewClient = Parameters<typeof callReview>[0];

// A fixed config with the brief filled in: the same value on every run.
function briefedConfig(): pipeline.ProjectConfig {
  return {
    schemaVersion: 2,
    name: 'Demo',
    idea: 'A small tool that tracks reading lists.',
    architecture: 'One web app and a store.',
    stack: { language: 'TypeScript', framework: 'React', platform: 'Web', buildTool: 'Vite', testFramework: 'Vitest' },
    rules: [{ id: 'style', title: 'Style', text: 'Keep functions short.' }],
    pipeline: {
      name: 'sdd',
      description: 'The process.',
      arguments: [],
      flows: [],
    },
  };
}

// The same config without any brief field.
function bareConfig(): pipeline.ProjectConfig {
  const config = briefedConfig();
  return { schemaVersion: config.schemaVersion, rules: config.rules, pipeline: config.pipeline };
}

describe('F-06 review request', () => {
  it('F-06 AC-013 the request carries the fixed review prompt', () => {
    const request = reviewRequest(briefedConfig());
    expect(request.prompt).toBe(REVIEW_PROMPT);
    expect(REVIEW_PROMPT.trim().length).toBeGreaterThan(0);
  });

  it('F-06 AC-013 the request text carries the brief, the rules and the pipeline config', () => {
    const value = JSON.parse(reviewRequest(briefedConfig()).json) as Record<string, unknown>;
    expect(value['brief']).toEqual({
      name: 'Demo',
      idea: 'A small tool that tracks reading lists.',
      architecture: 'One web app and a store.',
      stack: {
        language: 'TypeScript',
        framework: 'React',
        platform: 'Web',
        buildTool: 'Vite',
        testFramework: 'Vitest',
      },
    });
    expect(value['rules']).toEqual([{ id: 'style', title: 'Style', text: 'Keep functions short.' }]);
    expect(value['pipeline']).toEqual({ name: 'sdd', description: 'The process.', arguments: [], flows: [] });
  });

  it('F-06 AC-013 the same config gives the same request text on two calls', () => {
    const first = reviewRequest(briefedConfig());
    const second = reviewRequest(briefedConfig());
    expect(second.json).toBe(first.json);
    expect(second.prompt).toBe(first.prompt);
  });

  it('F-06 AC-013 the request text uses a fixed key order in the brief and the top level', () => {
    const json = reviewRequest(briefedConfig()).json;
    const keys = Object.keys(JSON.parse(json) as Record<string, unknown>);
    expect(keys).toEqual(['brief', 'rules', 'pipeline']);
    const brief = Object.keys((JSON.parse(json) as { brief: Record<string, unknown> }).brief);
    expect(brief).toEqual(['name', 'idea', 'architecture', 'stack']);
  });

  it('F-06 AC-013 the same pipeline built with other key order gives the same request text', () => {
    const config = briefedConfig();
    const reordered: pipeline.ProjectConfig = {
      ...config,
      rules: [{ text: 'Keep functions short.', title: 'Style', id: 'style' }],
      pipeline: { flows: [], arguments: [], description: 'The process.', name: 'sdd' },
    };
    expect(reviewRequest(reordered).json).toBe(reviewRequest(config).json);
  });

  it('F-06 AC-013 a config without the brief reads as a blank brief', () => {
    const value = JSON.parse(reviewRequest(bareConfig()).json) as {
      brief: { name: string; idea: string; stack: Record<string, string> };
    };
    expect(value.brief.name).toBe('');
    expect(value.brief.idea).toBe('');
    expect(value.brief.stack).toEqual({
      language: '',
      framework: '',
      platform: '',
      buildTool: '',
      testFramework: '',
    });
  });

  it('F-06 AC-013 a change to the brief changes the request text', () => {
    const changed = { ...briefedConfig(), idea: 'Another idea.' };
    expect(reviewRequest(changed).json).not.toBe(reviewRequest(briefedConfig()).json);
  });
});

describe('F-06 review call parameters', () => {
  it('F-06 AC-014 the call sets max_tokens to 8192', () => {
    const params = reviewCallParams('claude-test-model', reviewRequest(briefedConfig()));
    expect(REVIEW_MAX_TOKENS).toBe(8192);
    expect(params.body.max_tokens).toBe(8192);
  });

  it('F-06 AC-014 the call sets a timeout of 60000 ms per attempt', () => {
    const params = reviewCallParams('claude-test-model', reviewRequest(briefedConfig()));
    expect(REVIEW_TIMEOUT_MS).toBe(60000);
    expect(params.options.timeout).toBe(60000);
  });

  it('F-06 AC-015 the call sets maxRetries to 0 so one analysis makes one call', () => {
    const params = reviewCallParams('claude-test-model', reviewRequest(briefedConfig()));
    expect(REVIEW_MAX_RETRIES).toBe(0);
    expect(params.options.maxRetries).toBe(0);
  });

  it('F-06 AC-014 the call uses the model passed in, the prompt as system text and the JSON as the user message', () => {
    const request = reviewRequest(briefedConfig());
    const params = reviewCallParams('claude-test-model', request);
    expect(params.body.model).toBe('claude-test-model');
    expect(params.body.system).toBe(REVIEW_PROMPT);
    expect(params.body.messages).toEqual([{ role: 'user', content: request.json }]);
  });

  it('F-06 AC-014 the same request gives the same call parameters on two calls', () => {
    const request = reviewRequest(briefedConfig());
    expect(reviewCallParams('claude-test-model', request)).toEqual(
      reviewCallParams('claude-test-model', request),
    );
  });
});

// A fake client that records each call and answers with a fixed reply or a fixed error. No network is used.
function fakeClient(answer: { reply: unknown } | { error: Error }, calls: { body: unknown; options: unknown }[]): ReviewClient {
  const create = (body: unknown, options: unknown): Promise<unknown> => {
    calls.push({ body, options });
    return 'error' in answer ? Promise.reject(answer.error) : Promise.resolve(answer.reply);
  };
  return { messages: { create } } as unknown as ReviewClient;
}

describe('F-06 review call', () => {
  it('F-06 AC-014 callReview sends the call parameters and returns the joined text and the stop reason', async () => {
    const calls: { body: unknown; options: unknown }[] = [];
    const reply = {
      stop_reason: 'end_turn',
      content: [
        { type: 'text', text: '[' },
        { type: 'tool_use', id: 'x', name: 'y', input: {} },
        { type: 'text', text: ']' },
      ],
    };
    const request = reviewRequest(briefedConfig());
    const result = await callReview(fakeClient({ reply }, calls), 'claude-test-model', request);
    expect(result).toEqual({ text: '[]', stopReason: 'end_turn' });
    expect(calls).toEqual([reviewCallParams('claude-test-model', request)]);
  });

  it('F-06 AC-015 callReview makes one call and passes a thrown error on without a retry', async () => {
    const calls: { body: unknown; options: unknown }[] = [];
    const error = new Error('provider timeout');
    const request = reviewRequest(briefedConfig());
    await expect(callReview(fakeClient({ error }, calls), 'claude-test-model', request)).rejects.toBe(error);
    expect(calls).toHaveLength(1);
  });

  it('F-06 AC-014 callReview returns the stop reason max_tokens when the reply was cut short', async () => {
    const calls: { body: unknown; options: unknown }[] = [];
    const reply = { stop_reason: 'max_tokens', content: [{ type: 'text', text: '[{"sev' }] };
    const result = await callReview(fakeClient({ reply }, calls), 'claude-test-model', reviewRequest(briefedConfig()));
    expect(result).toEqual({ text: '[{"sev', stopReason: 'max_tokens' });
  });
});
