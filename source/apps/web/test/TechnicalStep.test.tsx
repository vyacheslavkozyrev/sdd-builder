// @vitest-environment jsdom
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { theme } from '../src/theme.js';
import { ARCHITECTURE_HELP_LINE, STACK_HELP_LINES, TechnicalStep } from '../src/wizard/TechnicalStep.js';
import type { ProjectValuesPatch, StackValues, WizardState, WizardValues } from '../src/wizard/state.js';
import { wizardReducer } from '../src/wizard/state.js';

const EMOJI = '\u{1F600}'; // one code point, two UTF-16 units

const BLANK_STACK: StackValues = { language: '', framework: '', platform: '', buildTool: '', testFramework: '' };
const BLANK: WizardValues = { name: '', idea: '', stack: BLANK_STACK, architecture: '', rules: [] };

function withStack(stack: Partial<StackValues>): WizardValues {
  return { ...BLANK, stack: { ...BLANK_STACK, ...stack } };
}

function renderStep(values: WizardValues, onChange: (patch: ProjectValuesPatch) => void = () => {}) {
  return render(
    <ThemeProvider theme={theme}>
      <TechnicalStep values={values} onChange={onChange} />
    </ThemeProvider>,
  );
}

function field(name: string): HTMLInputElement {
  return screen.getByRole('textbox', { name }) as HTMLInputElement;
}

function architectureInput(): HTMLTextAreaElement {
  return screen.getByRole('textbox', { name: 'Architecture (optional)' }) as HTMLTextAreaElement;
}

// The next wizard state from step 2 with these values; Next is enabled when the step moves on.
function nextStepFrom(values: WizardValues): number {
  const state: WizardState = { step: 2, values };
  return wizardReducer(state, { type: 'next' }).step;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('F-10 AC-001 the stack fields are single-line inputs', () => {
  it.each([
    ['Language', 'language'],
    ['Framework', 'framework'],
    ['Platform', 'platform'],
    ['Build tool', 'buildTool'],
    ['Test framework', 'testFramework'],
  ])('F-10 AC-001 renders %s as an input element, not a multi-line field', (label) => {
    renderStep(BLANK);
    const input = field(label);
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('aria-multiline')).toBeNull();
  });

  it('F-10 AC-001 a line break pasted into a stack field is not kept (negative case)', () => {
    const onChange = vi.fn();
    renderStep(BLANK, onChange);
    fireEvent.change(field('Framework'), { target: { value: 'React\nNext' } });
    expect(onChange).toHaveBeenLastCalledWith({ stack: { framework: 'ReactNext' } });
  });
});

describe('F-10 AC-002 language is required and blank language does not block Next', () => {
  it('F-10 AC-002 marks language as required and the other four as optional', () => {
    renderStep(BLANK);
    expect(field('Language').required).toBe(true);
    for (const label of ['Framework', 'Platform', 'Build tool', 'Test framework']) {
      expect(field(label).required).toBe(false);
    }
  });

  it.each(['', '   '])('F-10 AC-002 an empty or spaces-only language %j keeps Next enabled', (language) => {
    expect(nextStepFrom(withStack({ language }))).toBe(3);
  });
});

describe('F-10 AC-003 stack fields are stored as typed', () => {
  it.each([
    ['Language', 'language', 'TypeScript'],
    ['Language', 'language', '  Node  '],
    ['Language', 'language', '   '],
    ['Framework', 'framework', 'React'],
    ['Platform', 'platform', 'Web browser'],
    ['Build tool', 'buildTool', ' Vite '],
    ['Test framework', 'testFramework', 'Vitest'],
  ])('F-10 AC-003 %s (%s) keeps %j as typed', (label, key, typed) => {
    const onChange = vi.fn();
    renderStep(BLANK, onChange);
    fireEvent.change(field(label), { target: { value: typed } });
    expect(onChange).toHaveBeenLastCalledWith({ stack: { [key]: typed } });
  });
});

