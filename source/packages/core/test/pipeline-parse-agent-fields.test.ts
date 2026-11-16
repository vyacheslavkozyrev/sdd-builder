import { describe, expect, it } from 'vitest';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import type { AgentBlock, ChildBlock, Pipeline } from '../src/pipeline/model.js';
import { parsePipelineConfig, type PipelineProblem } from '../src/pipeline/parse.js';

/** A child flow with one Agent block carrying the given fields, plus its Start and End. */
function flow(agentFields: Record<string, unknown>): Record<string, unknown> {
  return {
    kind: 'flow',
    id: 'build',
    name: 'Build',
    description: 'A flow description.',
    enabled: true,
    blocks: [
      { kind: 'start', id: 'build-start', enabled: true },
      { kind: 'agent', id: 'build-implement', enabled: true, name: 'implement', scope: 'task', description: 'Implements.', ...agentFields },
      { kind: 'end', id: 'build-end', enabled: true, outcome: 'done' },
    ],
  };
}

/** A pipeline that passes every rule: a Start, the build flow, and an End. The pipeline fields are added by the caller. */
function configWith(agentFields: Record<string, unknown>, pipelineFields: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'My project',
    idea: 'A tool that tracks reading lists.',
    stack: { language: 'TypeScript' },
    pipeline: {
      name: 'main-pipeline',
      ...pipelineFields,
      blocks: [
        { kind: 'start', id: 'start', enabled: true, arguments: [] },
        flow(agentFields),
        { kind: 'end', id: 'end', enabled: true, outcome: 'done' },
      ],
    },
    rules: [],
  };
}

function problemsOf(value: unknown): PipelineProblem[] {
  const result = parsePipelineConfig(value);
  if (result.ok) throw new Error('expected the config to be refused');
  return result.problems;
}

/** The Agent block of the build flow, as parsed. */
function parsedAgent(value: unknown): AgentBlock {
  const result = parsePipelineConfig(value);
  if (!result.ok) throw new Error('expected the config to pass');
  const build = result.config.pipeline.blocks[1];
  if (build?.kind !== 'flow') throw new Error('expected a flow at index 1');
  const agent = build.blocks.find((block: ChildBlock) => block.kind === 'agent');
  if (agent?.kind !== 'agent') throw new Error('expected an Agent block');
  return agent;
}

/** The pipeline, as parsed. */
function parsedPipeline(value: unknown): Pipeline {
  const result = parsePipelineConfig(value);
  if (!result.ok) throw new Error('expected the config to pass');
  return result.config.pipeline;
}

describe('F-06 AC-026 an Agent block takes an optional model, tool list and body', () => {
  it.each(['haiku', 'sonnet', 'opus', 'inherit'])('accepts the model %s and keeps it on the parsed block', (model) => {
    expect(parsedAgent(configWith({ model })).model).toBe(model);
  });

  it('keeps the tool list and the body on the parsed Agent block', () => {
    expect(parsedAgent(configWith({ tools: ['Read', 'Bash(git:*)'], body: 'Implement the task.' }))).toEqual({
      kind: 'agent',
      id: 'build-implement',
      enabled: true,
      name: 'implement',
      scope: 'task',
      description: 'Implements.',
      ruleTags: [],
      tools: ['Read', 'Bash(git:*)'],
      body: 'Implement the task.',
    });
  });

  it('accepts an empty tool list', () => {
    expect(parsedAgent(configWith({ tools: [] })).tools).toEqual([]);
  });

  it('leaves model, tools and body out of the parsed block when the keys are absent', () => {
    const agent = parsedAgent(configWith({}));
    expect('model' in agent).toBe(false);
    expect('tools' in agent).toBe(false);
    expect('body' in agent).toBe(false);
  });

  it.each([
    ['a capitalised name', 'Haiku'],
    ['a name not in the list', 'gpt'],
    ['an empty string', ''],
    ['a number', 3],
    ['null', null],
  ])('refuses a model that is %s at the path of the model key', (_label, model) => {
    expect(problemsOf(configWith({ model }))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].model', message: 'must be haiku, sonnet, opus or inherit' },
    ]);
  });

  it.each([
    ['an empty name', ''],
    ['spaces only', '   '],
  ])('refuses a tool name that is %s at its own list position', (_label, tool) => {
    expect(problemsOf(configWith({ tools: ['Read', tool] }))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].tools[1]', message: 'must not be blank' },
    ]);
  });

  it.each([
    ['a space inside the name', 'Read Write'],
    ['a leading space', ' Read'],
    ['a trailing space', 'Read '],
    ['a tab', 'Read\tWrite'],
    ['a line feed', 'Read\nWrite'],
    ['a carriage return', 'Read\rWrite'],
    ['a NUL character', 'Read\u0000'],
    ['a DEL character', 'Read\u007f'],
    ['a line separator', 'Read Write'],
  ])('refuses a tool name with %s at its own list position', (_label, tool) => {
    expect(problemsOf(configWith({ tools: ['Read', tool] }))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].tools[1]', message: 'must not contain spaces, commas or control characters' },
    ]);
  });

  it.each([
    ['a comma between two names', 'Read,Write'],
    ['a trailing comma', 'Read,'],
    ['a comma inside a call', 'Bash(git log,*)'],
  ])('F-06 AC-026 refuses a tool name with %s, which would split the comma-joined tools line', (_label, tool) => {
    expect(problemsOf(configWith({ tools: ['Read', tool] }))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].tools[1]', message: 'must not contain spaces, commas or control characters' },
    ]);
  });

  it.each(['Read', 'Bash(git:*)', 'mcp__files__read', 'WebFetch(domain:example.com)'])(
    'accepts the tool name %s, which has no space or control character',
    (tool) => {
      expect(parsedAgent(configWith({ tools: [tool] })).tools).toEqual([tool]);
    },
  );

  it('refuses a tool name that is not a string at its list position', () => {
    expect(problemsOf(configWith({ tools: [42] }))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].tools[0]', message: 'must be a string' },
    ]);
  });

  it('refuses a tool list that is not a list', () => {
    expect(problemsOf(configWith({ tools: 'Read' }))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].tools', message: 'must be a list' },
    ]);
  });

  it('refuses a body that is not a string', () => {
    expect(problemsOf(configWith({ body: ['Implement.'] }))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1].body', message: 'must be a string' },
    ]);
  });

  it('accepts a body longer than 4,000 characters, since the cap is an entry check in the builder', () => {
    const body = 'x'.repeat(5000);
    expect(parsedAgent(configWith({ body })).body).toBe(body);
  });
});

