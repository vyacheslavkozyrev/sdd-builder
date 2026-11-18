import { describe, expect, it } from 'vitest';
import type { pipeline } from '@sddbuilder/core';
import {
  NAME_TAKEN_REASON,
  applyFlowField,
  applyPipelineField,
} from '../src/builder/fields.js';

type Pipeline = pipeline.Pipeline;
type Flow = pipeline.Flow;

function flow(id: string, extra: Partial<Flow> = {}): Flow {
  return { id, name: `Name ${id}`, description: 'Does a step', arguments: '', blocks: [], ...extra };
}

function config(flows: Flow[] = [flow('specify'), flow('plan')], extra: Partial<Pipeline> = {}): Pipeline {
  return { name: 'pipeline', description: 'A process', arguments: [], flows, ...extra };
}

const EMOJI = '😀';

describe('F-11 AC-027 pipeline field edits through the parser', () => {
  it('F-11 AC-027 applies an accepted pipeline name at once', () => {
    const result = applyPipelineField(config(), { field: 'name', value: 'Release' });
    expect(result).toEqual({ ok: true, pipeline: config(undefined, { name: 'Release' }) });
  });

  it('F-11 AC-027 refuses a blank pipeline name with the parser message and keeps the previous value', () => {
    const before = config();
    const result = applyPipelineField(before, { field: 'name', value: '   ' });
    expect(result).toEqual({ ok: false, reason: 'Name must be non-blank text.' });
    expect(before.name).toBe('pipeline');
  });

  it('F-11 AC-027 refuses a blank pipeline description with the parser message', () => {
    const result = applyPipelineField(config(), { field: 'description', value: '' });
    expect(result).toEqual({ ok: false, reason: 'Description must be non-blank text.' });
  });

  it('F-11 AC-027 accepts a valid argument list and refuses an argument with a bad id', () => {
    const good = applyPipelineField(config(), {
      field: 'arguments',
      value: [{ id: 'topic', required: true, hint: 'The topic' }],
    });
    expect(good.ok && good.pipeline.arguments).toEqual([{ id: 'topic', required: true, hint: 'The topic' }]);

    const bad = applyPipelineField(config(), {
      field: 'arguments',
      value: [{ id: 'Topic Name', required: true, hint: 'The topic' }],
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.reason.startsWith('Arguments at [0].id ')).toBe(true);
    }
  });

  it('F-11 AC-027 sets an optional field and removes it when the value is cleared', () => {
    const set = applyPipelineField(config(), { field: 'model', value: 'opus' });
    expect(set.ok && set.pipeline.model).toBe('opus');

    const cleared = applyPipelineField(config(undefined, { model: 'opus' }), {
      field: 'model',
      value: undefined,
    });
    expect(cleared.ok).toBe(true);
    expect(cleared.ok && 'model' in cleared.pipeline).toBe(false);
  });

  it('F-11 AC-027 refuses an empty tool name in the tools list', () => {
    const result = applyPipelineField(config(), { field: 'tools', value: ['Read', ''] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason.startsWith('Tools at [1] ')).toBe(true);
    }
  });

  it('F-11 AC-027 refuses a rule tag that is not an id, with the parser message', () => {
    const result = applyPipelineField(config(), { field: 'ruleTags', value: ['Bad Tag'] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason.startsWith('Rule tags at [0] ')).toBe(true);
    }
  });

  it('F-11 AC-027 refuses a blank pipeline name and leaves the input pipeline unchanged', () => {
    const before = config();
    const result = applyPipelineField(before, { field: 'name', value: '' });
    expect(result.ok).toBe(false);
    expect(before).toEqual(config());
  });

  it('F-11 AC-027 applies an edit when a problem sits elsewhere in the pipeline', () => {
    const broken = config([flow('specify', { description: '' }), flow('plan')]);
    const result = applyPipelineField(broken, { field: 'name', value: 'Release' });
    expect(result.ok && result.pipeline.name).toBe('Release');
  });
});

describe('F-11 AC-027 flow field edits through the parser', () => {
  it('F-11 AC-027 applies an accepted flow description to that flow only', () => {
    const result = applyFlowField(config(), 'plan', { field: 'description', value: 'Writes the plan' });
    expect(result.ok && result.pipeline.flows.map((f) => f.description)).toEqual([
      'Does a step',
      'Writes the plan',
    ]);
  });

  it('F-11 AC-027 refuses a blank flow description with the parser message and keeps the previous value', () => {
    const before = config();
    const result = applyFlowField(before, 'plan', { field: 'description', value: ' ' });
    expect(result).toEqual({ ok: false, reason: 'Description must be non-blank text.' });
    expect(before.flows[1]?.description).toBe('Does a step');
  });

  it('F-11 AC-027 applies a flow model and an arguments text', () => {
    const model = applyFlowField(config(), 'plan', { field: 'model', value: 'haiku' });
    expect(model.ok && model.pipeline.flows[1]?.model).toBe('haiku');

    const args = applyFlowField(config(), 'plan', { field: 'arguments', value: 'the spec file' });
    expect(args.ok && args.pipeline.flows[1]?.arguments).toBe('the spec file');
  });

  it('F-11 AC-027 throws for a flow id that is not in the pipeline', () => {
    expect(() => applyFlowField(config(), 'missing', { field: 'description', value: 'x' })).toThrow(
      'The pipeline has no flow with the id missing.',
    );
  });
});

