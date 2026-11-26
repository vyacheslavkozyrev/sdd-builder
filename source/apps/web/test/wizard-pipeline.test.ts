import { describe, expect, it } from 'vitest';
import { pipeline as core } from '@sddbuilder/core';
import {
  createInitialWizardState,
  defaultPipelineValue,
  emptyPipelineValue,
  wizardReducer,
  type WizardState,
} from '../src/wizard/state.js';
import { addBlock } from '../src/builder/blocks.js';
import { flowArrows } from '../src/builder/blockArrows.js';
import { valuesWith } from './wizardValues.js';

type Pipeline = core.Pipeline;

// A pipeline that differs from the default in its name only: the builder's change in these tests.
function renamed(pipeline: Pipeline, name: string): Pipeline {
  return { ...pipeline, name };
}

// A wizard state on step 3 with the project values filled, so a test can see that nothing else changes.
function step3WithValues(): WizardState {
  const values = {
    ...valuesWith('Demo', 'kept idea'),
    architecture: 'layered',
    stack: { language: 'TypeScript', framework: '', platform: '', buildTool: '', testFramework: '' },
    rules: [{ id: '30aabb6e-ead3-53ea-a26a-790955058e0b', name: 'Tests', description: 'Every change has a test.' }],
  };
  return { step: 3, values: { ...values, pipeline: defaultPipelineValue() } };
}

describe('F-11 AC-039 step 3 starts with the empty pipeline of a new project (F-16 AC-019)', () => {
  it('F-16 AC-019 a new wizard state holds a pipeline equal to the empty pipeline', () => {
    expect(createInitialWizardState().values.pipeline).toEqual(emptyPipelineValue());
  });

  it('F-16 AC-019 the pipeline is still empty when the wizard reaches step 3', () => {
    const onStep3 = wizardReducer(wizardReducer(createInitialWizardState(), { type: 'next' }), { type: 'next' });
    expect(onStep3.step).toBe(3);
    expect(onStep3.values.pipeline).toEqual(emptyPipelineValue());
  });

  it('F-11 AC-039 the default pipeline is a valid pipeline with at least one flow', () => {
    expect(defaultPipelineValue().flows.length).toBeGreaterThan(0);
  });
});

describe('F-11 AC-039 a builder change replaces only the pipeline value', () => {
  it('F-11 AC-039 set-pipeline stores the pipeline it is given', () => {
    const next = renamed(defaultPipelineValue(), 'Changed');
    const after = wizardReducer(step3WithValues(), { type: 'set-pipeline', pipeline: next });
    expect(after.values.pipeline).toBe(next);
  });

  it('F-11 AC-039 set-pipeline keeps the step and every other value of the wizard', () => {
    const start = step3WithValues();
    const after = wizardReducer(start, {
      type: 'set-pipeline',
      pipeline: renamed(defaultPipelineValue(), 'Changed'),
    });
    expect(after.step).toBe(start.step);
    expect(after.values.name).toBe(start.values.name);
    expect(after.values.idea).toBe(start.values.idea);
    expect(after.values.stack).toBe(start.values.stack);
    expect(after.values.architecture).toBe(start.values.architecture);
    expect(after.values.rules).toBe(start.values.rules);
  });

  it('F-11 AC-039 the step 2 values are kept when a builder change is made on step 3', () => {
    const start = step3WithValues();
    const after = wizardReducer(start, {
      type: 'set-pipeline',
      pipeline: renamed(defaultPipelineValue(), 'Changed'),
    });
    expect(after.values).toEqual({ ...start.values, pipeline: after.values.pipeline });
  });

  it('F-11 AC-039 two builder changes in turn leave the last pipeline in the state', () => {
    const first = wizardReducer(step3WithValues(), {
      type: 'set-pipeline',
      pipeline: renamed(defaultPipelineValue(), 'First'),
    });
    const second = wizardReducer(first, {
      type: 'set-pipeline',
      pipeline: renamed(defaultPipelineValue(), 'Second'),
    });
    expect(second.values.pipeline.name).toBe('Second');
    expect(second.values.name).toBe('Demo');
  });

  it('F-11 AC-039 a builder change does not modify the pipeline it replaces (negative case)', () => {
    const start = step3WithValues();
    const snapshot = structuredClone(start.values.pipeline);
    wizardReducer(start, { type: 'set-pipeline', pipeline: renamed(defaultPipelineValue(), 'Changed') });
    expect(start.values.pipeline).toEqual(snapshot);
  });
});

