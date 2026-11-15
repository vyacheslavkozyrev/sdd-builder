import { describe, expect, it } from 'vitest';
import { InvalidConfigError } from '../src/errors.js';
import type { GenerationResult } from '../src/model.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { generate } from '../src/pipeline/index.js';
import type { AgentBlock, FlowBlock, ProjectConfig } from '../src/pipeline/model.js';
import { parsePipelineConfig, type PipelineProblem } from '../src/pipeline/parse.js';
import { BASE_TEMPLATES } from './pipeline-routes-fixtures.js';

const TEMPLATES = BASE_TEMPLATES;

/** An accepted configuration: the generator returns files and no warning (F-02 AC-001, AC-029). */
function expectAccepted(result: GenerationResult): void {
  expect(result.files.length).toBeGreaterThan(0);
  expect(result.warnings).toEqual([]);
}

/** A child flow with one Agent block carrying the given fields, plus its Start and End. */
function flow(agentFields: Record<string, unknown>): Record<string, unknown> {
  return {
    kind: 'flow',
    id: 'build',
    name: 'Build',
    enabled: true,
    blocks: [
      { kind: 'start', id: 'build-start', enabled: true },
      { kind: 'agent', id: 'build-implement', enabled: true, name: 'implement', scope: 'task', ...agentFields },
      { kind: 'end', id: 'build-end', enabled: true, outcome: 'done' },
    ],
  };
}

/** A pipeline that passes every rule except the one under test: a Start, the build flow, and an End. */
function configWith(agentFields: Record<string, unknown>): Record<string, unknown> {
  return {
    schemaVersion: 2,
    name: 'My project',
    idea: 'A tool that tracks reading lists.',
    stack: { language: 'TypeScript' },
    pipeline: {
      name: 'main-pipeline',
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
  const agent = build.blocks.find((block) => block.kind === 'agent');
  if (agent?.kind !== 'agent') throw new Error('expected an Agent block');
  return agent;
}

/** The refusal of a config by generate. Fails the test when generate accepts it. */
function refusalOf(config: ProjectConfig): InvalidConfigError {
  let refusal: InvalidConfigError | undefined;
  try {
    generate(config, TEMPLATES);
  } catch (error) {
    if (error instanceof InvalidConfigError) refusal = error;
    else throw error;
  }
  if (refusal === undefined) throw new Error('expected the config to be refused');
  return refusal;
}

/** A fresh copy of the default pipeline, so a test can change one block without touching the others. */
function defaultCopy(): ProjectConfig {
  return structuredClone(defaultProjectConfig);
}

/** The build flow of a config, by its id. */
function buildFlow(config: ProjectConfig): FlowBlock {
  const found = config.pipeline.blocks.find(
    (block): block is FlowBlock => block.kind === 'flow' && block.id === 'build',
  );
  if (found === undefined) throw new Error('expected a build flow');
  return found;
}

/** The Agent block with the given id in the build flow of a config. */
function buildAgent(config: ProjectConfig, id: string): AgentBlock {
  const found = buildFlow(config).blocks.find((block) => block.id === id);
  if (found?.kind !== 'agent') throw new Error(`expected an Agent block "${id}"`);
  return found;
}

describe('F-02 AC-029 an Agent block carries a description; a missing, blank or non-string one is refused', () => {
  it('accepts a non-blank description and keeps it on the parsed Agent block', () => {
    expect(parsedAgent(configWith({ description: 'Implements the next task.' }))).toEqual({
      kind: 'agent',
      id: 'build-implement',
      enabled: true,
      name: 'implement',
      scope: 'task',
      description: 'Implements the next task.',
      ruleTags: [],
    });
  });

  it('refuses an Agent block with no description at the path of the block', () => {
    expect(problemsOf(configWith({}))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1]', message: 'description is required' },
    ]);
  });

  it.each([
    ['an empty string', ''],
    ['spaces only', '   '],
    ['tabs and line breaks only', '\t\n '],
  ])('refuses a description that is %s at the path of the block', (_label, description) => {
    expect(problemsOf(configWith({ description }))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1]', message: 'description must not be blank' },
    ]);
  });

  it.each([
    ['a number', 3],
    ['a list', ['Implements the next task.']],
    ['null', null],
  ])('refuses a description that is %s at the path of the block', (_label, description) => {
    expect(problemsOf(configWith({ description }))).toEqual([
      { path: 'pipeline.blocks[1].blocks[1]', message: 'description must be a string' },
    ]);
  });

  it('gives the default pipeline a non-blank description on each of its nine Agent blocks', () => {
    const agents = defaultProjectConfig.pipeline.blocks.flatMap((block) =>
      block.kind === 'flow' ? block.blocks.filter((child): child is AgentBlock => child.kind === 'agent') : [],
    );
    expect(agents).toHaveLength(9);
    for (const agent of agents) {
      expect(agent.description.trim(), agent.id).not.toBe('');
    }
  });
});

describe('F-02 AC-029 generate refuses an enabled Agent block with a blank or missing description', () => {
  it('accepts the default pipeline, whose Agent blocks all have a description', () => {
    expectAccepted(generate(defaultCopy(), TEMPLATES));
  });

  it('refuses an enabled Agent block with an empty description, naming the block path', () => {
    const config = defaultCopy();
    buildAgent(config, 'build-implement').description = '';
    const index = config.pipeline.blocks.findIndex((block) => block.id === 'build');
    const childIndex = buildFlow(config).blocks.findIndex((block) => block.id === 'build-implement');
    const message = 'Agent block "build-implement" has no description; its stub text would be empty';
    expect(refusalOf(config).problems).toEqual([`pipeline.blocks[${index}].blocks[${childIndex}]: ${message}`]);
  });

  it('refuses an enabled Agent block with a whitespace-only description', () => {
    const config = defaultCopy();
    buildAgent(config, 'build-review').description = '  \n ';
    expect(() => generate(config, TEMPLATES)).toThrow(InvalidConfigError);
  });

  it('refuses an enabled Agent block whose description is missing, not only blank', () => {
    const config = defaultCopy();
    Reflect.deleteProperty(buildAgent(config, 'build-test'), 'description');
    expect(() => generate(config, TEMPLATES)).toThrow(InvalidConfigError);
  });

  it('does not check a disabled Agent block, even with a blank description', () => {
    const config = defaultCopy();
    const agent = buildAgent(config, 'build-commit');
    agent.enabled = false;
    agent.description = '';
    expectAccepted(generate(config, TEMPLATES));
  });

  it('does not check an enabled Agent block inside a disabled flow, even with a blank description', () => {
    const config = defaultCopy();
    buildFlow(config).enabled = false;
    buildAgent(config, 'build-review').description = '';
    expectAccepted(generate(config, TEMPLATES));
  });
});
