import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { pipeline } from '@sddbuilder/core';
import type { ReviewModel } from '../src/analyze.js';
import { createApp, type GenerationPorts, type LimitPorts } from '../src/app.js';
import type { GenerationModel, GenerationReply } from '../src/generate/generation-model.js';
import type { LogPort } from '../src/log.js';
import { DailyCeiling } from '../src/limits/daily-ceiling.js';
import { fixedLimits } from './fixed-limits.js';
import { pipelineConfig, pipelineTemplates, refusedPipelineConfig, withPipelineRules } from './pipeline-config.js';

type App = ReturnType<typeof createApp>;

const GENERATE_URL = 'http://localhost/generate';
/** 2026-11-15 12:00:00 UTC: the clock of every daily ceiling in this file. */
const FIXED_NOW = Date.UTC(2026, 10, 15, 12, 0, 0);
/** A sentinel for the submitted brief and the model reply; it must never reach a response or a log line. */
const SECRET = 'SECRET-F07-ROUTE';

const UNUSED_REVIEW: ReviewModel = {
  complete: () => Promise.reject(new Error('the review model is not used by /generate')),
};

/** A model fake that answers each call in turn, records every prompt and rejects a call past its steps. */
interface FakeModel extends GenerationModel {
  prompts: string[];
}

function scriptedModel(steps: readonly string[]): FakeModel {
  const prompts: string[] = [];
  return {
    prompts,
    complete(prompt: string): Promise<GenerationReply> {
      prompts.push(prompt);
      const step = steps[prompts.length - 1];
      if (step === undefined) {
        return Promise.reject(new Error('unexpected extra model call'));
      }
      return Promise.resolve({ text: step, truncated: false });
    },
  };
}

/** A log port that keeps every line it receives. */
function recordingLog(): LogPort & { lines: string[] } {
  const lines: string[] = [];
  return { lines, write: (line: string) => lines.push(line) };
}

/** A reply that maps every planned path of the configuration to text that carries the sentinel and the layout. */
function replyFor(config: pipeline.ProjectConfig): string {
  const plan = pipeline.planGeneration(config, pipelineTemplates());
  return JSON.stringify(Object.fromEntries(plan.map((entry) => [entry.path, `${SECRET} ${entry.path}.\n\n${entry.layout}`])));
}

function appWith(
  generation: GenerationPorts | null,
  log: LogPort = recordingLog(),
  limits: LimitPorts = fixedLimits(),
): App {
  return createApp({ limits, review: UNUSED_REVIEW, generation, log });
}

function withModel(model: GenerationModel): GenerationPorts {
  return { templates: pipelineTemplates(), model };
}

function postBody(app: App, body: string): Response | Promise<Response> {
  return app.request(GENERATE_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
}

function postConfig(app: App, config: unknown): Response | Promise<Response> {
  return postBody(app, JSON.stringify(config));
}

/** The findings `/generate` answers a refused configuration with: `<path>: <message>` per problem. */
function refusalsOf(config: pipeline.ProjectConfig): string[] {
  return pipeline.configProblems(config).map((problem) => `${problem.path}: ${problem.message}`);
}

describe('F-07 AC-001 a valid pipeline config and a valid reply give 200 with a zip', () => {
  it('F-07 AC-001 returns 200 with the zip type after one model call', async () => {
    const config = pipelineConfig();
    const model = scriptedModel([replyFor(config)]);

    const response = await postConfig(appWith(withModel(model)), config);
    const zip = await JSZip.loadAsync(await response.arrayBuffer());
    const planned = pipeline.planGeneration(config, pipelineTemplates()).map((entry) => entry.path);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/zip');
    expect(Object.keys(zip.files)).toEqual(planned);
    expect(model.prompts).toHaveLength(1);
  });
});

describe('F-07 AC-002 a flat schemaVersion 1 body is refused with 400 and no model call', () => {
  it('F-07 AC-002 names schemaVersion in the problems and calls no model', async () => {
    const flat = {
      schemaVersion: 1,
      name: 'Flat project',
      idea: 'A flat brief.',
      stack: { language: 'TypeScript' },
      codeRules: ['Validate input at the boundary.'],
      testRules: [],
      targets: ['claude'],
    };
    const model = scriptedModel([]);

    const response = await postConfig(appWith(withModel(model)), flat);
    const json = (await response.json()) as { error: string; problems: string[] };

    expect(response.status).toBe(400);
    expect(json.error).toBe('project config is invalid');
    expect(json.problems.some((problem) => problem.startsWith('schemaVersion:'))).toBe(true);
    expect(model.prompts).toHaveLength(0);
  });
});

describe('F-07 AC-003 a body that is not JSON is refused with 400 and an error only', () => {
  it('F-07 AC-003 answers the error alone and calls no model', async () => {
    const model = scriptedModel([]);

    const response = await postBody(appWith(withModel(model)), '{not json');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'request body is not valid JSON' });
    expect(model.prompts).toHaveLength(0);
  });
});

