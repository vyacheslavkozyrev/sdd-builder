import { describe, expect, it } from 'vitest';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import { readPipeline } from '../../src/pipeline/parse/pipeline.js';

const PIPELINE = 'pipeline';
const validFlow = {
  id: 'fc358416-c66a-5fef-9c5e-a282b75cbd92',
  name: 'Plan',
  body: 'Plans the work.',
  arguments: [],
  artifacts: [],
  approval: false,
  blocks: [
    { id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' },
    { id: '128fea8a-2e63-5352-bd64-02ceddc0d0cb', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
  ],
};
const validPipeline = {
  name: 'SDD',
  description: 'A spec-driven process.',
  arguments: [],
  flows: [validFlow],
};

function readP(value: unknown, path = PIPELINE) {
  const problems = createProblemCollector();
  const pipeline = readPipeline(value, path, problems);
  return { pipeline, problems: problems.list() };
}

function refusedAt(value: unknown, path: string, message: string | RegExp) {
  const result = readP(value);
  expect(result.pipeline).toBeUndefined();
  const expected = typeof message === 'string' ? message : expect.stringMatching(message);
  expect(result.problems).toContainEqual({ path, message: expected });
}

describe('F-02 AC-011 a pipeline requires name, description, arguments and flows', () => {
  it('accepts a pipeline with every required key and no optional key', () => {
    expect(readP(validPipeline)).toEqual({
      pipeline: {
        name: 'SDD',
        description: 'A spec-driven process.',
        arguments: [],
        flows: [
          {
            index: 0,
            id: 'fc358416-c66a-5fef-9c5e-a282b75cbd92',
            name: 'Plan',
            body: 'Plans the work.',
            arguments: [],
            artifacts: [],
            approval: false,
            blocks: [
              { index: 0, id: 'f05559a1-554d-5c78-a9a6-bb9ce0bfc551', kind: 'start', next: '128fea8a-2e63-5352-bd64-02ceddc0d0cb' },
              { index: 1, id: '128fea8a-2e63-5352-bd64-02ceddc0d0cb', kind: 'end', outcome: 'done', producedArtifact: 'plan.md' },
            ],
          },
        ],
      },
      problems: [],
    });
  });

  it.each(['name', 'description', 'arguments', 'flows'])(
    'refuses a pipeline missing %s at the path of the pipeline',
    (key) => {
      const value: Record<string, unknown> = { ...validPipeline };
      delete value[key];
      refusedAt(value, PIPELINE, `is missing the key ${key}`);
    },
  );

  it('accepts the optional keys model, tools, ruleTags and body when they are absent or present', () => {
    const withOptional = { ...validPipeline, model: 'sonnet', tools: ['Read'], ruleTags: ['8f99cc27-78ab-5895-8637-5c13d7429593'], body: 'Body.' };
    expect(readP(withOptional).problems).toEqual([]);
    expect(readP(validPipeline).problems).toEqual([]);
  });

  it('refuses a key the pipeline does not declare, at the path of that key', () => {
    refusedAt({ ...validPipeline, extra: 1 }, 'pipeline.extra', 'has an unknown key extra');
  });

  it('refuses a pipeline that is not an object, at the pipeline path', () => {
    refusedAt([], PIPELINE, /must be an object/);
  });
});

describe('F-02 AC-012 the pipeline name is 1 to 100 code points and not blank', () => {
  it.each([
    ['one character', 'S'],
    ['100 code points', 'a'.repeat(100)],
    ['an emoji counted as one', '😀'.repeat(100)],
  ])('accepts a name of %s', (_label, name) => {
    expect(readP({ ...validPipeline, name }).pipeline?.name).toBe(name);
  });

  it.each([
    ['the empty string', ''],
    ['spaces only', '   '],
  ])('refuses a name of %s at pipeline.name', (_label, name) => {
    refusedAt({ ...validPipeline, name }, 'pipeline.name', 'must not be blank');
  });

  it('refuses a name of 101 code points at pipeline.name', () => {
    refusedAt({ ...validPipeline, name: 'a'.repeat(101) }, 'pipeline.name', 'must be at most 100 characters');
  });
});

describe('F-02 AC-013 flows is a list kept in its order; a flows value that is not a list is refused', () => {
  it('keeps the flows in the order of the list', () => {
    const second = { ...validFlow, id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6', name: 'Build' };
    const result = readP({ ...validPipeline, flows: [validFlow, second] });
    expect(result.pipeline?.flows.map((flow) => flow.id)).toEqual(['fc358416-c66a-5fef-9c5e-a282b75cbd92', 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6']);
    expect(result.problems).toEqual([]);
  });

  it.each([
    ['an object', { id: 'fc358416-c66a-5fef-9c5e-a282b75cbd92' }],
    ['text', 'plan'],
    ['a number', 3],
  ])('refuses flows that is %s at pipeline.flows', (_label, flows) => {
    refusedAt({ ...validPipeline, flows }, 'pipeline.flows', /must be a list/);
  });

  it('leaves out an invalid flow, names it by its index, and keeps the others in order', () => {
    const broken = { ...validFlow, id: '3f683e0b-8991-5797-a2d0-8b3f497f37c8', approval: 'yes' };
    const second = { ...validFlow, id: 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6', name: 'Build' };
    const result = readP({ ...validPipeline, flows: [validFlow, broken, second] });
    expect(result.pipeline?.flows.map((flow) => flow.id)).toEqual(['fc358416-c66a-5fef-9c5e-a282b75cbd92', 'ea365500-e6ec-5064-90ea-fb6cc4bb49d6']);
    expect(result.problems).toEqual([
      { path: 'pipeline.flows.1.approval', message: expect.stringContaining('true or false') },
    ]);
  });

  it('refuses the pipeline when every flow is invalid, keeping the problem of each flow', () => {
    const broken = { ...validFlow, approval: 'yes' };
    const result = readP({ ...validPipeline, flows: [broken] });
    expect(result.pipeline).toBeUndefined();
    expect(result.problems).toEqual([
      { path: 'pipeline.flows.0.approval', message: expect.stringContaining('true or false') },
    ]);
  });
});

describe('F-02 AC-014 the pipeline description is up to 1,000 code points and required', () => {
  it('accepts a description of 1,000 code points', () => {
    expect(readP({ ...validPipeline, description: 'a'.repeat(1000) }).problems).toEqual([]);
  });

  it('refuses a description of 1,001 code points at pipeline.description', () => {
    const description = 'a'.repeat(1001);
    refusedAt({ ...validPipeline, description }, 'pipeline.description', 'must be at most 1000 characters');
  });

  it('refuses a description that is not text, at pipeline.description', () => {
    refusedAt({ ...validPipeline, description: 7 }, 'pipeline.description', 'must be text, got a number');
  });
});

describe('F-02 AC-086 a pipeline with zero flows is refused at pipeline.flows', () => {
  it('refuses flows: [] with a problem at pipeline.flows and returns no pipeline', () => {
    const result = readP({ ...validPipeline, flows: [] });
    expect(result.pipeline).toBeUndefined();
    expect(result.problems).toEqual([{ path: 'pipeline.flows', message: 'must hold at least one flow, got 0' }]);
  });
});

describe('F-02 AC-019 the pipeline argument rows follow the argument rules and name their list', () => {
  it('reports an argument id that is not file-safe at pipeline.arguments.0.id', () => {
    const value = { ...validPipeline, arguments: [{ id: 'Style Rule', required: true, hint: 'h' }] };
    expect(readP(value).problems).toEqual([
      { path: 'pipeline.arguments.0.id', message: expect.stringContaining('must be a GUID') },
    ]);
  });

  it('reports a row with an unknown key at the path of the row, as the flow arguments do', () => {
    const value = { ...validPipeline, arguments: [{ id: 'ccc656eb-7dbe-5012-9af8-c2559c43ae31', required: true, hint: 'h', extra: 1 }] };
    expect(readP(value).problems).toEqual([
      { path: 'pipeline.arguments.0', message: 'has an unknown key extra' },
    ]);
  });
});

describe('F-02 AC-030 the pipeline model is haiku, sonnet, opus or inherit', () => {
  it.each(['haiku', 'sonnet', 'opus', 'inherit'])('accepts model %s', (model) => {
    expect(readP({ ...validPipeline, model }).problems).toEqual([]);
  });

  it.each(['Haiku', 'gpt', 7])('refuses model %j at pipeline.model', (model) => {
    refusedAt({ ...validPipeline, model }, 'pipeline.model', /must be one of haiku, sonnet, opus, inherit/);
  });
});

describe('F-02 AC-071 a pipeline rule tag must be a GUID', () => {
  it('refuses "Style Rule" at pipeline.ruleTags.0', () => {
    const result = readP({ ...validPipeline, ruleTags: ['Style Rule'] });
    expect(result.problems).toEqual([
      { path: 'pipeline.ruleTags.0', message: expect.stringContaining('must be a GUID') },
    ]);
  });
});

describe('F-02 AC-072 a rule tag listed twice on the pipeline is refused at the second entry', () => {
  it('refuses a repeated tag at pipeline.ruleTags.1', () => {
    const result = readP({ ...validPipeline, ruleTags: ['8f99cc27-78ab-5895-8637-5c13d7429593', '8f99cc27-78ab-5895-8637-5c13d7429593'] });
    expect(result.problems).toEqual([
      { path: 'pipeline.ruleTags.1', message: 'repeats 8f99cc27-78ab-5895-8637-5c13d7429593; each entry must be listed once' },
    ]);
  });
});
