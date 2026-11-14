import { describe, expect, it } from 'vitest';
import { validateConfig } from '../src/index.js';
import { wouldCreateCycle } from '../src/validate/map.js';
import { baseConfig, connection, withDefaults, workflow } from './fixtures.js';

describe('F-02 T006 map references and cycles', () => {
  it('F-02 AC-003 a map without cycles or bad references has no problems', () => {
    expect(validateConfig(baseConfig())).toEqual([]);
  });

  it('F-02 AC-002 a connection to an unknown workflow is refused, naming the reference', () => {
    const config = baseConfig({ connections: [connection('specify', 'nowhere')] });
    expect(validateConfig(config)).toEqual(['connection "specify-nowhere": unknown workflow "nowhere"']);
  });

  it('F-02 AC-002 a workflow that uses an unknown step is refused', () => {
    const config = baseConfig({
      workflows: withDefaults([workflow('solo', { steps: [{ stepId: 'does-not-exist', enabled: true }] })]),
      connections: [],
    });
    expect(validateConfig(config)).toEqual(['workflow "solo": unknown step "does-not-exist"']);
  });

  it('F-02 AC-002 a condition that follows a step outside its workflow is refused', () => {
    const config = baseConfig({
      workflows: withDefaults([
        workflow('solo', {
          steps: [{ stepId: 'release', enabled: true }],
          conditions: [{ id: 'orphan', enabled: true, afterStepId: 'plan', gate: { id: 'orphan', type: 'checks', required: false }, pass: { kind: 'next' }, fail: { kind: 'stop' } }],
        }),
      ]),
      connections: [],
    });
    expect(validateConfig(config)).toEqual(['condition "orphan": follows step "plan", which is not in workflow "solo"']);
  });

  it('F-06 AC-029 a switched-off condition that follows a step outside its workflow gives no finding', () => {
    const config = baseConfig({
      workflows: withDefaults([
        workflow('solo', {
          steps: [{ stepId: 'release', enabled: true }],
          conditions: [
            {
              id: 'orphan',
              enabled: false,
              afterStepId: 'plan',
              gate: { id: 'orphan', type: 'checks', required: false },
              pass: { kind: 'next' },
              fail: { kind: 'stop' },
            },
          ],
        }),
      ]),
      connections: [],
    });
    expect(validateConfig(config)).toEqual([]);
  });

  it('F-06 AC-029 a switched-off condition with an unwired output and an orphan step gives no finding', () => {
    const config = baseConfig({
      workflows: withDefaults([
        workflow('solo', {
          steps: [{ stepId: 'release', enabled: true }],
          conditions: [
            {
              id: 'orphan',
              enabled: false,
              afterStepId: 'plan',
              gate: { id: 'orphan', type: 'checks', required: false },
              pass: { kind: 'next' },
              fail: undefined,
            },
          ],
        }),
      ]),
      connections: [],
    });
    expect(validateConfig(config)).toEqual([]);
  });

  it('F-06 AC-029 a switched-on condition that follows a step outside its workflow is still refused', () => {
    const config = baseConfig({
      workflows: withDefaults([
        workflow('solo', {
          steps: [{ stepId: 'release', enabled: true }],
          conditions: [
            {
              id: 'orphan',
              enabled: true,
              afterStepId: 'plan',
              gate: { id: 'orphan', type: 'checks', required: false },
              pass: { kind: 'next' },
              fail: { kind: 'stop' },
            },
          ],
        }),
      ]),
      connections: [],
    });
    expect(validateConfig(config)).toEqual([
      'condition "orphan": follows step "plan", which is not in workflow "solo"',
    ]);
  });

  it('F-02 AC-010 a connection to or from a disabled workflow is refused', () => {
    const config = baseConfig({
      workflows: withDefaults([workflow('a'), workflow('b', { enabled: false })]),
      connections: [connection('a', 'b')],
    });
    expect(validateConfig(config)).toEqual(['connection "a-b": workflow "b" is disabled']);
  });

  it('F-02 AC-003 a cycle on the map is refused, naming the workflows in order', () => {
    const config = baseConfig({
      workflows: withDefaults([workflow('a'), workflow('b'), workflow('c')]),
      connections: [connection('a', 'b'), connection('b', 'c'), connection('c', 'a')],
    });
    expect(validateConfig(config)).toEqual(['map cycle: a -> b -> c -> a']);
  });

  it('F-02 AC-003 a two-workflow cycle is reported once', () => {
    const config = baseConfig({
      workflows: withDefaults([workflow('x'), workflow('y')]),
      connections: [connection('x', 'y'), connection('y', 'x')],
    });
    expect(validateConfig(config)).toEqual(['map cycle: x -> y -> x']);
  });
});

describe('F-06 T004 wouldCreateCycle', () => {
  const chain = [connection('a', 'b'), connection('b', 'c')];

  it.each([
    ['a workflow to itself, on an empty map', [], 'a', 'a'],
    ['a workflow to itself, on a map with other connections', chain, 'b', 'b'],
  ])('F-06 AC-013 refuses a self-link: %s', (_name, connections, from, to) => {
    expect(wouldCreateCycle(connections, from, to)).toBe(true);
  });

  it.each([
    ['closing a chain back to its start (C→A after A→B→C)', [...chain], 'c', 'a'],
    ['closing a chain back to its middle (C→B after A→B→C)', [...chain], 'c', 'b'],
    ['the reverse of an existing connection (B→A after A→B)', [connection('a', 'b')], 'b', 'a'],
    ['closing a longer path back to its start (D→A after A→B→C→D)', [...chain, connection('c', 'd')], 'd', 'a'],
  ])('F-06 AC-014 refuses a connection that closes a cycle: %s', (_name, connections, from, to) => {
    expect(wouldCreateCycle(connections, from, to)).toBe(true);
  });

  it.each([
    ['an unrelated pair on an empty map', [], 'a', 'b'],
    ['extending a chain forward (C→D after A→B→C)', [...chain], 'c', 'd'],
    ['a new branch from the start (A→C after A→B)', [connection('a', 'b')], 'a', 'c'],
    ['joining two branches without a loop (B→C after A→B, A→C)', [connection('a', 'b'), connection('a', 'c')], 'b', 'c'],
    ['a pair with no path in either direction (D→E after A→B→C)', [...chain], 'd', 'e'],
    ['a connection from a workflow with no outgoing links (C→A when only A→B exists)', [connection('a', 'b')], 'c', 'a'],
  ])('F-06 AC-014 allows a connection that keeps the map acyclic: %s', (_name, connections, from, to) => {
    expect(wouldCreateCycle(connections, from, to)).toBe(false);
  });

  it('F-06 AC-014 does not change the connections it is given', () => {
    const connections = [...chain];
    wouldCreateCycle(connections, 'c', 'a');
    expect(connections).toEqual(chain);
  });
});