describe('F-16 AC-019 New project resets the pipeline to the empty pipeline', () => {
  it('F-16 AC-019 restart after a builder change puts back a pipeline equal to the empty pipeline', () => {
    const changed = wizardReducer(step3WithValues(), {
      type: 'set-pipeline',
      pipeline: renamed(defaultPipelineValue(), 'Changed'),
    });
    const restarted = wizardReducer(changed, { type: 'restart' });
    expect(restarted.values.pipeline).toEqual(emptyPipelineValue());
    expect(restarted.values.pipeline.name).not.toBe('Changed');
  });

  it('F-11 AC-040 restart does not return the pipeline object of the state it resets', () => {
    const changed = wizardReducer(step3WithValues(), {
      type: 'set-pipeline',
      pipeline: renamed(defaultPipelineValue(), 'Changed'),
    });
    const restarted = wizardReducer(changed, { type: 'restart' });
    expect(restarted.values.pipeline).not.toBe(changed.values.pipeline);
  });

  it('F-16 AC-019 restart returns to step 1 with the empty pipeline', () => {
    const restarted = wizardReducer(step3WithValues(), { type: 'restart' });
    expect(restarted.step).toBe(1);
    expect(restarted.values.pipeline).toEqual(emptyPipelineValue());
  });
});

describe('F-11 AC-040 two wizard states never share one pipeline object', () => {
  it('F-11 AC-040 two new wizard states hold different pipeline objects', () => {
    const first = createInitialWizardState();
    const second = createInitialWizardState();
    expect(first.values.pipeline).not.toBe(second.values.pipeline);
  });

  it('F-11 AC-040 two new wizard states do not share the flows array or the arguments array', () => {
    const first = createInitialWizardState().values.pipeline;
    const second = createInitialWizardState().values.pipeline;
    expect(first.flows).not.toBe(second.flows);
    expect(first.arguments).not.toBe(second.arguments);
  });

  it('F-11 AC-040 two calls to defaultPipelineValue do not share the flows array or a flow object', () => {
    const first = defaultPipelineValue();
    const second = defaultPipelineValue();
    expect(first.flows).not.toBe(second.flows);
    const [firstFlow] = first.flows;
    const [secondFlow] = second.flows;
    expect(firstFlow).toBeDefined();
    expect(firstFlow).not.toBe(secondFlow);
  });

  it('F-11 AC-040 each call to defaultPipelineValue returns a new object (negative case)', () => {
    expect(defaultPipelineValue()).not.toBe(defaultPipelineValue());
  });

  it('F-11 AC-040 the restarted state and a state built before it hold different pipeline objects', () => {
    const before = createInitialWizardState();
    const restarted = wizardReducer(before, { type: 'restart' });
    expect(restarted.values.pipeline).not.toBe(before.values.pipeline);
  });
});

// The default pipeline's flow with the given id, or a failure when the default does not hold it.
function defaultFlow(id: string) {
  const found = defaultPipelineValue().flows.find((flow) => flow.id === id);
  if (found === undefined) throw new Error(`the default pipeline has no flow ${id}`);
  return found;
}

