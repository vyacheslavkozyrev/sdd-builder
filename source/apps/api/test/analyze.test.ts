import { describe, expect, it } from 'vitest';
import { pipeline } from '@sddbuilder/core';
import { analyzePipeline } from '../src/analyze.js';
import type { AnalysisLog, ReviewModel } from '../src/analyze.js';
import type { ReviewRequest } from '../src/review/prompt.js';
import type { ReviewReply } from '../src/review/anthropic.js';

// A valid pipeline with the brief filled in, except that `build-agent` points at a block that does not exist, so
// the structural checks have a finding. Each call returns a fresh copy.
function config(change?: (value: pipeline.ProjectConfig) => void): pipeline.ProjectConfig {
  const value: pipeline.ProjectConfig = {
    schemaVersion: 2,
    name: 'Demo',
    idea: 'A small tool that tracks reading lists.',
    architecture: 'One web app and a store.',
    stack: { language: 'TypeScript', framework: 'React', platform: 'Web', buildTool: 'Vite', testFramework: 'Vitest' },
    rules: [{ id: 'style', title: 'Style', text: 'Keep functions short.' }],
    pipeline: {
      name: 'sdd',
      description: 'The process.',
      arguments: [{ id: 'feature-id', required: true, hint: 'F-XX' }],
      flows: [
        {
          id: 'build',
          name: 'Build',
          description: 'Builds one feature.',
          arguments: 'feature-id',
          blocks: [
            { id: 'build-start', kind: 'start', connectedTo: { to: 'build-agent', label: 'feature-id' } },
            {
              id: 'build-agent',
              kind: 'agent',
              name: 'build',
              description: 'Builds the feature.',
              arguments: 'feature-id',
              connectedTo: { to: 'missing-block', label: 'code' },
            },
            { id: 'build-end', kind: 'end', outcome: 'done' },
          ],
        },
      ],
    },
  };
  change?.(value);
  return value;
}

// A config with a blank brief: the brief checks give blockers, and the structure is the same.
function blankBriefConfig(): pipeline.ProjectConfig {
  return config((value) => {
    delete value.name;
    delete value.idea;
  });
}

// A fake model that records each request and answers with a fixed reply, or throws a fixed error.
function fakeModel(answer: ReviewReply | Error): { model: ReviewModel; requests: ReviewRequest[] } {
  const requests: ReviewRequest[] = [];
  const model: ReviewModel = {
    review(request) {
      requests.push(request);
      return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
    },
  };
  return { model, requests };
}

function reply(text: string, stopReason: string | null = 'end_turn'): ReviewReply {
  return { text, stopReason };
}

function recordingLog(): { log: AnalysisLog; events: [string, string][] } {
  const events: [string, string][] = [];
  return { log: (event, status) => events.push([event, status]), events };
}

const VALID_ENTRIES = JSON.stringify([
  { severity: 'warning', subject: 'brief.stack', message: 'Name the framework.' },
  { severity: 'blocker', subject: 'rules', message: 'Two rules conflict.' },
]);

describe('F-06 analysis result', () => {
  it('F-06 AC-025 the result has findings and a review with status, findings and dropped', async () => {
    const { model } = fakeModel(reply(VALID_ENTRIES));
    const result = await analyzePipeline(config(), model, recordingLog().log);
    expect(Object.keys(result).sort()).toEqual(['findings', 'review']);
    expect(Object.keys(result.review).sort()).toEqual(['dropped', 'findings', 'status']);
    expect(result.review.status).toBe('ok');
    expect(result.review.findings).toEqual([
      { severity: 'warning', subject: 'brief.stack', message: 'Name the framework.' },
      { severity: 'warning', subject: 'rules', message: 'Two rules conflict.' },
    ]);
    expect(result.review.dropped).toBe(0);
  });

  it('F-06 AC-029 the structural findings come first, in the order analyzeStructure returns them', async () => {
    const value = config();
    const structural = pipeline.analyzeStructure(value);
    expect(structural.length).toBeGreaterThan(0);
    const result = await analyzePipeline(value, null, recordingLog().log);
    expect(result.findings.slice(0, structural.length)).toEqual(structural);
  });

  it('F-06 AC-025 the brief findings follow the structural findings, in the order analyzeBrief returns them', async () => {
    const value = blankBriefConfig();
    const structural = pipeline.analyzeStructure(value);
    const brief = pipeline.analyzeBrief(value);
    expect(brief.length).toBeGreaterThan(0);
    const result = await analyzePipeline(value, null, recordingLog().log);
    expect(result.findings).toEqual([...structural, ...brief]);
  });

  it('F-06 AC-025 a config that gives no findings returns an empty findings list', async () => {
    const valid = config((value) => {
      value.pipeline.flows[0]!.blocks[1] = {
        id: 'build-agent',
        kind: 'agent',
        name: 'build',
        description: 'Builds the feature.',
        arguments: 'feature-id',
        connectedTo: { to: 'build-end', label: 'code' },
      };
    });
    expect(pipeline.analyzeStructure(valid)).toEqual([]);
    expect(pipeline.analyzeBrief(valid)).toEqual([]);
    const result = await analyzePipeline(valid, null, recordingLog().log);
    expect(result.findings).toEqual([]);
  });
});

