import { describe, expect, it, vi } from 'vitest';
import { Stepper } from '@mui/material';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WizardStepper } from '../src/wizard/WizardStepper.js';
import type { StepNumber } from '../src/wizard/steps.js';

const TITLES = ['Project', 'Technical details', 'Workflow', 'Analyze and generate'];
const STEPS: readonly StepNumber[] = [1, 2, 3, 4];

interface ElementProps {
  children?: ReactNode;
  'aria-label'?: string;
  onClick?: () => void;
}

interface RowProps {
  children?: ReactNode;
  sx?: { display?: string; flexDirection?: string };
}

/** Every element in the tree, depth first. */
function allElements(node: ReactNode): ReactElement<ElementProps>[] {
  if (Array.isArray(node)) return node.flatMap((child) => allElements(child));
  if (!isValidElement<ElementProps>(node)) return [];
  return [node, ...allElements(node.props.children)];
}

/** Finds the first element in the tree whose props satisfy the predicate. */
function findElement(
  node: ReactNode,
  predicate: (props: ElementProps) => boolean,
): ReactElement<ElementProps> | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
    return undefined;
  }
  if (!isValidElement<ElementProps>(node)) return undefined;
  if (predicate(node.props)) return node;
  return findElement(node.props.children, predicate);
}

function navButton(step: StepNumber, label: 'Prev' | 'Next') {
  const element = WizardStepper({ step, onPrev: () => undefined, onNext: () => undefined });
  return findElement(element, (props) => props['aria-label'] === label);
}

function render(step: StepNumber): string {
  return renderToStaticMarkup(
    <WizardStepper step={step} onPrev={() => undefined} onNext={() => undefined} />,
  );
}

/** The opening button tag that carries the given aria-label. */
function buttonTag(markup: string, label: string): string {
  const match = new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`).exec(markup);
  if (!match) throw new Error(`No ${label} button in the markup`);
  return match[0];
}

describe('F-08 wizard stepper', () => {
  it('F-08 AC-001 shows the four step titles in order', () => {
    const markup = render(1);
    const positions = TITLES.map((title) => markup.indexOf(`>${title}<`));
    positions.forEach((position) => expect(position).toBeGreaterThanOrEqual(0));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it.each([
    { step: 1 as StepNumber, done: 0 },
    { step: 2 as StepNumber, done: 1 },
    { step: 3 as StepNumber, done: 2 },
    { step: 4 as StepNumber, done: 3 },
  ])('F-08 AC-002 on step $step marks $done step(s) completed and one active', ({ step, done }) => {
    const markup = render(step);
    const completed = (markup.match(/class="MuiStepLabel-label Mui-completed/g) ?? []).length;
    const active = (markup.match(/class="MuiStepLabel-label Mui-active/g) ?? []).length;
    expect(completed).toBe(done);
    expect(active).toBe(1);
  });

  it.each(STEPS)('F-08 AC-003 on step %i renders no step title as a button or link', (step) => {
    const markup = render(step);
    for (const title of TITLES) {
      const wrapped = new RegExp(`<(button|a)\\b(?:(?!<\\/\\1>)[\\s\\S])*>${title}<`);
      expect(markup).not.toMatch(wrapped);
    }
    expect(markup).not.toMatch(/role="button"/);
  });

  it('F-08 AC-003 gives no stepper element a click handler; only Prev and Next carry one', () => {
    const element = WizardStepper({ step: 2, onPrev: () => undefined, onNext: () => undefined });
    const handlers = allElements(element)
      .filter((el) => el.props.onClick !== undefined)
      .map((el) => el.props['aria-label'])
      .sort();
    expect(handlers).toEqual(['Next', 'Prev']);
  });

  it('F-08 AC-004 places Prev before the stepper titles and Next after them, in one row', () => {
    const markup = render(2);
    const prev = markup.indexOf('aria-label="Prev"');
    const first = markup.indexOf('>Project<');
    const next = markup.indexOf('aria-label="Next"');
    expect(prev).toBeGreaterThanOrEqual(0);
    expect(first).toBeGreaterThan(prev);
    expect(next).toBeGreaterThan(first);

    const root = WizardStepper({ step: 2, onPrev: () => undefined, onNext: () => undefined });
    expect(isValidElement<RowProps>(root)).toBe(true);
    if (!isValidElement<RowProps>(root)) return;
    expect(root.props.sx?.display).toBe('flex');
    expect(root.props.sx?.flexDirection ?? 'row').toBe('row');
    const direct = Array.isArray(root.props.children) ? root.props.children : [root.props.children];
    expect(direct.some((child) => isValidElement(child) && child.type === Stepper)).toBe(true);
  });

  it.each([
    { step: 1 as StepNumber, disabled: true },
    { step: 2 as StepNumber, disabled: false },
    { step: 3 as StepNumber, disabled: false },
    { step: 4 as StepNumber, disabled: false },
  ])('F-08 AC-005 on step $step sets Prev disabled to $disabled', ({ step, disabled }) => {
    const tag = buttonTag(render(step), 'Prev');
    expect(tag.includes('disabled=""')).toBe(disabled);
  });

  it.each([1, 2, 3] as const)('F-08 AC-006 calls onNext once from step %i', (step) => {
    const onNext = vi.fn();
    const element = WizardStepper({ step, onPrev: () => undefined, onNext });
    const next = findElement(element, (props) => props['aria-label'] === 'Next');
    expect(next).toBeDefined();
    next?.props.onClick?.();
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('F-08 AC-006 calls onPrev once when Prev is clicked on step 2', () => {
    const onPrev = vi.fn();
    const element = WizardStepper({ step: 2, onPrev, onNext: () => undefined });
    const prev = findElement(element, (props) => props['aria-label'] === 'Prev');
    prev?.props.onClick?.();
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('F-08 AC-007 does not render Next on step 4', () => {
    const markup = render(4);
    expect(markup).not.toContain('aria-label="Next"');
    expect(markup).not.toContain('>Next<');
    expect(navButton(4, 'Next')).toBeUndefined();
  });

  it('F-08 AC-007 renders Next on steps 1, 2 and 3', () => {
    for (const step of [1, 2, 3] as const) {
      expect(render(step)).toContain('aria-label="Next"');
    }
  });

  it('F-08 AC-014 renders the stepper as a Material UI stepper', () => {
    expect(render(1)).toContain('MuiStepper-root');
  });

  it('F-08 AC-014 renders Prev and Next as Material UI buttons', () => {
    const markup = render(2);
    expect(buttonTag(markup, 'Prev')).toContain('MuiButton-root');
    expect(buttonTag(markup, 'Next')).toContain('MuiButton-root');
  });
});
