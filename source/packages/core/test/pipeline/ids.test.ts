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

const start = (id: string): Block => ({ index: 0, id, kind: 'start', next: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' });
const end = (id: string): Block => ({ index: 0, id, kind: 'end', outcome: 'done', producedArtifact: 'Plan' });
const agent = (id: string, name: string, args: Argument[] = []): Block => ({
  index: 0,
  id,
  kind: 'agent',
  name,
  description: 'Agent',
  arguments: numbered(args),
  next: '128fea8a-2e63-5352-bd64-02ceddc0d0cb',
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

const CLEAN_FLOW = flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('73782ea8-9285-5f90-9ce1-9c0fdded05f7'), end('2526f1f7-c804-552b-85a8-73ee26d7296d')]);

describe('F-02 AC-018 two argument rows with the same id are refused at the second id', () => {
  it('refuses a repeated argument id across the pipeline and a flow, at the later row', () => {
    const result = checkIdsUnique(
      config({
        pipelineArgs: [arg('a56aab15-5743-5847-9b77-b39b2124c91b')],
        flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')], [arg('a56aab15-5743-5847-9b77-b39b2124c91b')])],
      }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.arguments.0.id',
        message: 'must be unique: the id a56aab15-5743-5847-9b77-b39b2124c91b is already used at pipeline.arguments.0.id',
      },
    ]);
  });

  it('refuses a repeated argument id within an agent, at the second row', () => {
    const result = checkIdsUnique(
      config({
        flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 'review', [arg('6633b48d-142d-5c58-ad53-040e786cb000'), arg('6633b48d-142d-5c58-ad53-040e786cb000')]), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')])],
      }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.blocks.1.arguments.1.id',
        message: 'must be unique: the id 6633b48d-142d-5c58-ad53-040e786cb000 is already used at pipeline.flows.0.blocks.1.arguments.0.id',
      },
    ]);
  });

  it('refuses an argument id that equals a flow id at the argument, and the flow id too', () => {
    const result = checkIdsUnique(config({ flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')], [arg('fc358416-c66a-5fef-9c5e-a282b75cbd92')])] }));
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.id',
        message: 'must be unique: the id fc358416-c66a-5fef-9c5e-a282b75cbd92 is also used at pipeline.flows.0.arguments.0.id',
      },
      {
        path: 'pipeline.flows.0.arguments.0.id',
        message: 'must be unique: the id fc358416-c66a-5fef-9c5e-a282b75cbd92 is already used at pipeline.flows.0.id',
      },
    ]);
  });

  it('refuses an argument id that equals a block id at the argument, and the later block too', () => {
    const result = checkIdsUnique(config({ flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('0fd9ca33-4043-5e24-a68e-49123c871d97'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')], [arg('0fd9ca33-4043-5e24-a68e-49123c871d97')])] }));
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.arguments.0.id',
        message: 'must be unique: the id 0fd9ca33-4043-5e24-a68e-49123c871d97 is also used at pipeline.flows.0.blocks.0.id',
      },
      {
        path: 'pipeline.flows.0.blocks.0.id',
        message: 'must be unique: the id 0fd9ca33-4043-5e24-a68e-49123c871d97 is already used at pipeline.flows.0.arguments.0.id',
      },
    ]);
  });

  it('refuses an argument id that equals a rule id at the argument, when the rule comes first', () => {
    const result = checkIdsUnique(config({ rules: [rule('8f99cc27-78ab-5895-8637-5c13d7429593')], pipelineArgs: [arg('8f99cc27-78ab-5895-8637-5c13d7429593')], flows: [CLEAN_FLOW] }));
    expect(result).toEqual([
      { path: 'pipeline.arguments.0.id', message: 'must be unique: the id 8f99cc27-78ab-5895-8637-5c13d7429593 is already used at rules.0.id' },
    ]);
  });

  it('refuses a repeated argument id among the pipeline arguments, at the second row', () => {
    const result = checkIdsUnique(
      config({ pipelineArgs: [arg('a56aab15-5743-5847-9b77-b39b2124c91b'), arg('a56aab15-5743-5847-9b77-b39b2124c91b')], flows: [CLEAN_FLOW] }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.arguments.1.id',
        message: 'must be unique: the id a56aab15-5743-5847-9b77-b39b2124c91b is already used at pipeline.arguments.0.id',
      },
    ]);
  });

  it('accepts argument ids that are distinct from every other id', () => {
    expect(checkIdsUnique(config({ pipelineArgs: [arg('a56aab15-5743-5847-9b77-b39b2124c91b')], flows: [CLEAN_FLOW] }))).toEqual([]);
  });
});

