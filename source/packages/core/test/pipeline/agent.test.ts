import { describe, expect, it } from 'vitest';
import { createProblemCollector } from '../../src/pipeline/check/primitives.js';
import type { AgentBlock } from '../../src/pipeline/model.js';
import { readAgent } from '../../src/pipeline/parse/agent.js';

const AGENT = 'pipeline.flows.0.blocks.1';
const validAgent = {
  id: 'review',
  kind: 'agent',
  name: 'review',
  description: 'Reviews the plan.',
  arguments: [],
  next: 'done',
};
const validRow = { id: 'feature-id', required: true, hint: 'F-XX' };

function readA(value: unknown, path = AGENT, index = 1) {
  const problems = createProblemCollector();
  const block = readAgent(value, path, problems, index);
  return { block, problems: problems.list() };
}

function refusedAt(value: unknown, path: string) {
  const result = readA(value);
  expect(result.block).toBeUndefined();
  expect(result.problems).toEqual([{ path, message: expect.any(String) }]);
}

// A refused list item is left out; the rest of the agent is kept, so only the problem is checked.
function itemProblemAt(value: unknown, path: string) {
  const result = readA(value);
  expect(result.problems).toEqual([{ path, message: expect.any(String) }]);
}

function acceptedWith(extra: Record<string, unknown>): AgentBlock {
  const result = readA({ ...validAgent, ...extra });
  expect(result.problems).toEqual([]);
  if (result.block === undefined) throw new Error('the agent was refused');
  return result.block;
}

describe('F-02 AC-047 an agent requires id, kind, name, description, arguments and next', () => {
  it('accepts an agent with exactly the required keys', () => {
    expect(readA(validAgent)).toEqual({
      block: {
        index: 1,
        id: 'review',
        kind: 'agent',
        name: 'review',
        description: 'Reviews the plan.',
        arguments: [],
        next: 'done',
      },
      problems: [],
    });
  });

  it.each(['id', 'kind', 'name', 'description', 'arguments', 'next'])(
    'refuses an agent missing %s with the path of the agent',
    (key) => {
      const value: Record<string, unknown> = { ...validAgent };
      delete value[key];
      expect(readA(value)).toEqual({
        block: undefined,
        problems: [{ path: AGENT, message: `is missing the key ${key}` }],
      });
    },
  );

  it('refuses an agent with an unknown key at the path of that key', () => {
    expect(readA({ ...validAgent, extra: 1 })).toEqual({
      block: undefined,
      problems: [{ path: `${AGENT}.extra`, message: 'has an unknown key extra' }],
    });
  });

  it('refuses an agent whose kind is not agent', () => {
    expect(readA({ ...validAgent, kind: 'start' })).toEqual({
      block: undefined,
      problems: [{ path: `${AGENT}.kind`, message: 'must be agent, got text' }],
    });
  });

  it.each([[null], [[]], ['agent'], [3], [undefined]])('refuses the value %j, which is not an object, at the block path', (value) => {
    refusedAt(value, AGENT);
  });
});

describe('F-02 AC-048 an agent name follows the id rule', () => {
  it('accepts review as a name', () => {
    expect(readA(validAgent).block?.name).toBe('review');
  });

  it.each(['Review Agent', 'review_agent', ''])('refuses the name %j at the path of name', (name) => {
    refusedAt({ ...validAgent, name }, `${AGENT}.name`);
  });
});

describe('F-02 AC-049 an agent description is non-blank text of at most 1,000 code points', () => {
  it('accepts a description of exactly 1,000 code points', () => {
    expect(acceptedWith({ description: 'x'.repeat(1000) }).description).toHaveLength(1000);
  });

  it.each([[''], ['   '], ['x'.repeat(1001)]])('refuses the description %j at the path of description', (description) => {
    refusedAt({ ...validAgent, description }, `${AGENT}.description`);
  });

  it('counts the description in code points, so 1,000 emoji are accepted and 1,001 refused', () => {
    expect(acceptedWith({ description: '😀'.repeat(1000) }).description).toHaveLength(2000);
    refusedAt({ ...validAgent, description: '😀'.repeat(1001) }, `${AGENT}.description`);
  });
});

describe('F-02 AC-050 an agent tools list holds text items of at most 100 code points', () => {
  it('accepts a list of text items and the empty list', () => {
    expect(acceptedWith({ tools: ['Read', 'Bash'] }).tools).toEqual(['Read', 'Bash']);
    expect(acceptedWith({ tools: [] }).tools).toEqual([]);
  });

  it('accepts an item of exactly 100 code points', () => {
    expect(acceptedWith({ tools: ['x'.repeat(100)] }).tools).toEqual(['x'.repeat(100)]);
  });

  it('refuses a non-text item at the path of the item and keeps the others', () => {
    expect(readA({ ...validAgent, tools: ['Read', 1] })).toEqual({
      block: { ...validAgent, index: 1, tools: ['Read'] },
      problems: [{ path: `${AGENT}.tools.1`, message: expect.any(String) }],
    });
  });

  it('refuses a text item of 101 code points at the path of the item', () => {
    itemProblemAt({ ...validAgent, tools: ['x'.repeat(101)] }, `${AGENT}.tools.0`);
  });

  it('accepts a repeated tool, since repeats are allowed', () => {
    expect(acceptedWith({ tools: ['Read', 'Read'] }).tools).toEqual(['Read', 'Read']);
  });

  it('counts a tool in code points, so 100 emoji are accepted and 101 refused', () => {
    expect(acceptedWith({ tools: ['😀'.repeat(100)] }).tools).toEqual(['😀'.repeat(100)]);
    itemProblemAt({ ...validAgent, tools: ['😀'.repeat(101)] }, `${AGENT}.tools.0`);
  });
});

