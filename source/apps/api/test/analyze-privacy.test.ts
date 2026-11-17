import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';

// Every file-writing function is wrapped in a spy that still performs the call, so a write would be seen.
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof fs>();
  return {
    ...actual,
    writeFileSync: vi.fn(actual.writeFileSync),
    appendFileSync: vi.fn(actual.appendFileSync),
    mkdirSync: vi.fn(actual.mkdirSync),
    copyFileSync: vi.fn(actual.copyFileSync),
    renameSync: vi.fn(actual.renameSync),
    rmSync: vi.fn(actual.rmSync),
    unlinkSync: vi.fn(actual.unlinkSync),
    createWriteStream: vi.fn(actual.createWriteStream),
    promises: {
      ...actual.promises,
      writeFile: vi.fn(actual.promises.writeFile),
      appendFile: vi.fn(actual.promises.appendFile),
      mkdir: vi.fn(actual.promises.mkdir),
      copyFile: vi.fn(actual.promises.copyFile),
      rename: vi.fn(actual.promises.rename),
      rm: vi.fn(actual.promises.rm),
      unlink: vi.fn(actual.promises.unlink),
    },
  };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof fsPromises>();
  return {
    ...actual,
    writeFile: vi.fn(actual.writeFile),
    appendFile: vi.fn(actual.appendFile),
    mkdir: vi.fn(actual.mkdir),
    copyFile: vi.fn(actual.copyFile),
    rename: vi.fn(actual.rename),
    rm: vi.fn(actual.rm),
    unlink: vi.fn(actual.unlink),
  };
});
import { pipeline } from '@sddbuilder/core';
import { analyzePipeline } from '../src/analyze.js';
import type { AnalysisLog, ReviewModel } from '../src/analyze.js';
import type { ReviewRequest } from '../src/review/prompt.js';
import type { ReviewReply } from '../src/review/anthropic.js';

// A sentinel that stands in for brief content. The analysis must never let it reach a log line or a file.
const SENTINEL = 'SENTINEL-BRIEF-7f3a9c';

// A valid pipeline whose idea holds the sentinel. `build-agent` points at a block that does not exist, so the
// structural checks have a finding. Each call returns a fresh copy.
function config(options: { idea?: string; name?: string; agentTarget?: string } = {}): pipeline.ProjectConfig {
  return {
    schemaVersion: 2,
    name: options.name ?? 'Demo',
    idea: options.idea ?? `A tool that tracks reading lists. ${SENTINEL}`,
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
              connectedTo: { to: options.agentTarget ?? 'missing-block', label: 'code' },
            },
            { id: 'build-end', kind: 'end', outcome: 'done' },
          ],
        },
      ],
    },
  };
}

// A fake model that records each request and answers with a fixed reply, or rejects with a fixed error.
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

const VALID_ENTRIES = JSON.stringify([{ severity: 'warning', subject: 'brief.stack', message: 'Name the framework.' }]);

// Records every log call. A log call must be exactly (event, status), both strings.
function recordingLog(): { log: AnalysisLog; calls: unknown[][] } {
  const calls: unknown[][] = [];
  return {
    log: (...args: [string, string]) => {
      calls.push(args);
    },
    calls,
  };
}

// Every value a log call received, flattened to text, so a sentinel anywhere in a line is found.
function logText(calls: unknown[][]): string {
  return JSON.stringify(calls);
}

// The file-writing functions the analysis must never call. A write would show as a call on one of these.
function fileWriters(): unknown[] {
  return [
    fs.writeFileSync,
    fs.appendFileSync,
    fs.mkdirSync,
    fs.copyFileSync,
    fs.renameSync,
    fs.rmSync,
    fs.unlinkSync,
    fs.createWriteStream,
    fs.promises.writeFile,
    fs.promises.appendFile,
    fs.promises.mkdir,
    fs.promises.copyFile,
    fs.promises.rename,
    fs.promises.rm,
    fs.promises.unlink,
    fsPromises.writeFile,
    fsPromises.appendFile,
    fsPromises.mkdir,
    fsPromises.copyFile,
    fsPromises.rename,
    fsPromises.rm,
    fsPromises.unlink,
  ];
}

