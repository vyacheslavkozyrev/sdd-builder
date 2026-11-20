import type Anthropic from '@anthropic-ai/sdk';
import type { pipeline } from '@sddbuilder/core';
import { describe, expect, it } from 'vitest';
import { callReview, reviewCallParams, type ReviewClient } from '../src/review/anthropic.js';
import { REVIEW_PROMPT, reviewRequest } from '../src/review/prompt.js';

const pipelineFixture: pipeline.Pipeline = {
  name: 'SDD',
  description: 'The process',
  arguments: [],
  flows: [],
};

function configFixture(): pipeline.ProjectConfig {
  return {
    schemaVersion: 2,
    name: 'Demo',
    idea: 'A tool that tracks reading lists',
    architecture: 'A small web app',
    stack: { language: 'TypeScript', framework: 'React' },
    rules: [],
    pipeline: pipelineFixture,
  };
}

// A fake client: it records each call and answers with a fixed message, or throws when asked to.
function fakeClient(answer: { text?: string; stopReason?: Anthropic.Message['stop_reason']; throws?: string }) {
  const calls: { body: Anthropic.MessageCreateParamsNonStreaming; options: Anthropic.RequestOptions | undefined }[] = [];
  const client: ReviewClient = {
    messages: {
      create: async (body, options) => {
        calls.push({ body, options });
        if (answer.throws !== undefined) throw new Error(answer.throws);
        return {
          content: [{ type: 'text', text: answer.text ?? '[]' }],
          stop_reason: answer.stopReason ?? 'end_turn',
        } as Anthropic.Message;
      },
    },
  };
  return { client, calls };
}

describe('F-06 review request', () => {
  it('F-06 AC-007 the request carries the fixed review prompt, the brief and the pipeline config', () => {
    const request = reviewRequest(configFixture());
    const content = JSON.parse(request.content) as {
      brief: { name: string; idea: string; stack: { language: string } };
      pipeline: { name: string };
    };

    expect(request.prompt).toBe(REVIEW_PROMPT);
    expect(content.brief.name).toBe('Demo');
    expect(content.brief.idea).toBe('A tool that tracks reading lists');
    expect(content.brief.stack.language).toBe('TypeScript');
    expect(content.pipeline.name).toBe('SDD');
  });

  it('F-06 AC-007 the request carries the rules, which the pipeline rule tags refer to', () => {
    const rule = { index: 0, id: 'tests-first', title: 'Tests first', text: 'Write the test before the code.' };
    const withRule: pipeline.ProjectConfig = { ...configFixture(), rules: [rule] };
    const content = JSON.parse(reviewRequest(withRule).content) as { rules: unknown };

    expect(content.rules).toEqual([rule]);
    expect(reviewRequest(withRule).content).not.toBe(reviewRequest(configFixture()).content);
  });

  it('F-06 AC-007 the same config gives the same request text on two calls', () => {
    const first = reviewRequest(configFixture());
    const second = reviewRequest(configFixture());

    expect(second.prompt).toBe(first.prompt);
    expect(second.content).toBe(first.content);
  });

  it('F-06 AC-007 the brief is written in a fixed key order, whatever order the config was built in', () => {
    const reversed: pipeline.ProjectConfig = {
      pipeline: pipelineFixture,
      rules: [],
      stack: { framework: 'React', language: 'TypeScript' },
      architecture: 'A small web app',
      idea: 'A tool that tracks reading lists',
      name: 'Demo',
      schemaVersion: 2,
    };

    expect(reviewRequest(reversed).content).toBe(reviewRequest(configFixture()).content);
  });

  it('F-06 AC-007 a config with no brief gives blank brief fields in the request', () => {
    const bare: pipeline.ProjectConfig = { schemaVersion: 2, rules: [], pipeline: pipelineFixture };
    const content = JSON.parse(reviewRequest(bare).content) as {
      brief: { name: string; idea: string; stack: { language: string; testFramework: string } };
    };

    expect(content.brief.name).toBe('');
    expect(content.brief.idea).toBe('');
    expect(content.brief.stack.language).toBe('');
    expect(content.brief.stack.testFramework).toBe('');
  });

  it('F-06 AC-007 a change to the brief changes the request text', () => {
    const changed = { ...configFixture(), idea: 'A different idea' };

    expect(reviewRequest(changed).content).not.toBe(reviewRequest(configFixture()).content);
  });

  it('F-06 AC-008 the review call sets max_tokens to 8192', () => {
    const params = reviewCallParams('model-x', reviewRequest(configFixture()));

    expect(params.body.max_tokens).toBe(8192);
  });

  it('F-06 AC-008 the review call sets a timeout of 60,000 ms per attempt', () => {
    const params = reviewCallParams('model-x', reviewRequest(configFixture()));

    expect(params.options.timeout).toBe(60_000);
  });

  it('F-06 AC-008 the review call names the model and sends the fixed prompt as the system prompt', () => {
    const request = reviewRequest(configFixture());
    const params = reviewCallParams('model-x', request);

    expect(params.body.model).toBe('model-x');
    expect(params.body.system).toBe(REVIEW_PROMPT);
    expect(params.body.messages).toEqual([{ role: 'user', content: request.content }]);
  });

  it('F-06 AC-009 the review call sets no SDK retry', () => {
    const params = reviewCallParams('model-x', reviewRequest(configFixture()));

    expect(params.options.maxRetries).toBe(0);
  });

  it('F-06 AC-009 one review call makes one client call with the fixed parameters', async () => {
    const { client, calls } = fakeClient({ text: '[]', stopReason: 'end_turn' });
    const request = reviewRequest(configFixture());

    await callReview(client, 'model-x', request);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.body.max_tokens).toBe(8192);
    expect(calls[0]?.options?.timeout).toBe(60_000);
    expect(calls[0]?.options?.maxRetries).toBe(0);
  });

  it('F-06 AC-009 a review call that throws is not retried and records one call', async () => {
    const { client, calls } = fakeClient({ throws: 'provider failure' });

    await expect(callReview(client, 'model-x', reviewRequest(configFixture()))).rejects.toThrow('provider failure');
    expect(calls).toHaveLength(1);
  });

  it('F-06 AC-009 callReview returns the text of the reply and its stop reason', async () => {
    const { client } = fakeClient({ text: '[{"severity":"info"}]', stopReason: 'max_tokens' });

    const reply = await callReview(client, 'model-x', reviewRequest(configFixture()));

    expect(reply).toEqual({ text: '[{"severity":"info"}]', stopReason: 'max_tokens' });
  });
});
