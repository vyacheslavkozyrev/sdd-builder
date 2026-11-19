import { describe, expect, it } from 'vitest';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { checkIdsUnique } from '../../src/pipeline/check/ids.js';
import { readArguments } from '../../src/pipeline/parse/argument.js';
import { readPipeline } from '../../src/pipeline/parse/pipeline.js';
import { readRules } from '../../src/pipeline/parse/rules.js';
import type { Argument, Block, Flow, ProjectConfig, Rule } from '../../src/pipeline/model.js';

// The items of a fixture are numbered by position, as a parsed document numbers them (model `index`).
function numbered<T extends { readonly index: number }>(items: readonly T[]): T[] {
  return items.map((item, index) => ({ ...item, index }));
}

const arg = (id: string): Argument => ({ index: 0, id, required: true, hint: 'hint' });
const rule = (id: string): Rule => ({ index: 0, id, title: 'Title', text: 'Text' });

const start = (id: string): Block => ({ index: 0, id, kind: 'start', next: 'end' });
const end = (id: string): Block => ({ index: 0, id, kind: 'end', outcome: 'done', producedArtifact: 'Plan' });
const agent = (id: string, name: string, args: Argument[] = []): Block => ({
  index: 0,
  id,
  kind: 'agent',
  name,
  description: 'Agent',
  arguments: numbered(args),
  next: 'end',
});

function flow(id: string, blocks: Block[], args: Argument[] = []): Flow {
  return {
    index: 0,
    id,
    name: id,
    arguments: numbered(args),
    body: 'Body',
    artifacts: [],
    approval: false,
    blocks: numbered(blocks),
  };
}

interface Parts {
  rules?: Rule[];
  pipelineArgs?: Argument[];
  flows: Flow[];
}

function config(parts: Parts): Pick<ProjectConfig, 'rules' | 'pipeline'> {
  return {
    rules: numbered(parts.rules ?? []),
    pipeline: {
      name: 'Pipeline',
      description: 'Desc',
      arguments: numbered(parts.pipelineArgs ?? []),
      flows: numbered(parts.flows),
    },
  };
}

const CLEAN_FLOW = flow('plan', [start('start-plan'), end('end-plan')]);

describe('F-02 AC-018 two argument rows with the same id are refused at the second id', () => {
  it('refuses a repeated argument id across the pipeline and a flow, at the later row', () => {
    const result = checkIdsUnique(
      config({
        pipelineArgs: [arg('feature-id')],
        flows: [flow('plan', [start('s'), end('e')], [arg('feature-id')])],
      }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.arguments.0.id',
        message: 'must be unique: the id feature-id is already used at pipeline.arguments.0.id',
      },
    ]);
  });

  it('refuses a repeated argument id within an agent, at the second row', () => {
    const result = checkIdsUnique(
      config({
        flows: [flow('plan', [start('s'), agent('a', 'review', [arg('x'), arg('x')]), end('e')])],
      }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.blocks.1.arguments.1.id',
        message: 'must be unique: the id x is already used at pipeline.flows.0.blocks.1.arguments.0.id',
      },
    ]);
  });

  it('refuses an argument id that equals a flow id at the argument, and the flow id too', () => {
    const result = checkIdsUnique(config({ flows: [flow('plan', [start('s'), end('e')], [arg('plan')])] }));
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.id',
        message: 'must be unique: the id plan is also used at pipeline.flows.0.arguments.0.id',
      },
      {
        path: 'pipeline.flows.0.arguments.0.id',
        message: 'must be unique: the id plan is already used at pipeline.flows.0.id',
      },
    ]);
  });

  it('refuses an argument id that equals a block id at the argument, and the later block too', () => {
    const result = checkIdsUnique(config({ flows: [flow('plan', [start('shared'), end('e')], [arg('shared')])] }));
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.arguments.0.id',
        message: 'must be unique: the id shared is also used at pipeline.flows.0.blocks.0.id',
      },
      {
        path: 'pipeline.flows.0.blocks.0.id',
        message: 'must be unique: the id shared is already used at pipeline.flows.0.arguments.0.id',
      },
    ]);
  });

  it('refuses an argument id that equals a rule id at the argument, when the rule comes first', () => {
    const result = checkIdsUnique(config({ rules: [rule('style')], pipelineArgs: [arg('style')], flows: [CLEAN_FLOW] }));
    expect(result).toEqual([
      { path: 'pipeline.arguments.0.id', message: 'must be unique: the id style is already used at rules.0.id' },
    ]);
  });

  it('refuses a repeated argument id among the pipeline arguments, at the second row', () => {
    const result = checkIdsUnique(
      config({ pipelineArgs: [arg('feature-id'), arg('feature-id')], flows: [CLEAN_FLOW] }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.arguments.1.id',
        message: 'must be unique: the id feature-id is already used at pipeline.arguments.0.id',
      },
    ]);
  });

  it('accepts argument ids that are distinct from every other id', () => {
    expect(checkIdsUnique(config({ pipelineArgs: [arg('feature-id')], flows: [CLEAN_FLOW] }))).toEqual([]);
  });
});