describe('F-12 AC-051 the default pipeline shows its blocks as the model holds them', () => {
  it('F-12 AC-051 each default flow holds the blocks of the default data', () => {
    const counts = defaultPipelineValue().flows.map((flow) => [flow.id, flow.blocks.length]);
    expect(counts).toEqual([
      ['f2cce1b4-ea0c-4dbe-9151-870598b6a4d2', 3],
      ['8a976641-9b75-4aa9-a363-fb78b4225c7a', 3],
      ['d3882ef1-5c45-41aa-9277-a98217396d45', 3],
      ['8408b4cd-929e-4963-a5f6-bfd38df9ba5b', 7],
      ['bab66c9b-eb9c-4cf4-b296-f40c8d7c5670', 3],
      ['1ecd7679-1b52-433e-bbff-ce61026ac435', 3],
    ]);
  });

  it('F-12 AC-051 a linear flow shows its arrows of next, in block order', () => {
    expect(flowArrows(defaultFlow('f2cce1b4-ea0c-4dbe-9151-870598b6a4d2')).map((arrow) => [arrow.fromId, arrow.toId])).toEqual([
      ['ecc92254-8daa-4879-9bcb-2bb7c96e4289', 'b86f903b-53da-44bf-9ac1-7bdfb71ea194'],
      ['b86f903b-53da-44bf-9ac1-7bdfb71ea194', '32c059f2-a0aa-4690-b6d0-02758bd5fe48'],
    ]);
  });

  it('F-12 AC-051 the build flow shows the true route of its condition and no arrow for the false stop', () => {
    const arrows = flowArrows(defaultFlow('8408b4cd-929e-4963-a5f6-bfd38df9ba5b'));
    expect(arrows).toHaveLength(6);
    expect(arrows).toContainEqual({
      fromId: 'beb2e8f1-fe82-4047-aa03-81354421880d',
      output: 'true',
      toId: '9988871d-3547-4cdd-a194-ec453c7a79f0',
      isReturn: false,
      roundLimit: null,
      branchLabel: 'true',
      roundsLabel: null,
    });
    expect(arrows.some((arrow) => arrow.fromId === 'beb2e8f1-fe82-4047-aa03-81354421880d' && arrow.output === 'false')).toBe(false);
  });

  it('F-12 AC-051 the default blocks keep their ids and kinds in order (negative: no block is invented)', () => {
    const kinds = defaultFlow('8408b4cd-929e-4963-a5f6-bfd38df9ba5b').blocks.map((block) => `${block.id}:${block.kind}`);
    expect(kinds).toEqual([
      '4bc03b55-3d19-4b03-8234-d2e219150936:start',
      '6bbdd49e-9b07-43dd-b011-7601a39a83b8:agent',
      '019bed91-c21b-4268-aebc-91ffc2ff7f8f:agent',
      '0ec10e27-473d-4cd4-8e69-7537192c2b76:agent',
      'beb2e8f1-fe82-4047-aa03-81354421880d:condition',
      '9988871d-3547-4cdd-a194-ec453c7a79f0:agent',
      'a211f4b5-c1ae-47c7-b4b9-dc637ce91e29:end',
    ]);
  });
});

describe('F-12 AC-053 step 3 keeps the pipeline with its blocks when the user moves to step 4 and back', () => {
  it('F-12 AC-053 the blocks added on step 3 are the same after next and prev', () => {
    const base = step3WithValues();
    const flows = base.values.pipeline.flows.map((flow) =>
      flow.id === 'f2cce1b4-ea0c-4dbe-9151-870598b6a4d2' ? addBlock(flow, 'end').flow : flow,
    );
    const onStep3 = wizardReducer(base, {
      type: 'set-pipeline',
      pipeline: { ...base.values.pipeline, flows },
    });
    const back = wizardReducer(wizardReducer(onStep3, { type: 'next' }), { type: 'prev' });
    expect(back.step).toBe(3);
    expect(back.values.pipeline).toBe(onStep3.values.pipeline);
    // The default specify flow has three blocks; the added End makes four.
    expect(back.values.pipeline.flows[0]?.blocks).toHaveLength(4);
  });

  it('F-12 AC-053 the pipeline is the same object on step 4 as on step 3 (negative: no reset on next)', () => {
    const base = step3WithValues();
    const onStep4 = wizardReducer(base, { type: 'next' });
    expect(onStep4.step).toBe(4);
    expect(onStep4.values.pipeline).toBe(base.values.pipeline);
  });
});

describe('F-16 AC-019 a new project starts with an empty pipeline', () => {
  it('F-16 AC-019 a new wizard state has zero flows and no arguments in its pipeline', () => {
    const { pipeline } = createInitialWizardState().values;
    expect(pipeline.flows).toHaveLength(0);
    expect(pipeline.arguments).toHaveLength(0);
  });

  it('F-16 AC-019 a restart has zero flows and no arguments in its pipeline', () => {
    const changed = wizardReducer(step3WithValues(), {
      type: 'set-pipeline',
      pipeline: defaultPipelineValue(),
    });
    const { pipeline } = wizardReducer(changed, { type: 'restart' }).values;
    expect(pipeline.flows).toHaveLength(0);
    expect(pipeline.arguments).toHaveLength(0);
  });

  it('F-16 AC-019 the parser refuses the empty pipeline with the problems at pipeline.flows and pipeline.name', () => {
    const result = core.parseProjectConfig({
      schemaVersion: 2,
      rules: [],
      pipeline: createInitialWizardState().values.pipeline,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.map((problem) => problem.path).sort()).toEqual(['pipeline.flows', 'pipeline.name']);
  });

  it('F-16 AC-019 the parser accepts the default pipeline, so the refusal is the empty pipeline alone (negative case)', () => {
    const result = core.parseProjectConfig({
      schemaVersion: 2,
      rules: [],
      pipeline: structuredClone(core.defaultPipeline),
    });
    expect(result.ok).toBe(true);
  });
});
