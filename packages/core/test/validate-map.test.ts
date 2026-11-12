import { describe, expect, it } from 'vitest';
import { validateConfig } from '../src/index.js';
import { baseConfig, connection, workflow } from './fixtures.js';

describe('F-02 T006 map references and cycles', () => {
  it('F-02 AC-003 a map without cycles or bad references has no problems', () => {
    expect(validateConfig(baseConfig())).toEqual([]);
  });

  it('F-02 AC-002 a connection to an unknown workflow is refused, naming the reference', () => {
    const config = baseConfig({ connections: [connection('specify', 'nowhere')] });
    expect(validateConfig(config)).toContain('connection "specify-nowhere": unknown workflow "nowhere"');
  });

  it('F-02 AC-002 a workflow that uses an unknown step is refused', () => {
    const config = baseConfig({
      workflows: [workflow('solo', { steps: [{ stepId: 'does-not-exist', enabled: true }] })],
      connections: [],
    });
    expect(validateConfig(config)).toEqual(['workflow "solo": unknown step "does-not-exist"']);
  });

  it('F-02 AC-002 a condition that follows a step outside its workflow is refused', () => {
    const config = baseConfig({
      workflows: [
        workflow('solo', {
          steps: [{ stepId: 'release', enabled: true }],
          conditions: [{ id: 'orphan', afterStepId: 'plan', gate: { id: 'orphan', type: 'checks', required: false }, pass: { kind: 'next' }, fail: { kind: 'stop' } }],
        }),
      ],
      connections: [],
    });
    expect(validateConfig(config)).toEqual(['condition "orphan": follows step "plan", which is not in workflow "solo"']);
  });

  it('F-02 AC-010 a connection to or from a disabled workflow is refused', () => {
    const config = baseConfig({
      workflows: [workflow('a'), workflow('b', { enabled: false })],
      connections: [connection('a', 'b')],
    });
    expect(validateConfig(config)).toEqual(['connection "a-b": workflow "b" is disabled']);
  });

  it('F-02 AC-003 a cycle on the map is refused, naming the workflows in order', () => {
    const config = baseConfig({
      workflows: [workflow('a'), workflow('b'), workflow('c')],
      connections: [connection('a', 'b'), connection('b', 'c'), connection('c', 'a')],
    });
    expect(validateConfig(config)).toEqual(['map cycle: a -> b -> c -> a']);
  });

  it('F-02 AC-003 a two-workflow cycle is reported once', () => {
    const config = baseConfig({
      workflows: [workflow('x'), workflow('y')],
      connections: [connection('x', 'y'), connection('y', 'x')],
    });
    expect(validateConfig(config)).toEqual(['map cycle: x -> y -> x']);
  });
});