describe('F-11 AC-028 body length in code points', () => {
  it('F-11 AC-028 accepts a pipeline body of 1,000 characters', () => {
    const result = applyPipelineField(config(), { field: 'body', value: 'a'.repeat(1000) });
    expect(result.ok && result.pipeline.body).toBe('a'.repeat(1000));
  });

  it('F-11 AC-028 refuses a pipeline body of 1,001 characters with the parser message', () => {
    const result = applyPipelineField(config(), { field: 'body', value: 'a'.repeat(1001) });
    expect(result).toEqual({ ok: false, reason: 'Body must be at most 1000 characters.' });
  });

  it('F-11 AC-028 counts one emoji as one character', () => {
    const accepted = applyPipelineField(config(), { field: 'body', value: 'a'.repeat(999) + EMOJI });
    expect(accepted.ok).toBe(true);

    const refused = applyPipelineField(config(), { field: 'body', value: 'a'.repeat(1000) + EMOJI });
    expect(refused.ok).toBe(false);
  });

  it('F-11 AC-028 counts 1,000 emoji as accepted and 1,001 as refused', () => {
    expect(applyFlowField(config(), 'plan', { field: 'body', value: EMOJI.repeat(1000) }).ok).toBe(true);
    expect(applyFlowField(config(), 'plan', { field: 'body', value: EMOJI.repeat(1001) }).ok).toBe(false);
  });

  it('F-11 AC-028 clears a flow body with undefined', () => {
    const withBody = config([flow('specify', { body: 'Old text' }), flow('plan')]);
    const result = applyFlowField(withBody, 'specify', { field: 'body', value: undefined });
    expect(result.ok).toBe(true);
    expect(result.ok && 'body' in (result.pipeline.flows[0] ?? {})).toBe(false);
  });
});

describe('F-11 AC-029 flow name', () => {
  const valid = ['Plan', 'Plan 2', 'Write the Spec!', 'Ünïcode name'];
  for (const name of valid) {
    it(`F-11 AC-029 accepts the free-text name "${name}"`, () => {
      const result = applyFlowField(config(), 'plan', { field: 'name', value: name });
      expect(result.ok && result.pipeline.flows[1]?.name).toBe(name);
    });
  }

  const blank: Array<[string, string]> = [
    ['empty', ''],
    ['of spaces', '   '],
    ['of tabs and newlines', '\t\n'],
  ];
  for (const [label, value] of blank) {
    it(`F-11 AC-029 refuses a name that is ${label}, with the reason, and keeps the previous name`, () => {
      const before = config();
      const result = applyFlowField(before, 'plan', { field: 'name', value });
      expect(result).toEqual({ ok: false, reason: 'Name must be non-blank text.' });
      expect(before.flows[1]?.name).toBe('Name plan');
    });
  }

  const duplicates: string[] = ['Name specify', ' Name specify ', 'Name specify\t'];
  for (const value of duplicates) {
    it(`F-11 AC-029 refuses the name "${value}" that another flow already has`, () => {
      const before = config();
      const result = applyFlowField(before, 'plan', { field: 'name', value });
      expect(result).toEqual({ ok: false, reason: NAME_TAKEN_REASON });
      expect(before.flows[1]?.name).toBe('Name plan');
    });
  }

  it('F-11 AC-029 keeps a flow own name without a clash', () => {
    const result = applyFlowField(config(), 'plan', { field: 'name', value: 'Name plan' });
    expect(result.ok && result.pipeline.flows[1]?.name).toBe('Name plan');
  });

  it('F-11 AC-029 compares names after trimming, so a name that differs only in surrounding space is refused', () => {
    const result = applyFlowField(config(), 'plan', { field: 'name', value: '  Name specify  ' });
    expect(result).toEqual({ ok: false, reason: NAME_TAKEN_REASON });
  });

  it('F-11 AC-029 compares names case-sensitively, so a name that differs only in case is accepted', () => {
    const result = applyFlowField(config(), 'plan', { field: 'name', value: 'name SPECIFY' });
    expect(result.ok && result.pipeline.flows[1]?.name).toBe('name SPECIFY');
  });

  it('F-11 AC-029 leaves the flow id unchanged when the name is edited', () => {
    const result = applyFlowField(config(), 'plan', { field: 'name', value: 'Write the plan' });
    expect(result.ok && result.pipeline.flows.map((f) => f.id)).toEqual(['specify', 'plan']);
  });
});