describe('F-06 analysis privacy', () => {
  let consoleSpies: ReturnType<typeof vi.spyOn>[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpies = [
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'info'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'error'),
      vi.spyOn(console, 'debug'),
      vi.spyOn(process.stdout, 'write'),
      vi.spyOn(process.stderr, 'write'),
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('F-06 AC-031 the sentinel in the idea is in no log line on the success path', async () => {
    const { log, calls } = recordingLog();
    const { model } = fakeModel(reply(VALID_ENTRIES));
    await analyzePipeline(config(), model, log);
    expect(calls).toHaveLength(1);
    expect(logText(calls)).not.toContain(SENTINEL);
    for (const call of calls) {
      expect(call).toHaveLength(2);
      expect(call.every((value) => typeof value === 'string')).toBe(true);
    }
  });

  it.each([
    ['no model', (): ReviewModel | null => null],
    ['a thrown error without the sentinel', (): ReviewModel | null => fakeModel(new Error('timeout')).model],
    ['a reply stopped at max_tokens', (): ReviewModel | null => fakeModel(reply(VALID_ENTRIES, 'max_tokens')).model],
    ['a reply that is not JSON', (): ReviewModel | null => fakeModel(reply(`not json ${SENTINEL}`)).model],
    ['a reply that is JSON but not an array', (): ReviewModel | null => fakeModel(reply('{"severity":"info"}')).model],
  ])('F-06 AC-031 the sentinel in the idea is in no log line with %s', async (_name, modelFor) => {
    const { log, calls } = recordingLog();
    const result = await analyzePipeline(config(), modelFor(), log);
    expect(result.review.status).toBe('failed');
    expect(calls).toHaveLength(1);
    expect(logText(calls)).not.toContain(SENTINEL);
  });

  it('F-06 AC-032 a thrown error whose message holds the sentinel is not in the log lines', async () => {
    const { log, calls } = recordingLog();
    const { model } = fakeModel(new Error(`provider rejected the brief: ${SENTINEL}`));
    await analyzePipeline(config(), model, log);
    expect(logText(calls)).not.toContain(SENTINEL);
    expect(logText(calls)).not.toContain('provider rejected');
  });

  it('F-06 AC-032 a thrown error whose message holds the sentinel is not in the result', async () => {
    const { model } = fakeModel(new Error(`provider rejected the brief: ${SENTINEL}`));
    const result = await analyzePipeline(config(), model, recordingLog().log);
    expect(JSON.stringify(result.review)).not.toContain(SENTINEL);
    expect(result.review).toEqual({ status: 'failed', findings: [], dropped: 0 });
  });

  it('F-06 AC-032 a thrown error with a non-Error value is not in the log lines or the result', async () => {
    const rejecting: ReviewModel = {
      review() {
        return Promise.reject(SENTINEL);
      },
    };
    const { log, calls } = recordingLog();
    const result = await analyzePipeline(config(), rejecting, log);
    expect(logText(calls)).not.toContain(SENTINEL);
    expect(JSON.stringify(result)).not.toContain(SENTINEL);
  });

  it('F-06 AC-031 nothing reaches the console or the process output on a success or failure path', async () => {
    const { log } = recordingLog();
    await analyzePipeline(config(), fakeModel(reply(VALID_ENTRIES)).model, log);
    await analyzePipeline(config(), fakeModel(new Error(SENTINEL)).model, log);
    for (const spy of consoleSpies) {
      expect(spy).not.toHaveBeenCalled();
    }
  });

  it('F-06 AC-030 the analysis writes no file on the success path or on a failure path', async () => {
    // Positive control: each writer is a mock, so a call to it would be recorded and the checks below mean something.
    for (const writer of fileWriters()) {
      expect(vi.isMockFunction(writer)).toBe(true);
    }
    const { log } = recordingLog();
    await analyzePipeline(config(), fakeModel(reply(VALID_ENTRIES)).model, log);
    await analyzePipeline(config(), fakeModel(new Error('timeout')).model, log);
    await analyzePipeline(config(), null, log);
    for (const writer of fileWriters()) {
      expect(writer).not.toHaveBeenCalled();
    }
  });

  it('F-06 AC-030 two calls with different configs each return only their own findings', async () => {
    const first = config({ name: 'First', agentTarget: 'missing-one' });
    const second = config({ name: 'Second', idea: 'Another idea.', agentTarget: 'missing-two' });
    const firstStructural = pipeline.analyzeStructure(first);
    const secondStructural = pipeline.analyzeStructure(second);

    const { model: firstModel, requests: firstRequests } = fakeModel(reply('[]'));
    const { model: secondModel, requests: secondRequests } = fakeModel(reply('[]'));
    const firstResult = await analyzePipeline(first, firstModel, recordingLog().log);
    const secondResult = await analyzePipeline(second, secondModel, recordingLog().log);

    expect(firstResult.findings).toEqual([...firstStructural, ...pipeline.analyzeBrief(first)]);
    expect(secondResult.findings).toEqual([...secondStructural, ...pipeline.analyzeBrief(second)]);
    expect(firstResult.findings).not.toEqual(secondResult.findings);
    expect(firstRequests[0]?.json).toContain(SENTINEL);
    expect(secondRequests[0]?.json ?? '').not.toContain(SENTINEL);
    expect(secondRequests[0]?.json).toContain('Another idea.');
  });

  it('F-06 AC-030 an analysis leaves no state that changes the next call', async () => {
    const value = config({ agentTarget: 'missing-one' });
    const alone = await analyzePipeline(value, null, recordingLog().log);
    const other = config({ name: 'Other', agentTarget: 'missing-two' });
    await analyzePipeline(other, fakeModel(new Error('x')).model, recordingLog().log);
    const again = await analyzePipeline(value, null, recordingLog().log);
    expect(again).toEqual(alone);
  });
});