describe('F-02 AC-026 two flows with the same id are refused at the second flow id', () => {
  it('refuses a repeated flow id at the second flow', () => {
    const result = checkIdsUnique(
      config({ flows: [flow('plan', [start('s1'), end('e1')]), flow('plan', [start('s2'), end('e2')])] }),
    );
    expect(result).toEqual([
      { path: 'pipeline.flows.1.id', message: 'must be unique: the id plan is already used at pipeline.flows.0.id' },
    ]);
  });

  it('refuses a flow id that equals a block id of another flow, at the flow id and at the block', () => {
    const result = checkIdsUnique(
      config({ flows: [flow('plan', [start('s'), end('e')]), flow('review', [start('plan'), end('e2')])] }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.id',
        message: 'must be unique: the id plan is also used at pipeline.flows.1.blocks.0.id',
      },
      {
        path: 'pipeline.flows.1.blocks.0.id',
        message: 'must be unique: the id plan is already used at pipeline.flows.0.id',
      },
    ]);
  });

  it('refuses a flow id that equals a rule id at the flow id', () => {
    const result = checkIdsUnique(config({ rules: [rule('plan')], flows: [CLEAN_FLOW] }));
    expect(result).toEqual([
      { path: 'pipeline.flows.0.id', message: 'must be unique: the id plan is already used at rules.0.id' },
    ]);
  });

  it('refuses a flow id that equals an argument id at the flow id and at the argument', () => {
    const result = checkIdsUnique(config({ pipelineArgs: [arg('plan')], flows: [CLEAN_FLOW] }));
    expect(result).toEqual([
      {
        path: 'pipeline.arguments.0.id',
        message: 'must be unique: the id plan is also used at pipeline.flows.0.id',
      },
      {
        path: 'pipeline.flows.0.id',
        message: 'must be unique: the id plan is already used at pipeline.arguments.0.id',
      },
    ]);
  });
});

describe('F-02 AC-043 a block id is unique across flow, block, argument and rule ids', () => {
  it('refuses a block id that repeats a block id in another flow, at the later block', () => {
    const result = checkIdsUnique(
      config({ flows: [flow('plan', [start('s'), end('e')]), flow('review', [start('s'), end('e2')])] }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.1.blocks.0.id',
        message: 'must be unique: the id s is already used at pipeline.flows.0.blocks.0.id',
      },
    ]);
  });

  it('refuses a repeated block id within one flow, at the second block', () => {
    const result = checkIdsUnique(config({ flows: [flow('plan', [start('s'), end('s')])] }));
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.blocks.1.id',
        message: 'must be unique: the id s is already used at pipeline.flows.0.blocks.0.id',
      },
    ]);
  });

  it('refuses a block id that equals its own flow id, at the flow and at the block', () => {
    const result = checkIdsUnique(config({ flows: [flow('plan', [start('plan'), end('e')])] }));
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.id',
        message: 'must be unique: the id plan is also used at pipeline.flows.0.blocks.0.id',
      },
      {
        path: 'pipeline.flows.0.blocks.0.id',
        message: 'must be unique: the id plan is already used at pipeline.flows.0.id',
      },
    ]);
  });

  it('refuses a block id that equals a rule id, at the later block', () => {
    const result = checkIdsUnique(config({ rules: [rule('style')], flows: [flow('plan', [start('style'), end('e')])] }));
    expect(result).toEqual([
      { path: 'pipeline.flows.0.blocks.0.id', message: 'must be unique: the id style is already used at rules.0.id' },
    ]);
  });

  it('refuses a block id that equals an argument id at the later block, and the argument too when it comes first', () => {
    const result = checkIdsUnique(config({ pipelineArgs: [arg('plan')], flows: [flow('plan-flow', [start('plan'), end('e')])] }));
    expect(result).toEqual([
      {
        path: 'pipeline.arguments.0.id',
        message: 'must be unique: the id plan is also used at pipeline.flows.0.blocks.0.id',
      },
      {
        path: 'pipeline.flows.0.blocks.0.id',
        message: 'must be unique: the id plan is already used at pipeline.arguments.0.id',
      },
    ]);
  });
});

