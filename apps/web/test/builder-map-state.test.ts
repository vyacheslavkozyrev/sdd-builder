import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONNECTIONS, DEFAULT_WORKFLOWS } from '@sddbuilder/core';
import type { MapConnection, Scope } from '@sddbuilder/core';
import {
  addWorkflow,
  connect,
  removeConnection,
  removeWorkflow,
  setArtifact,
  setGate,
  startState,
} from '../src/builder/map-state.js';
import type { EditResult, MapState } from '../src/builder/map-state.js';

/** Unwraps a successful edit; fails the test with the refusal message otherwise. */
function applied(result: EditResult): MapState {
  if (!result.ok) {
    throw new Error(`expected the edit to apply, got refusal: ${result.message}`);
  }
  return result.state;
}

function refusedWith(result: EditResult): string {
  if (result.ok) {
    throw new Error('expected the edit to be refused');
  }
  return result.message;
}

/** A state with a chain A → B → C, all three workflows empty. */
function chainState(): MapState {
  let state: MapState = { workflows: [], connections: [] };
  for (const name of ['Alpha', 'Beta', 'Gamma']) {
    state = applied(addWorkflow(state, name, 'feature'));
  }
  state = applied(connect(state, 'alpha', 'beta'));
  state = applied(connect(state, 'beta', 'gamma'));
  return state;
}

function connectionBetween(state: MapState, from: string, to: string): MapConnection {
  const found = state.connections.find((c) => c.from === from && c.to === to);
  if (!found) {
    throw new Error(`no connection ${from} -> ${to}`);
  }
  return found;
}

describe('F-06 AC-001 starting state', () => {
  it('F-06 AC-001 starts with the default workflows and connections of the reference process', () => {
    const state = startState();
    expect(state.workflows).toEqual(DEFAULT_WORKFLOWS);
    expect(state.connections).toEqual(DEFAULT_CONNECTIONS);
  });
});

describe('F-06 AC-004 fresh session', () => {
  it('F-06 AC-004 a new session after edits starts again from the reference process', () => {
    const first = startState();
    const edited = applied(addWorkflow(removeWorkflow(first, 'verify-feature'), 'Audit', 'task'));
    expect(edited.workflows).not.toEqual(DEFAULT_WORKFLOWS);

    const second = startState();
    expect(second.workflows).toEqual(DEFAULT_WORKFLOWS);
    expect(second.connections).toEqual(DEFAULT_CONNECTIONS);
  });

  it('F-06 AC-004 edits to a session never change the reference data', () => {
    const state = startState();
    state.workflows[0]!.name = 'Changed';
    state.workflows[0]!.steps.push({ stepId: 'release', enabled: true });
    expect(DEFAULT_WORKFLOWS[0]!.name).toBe('Specify');
    expect(DEFAULT_WORKFLOWS[0]!.steps).toHaveLength(3);
    expect(startState().workflows[0]!.name).toBe('Specify');
  });
});

describe('F-06 AC-003 memory only', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('F-06 AC-003 a full edit session never touches localStorage, sessionStorage or indexedDB', () => {
    // Every Proxy trap throws, so any read, write, property test or enumeration of a storage global fails.
    const forbidden = (name: string): object => {
      const fail = (): never => {
        throw new Error(`${name} must not be used`);
      };
      return new Proxy(
        {},
        {
          get: fail,
          set: fail,
          has: fail,
          ownKeys: fail,
          getOwnPropertyDescriptor: fail,
          defineProperty: fail,
          deleteProperty: fail,
        },
      );
    };
    vi.stubGlobal('localStorage', forbidden('localStorage'));
    vi.stubGlobal('sessionStorage', forbidden('sessionStorage'));
    vi.stubGlobal('indexedDB', forbidden('indexedDB'));

    // The fakes are really installed, so the session below is tested against them.
    expect(() => globalThis.localStorage.getItem('probe')).toThrow('localStorage must not be used');
    expect(() => globalThis.sessionStorage.setItem('probe', 'x')).toThrow('sessionStorage must not be used');
    expect(() => globalThis.indexedDB.open('probe')).toThrow('indexedDB must not be used');

    let state = startState();
    state = applied(addWorkflow(state, 'Audit', 'project'));
    refusedWith(addWorkflow(state, 'audit', 'project'));
    state = applied(connect(state, 'audit', 'release-project'));
    refusedWith(connect(state, 'release-project', 'audit'));
    state = setArtifact(state, connectionBetween(state, 'audit', 'release-project').id, 'notes.md');
    state = applied(setGate(state, connectionBetween(state, 'audit', 'release-project').id, 'checks'));
    refusedWith(setGate(state, connectionBetween(state, 'audit', 'release-project').id, 'diff-size', '0'));
    state = removeConnection(state, connectionBetween(state, 'audit', 'release-project').id);
    state = removeWorkflow(state, 'audit');

    expect(state.workflows).toEqual(DEFAULT_WORKFLOWS);
    expect(state.connections).toEqual(DEFAULT_CONNECTIONS);
  });
});