describe('F-02 AC-026 two flows with the same id are refused at the second flow id', () => {
  it('refuses a repeated flow id at the second flow', () => {
    const result = checkIdsUnique(
      config({ flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('873e085a-05b2-54fa-9b5c-8eb5270d1a0a'), end('81507eed-dfae-5861-97e9-51a06ad86378')]), flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('57bc00b7-057c-5a30-9b7f-720507f075a7'), end('209887a4-405a-54db-9cb0-96e58323b4e1')])] }),
    );
    expect(result).toEqual([
      { path: 'pipeline.flows.1.id', message: 'must be unique: the id fc358416-c66a-5fef-9c5e-a282b75cbd92 is already used at pipeline.flows.0.id' },
    ]);
  });

  it('refuses a flow id that equals a block id of another flow, at the flow id and at the block', () => {
    const result = checkIdsUnique(
      config({ flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')]), flow('82c969a4-365a-5525-8168-6ae1093b1867', [start('fc358416-c66a-5fef-9c5e-a282b75cbd92'), end('209887a4-405a-54db-9cb0-96e58323b4e1')])] }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.id',
        message: 'must be unique: the id fc358416-c66a-5fef-9c5e-a282b75cbd92 is also used at pipeline.flows.1.blocks.0.id',
      },
      {
        path: 'pipeline.flows.1.blocks.0.id',
        message: 'must be unique: the id fc358416-c66a-5fef-9c5e-a282b75cbd92 is already used at pipeline.flows.0.id',
      },
    ]);
  });

  it('refuses a flow id that equals a rule id at the flow id', () => {
    const result = checkIdsUnique(config({ rules: [rule('fc358416-c66a-5fef-9c5e-a282b75cbd92')], flows: [CLEAN_FLOW] }));
    expect(result).toEqual([
      { path: 'pipeline.flows.0.id', message: 'must be unique: the id fc358416-c66a-5fef-9c5e-a282b75cbd92 is already used at rules.0.id' },
    ]);
  });

  it('refuses a flow id that equals an argument id at the flow id and at the argument', () => {
    const result = checkIdsUnique(config({ pipelineArgs: [arg('fc358416-c66a-5fef-9c5e-a282b75cbd92')], flows: [CLEAN_FLOW] }));
    expect(result).toEqual([
      {
        path: 'pipeline.arguments.0.id',
        message: 'must be unique: the id fc358416-c66a-5fef-9c5e-a282b75cbd92 is also used at pipeline.flows.0.id',
      },
      {
        path: 'pipeline.flows.0.id',
        message: 'must be unique: the id fc358416-c66a-5fef-9c5e-a282b75cbd92 is already used at pipeline.arguments.0.id',
      },
    ]);
  });
});

