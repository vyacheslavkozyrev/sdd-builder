import { pipeline } from '@sddbuilder/core';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import type { GenerationReply } from '../src/generate/anthropic.js';
import type { GenerationTemplates } from '../src/generate/load-templates.js';
import type { GenerationRequest } from '../src/generate/prompt.js';
import { generateProject, type GenerationModel, type GenerationResult } from '../src/generate/service.js';

// Fixed layouts, given as data: no template file is read. None has a placeholder or a heading, so a reply is checked on
// its text only.
const TEMPLATES: GenerationTemplates = {
  base: [{ path: 'CLAUDE.md', layout: 'Project instructions.' }],
  pipeline: 'Pipeline.',
  flow: 'Flow.',
  agent: 'Agent.',
  rule: 'Rule.',
};

// A config with one flow, Start, Agent and End, and no rules. Its brief has only warnings (no framework is named and
// no rule is listed), and its structure has no blocker, so it is planned.
function configFixture(): pipeline.ProjectConfig {
  return {
    schemaVersion: 2,
    name: 'Demo',
    idea: 'A demo project',
    architecture: 'A small service',
    stack: { language: 'TypeScript' },
    rules: [],
    pipeline: {
      name: 'SDD',
      description: 'The process',
      arguments: [],
      flows: [
        {
          index: 0,
          id: 'build',
          name: 'Build',
          arguments: [],
          body: 'Runs the build agent.',
          artifacts: [{ label: 'out.md', template: 'The output' }],
          approval: false,
          blocks: [
            { index: 0, id: 'start', kind: 'start', next: 'agent' },
            {
              index: 1,
              id: 'agent',
              kind: 'agent',
              name: 'build-agent',
              description: 'Builds the project.',
              arguments: [],
              next: 'end',
            },
            { index: 2, id: 'end', kind: 'end', outcome: 'done', producedArtifact: 'out.md' },
          ],
        },
      ],
    },
  };
}

// The paths the plan of a config lists, in plan order. The plan is built by core, the same way the service builds it.
function plannedPaths(config: pipeline.ProjectConfig): string[] {
  const result = pipeline.planGeneration(config, TEMPLATES);
  if (!result.ok) throw new Error('the fixture config has a blocker');
  return result.files.map((file) => file.path);
}

// A fake model: it records each request and answers with the next reply in the list. An entry that is an Error is
// thrown. Asking for more replies than the list holds throws, which the service reports as a provider error.
interface FakeModel extends GenerationModel {
  readonly requests: GenerationRequest[];
}

