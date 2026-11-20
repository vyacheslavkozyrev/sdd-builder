import { pipeline } from '@sddbuilder/core';
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { analyzePipeline, type ReviewModel } from '../src/analyze.js';

// A fixed sentinel that stands in for brief content. It must never reach a log line or a file.
const SENTINEL = 'SENTINEL-IDEA-7f3a91';

const pipelineFixture: pipeline.Pipeline = {
  name: 'SDD',
  description: 'The process',
  arguments: [],
  flows: [],
};

function configFixture(idea: string, name = 'Project'): pipeline.ProjectConfig {
  return {
    schemaVersion: 2,
    name,
    idea,
    architecture: 'A small web app',
    stack: { language: 'TypeScript', framework: 'React' },
    rules: [],
    pipeline: pipelineFixture,
  };
}

// A fake model that answers with a fixed reply, or throws an error with a fixed message.
function fakeModel(answer: { text?: string; stopReason?: string | null; throws?: string }): ReviewModel {
  return {
    review: async () => {
      if (answer.throws !== undefined) throw new Error(answer.throws);
      const stopReason = answer.stopReason === undefined ? 'end_turn' : answer.stopReason;
      return { text: answer.text ?? '[]', stopReason };
    },
  };
}

// Collects every log line of one analysis, so the test can search all of them.
async function analyzeLogged(config: pipeline.ProjectConfig, model: ReviewModel | null) {
  const lines: string[] = [];
  const result = await analyzePipeline(config, model, (line) => lines.push(line));
  return { result, lines };
}

// The relative paths of every file and folder under a root, sorted, so two listings can be compared.
function listTree(root: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(root, prefix)).sort()) {
    const rel = prefix === '' ? name : `${prefix}/${name}`;
    out.push(rel);
    if (statSync(join(root, rel)).isDirectory()) out.push(...listTree(root, rel));
  }
  return out;
}

const failurePaths: { label: string; model: ReviewModel | null }[] = [
  { label: 'no model', model: null },
  { label: 'a thrown error', model: fakeModel({ throws: 'connection reset' }) },
  { label: 'stop reason max_tokens', model: fakeModel({ text: '[', stopReason: 'max_tokens' }) },
  { label: 'a reply that is not JSON', model: fakeModel({ text: 'not json at all' }) },
  { label: 'a reply that is JSON but not an array', model: fakeModel({ text: '{"findings": []}' }) },
];

describe('F-06 the analysis keeps no brief content in logs', () => {
  it('F-06 AC-025 the sentinel idea appears in no log line on the success path', async () => {
    const model = fakeModel({ text: JSON.stringify([{ severity: 'info', subject: 'idea', message: 'Clear.' }]) });
    const { lines } = await analyzeLogged(configFixture(SENTINEL), model);

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line).not.toContain(SENTINEL);
  });

  it.each(failurePaths)('F-06 AC-025 the sentinel idea appears in no log line on the failure path: $label', async ({
    model,
  }) => {
    const { lines } = await analyzeLogged(configFixture(SENTINEL), model);

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line).not.toContain(SENTINEL);
  });

  it('F-06 AC-025 the log lines carry the event and the status only', async () => {
    const { lines } = await analyzeLogged(configFixture(SENTINEL), fakeModel({ text: '[]' }));

    expect(lines).toEqual(['analyze review=ok']);
  });

  it('F-06 AC-026 a thrown error whose message holds the sentinel leaves it out of the log lines and the result', async () => {
    const model = fakeModel({ throws: `provider echoed the brief: ${SENTINEL}` });
    const { result, lines } = await analyzeLogged(configFixture(SENTINEL), model);

    for (const line of lines) expect(line).not.toContain(SENTINEL);
    expect(JSON.stringify(result)).not.toContain(SENTINEL);
    expect(lines).toContain('analyze review=failed');
  });
});

describe('F-06 the analysis keeps no state between calls', () => {
  it('F-06 AC-024 two calls with different configs each return only their own findings', async () => {
    const first = configFixture('', '');
    const second = configFixture('A complete idea for a notes app', 'Notes');
    const model = fakeModel({ text: '[]' });

    const firstResult = await analyzePipeline(first, model, () => {});
    const secondResult = await analyzePipeline(second, model, () => {});

    expect(firstResult.findings).toEqual([...pipeline.analyzeStructure(first), ...pipeline.analyzeBrief(first)]);
    expect(secondResult.findings).toEqual([...pipeline.analyzeStructure(second), ...pipeline.analyzeBrief(second)]);
    expect(secondResult.findings).not.toEqual(firstResult.findings);
  });

  it('F-06 AC-024 the result of a call is not changed by a later call that fails', async () => {
    const config = configFixture('A complete idea for a notes app', 'Notes');
    const ok = await analyzePipeline(config, fakeModel({ text: '[]' }), () => {});
    const snapshot = structuredClone(ok);

    await analyzePipeline(configFixture('', ''), fakeModel({ throws: 'timeout' }), () => {});

    expect(ok).toEqual(snapshot);
  });
});

// Puts an environment variable back as it was, removing it when it was not set.
function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe('F-06 the analysis writes no file', () => {
  let root: string;
  let previous: { cwd: string; tmpdir: string | undefined; home: string | undefined };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'sddbuilder-f06-privacy-'));
    previous = { cwd: process.cwd(), tmpdir: process.env['TMPDIR'], home: process.env['HOME'] };
  });

  // The folder is removed even when restoring the cwd or the environment fails.
  afterEach(() => {
    try {
      process.chdir(previous.cwd);
    } finally {
      restoreEnv('TMPDIR', previous.tmpdir);
      restoreEnv('HOME', previous.home);
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('F-06 AC-024 the analysis, run from a temp folder with TMPDIR and HOME set to it, leaves that folder unchanged', async () => {
    process.chdir(root);
    process.env['TMPDIR'] = root;
    process.env['HOME'] = root;
    const before = listTree(root);

    await analyzeLogged(configFixture(SENTINEL), fakeModel({ text: '[]' }));
    await analyzeLogged(configFixture(SENTINEL), null);
    await analyzeLogged(configFixture(SENTINEL), fakeModel({ throws: 'timeout' }));

    expect(listTree(root)).toEqual(before);
  });
});