describe('F-06 AC-009 AC-011 AC-012 AC-016 AC-017 AC-018 edits never mutate the state they are given', () => {
  it('F-06 AC-009 AC-011 AC-012 AC-016 AC-017 AC-018 every successful edit leaves its input as it was', () => {
    const input = startState();
    const snapshot = structuredClone(input);
    const withAudit = applied(addWorkflow(input, 'Audit', 'task'));
    const withConnection = applied(connect(withAudit, 'audit', 'specify'));
    const withLabel = setArtifact(withConnection, 'audit-specify', 'notes.md');
    const withGate = applied(setGate(withLabel, 'audit-specify', 'diff-size', '10'));
    removeConnection(withGate, 'audit-specify');
    removeWorkflow(withGate, 'audit');
    expect(input).toEqual(snapshot);
    expect(withAudit).not.toBe(input);
  });
});

describe('F-06 AC-009 adding a workflow', () => {
  it.each([
    ['project', 'project'],
    ['feature', 'features.md'],
    ['task', 'plan.md'],
  ] as const)('F-06 AC-009 a %s workflow iterates over %s with no steps or conditions', (scope, source) => {
    const state = applied(addWorkflow(startState(), '  Review sweep  ', scope));
    const added = state.workflows[state.workflows.length - 1]!;
    expect(added).toEqual({
      id: 'review-sweep',
      name: 'Review sweep',
      scope,
      iterationSource: source,
      enabled: true,
      steps: [],
      conditions: [],
    });
    expect(state.workflows).toHaveLength(DEFAULT_WORKFLOWS.length + 1);
  });

  it('F-06 AC-009 gives a new workflow a unique id when the name would reuse an existing id', () => {
    const state = applied(addWorkflow(startState(), 'Specify!', 'feature'));
    const ids = state.workflows.map((w) => w.id);
    expect(ids).toContain('specify-2');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('F-06 AC-009 throws for a scope outside the three, since the scope comes from a fixed choice', () => {
    expect(() => addWorkflow(startState(), 'Audit', 'team' as Scope)).toThrow('Unknown scope: team');
  });

  it('F-06 AC-009 falls back to a fixed id when the name has no letters or digits', () => {
    const state = applied(addWorkflow(startState(), '¡¿', 'task'));
    expect(state.workflows[state.workflows.length - 1]!.id).toBe('workflow');
  });
});

describe('F-06 AC-010 refused workflow names', () => {
  it.each([
    ['an empty name', ''],
    ['a name only of spaces', '   '],
  ])('F-06 AC-010 refuses %s with a message and leaves the state unchanged', (_label, name) => {
    const before = startState();
    const result = addWorkflow(before, name, 'feature');
    expect(refusedWith(result)).toMatch(/name/i);
    expect(before).toEqual(startState());
  });

  it('F-06 AC-010 refuses a name that duplicates another workflow, ignoring case and spaces', () => {
    const before = startState();
    const message = refusedWith(addWorkflow(before, '  specify ', 'task'));
    expect(message).toMatch(/already exists/);
    expect(before).toEqual(startState());
  });
});

describe('F-06 AC-011 removing a workflow', () => {
  it('F-06 AC-011 removes the workflow and every connection to and from it, and nothing else', () => {
    const state = removeWorkflow(startState(), 'implement-cycle');
    expect(state.workflows.map((w) => w.id)).toEqual(['specify', 'verify-feature', 'release-project']);
    expect(state.connections.map((c) => c.id)).toEqual(['verify-release']);
  });

  it('F-06 AC-011 keeps connections between the workflows that remain', () => {
    let state = startState();
    state = applied(addWorkflow(state, 'Audit', 'project'));
    state = applied(connect(state, 'audit', 'release-project'));
    const after = removeWorkflow(state, 'implement-cycle');
    expect(after.connections.map((c) => [c.from, c.to])).toEqual([
      ['verify-feature', 'release-project'],
      ['audit', 'release-project'],
    ]);
  });

  it('F-06 AC-011 throws for an unknown workflow id', () => {
    expect(() => removeWorkflow(startState(), 'missing')).toThrow('Unknown workflow id: missing');
  });
});

describe('F-06 AC-012 connecting workflows', () => {
  it('F-06 AC-012 creates a connection from A to B with neither a label nor a gate', () => {
    const base = applied(addWorkflow(startState(), 'Audit', 'project'));
    const state = applied(connect(base, 'audit', 'specify'));
    const created = connectionBetween(state, 'audit', 'specify');
    expect(created).toEqual({ id: 'audit-specify', from: 'audit', to: 'specify' });
    expect('artifact' in created).toBe(false);
    expect('gate' in created).toBe(false);
  });
});

describe('F-06 AC-013 self-links', () => {
  it('F-06 AC-013 refuses a connection from a workflow to itself', () => {
    const before = startState();
    expect(refusedWith(connect(before, 'specify', 'specify'))).toMatch(/itself/);
    expect(before).toEqual(startState());
  });
});

describe('F-06 AC-014 cycles', () => {
  it('F-06 AC-014 refuses C → A when A → B → C exists and leaves the state unchanged', () => {
    const before = chainState();
    const message = refusedWith(connect(before, 'gamma', 'alpha'));
    expect(message).toMatch(/cycle/);
    expect(before.connections.map((c) => [c.from, c.to])).toEqual([
      ['alpha', 'beta'],
      ['beta', 'gamma'],
    ]);
  });

  it('F-06 AC-014 refuses the reverse of a single connection', () => {
    const before = chainState();
    expect(refusedWith(connect(before, 'beta', 'alpha'))).toMatch(/cycle/);
  });

  it('F-06 AC-014 accepts a connection that does not close a cycle', () => {
    const state = applied(connect(chainState(), 'alpha', 'gamma'));
    expect(state.connections.map((c) => [c.from, c.to])).toEqual([
      ['alpha', 'beta'],
      ['beta', 'gamma'],
      ['alpha', 'gamma'],
    ]);
  });
});

describe('F-06 AC-015 duplicate connections', () => {
  it('F-06 AC-015 refuses a second connection between the same two workflows in the same direction', () => {
    const before = startState();
    expect(refusedWith(connect(before, 'specify', 'implement-cycle'))).toMatch(/already connected/);
    expect(before).toEqual(startState());
  });
});

describe('F-06 AC-016 removing a connection', () => {
  it('F-06 AC-016 removes only the connection and leaves both workflows in place', () => {
    const state = removeConnection(startState(), 'specify-implement');
    expect(state.connections.map((c) => c.id)).toEqual(['implement-verify', 'verify-release']);
    expect(state.workflows).toEqual(DEFAULT_WORKFLOWS);
  });

  it('F-06 AC-016 throws for an unknown connection id', () => {
    expect(() => removeConnection(startState(), 'missing')).toThrow('Unknown connection id: missing');
  });
});

describe('F-06 AC-017 artifact label', () => {
  it('F-06 AC-017 stores the artifact label trimmed', () => {
    const state = setArtifact(startState(), 'implement-verify', '  stories.md  ');
    expect(connectionBetween(state, 'implement-cycle', 'verify-feature').artifact).toBe('stories.md');
  });

  it('F-06 AC-017 clears the label when it is empty or only spaces', () => {
    const withLabel = startState();
    expect(connectionBetween(withLabel, 'specify', 'implement-cycle').artifact).toBe('plan.md');
    for (const blank of ['', '   ']) {
      const cleared = setArtifact(withLabel, 'specify-implement', blank);
      const connection = connectionBetween(cleared, 'specify', 'implement-cycle');
      expect('artifact' in connection).toBe(false);
    }
  });
});

describe('F-06 AC-018 gates', () => {
  it.each(['approval', 'checks', 'review'] as const)('F-06 AC-018 sets a %s gate with no threshold', (type) => {
    const state = applied(setGate(startState(), 'implement-verify', type));
    const gate = connectionBetween(state, 'implement-cycle', 'verify-feature').gate;
    expect(gate).toEqual({ id: 'implement-verify-gate', type, required: false });
  });

  it('F-06 AC-018 sets a diff-size gate with a whole-number threshold', () => {
    const state = applied(setGate(startState(), 'implement-verify', 'diff-size', ' 400 '));
    expect(connectionBetween(state, 'implement-cycle', 'verify-feature').gate).toEqual({
      id: 'implement-verify-gate',
      type: 'diff-size',
      threshold: 400,
      required: false,
    });
  });

  it.each(['', '0', '-3', '1.5', 'abc', '12px', '99999999999999999999'])(
    'F-06 AC-018 refuses the diff-size threshold %j with a message and no change',
    (threshold) => {
      const before = startState();
      expect(refusedWith(setGate(before, 'implement-verify', 'diff-size', threshold))).toMatch(/whole number/);
      expect(before).toEqual(startState());
    },
  );

  it.each(['Approval', 'none', 'diff_size', ' checks'])(
    'F-06 AC-018 refuses the gate type %j, which is not one of the four, with a message and no change',
    (type) => {
      const before = startState();
      expect(refusedWith(setGate(before, 'implement-verify', type))).toMatch(/approval, checks, review or diff-size/);
      expect(before).toEqual(startState());
    },
  );

  it('F-06 AC-018 clears the gate when the type is null', () => {
    const withGate = applied(setGate(startState(), 'implement-verify', 'review'));
    const state = applied(setGate(withGate, 'implement-verify', null));
    expect('gate' in connectionBetween(state, 'implement-cycle', 'verify-feature')).toBe(false);
  });

  it('F-06 AC-018 replaces a diff-size threshold when another gate type is chosen', () => {
    const withGate = applied(setGate(startState(), 'implement-verify', 'diff-size', '50'));
    const state = applied(setGate(withGate, 'implement-verify', 'checks'));
    const gate = connectionBetween(state, 'implement-cycle', 'verify-feature').gate;
    expect(gate).toEqual({ id: 'implement-verify-gate', type: 'checks', required: false });
  });
});