describe('F-02 AC-043 a block id is unique across flow, block, argument and rule ids', () => {
  it('refuses a block id that repeats a block id in another flow, at the later block', () => {
    const result = checkIdsUnique(
      config({ flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')]), flow('82c969a4-365a-5525-8168-6ae1093b1867', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808'), end('209887a4-405a-54db-9cb0-96e58323b4e1')])] }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.1.blocks.0.id',
        message: 'must be unique: the id aaa4a9fb-6e34-59bf-ab3d-968d23868808 is already used at pipeline.flows.0.blocks.0.id',
      },
    ]);
  });

  it('refuses a repeated block id within one flow, at the second block', () => {
    const result = checkIdsUnique(config({ flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808'), end('aaa4a9fb-6e34-59bf-ab3d-968d23868808')])] }));
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.blocks.1.id',
        message: 'must be unique: the id aaa4a9fb-6e34-59bf-ab3d-968d23868808 is already used at pipeline.flows.0.blocks.0.id',
      },
    ]);
  });

  it('refuses a block id that equals its own flow id, at the flow and at the block', () => {
    const result = checkIdsUnique(config({ flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('fc358416-c66a-5fef-9c5e-a282b75cbd92'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')])] }));
    expect(result).toEqual([
      {
        path: 'pipeline.flows.0.id',
        message: 'must be unique: the id fc358416-c66a-5fef-9c5e-a282b75cbd92 is also used at pipeline.flows.0.blocks.0.id',
      },
      {
        path: 'pipeline.flows.0.blocks.0.id',
        message: 'must be unique: the id fc358416-c66a-5fef-9c5e-a282b75cbd92 is already used at pipeline.flows.0.id',
      },
    ]);
  });

  it('refuses a block id that equals a rule id, at the later block', () => {
    const result = checkIdsUnique(config({ rules: [rule('8f99cc27-78ab-5895-8637-5c13d7429593')], flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('8f99cc27-78ab-5895-8637-5c13d7429593'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')])] }));
    expect(result).toEqual([
      { path: 'pipeline.flows.0.blocks.0.id', message: 'must be unique: the id 8f99cc27-78ab-5895-8637-5c13d7429593 is already used at rules.0.id' },
    ]);
  });

  it('refuses a block id that equals an argument id at the later block, and the argument too when it comes first', () => {
    const result = checkIdsUnique(config({ pipelineArgs: [arg('fc358416-c66a-5fef-9c5e-a282b75cbd92')], flows: [flow('67167b70-4fb3-5bc8-9f42-a265527fa4e4', [start('fc358416-c66a-5fef-9c5e-a282b75cbd92'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')])] }));
    expect(result).toEqual([
      {
        path: 'pipeline.arguments.0.id',
        message: 'must be unique: the id fc358416-c66a-5fef-9c5e-a282b75cbd92 is also used at pipeline.flows.0.blocks.0.id',
      },
      {
        path: 'pipeline.flows.0.blocks.0.id',
        message: 'must be unique: the id fc358416-c66a-5fef-9c5e-a282b75cbd92 is already used at pipeline.arguments.0.id',
      },
    ]);
  });
});

describe('F-02 AC-048 agent names are unique in the pipeline, even across flows', () => {
  it('refuses a repeated agent name in another flow, at the second name', () => {
    const result = checkIdsUnique(
      config({
        flows: [
          flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('873e085a-05b2-54fa-9b5c-8eb5270d1a0a'), agent('1b115b3d-5f20-5511-ac31-56c01fdc0b43', 'review'), end('81507eed-dfae-5861-97e9-51a06ad86378')]),
          flow('ea365500-e6ec-5064-90ea-fb6cc4bb49d6', [start('57bc00b7-057c-5a30-9b7f-720507f075a7'), agent('01855405-21ee-5fcb-a8cc-c0e47eb2901d', 'review'), end('209887a4-405a-54db-9cb0-96e58323b4e1')]),
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
      config({ flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808'), agent('1b115b3d-5f20-5511-ac31-56c01fdc0b43', 'review'), agent('01855405-21ee-5fcb-a8cc-c0e47eb2901d', 'review'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')])] }),
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
        config({ flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808'), agent('1b115b3d-5f20-5511-ac31-56c01fdc0b43', 'review'), agent('01855405-21ee-5fcb-a8cc-c0e47eb2901d', 'writer'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')])] }),
      ),
    ).toEqual([]);
  });

  it('does not count an agent name as a block id', () => {
    expect(checkIdsUnique(config({ flows: [flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808'), agent('fdac7165-b540-5201-bca7-029a056ea40e', 's'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')])] }))).toEqual([]);
  });
});

describe('F-02 AC-068 a rule id is unique in the whole project', () => {
  it('refuses a repeated rule id at the later rule', () => {
    const result = checkIdsUnique(config({ rules: [rule('8f99cc27-78ab-5895-8637-5c13d7429593'), rule('8f99cc27-78ab-5895-8637-5c13d7429593')], flows: [CLEAN_FLOW] }));
    expect(result).toEqual([{ path: 'rules.1.id', message: 'must be unique: the id 8f99cc27-78ab-5895-8637-5c13d7429593 is already used at rules.0.id' }]);
  });

  it('refuses a flow id that equals an earlier rule id, at the flow', () => {
    const result = checkIdsUnique(config({ rules: [rule('fc358416-c66a-5fef-9c5e-a282b75cbd92')], flows: [CLEAN_FLOW] }));
    expect(result.map((problem) => problem.path)).toEqual(['pipeline.flows.0.id']);
  });

  it('refuses a pipeline argument id that equals a rule id, at the argument, since rules come first', () => {
    const result = checkIdsUnique(
      config({ pipelineArgs: [arg('a56aab15-5743-5847-9b77-b39b2124c91b')], rules: [rule('a56aab15-5743-5847-9b77-b39b2124c91b')], flows: [CLEAN_FLOW] }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.arguments.0.id',
        message: 'must be unique: the id a56aab15-5743-5847-9b77-b39b2124c91b is already used at rules.0.id',
      },
    ]);
  });

  it('accepts distinct rule ids', () => {
    expect(checkIdsUnique(config({ rules: [rule('8f99cc27-78ab-5895-8637-5c13d7429593'), rule('e345b9a9-48a4-5f13-a7a8-34a0f6722b08')], flows: [CLEAN_FLOW] }))).toEqual([]);
  });
});

describe('F-02 AC-019 AC-018 an id clash after a refused item is reported at the document index', () => {
  // A flow value as the document holds it; the block ids of the two copies are GUIDs kept apart.
  const BLOCK_IDS = {
    one: { start: '77db7469-b614-5fee-a6fd-559322f9942e', end: '2f7e0001-79af-57ca-9203-3b407af3c4bb' },
    two: { start: '5097d2c3-2eac-5746-883c-f64a0ed6a0a0', end: '2df50955-4965-5268-a0eb-3bdbacc790cc' },
  } as const;
  const planFlow = (suffix: keyof typeof BLOCK_IDS) => {
    const { start: startId, end: endId } = BLOCK_IDS[suffix];
    return {
      id: 'fc358416-c66a-5fef-9c5e-a282b75cbd92',
      name: `Plan ${suffix}`,
      body: 'Body',
      arguments: [],
      artifacts: [],
      approval: false,
      blocks: [
        { id: startId, kind: 'start', next: endId },
        { id: endId, kind: 'end', outcome: 'done', producedArtifact: 'Plan' },
      ],
    };
  };

  it('refuses a rule id that clashes with a later rule, at the rule document index', () => {
    const problems = createProblemCollector();
    const rules = readRules(
      [
        { id: 'Bad Id', title: 'Title', text: 'Text' },
        { id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Title', text: 'Text' },
        { id: '8f99cc27-78ab-5895-8637-5c13d7429593', title: 'Title', text: 'Text' },
      ],
      'rules',
      problems,
    );
    expect(problems.list()).toHaveLength(1);
    expect(checkIdsUnique({ rules: rules ?? [], pipeline: config({ flows: [] }).pipeline })).toEqual([
      { path: 'rules.2.id', message: 'must be unique: the id 8f99cc27-78ab-5895-8637-5c13d7429593 is already used at rules.1.id' },
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
          { id: 'a56aab15-5743-5847-9b77-b39b2124c91b', required: true, hint: 'hint' },
          { id: 'a56aab15-5743-5847-9b77-b39b2124c91b', required: true, hint: 'hint' },
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
        message: 'must be unique: the id a56aab15-5743-5847-9b77-b39b2124c91b is already used at pipeline.arguments.1.id',
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
      { path: 'pipeline.flows.2.id', message: 'must be unique: the id fc358416-c66a-5fef-9c5e-a282b75cbd92 is already used at pipeline.flows.1.id' },
    ]);
  });
});

describe('F-16 AC-028 every id is a GUID, and a GUID id is unique in the pipeline', () => {
  it('F-16 AC-028 refuses a GUID block id that repeats in a later flow, at the later block', () => {
    const result = checkIdsUnique(
      config({
        flows: [
          flow('fc358416-c66a-5fef-9c5e-a282b75cbd92', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808'), end('c6aa4797-99c3-5de1-a1c5-ff4762474687')]),
          flow('82c969a4-365a-5525-8168-6ae1093b1867', [start('aaa4a9fb-6e34-59bf-ab3d-968d23868808'), end('9ed0bdfe-f040-5934-9233-bdec297f9995')]),
        ],
      }),
    );
    expect(result).toEqual([
      {
        path: 'pipeline.flows.1.blocks.0.id',
        message: 'must be unique: the id aaa4a9fb-6e34-59bf-ab3d-968d23868808 is already used at pipeline.flows.0.blocks.0.id',
      },
    ]);
  });
});
