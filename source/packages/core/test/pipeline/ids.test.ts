import { describe, expect, it } from 'vitest';
import { parseProjectConfig } from '../../src/pipeline/parse/project.js';

function rule(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id: 'no-secrets', title: 'No secrets', text: 'Never commit keys.', ...overrides };
}

function start(id: string): Record<string, unknown> {
  return { id, kind: 'start' };
}

function agent(id: string, name: string): Record<string, unknown> {
  return { id, kind: 'agent', name, description: 'Writes the spec', arguments: '' };
}

function flow(id: string, blocks: Record<string, unknown>[]): Record<string, unknown> {
  return { id, name: `Flow ${id}`, description: 'A flow', arguments: '', blocks };
}

function pipeline(
  flows: Record<string, unknown>[],
  args: Record<string, unknown>[] = [],
): Record<string, unknown> {
  return { name: 'Feature flow', description: 'Runs one feature.', arguments: args, flows };
}

function root(pipelineValue: Record<string, unknown>, rules: unknown[] = [rule()]): Record<string, unknown> {
  return { schemaVersion: 2, rules, pipeline: pipelineValue };
}

function pathsOf(input: unknown): string[] {
  const result = parseProjectConfig(input);
  if (result.ok) {
    return ['<config returned>'];
  }
  return result.problems.map((problem) => problem.path);
}

describe('F-02 AC-022 an id is unique across flows, blocks and pipeline arguments', () => {
  it.each([
    {
      label: 'a flow id equal to an earlier argument id',
      input: root(pipeline([flow('review', [start('s')])], [{ id: 'review', required: true, hint: 'Which' }])),
      paths: ['pipeline.flows[0].id'],
    },
    {
      label: 'a block id equal to an argument id',
      input: root(pipeline([flow('build', [start('brief')])], [{ id: 'brief', required: true, hint: 'Which' }])),
      paths: ['pipeline.flows[0].blocks[0].id'],
    },
    {
      label: 'a block id equal to its own flow id',
      input: root(pipeline([flow('build', [start('build')])])),
      paths: ['pipeline.flows[0].blocks[0].id'],
    },
    {
      label: 'a flow id equal to a block id in an earlier flow',
      input: root(pipeline([flow('a', [start('shared')]), flow('shared', [start('b')])])),
      paths: ['pipeline.flows[1].id'],
    },
    {
      label: 'a block id equal to a block id in another flow',
      input: root(pipeline([flow('a', [start('s1')]), flow('b', [start('s1')])])),
      paths: ['pipeline.flows[1].blocks[0].id'],
    },
    {
      label: 'a block id equal to a block id earlier in the same flow',
      input: root(pipeline([flow('a', [start('s1'), start('s1')])])),
      paths: ['pipeline.flows[0].blocks[1].id'],
    },
  ])('F-02 AC-022 refuses $label, at the path of the second occurrence', ({ input, paths }) => {
    const result = parseProjectConfig(input);
    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('config');
    expect(pathsOf(input)).toEqual(paths);
  });

  it('F-02 AC-022 names the path of a third occurrence on its own, not the first', () => {
    const input = root(pipeline([flow('a', [start('x')]), flow('b', [start('y')]), flow('c', [start('x')])]));
    expect(pathsOf(input)).toEqual(['pipeline.flows[2].blocks[0].id']);
  });

  it('F-02 AC-022 reports every clash in document order', () => {
    const input = root(
      pipeline(
        [flow('a', [start('x'), start('x')]), flow('a', [start('y')])],
        [{ id: 'arg', required: false, hint: 'Hint' }, { id: 'arg', required: false, hint: 'Hint' }],
      ),
    );
    expect(pathsOf(input)).toEqual([
      'pipeline.arguments[1].id',
      'pipeline.flows[0].blocks[1].id',
      'pipeline.flows[1].id',
    ]);
  });

  it('F-02 AC-022 returns the config when every id is distinct across the pipeline', () => {
    const input = root(
      pipeline(
        [flow('a', [start('s1'), agent('w1', 'writer')]), flow('b', [start('s2')])],
        [{ id: 'topic', required: true, hint: 'Topic' }],
      ),
    );
    expect(parseProjectConfig(input).ok).toBe(true);
  });

  it('F-02 AC-022 does not check rule ids against pipeline ids, so a rule may share a flow id', () => {
    const input = root(pipeline([flow('build', [start('s1')])]), [rule({ id: 'build' })]);
    expect(parseProjectConfig(input).ok).toBe(true);
  });

  it('F-02 AC-022 refuses the argument as the second occurrence when flows are written before arguments', () => {
    const input = root({
      name: 'Feature flow',
      description: 'Runs one feature.',
      flows: [flow('build', [start('s1')])],
      arguments: [{ id: 'build', required: true, hint: 'Which' }],
    });
    expect(pathsOf(input)).toEqual(['pipeline.arguments[0].id']);
  });

  it('F-02 AC-022 reports no clash while another part of the config is invalid', () => {
    const input = root(pipeline([flow('a', [start('x')]), { ...flow('x', [start('y')]), name: ' ' }]));
    expect(pathsOf(input)).toEqual(['pipeline.flows[1].name']);
  });
});

describe('F-02 AC-010 two agents with the same name are refused at the second', () => {
  it('F-02 AC-010 refuses an agent name equal to an earlier agent name, at the second agent', () => {
    const input = root(
      pipeline([flow('a', [start('s1'), agent('w1', 'writer')]), flow('b', [agent('w2', 'writer')])]),
    );
    expect(pathsOf(input)).toEqual(['pipeline.flows[1].blocks[0].name']);
  });

  it('F-02 AC-010 refuses an agent name repeated within one flow, at the second agent', () => {
    const input = root(pipeline([flow('a', [agent('w1', 'writer'), agent('w2', 'writer')])]));
    expect(pathsOf(input)).toEqual(['pipeline.flows[0].blocks[1].name']);
  });

  it('F-02 AC-010 accepts agents with distinct names, even when their block ids are distinct too', () => {
    const input = root(pipeline([flow('a', [agent('w1', 'writer')]), flow('b', [agent('r1', 'reviewer')])]));
    expect(parseProjectConfig(input).ok).toBe(true);
  });

  it('F-02 AC-010 accepts an agent name equal to a flow or block id, because agent names have their own set', () => {
    const input = root(pipeline([flow('writer', [start('s1'), agent('writer-block', 'writer')])]));
    expect(parseProjectConfig(input).ok).toBe(true);
  });
});