describe('F-07 AC-004 a body that fails parsePipelineConfig gives one problem per failure and no model call', () => {
  const bodies: [string, Record<string, unknown>][] = [
    ['a name that is not a string', { name: 42 }],
    ['a stack without a language', { stack: {} }],
    ['rules that are not a list', { rules: 'none' }],
  ];

  for (const [label, override] of bodies) {
    it(`F-07 AC-004 refuses ${label} with the parser's problems and calls no model`, async () => {
      const body = { ...pipelineConfig(), ...override };
      const parsed = pipeline.parsePipelineConfig(body);
      expect(parsed.ok).toBe(false);
      const expected = parsed.ok ? [] : parsed.problems.map((problem) => `${problem.path || '(root)'}: ${problem.message}`);
      const model = scriptedModel([]);

      const response = await postConfig(appWith(withModel(model)), body);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'project config is invalid', problems: expected });
      expect(model.prompts).toHaveLength(0);
    });
  }

  const parseRefusals: [string, (blocks: pipeline.ChildBlock[]) => void][] = [
    [
      'a Condition whose fail route names no block',
      (blocks) => {
        const condition = blocks.find((block): block is pipeline.ConditionBlock => block.kind === 'condition');
        if (condition === undefined) {
          throw new Error('the default pipeline must hold a condition');
        }
        condition.failRoute = { kind: 'back', blockId: 'no-such-block' };
      },
    ],
    [
      'a block with no description',
      (blocks) => {
        const agent = blocks.find((block): block is pipeline.AgentBlock => block.kind === 'agent');
        if (agent === undefined) {
          throw new Error('the default pipeline must hold an agent');
        }
        agent.description = '';
      },
    ],
  ];

  for (const [label, breakBlocks] of parseRefusals) {
    it(`F-07 AC-004 refuses ${label} with 400 at the parse, before the structural rules, and calls no model`, async () => {
      const config = pipelineConfig();
      breakBlocks(
        config.pipeline.blocks
          .filter((block): block is pipeline.FlowBlock => block.kind === 'flow')
          .flatMap((flow) => flow.blocks),
      );
      const parsed = pipeline.parsePipelineConfig(config);
      expect(parsed.ok).toBe(false);
      const expected = parsed.ok ? [] : parsed.problems.map((problem) => `${problem.path || '(root)'}: ${problem.message}`);
      expect(expected.length).toBeGreaterThan(0);
      const model = scriptedModel([]);

      const response = await postConfig(appWith(withModel(model)), config);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'project config is invalid', problems: expected });
      expect(model.prompts).toHaveLength(0);
    });
  }
});

describe('F-07 AC-005 a body with an unknown key is refused with 400 that names the key', () => {
  it('F-07 AC-005 names the unknown key path and calls no model', async () => {
    const model = scriptedModel([]);

    const response = await postConfig(appWith(withModel(model)), { ...pipelineConfig(), extra: 'value' });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'project config is invalid', problems: ['extra: is not a known key'] });
    expect(model.prompts).toHaveLength(0);
  });
});

describe('F-07 AC-006 a configuration the structural rules refuse gives 422 with every problem and no model call', () => {
  it('F-07 AC-006 refuses a rule tag that names no rule with its path and message, and calls no model', async () => {
    const config = refusedPipelineConfig();
    const expected = refusalsOf(config);
    expect(expected).toEqual([expect.stringContaining('"no-such-rule" names no rule')]);
    const model = scriptedModel([]);

    const response = await postConfig(appWith(withModel(model)), config);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'project config cannot be generated', problems: expected });
    expect(model.prompts).toHaveLength(0);
  });

  it('F-07 AC-006 lists every problem, in path then message order, in one response', async () => {
    const config = pipelineConfig();
    const flows = config.pipeline.blocks.filter((block): block is pipeline.FlowBlock => block.kind === 'flow');
    flows.slice(0, 2).forEach((flow, index) => {
      flow.ruleTags = [`no-such-rule-${index}`];
    });
    const problems = pipeline.configProblems(config);
    expect(problems).toHaveLength(2);
    const sorted = [...problems].sort((a, b) => {
      if (a.path !== b.path) return a.path < b.path ? -1 : 1;
      if (a.message !== b.message) return a.message < b.message ? -1 : 1;
      return 0;
    });
    expect(problems).toEqual(sorted);
    const expected = sorted.map((problem) => `${problem.path}: ${problem.message}`);
    const model = scriptedModel([]);

    const response = await postConfig(appWith(withModel(model)), config);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'project config cannot be generated', problems: expected });
    expect(model.prompts).toHaveLength(0);
  });
});

