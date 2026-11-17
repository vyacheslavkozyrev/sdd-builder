import { describe, expect, it } from 'vitest';
import type { pipeline } from '@sddbuilder/core';
import { NO_ARROW_REASON } from '../src/builder/connect.js';
import { GATE_EXISTS_REASON, addGate, type GateRequest } from '../src/builder/gates.js';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;

function flow(id: string, extra: Partial<Flow> = {}): Flow {
  return { id, name: `Name ${id}`, description: '', arguments: '', blocks: [], ...extra };
}

function config(flows: Flow[]): Pipeline {
  return { name: 'pipeline', description: '', arguments: [], flows };
}

// Two flows joined by an arrow, with no gate yet.
function arrowed(): Pipeline {
  return config([flow('specify', { connectedTo: { to: 'plan', label: 'spec' } }), flow('plan')]);
}

const approval = (description: string): GateRequest => ({ kind: 'approval', description });
const check = (type: string, threshold = '', description = 'Run the checks'): GateRequest => ({
  kind: 'check',
  description,
  type,
  threshold,
});

describe('F-11 AC-017 approval on an arrow', () => {
  it('F-11 AC-017 adds an approval with its description to the arrow', () => {
    const result = addGate(arrowed(), 'specify', approval('Owner signs off'));
    expect(result.ok && result.pipeline.flows[0]?.connectedTo).toEqual({
      to: 'plan',
      label: 'spec',
      gate: { kind: 'approval', description: 'Owner signs off' },
    });
  });

  const blank: Array<[string, string]> = [
    ['empty', ''],
    ['of spaces only', '   '],
    ['of tabs and newlines only', '\t\n '],
  ];
  for (const [label, value] of blank) {
    it(`F-11 AC-017 refuses an approval whose description is ${label}, with the reason, and adds no gate`, () => {
      const before = arrowed();
      const result = addGate(before, 'specify', approval(value));
      expect(result).toEqual({ ok: false, reason: 'Description must be non-blank text.' });
      expect(before.flows[0]?.connectedTo?.gate).toBeUndefined();
    });
  }
});

describe('F-11 AC-018 check on an arrow', () => {
  it('F-11 AC-018 adds a checks gate with no threshold', () => {
    const result = addGate(arrowed(), 'specify', check('checks'));
    expect(result.ok && result.pipeline.flows[0]?.connectedTo?.gate).toEqual({
      kind: 'check',
      description: 'Run the checks',
      type: 'checks',
    });
  });

  it('F-11 AC-018 adds a diff size gate with a positive whole-number threshold', () => {
    const result = addGate(arrowed(), 'specify', check('diff size', '40'));
    expect(result.ok && result.pipeline.flows[0]?.connectedTo?.gate).toEqual({
      kind: 'check',
      description: 'Run the checks',
      type: 'diff size',
      threshold: 40,
    });
  });

  it('F-11 AC-018 reads a threshold with surrounding spaces as its number', () => {
    const result = addGate(arrowed(), 'specify', check('diff size', ' 3 '));
    expect(result.ok && result.pipeline.flows[0]?.connectedTo?.gate).toEqual({
      kind: 'check',
      description: 'Run the checks',
      type: 'diff size',
      threshold: 3,
    });
  });

  const refused: Array<[string, GateRequest, string]> = [
    ['a checks gate with a threshold', check('checks', '5'), 'Threshold is not allowed on a checks gate.'],
    ['a diff size gate with no threshold', check('diff size'), 'Threshold is required on a diff size gate.'],
    ['a diff size gate with a blank threshold', check('diff size', '   '), 'Threshold is required on a diff size gate.'],
    ['a diff size gate with a zero threshold', check('diff size', '0'), 'Threshold must be a positive whole number.'],
    ['a diff size gate with a negative threshold', check('diff size', '-2'), 'Threshold must be a positive whole number.'],
    ['a diff size gate with a fractional threshold', check('diff size', '1.5'), 'Threshold must be a positive whole number.'],
    ['a diff size gate with a text threshold', check('diff size', 'many'), 'Threshold must be a positive whole number.'],
    ['a diff size gate with an exponent threshold', check('diff size', '1e3'), 'Threshold must be a positive whole number.'],
    ['a diff size gate with a threshold beyond the safe integer range', check('diff size', '9007199254740993'), 'Threshold must be a positive whole number.'],
    ['a check with a type that is not checks or diff size', check('lint'), 'Type must be one of checks, diff size.'],
    ['a check with a blank description', check('checks', '', '  '), 'Description must be non-blank text.'],
  ];
  for (const [label, request, reason] of refused) {
    it(`F-11 AC-018 refuses ${label}, with the reason, and adds no gate`, () => {
      const before = arrowed();
      expect(addGate(before, 'specify', request)).toEqual({ ok: false, reason });
      expect(before.flows[0]?.connectedTo?.gate).toBeUndefined();
    });
  }
});

describe('F-11 AC-019 one gate per arrow', () => {
  it('F-11 AC-019 refuses a check on an arrow that already has an approval, and the approval stays', () => {
    const withApproval = addGate(arrowed(), 'specify', approval('Owner signs off'));
    if (!withApproval.ok) {
      throw new Error('setup must add the approval');
    }
    const result = addGate(withApproval.pipeline, 'specify', check('checks'));
    expect(result).toEqual({ ok: false, reason: GATE_EXISTS_REASON });
    expect(withApproval.pipeline.flows[0]?.connectedTo?.gate).toEqual({
      kind: 'approval',
      description: 'Owner signs off',
    });
  });

  it('F-11 AC-019 refuses an approval on an arrow that already has a check, and the check stays', () => {
    const withCheck = addGate(arrowed(), 'specify', check('diff size', '10'));
    if (!withCheck.ok) {
      throw new Error('setup must add the check');
    }
    const result = addGate(withCheck.pipeline, 'specify', approval('Owner signs off'));
    expect(result).toEqual({ ok: false, reason: GATE_EXISTS_REASON });
    expect(withCheck.pipeline.flows[0]?.connectedTo?.gate).toEqual({
      kind: 'check',
      description: 'Run the checks',
      type: 'diff size',
      threshold: 10,
    });
  });
});

describe('F-11 AC-017 to AC-019 gate on a flow without an arrow', () => {
  it('F-11 AC-017 refuses a gate on a flow that has no arrow, with the reason', () => {
    const before = config([flow('specify'), flow('plan')]);
    expect(addGate(before, 'specify', approval('Owner signs off'))).toEqual({
      ok: false,
      reason: NO_ARROW_REASON,
    });
  });

  it('F-11 AC-017 adds a gate although another flow has a problem the gate does not own', () => {
    const before = config([
      flow('specify', { connectedTo: { to: 'plan', label: 'spec' } }),
      flow('plan', { name: '' }),
    ]);
    const result = addGate(before, 'specify', approval('Owner signs off'));
    expect(result.ok && result.pipeline.flows[0]?.connectedTo?.gate).toEqual({
      kind: 'approval',
      description: 'Owner signs off',
    });
  });

  it('F-11 AC-017 does not change the pipeline it is given when it adds a gate', () => {
    const before = arrowed();
    const snapshot = JSON.stringify(before);
    addGate(before, 'specify', approval('Owner signs off'));
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});
