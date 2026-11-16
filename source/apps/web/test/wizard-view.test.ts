import { describe, expect, it } from 'vitest';
import { footerView, stepperView, wizardFrameView } from '../src/wizard/view.js';
import { backStep, nextStep, startWizard } from '../src/wizard/state.js';
import type { StepNumber, WizardState } from '../src/wizard/state.js';

interface FakeValues {
  name: string;
  idea: string;
}

const filled: FakeValues = { name: 'Demo', idea: 'A small tool' };

function atStep(step: StepNumber): WizardState<FakeValues> {
  return { step, values: filled };
}

describe('F-05 AC-003 the stepper marks the current step as current and the earlier steps as done', () => {
  const cases: ReadonlyArray<readonly [StepNumber, readonly string[]]> = [
    [1, ['current', 'todo', 'todo', 'todo']],
    [2, ['done', 'current', 'todo', 'todo']],
    [3, ['done', 'done', 'current', 'todo']],
    [4, ['done', 'done', 'done', 'current']],
  ];

  it.each(cases)('F-05 AC-003 on step %i the statuses are %j', (step, expected) => {
    expect(stepperView(atStep(step)).map((item) => item.status)).toEqual(expected);
  });

  it('F-05 AC-003 the stepper lists the four step titles in order', () => {
    expect(stepperView(atStep(1)).map((item) => item.title)).toEqual([
      'Project name and idea',
      'Technical details',
      'Workflow',
      'Analyze and generate',
    ]);
  });

  it('F-05 AC-003 the stepper lists the step numbers 1 to 4 in order', () => {
    expect(stepperView(atStep(2)).map((item) => item.step)).toEqual([1, 2, 3, 4]);
  });

  it('F-05 AC-003 moving forward with Next updates the statuses', () => {
    const next = nextStep(startWizard(filled));
    expect(stepperView(next).map((item) => item.status)).toEqual(['done', 'current', 'todo', 'todo']);
  });

  it('F-05 AC-003 moving back with Back updates the statuses', () => {
    const back = backStep(atStep(3));
    expect(stepperView(back).map((item) => item.status)).toEqual(['done', 'current', 'todo', 'todo']);
  });
});

describe('F-05 AC-003 the stepper has no click target', () => {
  it('F-05 AC-003 each stepper item carries only its step, title and status', () => {
    for (const item of stepperView(atStep(2))) {
      expect(Object.keys(item).sort()).toEqual(['status', 'step', 'title']);
    }
  });

  it('F-05 AC-003 the stepper view does not change the wizard state', () => {
    const state = atStep(2);
    stepperView(state);
    expect(state).toEqual({ step: 2, values: filled });
  });
});

describe('F-05 AC-002 the footer shows Back disabled on step 1 and hides Next on step 4', () => {
  const cases: ReadonlyArray<readonly [StepNumber, boolean, boolean]> = [
    [1, false, true],
    [2, true, true],
    [3, true, true],
    [4, true, false],
  ];

  it.each(cases)('F-05 AC-002 on step %i backEnabled is %s and nextVisible is %s', (step, back, next) => {
    expect(footerView(atStep(step))).toEqual({ backEnabled: back, nextVisible: next });
  });

  it('F-05 AC-002 a new wizard has Back disabled and Next visible', () => {
    expect(footerView(startWizard(filled))).toEqual({ backEnabled: false, nextVisible: true });
  });

  it('F-05 AC-002 Next is hidden only after reaching step 4 by Next', () => {
    let state = startWizard(filled);
    const visible: boolean[] = [footerView(state).nextVisible];
    for (let i = 0; i < 3; i += 1) {
      state = nextStep(state);
      visible.push(footerView(state).nextVisible);
    }
    expect(visible).toEqual([true, true, true, false]);
  });
});

describe('F-05 AC-002 and AC-003 the frame view combines the stepper and the footer', () => {
  it('F-05 AC-003 the frame view carries the stepper of the given state', () => {
    expect(wizardFrameView(atStep(3)).stepper).toEqual(stepperView(atStep(3)));
  });

  it('F-05 AC-002 the frame view carries the footer of the given state', () => {
    expect(wizardFrameView(atStep(4)).footer).toEqual({ backEnabled: true, nextVisible: false });
  });
});