describe('F-02 AC-051 agent reads and writes are non-blank labels with no repeats', () => {
  it('accepts a label list and the same label in reads and in writes', () => {
    const block = acceptedWith({ reads: ['plan.md'], writes: ['plan.md'] });
    expect(block.reads).toEqual(['plan.md']);
    expect(block.writes).toEqual(['plan.md']);
  });

  it.each([[''], ['  ']])('refuses the label %j at the path of the item', (label) => {
    itemProblemAt({ ...validAgent, reads: [label] }, `${AGENT}.reads.0`);
  });

  it('refuses a label listed twice at the path of the second item', () => {
    expect(readA({ ...validAgent, writes: ['plan.md', 'plan.md'] })).toEqual({
      block: { ...validAgent, index: 1, writes: ['plan.md'] },
      problems: [{ path: `${AGENT}.writes.1`, message: expect.stringContaining('repeats plan.md') }],
    });
  });

  it('accepts a label of exactly 1,000 code points and refuses 1,001 at the path of the item', () => {
    expect(acceptedWith({ reads: ['x'.repeat(1000)] }).reads).toEqual(['x'.repeat(1000)]);
    itemProblemAt({ ...validAgent, reads: ['x'.repeat(1001)] }, `${AGENT}.reads.0`);
  });
});

describe('F-02 AC-050 AC-051 AC-071 a list field that is not a list is refused at its path', () => {
  it.each([
    ['tools', 'Read'],
    ['reads', 'plan.md'],
    ['writes', 1],
    ['ruleTags', 'style'],
  ])('refuses %s set to %j at the path of the key', (key, value) => {
    refusedAt({ ...validAgent, [key]: value }, `${AGENT}.${key}`);
  });
});

describe('F-02 AC-053 and F-12 AC-028 an agent body is not blank and at most 1,000 code points; model takes the four values', () => {
  it('accepts a body of exactly 1,000 code points and refuses 1,001 at the path of body', () => {
    expect(acceptedWith({ body: 'x'.repeat(1000) }).body).toHaveLength(1000);
    refusedAt({ ...validAgent, body: 'x'.repeat(1001) }, `${AGENT}.body`);
  });

  it.each(['haiku', 'sonnet', 'opus', 'inherit'])('accepts the model %s', (model) => {
    expect(acceptedWith({ model }).model).toBe(model);
  });

  it.each([[''], ['   '], ['\n\t']])('refuses a blank body %j at the path of body (F-12 AC-028)', (body) => {
    refusedAt({ ...validAgent, body }, `${AGENT}.body`);
  });

  it('accepts an agent with no body (F-12 AC-028)', () => {
    expect(readA(validAgent).block).not.toHaveProperty('body');
  });

  it('accepts an agent with no model', () => {
    expect(readA(validAgent).block).not.toHaveProperty('model');
  });

  it.each(['Haiku', 'gpt'])('refuses the model %j at the path of model', (model) => {
    refusedAt({ ...validAgent, model }, `${AGENT}.model`);
  });
});

describe('F-02 AC-055 agent arguments are argument rows and an empty list is accepted', () => {
  it('accepts an empty arguments list', () => {
    expect(readA(validAgent).block?.arguments).toEqual([]);
  });

  it('accepts a valid argument row', () => {
    expect(acceptedWith({ arguments: [validRow] }).arguments).toEqual([{ ...validRow, index: 0 }]);
  });

  it('refuses an invalid row at the path of the row', () => {
    expect(readA({ ...validAgent, arguments: [{ ...validRow, required: 'true' }] })).toEqual({
      block: { ...validAgent, index: 1, arguments: [] },
      problems: [{ path: `${AGENT}.arguments.0.required`, message: expect.any(String) }],
    });
  });

  it('refuses arguments that are not a list at the path of arguments', () => {
    refusedAt({ ...validAgent, arguments: 'feature-id' }, `${AGENT}.arguments`);
  });
});

describe('F-02 AC-071 a rule tag of an agent is an id', () => {
  it('accepts a rule tag that is an id', () => {
    expect(acceptedWith({ ruleTags: ['style-rule'] }).ruleTags).toEqual([{ ruleId: 'style-rule', index: 0 }]);
  });

  it('refuses "Style Rule" at the path of the tag', () => {
    itemProblemAt({ ...validAgent, ruleTags: ['Style Rule'] }, `${AGENT}.ruleTags.0`);
  });
});

describe('F-02 AC-072 a rule tag listed twice is refused on the agent', () => {
  it('refuses a repeated tag at the path of the second entry', () => {
    expect(readA({ ...validAgent, ruleTags: ['style', 'style'] })).toEqual({
      block: { ...validAgent, index: 1, ruleTags: [{ ruleId: 'style', index: 0 }] },
      problems: [{ path: `${AGENT}.ruleTags.1`, message: expect.stringContaining('repeats style') }],
    });
  });
});

describe('F-02 AC-073 an absent ruleTags key and an empty list are accepted', () => {
  it('accepts an agent with no ruleTags key', () => {
    expect(readA(validAgent).block).not.toHaveProperty('ruleTags');
  });

  it('accepts an empty ruleTags list', () => {
    expect(acceptedWith({ ruleTags: [] }).ruleTags).toEqual([]);
  });
});