function fakeModel(answers: readonly (GenerationReply | Error)[]): FakeModel {
  const requests: GenerationRequest[] = [];
  return {
    requests,
    generate: async (request) => {
      requests.push(request);
      const answer = answers[requests.length - 1];
      if (answer === undefined) throw new Error('the fake model has no reply left');
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
}

function reply(text: string, stopReason: GenerationReply['stopReason'] = 'end_turn'): GenerationReply {
  return { text, stopReason };
}

// A reply with one text for every path given, as one JSON object.
function goodReply(paths: readonly string[], text = 'File text.'): GenerationReply {
  return reply(JSON.stringify(Object.fromEntries(paths.map((path) => [path, text]))));
}

async function zipEntries(result: GenerationResult): Promise<{ names: string[]; texts: Record<string, string> }> {
  if (result.kind !== 'zip') throw new Error(`expected a zip, got ${result.kind}`);
  const zip = await JSZip.loadAsync(result.bytes);
  const names = Object.keys(zip.files);
  const texts: Record<string, string> = {};
  for (const name of names) {
    const entry = zip.file(name);
    if (entry !== null) texts[name] = await entry.async('string');
  }
  return { names, texts };
}

describe('F-15 AC-005 a configuration with warnings only is generated', () => {
  it('F-15 AC-005 gives a zip with every planned path when the brief has warnings and no blocker', async () => {
    const config = configFixture();
    const warnings = pipeline.analyzeBrief(config);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.every((finding) => finding.severity === 'warning')).toBe(true);

    const paths = plannedPaths(config);
    const model = fakeModel([goodReply(paths)]);
    const result = await generateProject(config, { templates: TEMPLATES, model });
    expect(result.kind).toBe('zip');
    expect((await zipEntries(result)).names).toEqual(paths);
  });
});

describe('F-15 AC-008 a refused configuration makes no model call', () => {
  it('F-15 AC-008 AC-010 refuses with every blocker, the same problems as the gate, and records zero model calls', async () => {
    const config = configFixture();
    const flow = config.pipeline.flows[0];
    if (flow === undefined) throw new Error('the fixture has no flow');
    const broken: pipeline.ProjectConfig = {
      ...config,
      pipeline: {
        ...config.pipeline,
        flows: [
          {
            ...flow,
            blocks: flow.blocks.map((block) => {
              if (block.kind === 'start') return { ...block, next: 'nowhere' };
              if (block.kind === 'agent') return { ...block, next: 'nowhere' };
              return block;
            }),
          },
        ],
      },
    };
    const expected = pipeline
      .analyzeStructure(broken)
      .filter((finding) => finding.severity === 'blocker')
      .map((finding) => `${finding.path}: ${finding.message}`);
    expect(expected.length).toBeGreaterThan(1);

    const model = fakeModel([]);
    const result = await generateProject(broken, { templates: TEMPLATES, model });
    expect(result).toEqual({ kind: 'refused', problems: expected });
    expect(model.requests).toHaveLength(0);
  });

  it('F-15 AC-009 refuses a blocked configuration before the missing model is checked', async () => {
    const config = configFixture();
    const flow = config.pipeline.flows[0];
    if (flow === undefined) throw new Error('the fixture has no flow');
    const broken: pipeline.ProjectConfig = {
      ...config,
      pipeline: { ...config.pipeline, flows: [{ ...flow, blocks: flow.blocks.slice(1) }] },
    };
    const result = await generateProject(broken, { templates: TEMPLATES, model: null });
    expect(result.kind).toBe('refused');
  });
});

describe('F-15 AC-022 no model key gives unavailable with no call', () => {
  it('F-15 AC-022 gives unavailable for a valid configuration when the model is null', async () => {
    const result = await generateProject(configFixture(), { templates: TEMPLATES, model: null });
    expect(result).toEqual({ kind: 'unavailable' });
  });
});

describe('F-15 AC-015 one generation call for the whole plan', () => {
  it('F-15 AC-015 makes one call whose prompt holds every planned path in plan order', async () => {
    const config = configFixture();
    const paths = plannedPaths(config);
    const model = fakeModel([goodReply(paths)]);
    await generateProject(config, { templates: TEMPLATES, model });
    expect(model.requests).toHaveLength(1);
    const content = model.requests[0]?.content ?? '';
    expect(content).toContain('Builds the project.');
    expect(content).toContain('Project instructions.');
    let at = 0;
    for (const path of paths) {
      const found = content.indexOf(JSON.stringify(path), at);
      expect(found).toBeGreaterThanOrEqual(0);
      at = found;
    }
  });
});

describe('F-15 AC-017 one retry for a bad reply', () => {
  it('F-15 AC-017 retries once with the findings of the first reply in the retry prompt', async () => {
    const config = configFixture();
    const paths = plannedPaths(config);
    const model = fakeModel([reply('{}'), goodReply(paths)]);
    const result = await generateProject(config, { templates: TEMPLATES, model });
    expect(result.kind).toBe('zip');
    expect(model.requests).toHaveLength(2);
    const retry = model.requests[1]?.prompt ?? '';
    for (const path of paths) {
      expect(retry).toContain(`${path}: is missing from the reply`);
    }
  });

  it('F-15 AC-017 retries once for a reply that is not one JSON object', async () => {
    const config = configFixture();
    const paths = plannedPaths(config);
    const model = fakeModel([reply('Here are the files: {}'), goodReply(paths)]);
    const result = await generateProject(config, { templates: TEMPLATES, model });
    expect(result.kind).toBe('zip');
    expect(model.requests).toHaveLength(2);
    expect(model.requests[1]?.prompt).toContain('(reply): is not one JSON object');
  });

  it('F-15 AC-017 treats an empty text as a bad reply and retries once', async () => {
    const config = configFixture();
    const paths = plannedPaths(config);
    const empty = reply(JSON.stringify(Object.fromEntries(paths.map((path) => [path, '']))));
    const model = fakeModel([empty, empty]);
    const result = await generateProject(config, { templates: TEMPLATES, model });
    expect(model.requests).toHaveLength(2);
    expect(result).toEqual({
      kind: 'bad-reply',
      problems: paths.map((path) => `${path}: has an empty text`),
    });
  });

  it('F-15 AC-017 treats a truncated reply as a bad reply and retries once', async () => {
    const config = configFixture();
    const paths = plannedPaths(config);
    const model = fakeModel([reply('{"CLAUDE.md": "cut', 'max_tokens'), goodReply(paths)]);
    const result = await generateProject(config, { templates: TEMPLATES, model });
    expect(result.kind).toBe('zip');
    expect(model.requests).toHaveLength(2);
    expect(model.requests[1]?.prompt).toContain('(reply): was cut short at the token limit');
  });
});

describe('F-15 AC-018 the retry reply builds the zip', () => {
  it('F-15 AC-018 builds the zip from the good retry reply, in plan order', async () => {
    const config = configFixture();
    const paths = plannedPaths(config);
    const model = fakeModel([reply('{}'), goodReply(paths, 'Retried text.')]);
    const result = await generateProject(config, { templates: TEMPLATES, model });
    const { names, texts } = await zipEntries(result);
    expect(names).toEqual(paths);
    expect(texts).toEqual(Object.fromEntries(paths.map((path) => [path, 'Retried text.'])));
  });
});

describe('F-15 AC-019 two bad replies give a bad-reply result with no reply text', () => {
  it('F-15 AC-019 never returns a reply key that is not in the plan, only a finding about the reply', async () => {
    const config = configFixture();
    const paths = plannedPaths(config);
    const secret = 'SECRET-KEY-TEXT';
    const extra = reply(
      JSON.stringify({ ...Object.fromEntries(paths.map((path) => [path, 'File text.'])), [secret]: 'x' }),
    );
    const model = fakeModel([extra, extra]);
    const result = await generateProject(config, { templates: TEMPLATES, model });
    expect(result).toEqual({ kind: 'bad-reply', problems: ['(reply): is not in the plan'] });
    expect(JSON.stringify(result)).not.toContain(secret);
  });

  it('F-15 AC-019 gives the paths and messages of the second reply and never its text', async () => {
    const config = configFixture();
    const paths = plannedPaths(config);
    const secret = 'SECRET-REPLY-TEXT';
    const bad = reply(JSON.stringify({ 'CLAUDE.md': `${secret} {{placeholder}}` }));
    const model = fakeModel([bad, bad]);
    const result = await generateProject(config, { templates: TEMPLATES, model });
    expect(model.requests).toHaveLength(2);
    expect(result.kind).toBe('bad-reply');
    if (result.kind !== 'bad-reply') return;
    expect(result.problems).toContain('CLAUDE.md: holds a {{...}} placeholder');
    for (const path of paths.filter((path) => path !== 'CLAUDE.md')) {
      expect(result.problems).toContain(`${path}: is missing from the reply`);
    }
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});

describe('F-15 AC-020 a provider error answers after one call', () => {
  it('F-15 AC-020 gives provider-error after one call when the first call throws, and does not retry', async () => {
    const model = fakeModel([new Error('provider failure with SECRET-KEY-TEXT')]);
    const result = await generateProject(configFixture(), { templates: TEMPLATES, model });
    expect(result).toEqual({ kind: 'provider-error' });
    expect(model.requests).toHaveLength(1);
  });

  it('F-15 AC-020 gives provider-error and no zip when the retry call throws', async () => {
    const model = fakeModel([reply('{}'), new Error('provider failure')]);
    const result = await generateProject(configFixture(), { templates: TEMPLATES, model });
    expect(result).toEqual({ kind: 'provider-error' });
    expect(model.requests).toHaveLength(2);
  });
});

describe('F-15 AC-027 a generator error propagates', () => {
  it('F-15 AC-027 throws the generator error for a duplicate output path, and makes no call', async () => {
    const duplicated: GenerationTemplates = {
      ...TEMPLATES,
      base: [
        { path: 'CLAUDE.md', layout: 'One.' },
        { path: 'CLAUDE.md', layout: 'Two.' },
      ],
    };
    const model = fakeModel([]);
    await expect(generateProject(configFixture(), { templates: duplicated, model })).rejects.toThrow(
      'two planned files have the path CLAUDE.md',
    );
    expect(model.requests).toHaveLength(0);
  });
});