describe('F-06 AC-042 the pipeline takes an optional description, rule tags, model, tools and body', () => {
  it('keeps every pipeline field on the parsed pipeline', () => {
    expect(
      parsedPipeline(
        configWith(
          {},
          {
            description: 'Runs the whole process.',
            ruleTags: ['qa.md'],
            model: 'sonnet',
            tools: ['Read'],
            body: 'Run the flows in order.',
          },
        ),
      ),
    ).toEqual({
      name: 'main-pipeline',
      description: 'Runs the whole process.',
      ruleTags: ['qa.md'],
      model: 'sonnet',
      tools: ['Read'],
      body: 'Run the flows in order.',
      blocks: expect.any(Array),
    });
  });

  it('leaves the optional pipeline fields out when they are absent, and sets its rule tags to an empty list', () => {
    const pipeline = parsedPipeline(configWith({}));
    expect(pipeline.ruleTags).toEqual([]);
    expect('description' in pipeline).toBe(false);
    expect('model' in pipeline).toBe(false);
    expect('tools' in pipeline).toBe(false);
    expect('body' in pipeline).toBe(false);
  });

  it('refuses an unknown pipeline model at the path of the model key', () => {
    expect(problemsOf(configWith({}, { model: 'large' }))).toEqual([
      { path: 'pipeline.model', message: 'must be haiku, sonnet, opus or inherit' },
    ]);
  });

  it('refuses a blank pipeline tool name at its list position', () => {
    expect(problemsOf(configWith({}, { tools: [''] }))).toEqual([
      { path: 'pipeline.tools[0]', message: 'must not be blank' },
    ]);
  });

  it('refuses a pipeline tool name with a line break at its list position', () => {
    expect(problemsOf(configWith({}, { tools: ['Read\nWrite'] }))).toEqual([
      { path: 'pipeline.tools[0]', message: 'must not contain spaces, commas or control characters' },
    ]);
  });

  it('F-06 AC-026 refuses a pipeline tool name with a comma at its list position', () => {
    expect(problemsOf(configWith({}, { tools: ['Read,Write'] }))).toEqual([
      { path: 'pipeline.tools[0]', message: 'must not contain spaces, commas or control characters' },
    ]);
  });

  it('refuses a pipeline description that is not a string', () => {
    expect(problemsOf(configWith({}, { description: 7 }))).toEqual([
      { path: 'pipeline.description', message: 'must be a string' },
    ]);
  });

  it('refuses a pipeline rule tag that is empty at its list position', () => {
    expect(problemsOf(configWith({}, { ruleTags: ['qa.md', ''] }))).toEqual([
      { path: 'pipeline.ruleTags[1]', message: 'must not be empty' },
    ]);
  });

  it('still refuses an unknown key on the pipeline', () => {
    expect(problemsOf(configWith({}, { colour: 'blue' }))).toEqual([
      { path: 'pipeline.colour', message: 'is not a known key' },
    ]);
  });

  it('keeps the default pipeline valid and unchanged by the parse', () => {
    const result = parsePipelineConfig(structuredClone(defaultProjectConfig));
    expect(result).toEqual({ ok: true, config: defaultProjectConfig });
  });
});
