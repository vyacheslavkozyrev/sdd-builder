import { describe, expect, it } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StepBody, PLACEHOLDER_LINE } from '../src/wizard/StepBody.js';
import { Wizard } from '../src/wizard/Wizard.js';
import { WizardStepper } from '../src/wizard/WizardStepper.js';
import type { StepNumber } from '../src/wizard/steps.js';

const TITLES = ['Project', 'Technical details', 'Workflow', 'Analyze and generate'];
const STEPS: readonly StepNumber[] = [1, 2, 3, 4];

function render(step: StepNumber): string {
  return renderToStaticMarkup(<Wizard step={step} onPrev={() => undefined} onNext={() => undefined} />);
}

/** The direct children of the element a component returns. */
function childrenOf(element: ReactElement): ReactNode[] {
  const children = (element.props as { children?: ReactNode }).children;
  return Array.isArray(children) ? children : [children];
}

describe('F-08 wizard panel', () => {
  it('F-08 AC-004 renders the stepper row first and the step body after it', () => {
    const root = Wizard({ step: 2, onPrev: () => undefined, onNext: () => undefined });
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
    const body = markup.indexOf(PLACEHOLDER_LINE);
    expect(prev).toBeGreaterThanOrEqual(0);
    expect(body).toBeGreaterThan(prev);
    if (step === 4) {
      expect(next).toBe(-1);
    } else {
      expect(next).toBeGreaterThanOrEqual(0);
      expect(body).toBeGreaterThan(next);
    }
  });

  it.each(STEPS)('F-08 AC-013 on step %i shows the placeholder line', (step) => {
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
