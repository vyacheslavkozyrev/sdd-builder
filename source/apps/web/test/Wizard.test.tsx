import { describe, expect, it } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectStep, NAME_ID } from '../src/wizard/ProjectStep.js';
import { StepBody, PLACEHOLDER_LINE } from '../src/wizard/StepBody.js';
import { Wizard } from '../src/wizard/Wizard.js';
import { WizardStepper } from '../src/wizard/WizardStepper.js';
import type { WizardValues } from '../src/wizard/state.js';
import type { StepNumber } from '../src/wizard/steps.js';

const TITLES = ['Project', 'Technical details', 'Workflow', 'Analyze and generate'];
const STEPS: readonly StepNumber[] = [1, 2, 3, 4];
const EMPTY: WizardValues = { name: '', idea: '' };

// The marker that shows the step body of each step: the project name field on
// step 1 (F-09 AC-012), the F-08 placeholder line on steps 2 to 4.
const BODY_MARKER: Readonly<Record<StepNumber, string>> = {
  1: `id="${NAME_ID}"`,
  2: PLACEHOLDER_LINE,
  3: PLACEHOLDER_LINE,
  4: PLACEHOLDER_LINE,
};

function render(step: StepNumber, values: WizardValues = EMPTY): string {
  return renderToStaticMarkup(
    <Wizard step={step} values={values} onUpdate={() => undefined} onPrev={() => undefined} onNext={() => undefined} />,
  );
}

/** The direct children of the element a component returns. */
function childrenOf(element: ReactElement): ReactNode[] {
  const children = (element.props as { children?: ReactNode }).children;
  return Array.isArray(children) ? children : [children];
}

describe('F-08 wizard panel', () => {
  it('F-08 AC-004 renders the stepper row first and the step body after it', () => {
    const root = Wizard({ step: 2, values: EMPTY, onUpdate: () => undefined, onPrev: () => undefined, onNext: () => undefined });
    expect(isValidElement(root)).toBe(true);
    if (!isValidElement(root)) return;
    const [first, second] = childrenOf(root);
    expect(isValidElement(first) && first.type).toBe(WizardStepper);
    expect(isValidElement(second) && second.type).toBe(StepBody);
  });

  it.each(STEPS)('F-08 AC-004 on step %i puts Prev and Next above the step body', (step) => {
    const markup = render(step);
    const prev = markup.indexOf('aria-label="Prev"');
    const next = markup.indexOf('aria-label="Next"');
    const body = markup.indexOf(BODY_MARKER[step]);
    expect(prev).toBeGreaterThanOrEqual(0);
    expect(next).toBeGreaterThan(prev);
    expect(body).toBeGreaterThan(next);
  });

  it('F-08 AC-007 on step 4 shows Next disabled above the step body (negative case: not enabled)', () => {
    const markup = render(4);
    const next = /<button[^>]*aria-label="Next"[^>]*>/.exec(markup)?.[0] ?? '';
    expect(next).toContain('disabled=""');
    expect(markup.indexOf('aria-label="Next"')).toBeLessThan(markup.indexOf(PLACEHOLDER_LINE));
  });

  it.each([2, 3, 4] as const)('F-08 AC-013 on step %i shows the placeholder line', (step) => {
    expect(render(step)).toContain(PLACEHOLDER_LINE);
  });

  it.each(STEPS)('F-08 AC-013 on step %i names the step only once, in the stepper', (step) => {
    const markup = render(step);
    for (const title of TITLES) {
      const count = markup.split(`>${title}<`).length - 1;
      expect(count).toBe(1);
    }
  });

  it.each(STEPS)('F-08 AC-013 on step %i shows no step counter', (step) => {
    const markup = render(step);
    expect(markup).not.toMatch(/step\s+\d\s+of\s+4/i);
    expect(markup).not.toMatch(/STEP\s+\d/);
  });

  it('F-08 AC-013 renders no input field in the step body', () => {
    const body = renderToStaticMarkup(<StepBody />);
    expect(body).toContain(PLACEHOLDER_LINE);
    expect(body).not.toMatch(/<(input|textarea|select)\b/);
    expect(body).not.toMatch(/role="(textbox|combobox|spinbutton)"/);
  });
});

describe('F-09 wizard project step', () => {
  it('F-09 AC-012 step selection: step 1 shows the project step, steps 2 to 4 the placeholder (table-driven)', () => {
    const body = (step: StepNumber) => {
      const root = Wizard({ step, values: EMPTY, onUpdate: () => undefined, onPrev: () => undefined, onNext: () => undefined });
      const second = isValidElement(root) ? childrenOf(root)[1] : undefined;
      return isValidElement(second) ? second.type : undefined;
    };
    expect(body(1)).toBe(ProjectStep);
    expect(body(2)).toBe(StepBody);
    expect(body(3)).toBe(StepBody);
    expect(body(4)).toBe(StepBody);
  });

  it('F-09 AC-012 on step 1 the project name field is shown and the placeholder line is not', () => {
    const markup = render(1);
    expect(markup).toContain(`id="${NAME_ID}"`);
    expect(markup).not.toContain(PLACEHOLDER_LINE);
  });

  // The guard on the match makes the "not disabled" check fail if the Next button is missing.
  function nextButtonOf(markup: string): string {
    const next = /<button[^>]*aria-label="Next"[^>]*>/.exec(markup)?.[0] ?? '';
    expect(next).toContain('aria-label="Next"');
    return next;
  }

  it.each([
    ['empty', ''],
    ['spaces-only', '   '],
  ])('F-09 AC-004 Next is not disabled on step 1 by a name that is %s (negative case)', (_label, name) => {
    expect(nextButtonOf(render(1, { name, idea: '' }))).not.toContain('disabled=""');
  });

  it.each([
    ['empty', ''],
    ['spaces-only', '   '],
  ])('F-09 AC-009 Next is not disabled on step 1 by an idea that is %s (negative case)', (_label, idea) => {
    expect(nextButtonOf(render(1, { name: 'Tracker', idea }))).not.toContain('disabled=""');
  });

  it('F-09 AC-013 wiring the values reach the project step fields', () => {
    const markup = render(1, { name: 'Tracker', idea: 'A tracker' });
    expect(markup).toContain('value="Tracker"');
    expect(markup).toContain('A tracker');
  });
});
