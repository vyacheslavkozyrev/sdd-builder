import { describe, expect, it } from 'vitest';
import { createProblems } from '../../src/pipeline/check/primitives.js';
import { parseFlow } from '../../src/pipeline/parse/flow.js';

const AT = 'flows[0]';
const BODY_CAP = 1000;

function run(value: unknown) {
  const problems = createProblems();
  const flow = parseFlow(value, AT, problems);
  return {
    flow,
    paths: problems.list.map((problem) => problem.path),
    messages: problems.list.map((problem) => problem.message),
  };
}

function startBlock(id = 'start'): Record<string, unknown> {
  return { id, kind: 'start' };
}

function endBlock(id = 'finish'): Record<string, unknown> {
  return { id, kind: 'end', outcome: 'done' };
}

function flow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'build',
    name: 'Build',
    description: 'Builds one task',
    arguments: 'the task id',
    blocks: [startBlock(), endBlock()],
    ...overrides,
  };
}

function approvalGate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { kind: 'approval', description: 'The user approves the plan', ...overrides };
}

function checkGate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { kind: 'check', description: 'The diff is small', type: 'checks', ...overrides };
}

function withGate(gate: Record<string, unknown>): Record<string, unknown> {
  return flow({ connectedTo: { to: 'review', label: 'next', gate } });
}

describe('F-02 AC-007 a flow needs id, name, description, arguments and blocks', () => {
  it('accepts a flow with every required key and keeps the blocks in array order', () => {
    const result = run(flow({ blocks: [startBlock('first'), startBlock('second'), endBlock('last')] }));
    expect(result.paths).toEqual([]);
    expect(result.flow?.blocks.map((block) => block.id)).toEqual(['first', 'second', 'last']);
    expect(result.flow?.name).toBe('Build');
    expect(result.flow?.description).toBe('Builds one task');
    expect(result.flow?.arguments).toBe('the task id');
  });

  it.each(['id', 'name', 'description', 'arguments', 'blocks'])('refuses a flow without %s, with its path', (key) => {
    const value = flow();
    delete value[key];
    const result = run(value);
    expect(result.flow).toBeUndefined();
    expect(result.paths).toEqual([`${AT}.${key}`]);
  });

  it('refuses a blank name and a blank description', () => {
    expect(run(flow({ name: '   ' })).paths).toEqual([`${AT}.name`]);
    expect(run(flow({ description: '' })).paths).toEqual([`${AT}.description`]);
  });

  it('refuses an id that is not an id, with its path', () => {
    expect(run(flow({ id: 'Build Flow' })).paths).toEqual([`${AT}.id`]);
  });

  it('refuses arguments that are not text', () => {
    expect(run(flow({ arguments: 3 })).paths).toEqual([`${AT}.arguments`]);
  });

  it('accepts empty arguments, as an agent does', () => {
    const result = run(flow({ arguments: '' }));
    expect(result.paths).toEqual([]);
    expect(result.flow?.arguments).toBe('');
  });

  it('refuses blocks that are not a list, with their path', () => {
    expect(run(flow({ blocks: 'start' })).paths).toEqual([`${AT}.blocks`]);
  });

  it('refuses a block that fails, at the path of that block', () => {
    const result = run(flow({ blocks: [startBlock(), { id: 'bad', kind: 'loop' }] }));
    expect(result.flow).toBeUndefined();
    expect(result.paths).toEqual([`${AT}.blocks[1].kind`]);
  });

  it('refuses a flow that is not an object', () => {
    expect(run('build').paths).toEqual([AT]);
  });
});

describe('F-02 AC-015 a flow with no blocks is accepted', () => {
  it('accepts an empty blocks array', () => {
    const result = run(flow({ blocks: [] }));
    expect(result.paths).toEqual([]);
    expect(result.flow?.blocks).toEqual([]);
  });
});

describe('F-02 AC-020 a flow without connectedTo is accepted', () => {
  it('accepts a flow with no connectedTo and leaves the link out', () => {
    const result = run(flow());
    expect(result.paths).toEqual([]);
    expect(result.flow?.connectedTo).toBeUndefined();
  });
});

describe('F-02 AC-016 a flow link is { to, label } with a non-blank label, as a block link is', () => {
  it('accepts a link with a to and a label and no gate', () => {
    const result = run(flow({ connectedTo: { to: 'review', label: 'next' } }));
    expect(result.paths).toEqual([]);
    expect(result.flow?.connectedTo).toEqual({ to: 'review', label: 'next' });
  });

  it('refuses a link without to, with its path', () => {
    expect(run(flow({ connectedTo: { label: 'next' } })).paths).toEqual([`${AT}.connectedTo.to`]);
  });

  it('refuses a link without a label or with a blank label, with its path', () => {
    expect(run(flow({ connectedTo: { to: 'review' } })).paths).toEqual([`${AT}.connectedTo.label`]);
    expect(run(flow({ connectedTo: { to: 'review', label: ' ' } })).paths).toEqual([`${AT}.connectedTo.label`]);
  });
});

