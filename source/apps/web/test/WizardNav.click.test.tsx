// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StepNumber } from '../src/wizard/steps.js';
import { WizardNav } from '../src/wizard/WizardNav.js';

afterEach(() => {
  cleanup();
});

describe('F-08 AC-005 Prev click', () => {
  const enabled: readonly StepNumber[] = [2, 3, 4];

  it.each(enabled)('F-08 AC-005 calls onPrev exactly once when Prev is clicked on step %i', (step) => {
    const onPrev = vi.fn();
    render(<WizardNav step={step} onPrev={onPrev} onNext={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Prev' }));

    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('F-08 AC-005 negative case: a click on the disabled Prev on step 1 calls nothing', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<WizardNav step={1} onPrev={onPrev} onNext={onNext} />);

    const prev = screen.getByRole('button', { name: 'Prev' });
    expect((prev as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(prev);

    expect(onPrev).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });
});

describe('F-08 AC-007 Next click', () => {
  const enabled: readonly StepNumber[] = [1, 2, 3];

  it.each(enabled)('F-08 AC-007 calls onNext exactly once when Next is clicked on step %i', (step) => {
    const onNext = vi.fn();
    render(<WizardNav step={step} onPrev={vi.fn()} onNext={onNext} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('F-08 AC-007 negative case: the disabled Next on step 4 has no enabled handler and calls nothing', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<WizardNav step={4} onPrev={onPrev} onNext={onNext} />);

    const next = screen.getByRole('button', { name: 'Next' });
    expect((next as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(next);

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrev).not.toHaveBeenCalled();
  });
});
