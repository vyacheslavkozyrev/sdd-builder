import { describe, expect, it } from 'vitest';
import type { pipeline as core } from '@sddbuilder/core';
import {
  createInitialWizardState,
  defaultPipelineValue,
  wizardReducer,
  type WizardState,
} from '../src/wizard/state.js';
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
    rules: [{ name: 'Tests', description: 'Every change has a test.' }],
  };
  return { step: 3, values: { ...values, pipeline: defaultPipelineValue() } };
}

describe('F-11 AC-039 step 3 starts with the default pipeline in the wizard state', () => {
  it('F-11 AC-039 a new wizard state holds a pipeline equal to the default pipeline', () => {
    expect(createInitialWizardState().values.pipeline).toEqual(defaultPipelineValue());
  });

  it('F-11 AC-039 the pipeline is still the default when the wizard reaches step 3', () => {
    const onStep3 = wizardReducer(wizardReducer(createInitialWizardState(), { type: 'next' }), { type: 'next' });
    expect(onStep3.step).toBe(3);
    expect(onStep3.values.pipeline).toEqual(defaultPipelineValue());
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

describe('F-11 AC-040 New project resets the pipeline to a fresh copy of the default', () => {
  it('F-11 AC-040 restart after a builder change puts back a pipeline equal to the default', () => {
    const changed = wizardReducer(step3WithValues(), {
      type: 'set-pipeline',
      pipeline: renamed(defaultPipelineValue(), 'Changed'),
    });
    const restarted = wizardReducer(changed, { type: 'restart' });
    expect(restarted.values.pipeline).toEqual(defaultPipelineValue());
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

  it('F-11 AC-040 restart returns to step 1 with the pipeline', () => {
    const restarted = wizardReducer(step3WithValues(), { type: 'restart' });
    expect(restarted.step).toBe(1);
    expect(restarted.values.pipeline).toEqual(defaultPipelineValue());
  });
});

describe('F-11 AC-040 two wizard states never share one pipeline object', () => {
  it('F-11 AC-040 two new wizard states hold different pipeline objects', () => {
    const first = createInitialWizardState();
    const second = createInitialWizardState();
    expect(first.values.pipeline).not.toBe(second.values.pipeline);
  });

  it('F-11 AC-040 two new wizard states do not share the flows array or a flow object', () => {
    const first = createInitialWizardState().values.pipeline;
    const second = createInitialWizardState().values.pipeline;
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
