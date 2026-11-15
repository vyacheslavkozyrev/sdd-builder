import { describe, expect, it } from 'vitest';
import { InvalidConfigError } from '../src/errors.js';
import { defaultProjectConfig } from '../src/pipeline/default.js';
import { generate } from '../src/pipeline/index.js';
import type { FlowBlock, ProjectConfig } from '../src/pipeline/model.js';
import { parsePipelineConfig, type PipelineProblem } from '../src/pipeline/parse.js';
import { BASE_TEMPLATES } from './pipeline-routes-fixtures.js';

type Raw = Record<string, unknown>;

/** The six flow descriptions approved by the user, in the order of the default pipeline (F-03 AC-031). */
const APPROVED: ReadonlyArray<readonly [string, string]> = [
  ['specify', 'Turns the feature into user stories with testable acceptance criteria, then waits for approval.'],
  ['ux', "Draws the feature's screens as SVG from the stories, then waits for approval before the plan."],
  ['plan', 'Writes the ordered task list from the stories and the approved screens, then waits for approval before any code.'],
  ['build', 'Implements each planned task with its tests, reviews it, runs the checks and commits it, one commit per task.'],
  ['verify', 'Checks every acceptance criterion of the feature and prepares the manual checklist.'],
  ['complete', 'Marks the feature complete and commits its spec folder.'],
];

/** The default pipeline as an untrusted, raw config: the shape a JSON load would hand to the parser. */
function rawDefault(): Raw {
  return structuredClone(defaultProjectConfig) as unknown as Raw;
}

function blocksOf(raw: Raw): Raw[] {
  return (raw['pipeline'] as Raw)['blocks'] as Raw[];
}

/** The index of a flow of the pipeline, by its id. */
function indexOfFlow(raw: Raw, id: string): number {
  const index = blocksOf(raw).findIndex((block) => block['kind'] === 'flow' && block['id'] === id);
  if (index < 0) throw new Error(`expected a flow "${id}"`);
  return index;
}

/** The refusals of a raw config. Fails the test when the parser accepts it. */
function problemsOf(value: unknown): PipelineProblem[] {
  const result = parsePipelineConfig(value);
  if (result.ok) throw new Error('expected the config to be refused');
  return result.problems;
}

/** A config as the generator takes it, with the description of one flow changed. */
function configWithDescription(id: string, description: string): ProjectConfig {
  const config = structuredClone(defaultProjectConfig);
  const flow = config.pipeline.blocks.find((block): block is FlowBlock => block.kind === 'flow' && block.id === id);
  if (flow === undefined) throw new Error(`expected a flow "${id}"`);
  flow.description = description;
  return config;
}

/** The refusal of a config by generate. Fails the test when generate accepts it. */
function refusalOf(config: ProjectConfig): InvalidConfigError {
  let refusal: InvalidConfigError | undefined;
  try {
    generate(config, BASE_TEMPLATES);
  } catch (error) {
    if (error instanceof InvalidConfigError) refusal = error;
    else throw error;
  }
  if (refusal === undefined) throw new Error('expected the config to be refused');
  return refusal;
}

describe('F-03 AC-031 (description part) a pipeline flow carries a description, read by the parser', () => {
  it('parses the description of a flow and keeps it on the parsed flow', () => {
    const result = parsePipelineConfig(rawDefault());
    if (!result.ok) throw new Error('expected the default pipeline to parse');
    const specify = result.config.pipeline.blocks.find((block) => block.kind === 'flow' && block.id === 'specify');
    expect(specify).toMatchObject({ kind: 'flow', id: 'specify', description: APPROVED[0]?.[1] });
  });

  it.each([
    ['a missing description', undefined],
    ['a number', 42],
    ['null', null],
    ['a list', ['text']],
    ['an object', { text: 'text' }],
  ])('refuses %s at the path of the flow', (_label, value) => {
    const raw = rawDefault();
    const flow = blocksOf(raw)[indexOfFlow(raw, 'specify')] as Raw;
    if (value === undefined) delete flow['description'];
    else flow['description'] = value;
    const path = `pipeline.blocks[${indexOfFlow(raw, 'specify')}]`;
    const message = value === undefined ? 'description is required' : 'description must be a string';
    expect(problemsOf(raw)).toEqual([{ path, message }]);
  });

  it('refuses a missing description on a disabled flow too, since the parser checks the shape of every flow', () => {
    const raw = rawDefault();
    const index = indexOfFlow(raw, 'specify');
    const flow = blocksOf(raw)[index] as Raw;
    flow['enabled'] = false;
    delete flow['description'];
    expect(problemsOf(raw)).toEqual([{ path: `pipeline.blocks[${index}]`, message: 'description is required' }]);
  });

  it.each([[''], ['   '], ['\n\t']])('refuses the blank description %j at the path of the flow, as the Agent parser does', (blank) => {
    const raw = rawDefault();
    const index = indexOfFlow(raw, 'specify');
    (blocksOf(raw)[index] as Raw)['description'] = blank;
    expect(problemsOf(raw)).toEqual([{ path: `pipeline.blocks[${index}]`, message: 'description must not be blank' }]);
  });

  it('refuses a blank description on a disabled flow too, since the parser checks the shape of every flow', () => {
    const raw = rawDefault();
    const index = indexOfFlow(raw, 'specify');
    const flow = blocksOf(raw)[index] as Raw;
    flow['enabled'] = false;
    flow['description'] = '';
    expect(problemsOf(raw)).toEqual([{ path: `pipeline.blocks[${index}]`, message: 'description must not be blank' }]);
  });
});

describe('F-03 AC-031 (description part) a blank description on an enabled flow is refused at its path', () => {
  it.each([[''], ['   '], ['\n\t']])('refuses the blank description %j of an enabled flow at the flow path', (blank) => {
    const index = indexOfFlow(rawDefault(), 'specify');
    expect(refusalOf(configWithDescription('specify', blank)).problems).toEqual([
      `pipeline.blocks[${index}]: Flow "specify" has no description; its command text would be empty`,
    ]);
  });

  it('does not check a blank description of a disabled flow in generate, for a config built in code', () => {
    const config = structuredClone(defaultProjectConfig);
    config.pipeline.blocks.splice(1, 0, {
      kind: 'flow',
      id: 'draft',
      name: 'Draft',
      description: '',
      enabled: false,
      blocks: [
        { kind: 'start', id: 'draft-start', enabled: true },
        { kind: 'end', id: 'draft-end', enabled: true, outcome: 'done' },
      ],
      ruleTags: [],
    });
    expect(() => generate(config, BASE_TEMPLATES)).not.toThrow();
  });
});

describe('F-03 AC-031 (description part) the default pipeline has the six approved flow descriptions', () => {
  it('parses the default pipeline with six non-empty flow descriptions equal to the approved texts', () => {
    const result = parsePipelineConfig(rawDefault());
    if (!result.ok) throw new Error('expected the default pipeline to parse');
    const flows = result.config.pipeline.blocks.flatMap((block) => (block.kind === 'flow' ? [block] : []));
    expect(flows.map((flow) => [flow.id, flow.description])).toEqual(APPROVED);
    for (const flow of flows) expect(flow.description.trim()).not.toBe('');
  });
});