describe('F-07 AC-007 a body over the input caps gives 422 with one line per cap and no submitted text', () => {
  const overCaps: [string, () => pipeline.ProjectConfig, string[]][] = [
    [
      'an idea over 8,000 characters',
      () => pipelineConfig({ idea: `${SECRET}${'x'.repeat(8001 - SECRET.length)}` }),
      ['idea: 8001 characters, the limit is 8000'],
    ],
    ['more than 60 rules', () => withPipelineRules(61), ['rules: 61 rules, the limit is 60']],
    [
      'an idea over the cap and more than 60 rules',
      () => ({ ...withPipelineRules(61), idea: `${SECRET}${'x'.repeat(8001 - SECRET.length)}` }),
      ['idea: 8001 characters, the limit is 8000', 'rules: 61 rules, the limit is 60'],
    ],
  ];

  for (const [label, config, problems] of overCaps) {
    it(`F-07 AC-007 refuses ${label} with 422 and calls no model`, async () => {
      const model = scriptedModel([]);

      const response = await postConfig(appWith(withModel(model)), config());
      const text = await response.text();

      expect(response.status).toBe(422);
      expect(JSON.parse(text)).toEqual({ error: 'project config is over the input caps', problems });
      expect(text).not.toContain(SECRET);
      expect(model.prompts).toHaveLength(0);
    });
  }
});

describe('F-07 AC-013 with no generation model configured, /generate gives 503 and no model call', () => {
  it('F-07 AC-013 answers 503 with the error body and writes no log line', async () => {
    const log = recordingLog();

    const response = await postConfig(appWith(null, log), pipelineConfig());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'generation is not configured on this server' });
    expect(log.lines).toEqual([]);
  });
});

describe('F-07 AC-016 two planned files with one path are never zipped', () => {
  it('F-07 AC-016 gives 500 with the generic message, no zip and no duplicate detail, and no model call', async () => {
    // The flow id `pipeline` writes `.claude/commands/pipeline.md`, the path of the pipeline command. No configuration
    // problem reports it, so the planner throws a GenerationError for the duplicate path.
    const config = pipelineConfig();
    const specify = config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === 'specify');
    if (specify === undefined || specify.kind !== 'flow') throw new Error('the default pipeline must hold the specify flow');
    specify.id = 'pipeline';
    for (const block of config.pipeline.blocks) {
      if (block.kind === 'connection' && block.from === 'specify') block.from = 'pipeline';
      if (block.kind === 'condition' && block.failRoute.kind === 'back' && block.failRoute.blockId === 'specify') {
        block.failRoute = { kind: 'back', blockId: 'pipeline' };
      }
    }
    const log = recordingLog();
    const model = scriptedModel([]);

    const response = await postConfig(appWith(withModel(model), log), config);
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
    expect(JSON.parse(text)).toEqual({ error: 'internal error' });
    expect(text).not.toContain('duplicate');
    expect(log.lines).toEqual(['event=unexpected_error route=/generate status=500 error=GenerationError']);
    expect(model.prompts).toHaveLength(0);
  });
});

describe('F-07 AC-020 an unexpected error in the generate path gives 500 with the generic message', () => {
  it('F-07 AC-020 gives 500 with no exception text and logs the error name only', async () => {
    const log = recordingLog();
    const templates = {
      get: () => {
        throw new RangeError(`${SECRET} at /srv/app/internal.ts:12`);
      },
      paths: () => [],
    };
    const app = createApp({ limits: fixedLimits(), review: UNUSED_REVIEW, generation: { templates, model: scriptedModel([]) }, log });

    const response = await postConfig(app, pipelineConfig());
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(text)).toEqual({ error: 'internal error' });
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain('internal.ts');
    expect(log.lines).toEqual(['event=unexpected_error route=/generate status=500 error=RangeError']);
  });
});

describe('F-07 AC-022 a refusal does not count toward the generation ceiling', () => {
  it('F-07 AC-022 two 422 refusals leave the one-call ceiling for the next valid request', async () => {
    const config = pipelineConfig();
    const model = scriptedModel([replyFor(config), replyFor(config)]);
    const limits: LimitPorts = { ...fixedLimits(), generateCeiling: new DailyCeiling(1, () => FIXED_NOW) };
    const app = appWith(withModel(model), recordingLog(), limits);

    const refused = refusedPipelineConfig();
    expect((await postConfig(app, refused)).status).toBe(422);
    expect((await postConfig(app, refused)).status).toBe(422);
    expect((await postConfig(app, config)).status).toBe(200);

    const refusedByCeiling = await postConfig(app, config);
    expect(refusedByCeiling.status).toBe(429);
    expect(model.prompts).toHaveLength(1);
  });
});