describe('F-10 AC-004 a stack field keeps the first 100 code points', () => {
  it.each([
    [99, 99],
    [100, 100],
    [101, 100],
  ])('F-10 AC-004 typing %i characters keeps %i', (typed, kept) => {
    const onChange = vi.fn();
    renderStep(BLANK, onChange);
    fireEvent.change(field('Framework'), { target: { value: 'a'.repeat(typed) } });
    expect(onChange).toHaveBeenLastCalledWith({ stack: { framework: 'a'.repeat(kept) } });
  });

  it('F-10 AC-004 an emoji counts as one code point', () => {
    const onChange = vi.fn();
    renderStep(BLANK, onChange);
    fireEvent.change(field('Platform'), { target: { value: 'a'.repeat(99) + EMOJI } });
    expect(onChange).toHaveBeenLastCalledWith({ stack: { platform: 'a'.repeat(99) + EMOJI } });
  });

  it('F-10 AC-004 a paste that crosses the limit keeps the characters up to 100 and drops the rest', () => {
    const onChange = vi.fn();
    renderStep(BLANK, onChange);
    fireEvent.change(field('Build tool'), { target: { value: 'a'.repeat(98) + 'bcdef' } });
    expect(onChange).toHaveBeenLastCalledWith({ stack: { buildTool: 'a'.repeat(98) + 'bc' } });
  });
});

describe('F-10 AC-005 the architecture is a multi-line field without a counter', () => {
  it('F-10 AC-005 renders the architecture as a multi-line field', () => {
    renderStep(BLANK);
    expect(architectureInput().tagName).toBe('TEXTAREA');
  });

  it('F-10 AC-005 keeps the line break typed in the architecture', () => {
    const onChange = vi.fn();
    renderStep(BLANK, onChange);
    fireEvent.change(architectureInput(), { target: { value: 'Core is pure.\nThe API calls the LLM.' } });
    expect(onChange).toHaveBeenLastCalledWith({ architecture: 'Core is pure.\nThe API calls the LLM.' });
  });

  it('F-10 AC-005 shows no counter for the architecture', () => {
    renderStep({ ...BLANK, architecture: 'Core' });
    expect(screen.queryByText(/\d+ \/ 5,000/)).toBeNull();
    expect(screen.getByText(ARCHITECTURE_HELP_LINE)).toBeTruthy();
  });

  it('F-10 AC-005 an empty architecture keeps Next enabled (negative case)', () => {
    expect(nextStepFrom({ ...BLANK, architecture: '' })).toBe(3);
  });
});

describe('F-10 AC-006 the architecture keeps the first 5,000 code points', () => {
  it('F-10 AC-006 typing two characters after 4,999 keeps 5,000', () => {
    const onChange = vi.fn();
    renderStep({ ...BLANK, architecture: 'a'.repeat(4999) }, onChange);
    fireEvent.change(architectureInput(), { target: { value: 'a'.repeat(4999) + 'bc' } });
    expect(onChange).toHaveBeenLastCalledWith({ architecture: 'a'.repeat(4999) + 'b' });
  });

  it('F-10 AC-006 a single paste of 5,001 characters keeps the first 5,000', () => {
    const onChange = vi.fn();
    renderStep(BLANK, onChange);
    fireEvent.change(architectureInput(), { target: { value: 'a'.repeat(5001) } });
    expect(onChange).toHaveBeenLastCalledWith({ architecture: 'a'.repeat(5000) });
  });

  it('F-10 AC-006 a paste into a text already at 5,000 leaves it unchanged', () => {
    const onChange = vi.fn();
    renderStep({ ...BLANK, architecture: 'a'.repeat(5000) }, onChange);
    fireEvent.change(architectureInput(), { target: { value: 'a'.repeat(5000) + 'pasted' } });
    expect(onChange).toHaveBeenLastCalledWith({ architecture: 'a'.repeat(5000) });
  });

  it('F-10 AC-006 a surrogate pair that would cross the limit is dropped whole (negative case)', () => {
    const onChange = vi.fn();
    renderStep(BLANK, onChange);
    fireEvent.change(architectureInput(), { target: { value: 'a'.repeat(4999) + EMOJI + EMOJI } });
    expect(onChange).toHaveBeenLastCalledWith({ architecture: 'a'.repeat(4999) + EMOJI });
  });
});

describe('F-10 AC-024 the technical details step makes no storage or console call', () => {
  it('F-10 AC-024 changing any stack field or the architecture calls no storage or console method', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const log = vi.spyOn(console, 'log');
    const info = vi.spyOn(console, 'info');
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    renderStep(BLANK);
    for (const label of ['Language', 'Framework', 'Platform', 'Build tool', 'Test framework']) {
      fireEvent.change(field(label), { target: { value: 'typed' } });
    }
    fireEvent.change(architectureInput(), { target: { value: 'typed' } });
    expect(storage).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

describe('F-10 AC-004 help lines of the stack', () => {
  it('F-10 AC-004 shows the required note and the 100-character limit under the stack fields', () => {
    renderStep(BLANK);
    for (const line of STACK_HELP_LINES) {
      expect(screen.getByText(line)).toBeTruthy();
    }
  });
});
