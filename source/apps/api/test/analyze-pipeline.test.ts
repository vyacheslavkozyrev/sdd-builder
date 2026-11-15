import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { analyzePipeline, type ReviewModel, type ReviewReply } from '../src/analyze.js';
import type { LogPort } from '../src/log.js';

/** The default pipeline (templates/pipeline/default.json), parsed through the pipeline reader. */
function defaultPipeline(): pipeline.ProjectConfig {
  const json: unknown = JSON.parse(
    readFileSync(fileURLToPath(new URL('../../../templates/pipeline/default.json', import.meta.url)), 'utf8'),
  );
  const parsed = pipeline.parsePipelineConfig(json);
  if (!parsed.ok) {
    throw new Error('the default pipeline must parse');
  }
  return parsed.config;
}

/** A default pipeline with a structural blocker (a blank idea). */
function pipelineWithBlocker(): pipeline.ProjectConfig {
  return { ...defaultPipeline(), idea: '' };
}

/** A log port that records each line, so a test can check what was logged. */
function recordingLog(): LogPort & { lines: string[] } {
  const lines: string[] = [];
  return { lines, write: (line: string) => void lines.push(line) };
}

/** A fake model that answers with a fixed reply, or rejects with the given error. */
function replyingModel(reply: ReviewReply): ReviewModel {
  return { complete: () => Promise.resolve(reply) };
}

function throwingModel(error: unknown): ReviewModel {
  return { complete: () => Promise.reject(error) };
}

function okReply(text: string): ReviewReply {
  return { text, truncated: false };
}

describe('F-04 AC-016 model findings never change the structural findings', () => {
  it('F-04 AC-016 gives the same structural findings with and without a review reply', async () => {
    const config = pipelineWithBlocker();
    const structural = pipeline.analyzeStructure(config);
    const withReply = await analyzePipeline(
      config,
      replyingModel(okReply('[{"severity":"warning","subject":"idea","message":"Expand the idea."}]')),
      recordingLog(),
    );
    const withoutReply = await analyzePipeline(config, throwingModel(new Error('no reply')), recordingLog());

    expect(withReply.findings).toEqual(structural);
    expect(withoutReply.findings).toEqual(structural);
    expect(withReply.findings).toEqual(withoutReply.findings);
  });

  it('F-04 AC-016 keeps a structural blocker when the model says the block is fine', async () => {
    const config = pipelineWithBlocker();
    const result = await analyzePipeline(
      config,
      replyingModel(okReply('[{"severity":"info","subject":"idea","message":"The idea is fine as it is."}]')),
      recordingLog(),
    );

    expect(result.findings.some((finding) => finding.severity === 'blocker' && finding.subject === 'idea')).toBe(true);
    expect(result.review.status).toBe('ok');
  });
});

describe('F-04 AC-014 review with findings and without', () => {
  it('F-04 AC-014 gives an ok review with no findings for an empty array', async () => {
    const config = pipelineWithBlocker();

    const result = await analyzePipeline(config, replyingModel(okReply('[]')), recordingLog());

    expect(result.review).toEqual({ status: 'ok', findings: [], dropped: 0 });
    expect(result.findings).toEqual(pipeline.analyzeStructure(config));
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('F-04 AC-014 gives an ok review with the model findings, a model blocker kept as warning', async () => {
    const config = pipelineWithBlocker();
    const reply = '[{"severity":"blocker","subject":"idea","message":"Blocks the build."}]';

    const result = await analyzePipeline(config, replyingModel(okReply(reply)), recordingLog());

    expect(result.review).toEqual({
      status: 'ok',
      findings: [{ severity: 'warning', subject: 'idea', message: 'Blocks the build.' }],
      dropped: 0,
    });
    expect(result.findings).toEqual(pipeline.analyzeStructure(config));
  });
});

describe('F-04 AC-020 one model call per request', () => {
  const replies: { name: string; reply: ReviewReply | 'throw' }[] = [
    { name: 'a valid reply', reply: okReply('[]') },
    { name: 'an invalid reply', reply: okReply('Here is my review: none.') },
    { name: 'a reply cut short at the output limit', reply: { text: '[', truncated: true } },
    { name: 'a failed call', reply: 'throw' },
  ];

  for (const testCase of replies) {
    it(`F-04 AC-020 calls the model exactly once for ${testCase.name}`, async () => {
      let calls = 0;
      const model: ReviewModel = {
        complete: () => {
          calls += 1;
          return testCase.reply === 'throw'
            ? Promise.reject(new Error('provider down'))
            : Promise.resolve(testCase.reply);
        },
      };

      await analyzePipeline(defaultPipeline(), model, recordingLog());

      expect(calls).toBe(1);
    });
  }
});

describe('F-04 AC-017 a failed model call or reply keeps the structural findings', () => {
  const cases: { name: string; model: ReviewModel }[] = [
    { name: 'a thrown error', model: throwingModel(new Error('provider down')) },
    { name: 'a reply cut short at the output limit', model: replyingModel({ text: '[{"severity"', truncated: true }) },
    {
      name: 'a cut-short reply that looks like a valid array',
      model: replyingModel({ text: '[{"severity":"info","subject":"idea","message":"Expand it."}]', truncated: true }),
    },
    { name: 'a reply that is not JSON', model: replyingModel(okReply('Here is my review: none.')) },
    {
      name: 'a reply that is not an array',
      model: replyingModel(okReply('{"severity":"info","subject":"idea","message":"Expand it."}')),
    },
  ];

  for (const testCase of cases) {
    it(`F-04 AC-017 gives review failed for ${testCase.name}`, async () => {
      const config = defaultPipeline();
      const structural = pipeline.analyzeStructure(config);

      const result = await analyzePipeline(config, testCase.model, recordingLog());

      expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
      expect(result.findings).toEqual(structural);
      expect(result.findings.length).toBeGreaterThan(0);
    });
  }
});

describe('F-04 AC-018 the log line for a failed model call', () => {
  it('F-04 AC-018 logs the event and the error name only, never the message, brief or reply', async () => {
    const config = pipelineWithBlocker();
    const log = recordingLog();
    const secret = `Secret brief text ${config.idea} and a reply body`;

    await analyzePipeline(config, throwingModel(new TypeError(secret)), log);

    expect(log.lines).toHaveLength(1);
    const [line] = log.lines;
    expect(line).toBe('event=review_model_failed route=/analyze error=TypeError');
    expect(line).not.toContain('Secret');
    expect(line).not.toContain('reply body');
  });
});