describe('F-02 AC-017 a flow link gate is an approval or a check', () => {
  it('accepts an approval gate with a description', () => {
    const result = run(withGate(approvalGate()));
    expect(result.paths).toEqual([]);
    expect(result.flow?.connectedTo?.gate).toEqual({ kind: 'approval', description: 'The user approves the plan' });
  });

  it('refuses an approval gate without a description, with its path', () => {
    const gate = approvalGate();
    delete gate['description'];
    expect(run(withGate(gate)).paths).toEqual([`${AT}.connectedTo.gate.description`]);
  });

  it('accepts a checks gate with no threshold', () => {
    const result = run(withGate(checkGate()));
    expect(result.paths).toEqual([]);
    expect(result.flow?.connectedTo?.gate).toEqual({ kind: 'check', description: 'The diff is small', type: 'checks' });
  });

  it('accepts a diff size gate with a threshold', () => {
    const result = run(withGate(checkGate({ type: 'diff size', threshold: 400 })));
    expect(result.paths).toEqual([]);
    expect(result.flow?.connectedTo?.gate).toEqual({
      kind: 'check',
      description: 'The diff is small',
      type: 'diff size',
      threshold: 400,
    });
  });

  it('refuses a diff size gate without a threshold, at the threshold path', () => {
    expect(run(withGate(checkGate({ type: 'diff size' })))).toMatchObject({
      flow: undefined,
      paths: [`${AT}.connectedTo.gate.threshold`],
    });
  });

  it('refuses a threshold on a checks gate', () => {
    expect(run(withGate(checkGate({ type: 'checks', threshold: 5 }))).paths).toEqual([
      `${AT}.connectedTo.gate.threshold`,
    ]);
  });

  it('refuses a check gate without a description or a type, with their paths', () => {
    const noDescription = checkGate();
    delete noDescription['description'];
    expect(run(withGate(noDescription)).paths).toEqual([`${AT}.connectedTo.gate.description`]);

    const noType = checkGate();
    delete noType['type'];
    expect(run(withGate(noType)).paths).toEqual([`${AT}.connectedTo.gate.type`]);
  });

  it('refuses a gate of any other kind, at the kind path', () => {
    const result = run(withGate({ kind: 'manual', description: 'Someone looks at it' }));
    expect(result.flow).toBeUndefined();
    expect(result.paths).toEqual([`${AT}.connectedTo.gate.kind`]);
  });

  it('refuses a threshold that is not a positive whole number', () => {
    expect(run(withGate(checkGate({ type: 'diff size', threshold: 0 }))).paths).toEqual([
      `${AT}.connectedTo.gate.threshold`,
    ]);
  });
});

describe('F-02 AC-024 a flow body is at most 1,000 code points', () => {
  it('accepts a body of exactly 1,000 code points', () => {
    const body = 'a'.repeat(BODY_CAP);
    const result = run(flow({ body }));
    expect(result.paths).toEqual([]);
    expect(result.flow?.body).toBe(body);
  });

  it('accepts 1,000 emoji, which is 2,000 UTF-16 units', () => {
    const body = '😀'.repeat(BODY_CAP);
    const result = run(flow({ body }));
    expect(result.paths).toEqual([]);
    expect(result.flow?.body).toBe(body);
  });

  it('refuses a body of 1,001 code points, with its path', () => {
    expect(run(flow({ body: 'a'.repeat(BODY_CAP + 1) })).paths).toEqual([`${AT}.body`]);
  });

  it('refuses a body of 1,001 emoji, with its path', () => {
    expect(run(flow({ body: '😀'.repeat(BODY_CAP + 1) })).paths).toEqual([`${AT}.body`]);
  });

  it('refuses a body that is not text', () => {
    expect(run(flow({ body: 12 })).paths).toEqual([`${AT}.body`]);
  });

  it('accepts a flow with no body', () => {
    expect(run(flow()).flow?.body).toBeUndefined();
  });
});

describe('F-02 AC-025 flow ruleTags refuse a blank entry and a duplicate, each with its path', () => {
  it('accepts a list of rule ids', () => {
    const result = run(flow({ ruleTags: ['git', 'tests'] }));
    expect(result.paths).toEqual([]);
    expect(result.flow?.ruleTags).toEqual(['git', 'tests']);
  });

  it('refuses a blank entry at the path of the entry', () => {
    expect(run(flow({ ruleTags: ['git', ' '] })).paths).toEqual([`${AT}.ruleTags[1]`]);
  });

  it('refuses a duplicate entry at the path of the second occurrence', () => {
    expect(run(flow({ ruleTags: ['git', 'git'] })).paths).toEqual([`${AT}.ruleTags[1]`]);
  });

  it('refuses an entry that is not an id', () => {
    expect(run(flow({ ruleTags: ['Git Rules'] })).paths).toEqual([`${AT}.ruleTags[0]`]);
  });
});

describe('F-02 AC-026 a flow model is haiku, sonnet, opus or inherit', () => {
  it.each(['haiku', 'sonnet', 'opus', 'inherit'])('accepts %s', (model) => {
    const result = run(flow({ model }));
    expect(result.paths).toEqual([]);
    expect(result.flow?.model).toBe(model);
  });

  it('refuses any other model, with its path', () => {
    expect(run(flow({ model: 'gpt' })).paths).toEqual([`${AT}.model`]);
  });
});

describe('F-02 AC-004 an unknown key is refused at the flow, link and gate levels', () => {
  it('refuses an unknown key on the flow, with its path', () => {
    const result = run(flow({ colour: 'blue' }));
    expect(result.flow).toBeUndefined();
    expect(result.paths).toEqual([`${AT}.colour`]);
    expect(result.messages).toEqual(['unknown key']);
  });

  it('refuses an unknown key on the link, with its path', () => {
    expect(run(flow({ connectedTo: { to: 'review', label: 'next', weight: 1 } })).paths).toEqual([
      `${AT}.connectedTo.weight`,
    ]);
  });

  it('refuses an unknown key on an approval gate, with its path', () => {
    expect(run(withGate(approvalGate({ threshold: 3 }))).paths).toEqual([`${AT}.connectedTo.gate.threshold`]);
  });

  it('refuses an unknown key on a checks gate, with its path', () => {
    expect(run(withGate(checkGate({ owner: 'me' }))).paths).toEqual([`${AT}.connectedTo.gate.owner`]);
  });
});
