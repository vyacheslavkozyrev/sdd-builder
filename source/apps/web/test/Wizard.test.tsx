import { describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProjectStep, NAME_ID } from '../src/wizard/ProjectStep.js';
import { StepBody, PLACEHOLDER_LINE } from '../src/wizard/StepBody.js';
import { PipelineStep } from '../src/wizard/PipelineStep.js';
import { TAB_ROW_LABEL } from '../src/builder/PipelineTabs.js';
import { Wizard } from '../src/wizard/Wizard.js';
import { ADD_LABEL } from '../src/wizard/RuleBlocks.js';
import {
  LANGUAGE_ID,
  ARCHITECTURE_ID,
  FRAMEWORK_ID,
  PLATFORM_ID,
  BUILD_TOOL_ID,
  TEST_FRAMEWORK_ID,
} from '../src/wizard/TechnicalStep.js';
import { WizardStepper } from '../src/wizard/WizardStepper.js';
import { defaultWizardPipeline, type WizardValues } from '../src/wizard/state.js';
import type { StepNumber } from '../src/wizard/steps.js';

const TITLES = ['Project', 'Technical details', 'Workflow', 'Analyze and generate'];
const STEPS: readonly StepNumber[] = [1, 2, 3, 4];
const EMPTY: WizardValues = {
  name: '',
  idea: '',
  stack: { language: '', framework: '', platform: '', buildTool: '', testFramework: '' },
  architecture: '',
  rules: [],
  pipeline: defaultWizardPipeline(),
};

// The marker that shows the step body of each step: the project name field on
// step 1 (F-09 AC-012), the language field on step 2 (F-10 AC-019), the F-08
// tab row on step 3 (F-11 AC-041), the F-08 placeholder line on step 4.
const BODY_MARKER: Readonly<Record<StepNumber, string>> = {
  1: `id="${NAME_ID}"`,
  2: `id="${LANGUAGE_ID}"`,
  3: `aria-label="${TAB_ROW_LABEL}"`,
  4: PLACEHOLDER_LINE,
};

// No-op handlers for the panel's props; these tests only read the markup or the element tree.
const HANDLERS = {
  onUpdate: () => undefined,
  onAddRule: () => undefined,
  onRemoveRule: () => undefined,
  onUpdateRule: () => undefined,
  onPrev: () => undefined,
  onNext: () => undefined,
};

function render(step: StepNumber, values: Partial<WizardValues> = {}): string {
  return renderToStaticMarkup(<Wizard step={step} values={{ ...EMPTY, ...values }} {...HANDLERS} />);
}

/** The direct children of the element a component returns. */
function childrenOf(element: ReactElement): ReactNode[] {
  const children = (element.props as { children?: ReactNode }).children;
  return Array.isArray(children) ? children : [children];
}

describe('F-08 wizard panel', () => {
  it('F-08 AC-004 renders the stepper row first and the step body after it', () => {
    const root = Wizard({ step: 4, values: EMPTY, ...HANDLERS });
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

  it('F-08 AC-013 on step 4 shows the placeholder line', () => {
    expect(render(4)).toContain(PLACEHOLDER_LINE);
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
      const root = Wizard({ step, values: EMPTY, ...HANDLERS });
      const second = isValidElement(root) ? childrenOf(root)[1] : undefined;
      return isValidElement(second) ? second.type : undefined;
    };
    expect(body(1)).toBe(ProjectStep);
    expect(body(2)).toBeDefined();
    expect(body(2)).not.toBe(StepBody);
    expect(body(3)).toBe(PipelineStep);
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

describe('F-10 wizard technical details step', () => {
  it.each(STEPS)('F-10 AC-019 on step %i shows the step body for that step (table-driven over the four steps)', (step) => {
    const markup = render(step);
    if (step === 1) {
      expect(markup).toContain(`id="${NAME_ID}"`);
      expect(markup).not.toContain(ADD_LABEL);
    }
    if (step === 2) {
      for (const id of [LANGUAGE_ID, FRAMEWORK_ID, PLATFORM_ID, BUILD_TOOL_ID, TEST_FRAMEWORK_ID, ARCHITECTURE_ID]) {
        expect(markup).toContain(`id="${id}"`);
      }
      expect(markup).toContain(ADD_LABEL);
      expect(markup).not.toContain(PLACEHOLDER_LINE);
    }
    if (step === 3) {
      expect(markup).toContain(`aria-label="${TAB_ROW_LABEL}"`);
      expect(markup).not.toContain(PLACEHOLDER_LINE);
      expect(markup).not.toContain(ADD_LABEL);
      expect(markup).not.toContain(`id="${LANGUAGE_ID}"`);
    }
    if (step === 4) {
      expect(markup).toContain(PLACEHOLDER_LINE);
      expect(markup).not.toContain(ADD_LABEL);
      expect(markup).not.toContain(`id="${LANGUAGE_ID}"`);
    }
  });

  it('F-10 AC-019 on step 2 the stack and architecture come before the rule list in the markup', () => {
    const markup = render(2);
    const language = markup.indexOf(`id="${LANGUAGE_ID}"`);
    const architecture = markup.indexOf(`id="${ARCHITECTURE_ID}"`);
    const add = markup.indexOf(ADD_LABEL);
    expect(language).toBeGreaterThanOrEqual(0);
    expect(architecture).toBeGreaterThan(language);
    expect(add).toBeGreaterThan(architecture);
  });

  it('F-10 AC-019 on step 2 the rule list shows the empty text and no rule block on a new project', () => {
    const markup = render(2);
    expect(markup).toContain('No rule blocks yet.');
    expect(markup).not.toContain('Rule block 1');
  });

  it('F-10 AC-019 on step 2 the step body is the technical card, not the F-08 body or the project step', () => {
    const root = Wizard({ step: 2, values: EMPTY, ...HANDLERS });
    const second = isValidElement(root) ? childrenOf(root)[1] : undefined;
    expect(isValidElement(second), 'the step body must be an element').toBe(true);
    expect(isValidElement(second) && second.type).not.toBe(StepBody);
    expect(isValidElement(second) && second.type).not.toBe(ProjectStep);
  });
});

describe('F-11 wizard workflow step', () => {
  it('F-11 AC-041 on step 3 the step body is the Pipeline step, given the pipeline and the rule blocks', () => {
    const values: WizardValues = { ...EMPTY, rules: [{ name: 'Code style', description: 'Use the formatter.' }] };
    const root = Wizard({ step: 3, values, ...HANDLERS });
    const second = isValidElement(root) ? childrenOf(root)[1] : undefined;
    expect(isValidElement(second) && second.type).toBe(PipelineStep);
    const props = isValidElement(second) ? (second.props as { pipeline: unknown; ruleBlocks: unknown }) : undefined;
    expect(props?.pipeline).toBe(values.pipeline);
    expect(props?.ruleBlocks).toBe(values.rules);
  });

  it('F-11 AC-040 a change on step 3 reports the new pipeline through the update action', () => {
    const onUpdate = vi.fn();
    const root = Wizard({ step: 3, values: EMPTY, ...HANDLERS, onUpdate });
    const second = isValidElement(root) ? childrenOf(root)[1] : undefined;
    const next = { ...EMPTY.pipeline, name: 'Changed' };
    const onChange = isValidElement(second) ? (second.props as { onChange: (value: unknown) => void }).onChange : undefined;
    onChange?.(next);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({ pipeline: next });
  });
});