describe('F-06 review outcome', () => {
  it('F-06 AC-015 one analysis makes exactly one review call', async () => {
    const { model, requests } = fakeModel(reply(VALID_ENTRIES));
    await analyzePipeline(config(), model, recordingLog().log);
    expect(requests).toHaveLength(1);
  });

  it('F-06 AC-015 a call that throws is not retried', async () => {
    const { model, requests } = fakeModel(new Error('network down'));
    const result = await analyzePipeline(config(), model, recordingLog().log);
    expect(requests).toHaveLength(1);
    expect(result.review.status).toBe('failed');
  });

  it('F-06 AC-016 with no model configured the review is failed and the analysis still returns', async () => {
    const result = await analyzePipeline(config(), null, recordingLog().log);
    expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it('F-06 AC-019 a reply stopped at max_tokens gives status failed and its entries are not parsed', async () => {
    const { model } = fakeModel(reply(VALID_ENTRIES, 'max_tokens'));
    const result = await analyzePipeline(config(), model, recordingLog().log);
    expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
  });

  it('F-06 AC-024 a failed review has dropped 0', async () => {
    const { model } = fakeModel(reply('not json'));
    const result = await analyzePipeline(config(), model, recordingLog().log);
    expect(result.review.status).toBe('failed');
    expect(result.review.dropped).toBe(0);
  });

  it.each([
    ['no model', null],
    ['a thrown error', fakeModel(new Error('timeout')).model],
    ['a reply stopped at max_tokens', fakeModel(reply(VALID_ENTRIES, 'max_tokens')).model],
    ['a reply that is not JSON', fakeModel(reply('here is my review')).model],
    ['a reply that is JSON but not an array', fakeModel(reply('{"severity":"info"}')).model],
  ])('F-06 AC-026 with %s the structural and brief findings are returned in full', async (_name, model) => {
    const value = blankBriefConfig();
    const expected = [...pipeline.analyzeStructure(value), ...pipeline.analyzeBrief(value)];
    const result = await analyzePipeline(value, model, recordingLog().log);
    expect(result.findings).toEqual(expected);
    expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
  });

  it('F-06 AC-027 a valid empty reply gives status ok with no entries', async () => {
    const { model } = fakeModel(reply('[]'));
    const result = await analyzePipeline(config(), model, recordingLog().log);
    expect(result.review).toEqual({ status: 'ok', findings: [], dropped: 0 });
  });

  it('F-06 AC-027 a valid reply in which every entry is dropped gives status ok with the count dropped', async () => {
    const allInvalid = JSON.stringify([
      { severity: 'error', subject: 'brief.name', message: 'Unknown severity.' },
      { severity: 'info', subject: '   ', message: 'Blank subject.' },
      'not an object',
    ]);
    const { model } = fakeModel(reply(allInvalid));
    const result = await analyzePipeline(config(), model, recordingLog().log);
    expect(result.review).toEqual({ status: 'ok', findings: [], dropped: 3 });
  });

  it('F-06 AC-028 review entries carry only severity, subject and message', async () => {
    const { model } = fakeModel(reply(VALID_ENTRIES));
    const result = await analyzePipeline(config(), model, recordingLog().log);
    for (const entry of result.review.findings) {
      expect(Object.keys(entry).sort()).toEqual(['message', 'severity', 'subject']);
    }
  });
});

describe('F-06 config is not changed by the analysis', () => {
  it.each([
    ['no model', (): ReviewModel | null => null],
    ['a valid reply with entries', (): ReviewModel | null => fakeModel(reply(VALID_ENTRIES)).model],
    ['a thrown error', (): ReviewModel | null => fakeModel(new Error('timeout')).model],
    ['a reply stopped at max_tokens', (): ReviewModel | null => fakeModel(reply(VALID_ENTRIES, 'max_tokens')).model],
  ])('F-06 AC-028 the config is strictly equal before and after the analysis, with %s', async (_name, modelFor) => {
    const value = blankBriefConfig();
    const before = structuredClone(value);
    await analyzePipeline(value, modelFor(), recordingLog().log);
    expect(value).toStrictEqual(before);
  });
});

describe('F-06 analysis log', () => {
  it('F-06 AC-015 the analysis logs one review event with the review status', async () => {
    const { log, events } = recordingLog();
    const { model } = fakeModel(reply(VALID_ENTRIES));
    await analyzePipeline(config(), model, log);
    expect(events).toEqual([['review', 'ok']]);
  });

  it('F-06 AC-026 a failed review is logged with status failed', async () => {
    const { log, events } = recordingLog();
    await analyzePipeline(config(), null, log);
    expect(events).toEqual([['review', 'failed']]);
  });
});