describe('F-02 AC-048 agent names are unique in the pipeline, even across flows', () => {
  it('refuses a repeated agent name in another flow, at the second name', () => {
    const result = checkIdsUnique(
      config({
        flows: [
          flow('plan', [start('s1'), agent('a1', 'review'), end('e1')]),
          flow('build', [start('s2'), agent('a2', 'review'), end('e2')]),
        ],
      }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.1.blocks.1.name',
        message: 'must be unique: the agent name review is already used at pipeline.flows.0.blocks.1.name',
      },
    ]);
  });

  it('refuses a repeated agent name within one flow, at the second name', () => {
    const result = checkIdsUnique(
      config({ flows: [flow('plan', [start('s'), agent('a1', 'review'), agent('a2', 'review'), end('e')])] }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.blocks.2.name',
        message: 'must be unique: the agent name review is already used at pipeline.flows.0.blocks.1.name',
      },
    ]);
  });

  it('accepts agents with distinct names', () => {
    expect(
      checkIdsUnique(
        config({ flows: [flow('plan', [start('s'), agent('a1', 'review'), agent('a2', 'writer'), end('e')])] }),
      ),
    ).toEqual([]);
  });

  it('does not count an agent name as a block id', () => {
    expect(checkIdsUnique(config({ flows: [flow('plan', [start('s'), agent('a', 's'), end('e')])] }))).toEqual([]);
  });
});

describe('F-02 AC-068 a rule id is unique in the whole project', () => {
  it('refuses a repeated rule id at the later rule', () => {
    const result = checkIdsUnique(config({ rules: [rule('style'), rule('style')], flows: [CLEAN_FLOW] }));
    expect(result).toEqual([{ path: 'rules.1.id', message: 'must be unique: the id style is already used at rules.0.id' }]);
  });

  it('refuses a flow id that equals an earlier rule id, at the flow', () => {
    const result = checkIdsUnique(config({ rules: [rule('plan')], flows: [CLEAN_FLOW] }));
    expect(result.map((problem) => problem.path)).toEqual(['pipeline.flows.0.id']);
  });

  it('refuses a pipeline argument id that equals a rule id, at the argument, since rules come first', () => {
    const result = checkIdsUnique(
      config({ pipelineArgs: [arg('feature-id')], rules: [rule('feature-id')], flows: [CLEAN_FLOW] }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.arguments.0.id',
        message: 'must be unique: the id feature-id is already used at rules.0.id',
      },
    ]);
  });

  it('accepts distinct rule ids', () => {
    expect(checkIdsUnique(config({ rules: [rule('style'), rule('tests')], flows: [CLEAN_FLOW] }))).toEqual([]);
  });
});

describe('F-02 AC-019 AC-018 an id clash after a refused item is reported at the document index', () => {
  // A flow value as the document holds it; `suffix` keeps the block ids of two copies apart.
  const planFlow = (suffix: string) => ({
    id: 'plan',
    name: `Plan ${suffix}`,
    body: 'Body',
    arguments: [],
    artifacts: [],
    approval: false,
    blocks: [
      { id: `start-${suffix}`, kind: 'start', next: `end-${suffix}` },
      { id: `end-${suffix}`, kind: 'end', outcome: 'done', producedArtifact: 'Plan' },
    ],
  });

  it('refuses a rule id that clashes with a later rule, at the rule document index', () => {
    const problems = createProblemCollector();
    const rules = readRules(
      [
        { id: 'Bad Id', title: 'Title', text: 'Text' },
        { id: 'style', title: 'Title', text: 'Text' },
        { id: 'style', title: 'Title', text: 'Text' },
      ],
      'rules',
      problems,
    );
    expect(problems.list()).toHaveLength(1);
    expect(checkIdsUnique({ rules: rules ?? [], pipeline: config({ flows: [] }).pipeline })).toEqual([
      { path: 'rules.2.id', message: 'must be unique: the id style is already used at rules.1.id' },
    ]);
  });

  it('refuses a pipeline argument that clashes with a later argument, at the row document index', () => {
    const problems = createProblemCollector();
    const pipeline = readPipeline(
      {
        name: 'Pipeline',
        description: 'Desc',
        arguments: [
          { id: 'Bad Id', required: true, hint: 'hint' },
          { id: 'feature-id', required: true, hint: 'hint' },
          { id: 'feature-id', required: true, hint: 'hint' },
        ],
        flows: [planFlow('one')],
      },
      'pipeline',
      problems,
    );
    expect(problems.list()).toHaveLength(1);
    expect(checkIdsUnique({ rules: [], pipeline: pipeline ?? config({ flows: [] }).pipeline })).toEqual([
      {
        path: 'pipeline.arguments.2.id',
        message: 'must be unique: the id feature-id is already used at pipeline.arguments.1.id',
      },
    ]);
  });

  it('refuses a flow id that clashes with a later flow, at the flow document index', () => {
    const problems = createProblemCollector();
    const pipeline = readPipeline(
      {
        name: 'Pipeline',
        description: 'Desc',
        arguments: [],
        flows: [{ id: 'Bad Flow' }, planFlow('one'), planFlow('two')],
      },
      'pipeline',
      problems,
    );
    expect(problems.list().every((problem) => problem.path.startsWith('pipeline.flows.0'))).toBe(true);
    expect(checkIdsUnique({ rules: [], pipeline: pipeline ?? config({ flows: [] }).pipeline })).toEqual([
      { path: 'pipeline.flows.2.id', message: 'must be unique: the id plan is already used at pipeline.flows.1.id' },
    ]);
  });
});
