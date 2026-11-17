import { describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TextField } from '@mui/material';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TechnicalStep,
  LANGUAGE_ID,
  FRAMEWORK_ID,
  PLATFORM_ID,
  BUILD_TOOL_ID,
  TEST_FRAMEWORK_ID,
  ARCHITECTURE_ID,
  STACK_HELP_REQUIRED,
  STACK_HELP_LIMIT,
  BLANK_LANGUAGE_NOTE,
  ARCHITECTURE_HELP,
  type TechnicalStepProps,
} from '../src/wizard/TechnicalStep.js';
import type { StackValues, WizardValues } from '../src/wizard/state.js';

interface FieldProps {
  id?: string;
  multiline?: boolean;
  required?: boolean;
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
}

const EMPTY_STACK: StackValues = {
  language: '',
  framework: '',
  platform: '',
  buildTool: '',
  testFramework: '',
};

const STACK_IDS = [LANGUAGE_ID, FRAMEWORK_ID, PLATFORM_ID, BUILD_TOOL_ID, TEST_FRAMEWORK_ID] as const;

function props(overrides: Partial<TechnicalStepProps> = {}): TechnicalStepProps {
  return {
    stack: overrides.stack ?? EMPTY_STACK,
    architecture: overrides.architecture ?? '',
    onChange: overrides.onChange ?? (() => undefined),
  };
}

function render(overrides: Partial<TechnicalStepProps> = {}): string {
  return renderToStaticMarkup(<TechnicalStep {...props(overrides)} />);
}

/** The TextField elements in the tree TechnicalStep returns, in document order. */
function fieldsOf(overrides: Partial<TechnicalStepProps> = {}): ReactElement<FieldProps>[] {
  const found: ReactElement<FieldProps>[] = [];
  const walk = (node: ReactNode): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isValidElement(node)) return;
    if (node.type === TextField) found.push(node as ReactElement<FieldProps>);
    walk((node.props as { children?: ReactNode }).children);
  };
  walk(TechnicalStep(props(overrides)));
  return found;
}

function fieldById(id: string, overrides: Partial<TechnicalStepProps> = {}): ReactElement<FieldProps> {
  const field = fieldsOf(overrides).find((element) => element.props.id === id);
  if (!field) throw new Error(`no field ${id}`);
  return field;
}

/** Calls a field's change handler the way a typed or pasted change does, and returns the patch. */
function change(id: string, value: string, stack: StackValues = EMPTY_STACK): Partial<WizardValues> | undefined {
  let patch: Partial<WizardValues> | undefined;
  const onChange = (next: Partial<WizardValues>): void => {
    patch = next;
  };
  fieldById(id, { stack, onChange }).props.onChange?.({ target: { value } });
  return patch;
}

const repeat = (char: string, count: number): string => char.repeat(count);

describe('F-10 technical details step: stack fields', () => {
  it('F-10 AC-001 the five stack fields are single-line inputs, so Enter adds no line break (negative case)', () => {
    const markup = render();
    for (const id of STACK_IDS) {
      expect(fieldById(id).props.multiline, id).toBeFalsy();
      expect(markup).toMatch(new RegExp(`<input[^>]*id="${id}"`));
      expect(markup).not.toMatch(new RegExp(`<textarea[^>]*id="${id}"`));
    }
  });

  it('F-10 AC-002 language is marked required and the other four stack fields are optional', () => {
    expect(fieldById(LANGUAGE_ID).props.required).toBe(true);
    for (const id of [FRAMEWORK_ID, PLATFORM_ID, BUILD_TOOL_ID, TEST_FRAMEWORK_ID]) {
      expect(fieldById(id).props.required, id).toBeFalsy();
    }
    expect(render({ stack: { ...EMPTY_STACK, language: 'TypeScript' } })).toContain(STACK_HELP_REQUIRED);
  });

  it.each([
    ['an empty language', ''],
    ['a spaces-only language', '   '],
  ])('F-10 AC-002 %s shows the blank note and leaves the language input enabled', (_case, language) => {
    const markup = render({ stack: { ...EMPTY_STACK, language } });
    expect(markup).toContain(BLANK_LANGUAGE_NOTE);
    expect(markup).not.toContain(STACK_HELP_LIMIT);
    expect(markup).not.toMatch(/<input[^>]*id="technical-language"[^>]*disabled/);
  });

  it('F-10 AC-002 a language with text shows the help lines and not the blank note', () => {
    const markup = render({ stack: { ...EMPTY_STACK, language: 'TypeScript' } });
    expect(markup).toContain(STACK_HELP_REQUIRED);
    expect(markup).not.toContain(BLANK_LANGUAGE_NOTE);
  });

  it.each([
    ['TypeScript', 'TypeScript'],
    ['  Node  ', '  Node  '],
    ['   ', '   '],
  ])('F-10 AC-003 the language stores %j as typed, spaces kept', (input, stored) => {
    expect(change(LANGUAGE_ID, input)).toEqual({
      stack: { ...EMPTY_STACK, language: stored },
    });
  });

  it.each([
    [FRAMEWORK_ID, 'framework', 'React'],
    [PLATFORM_ID, 'platform', ' Web browser '],
    [BUILD_TOOL_ID, 'buildTool', 'Vite'],
    [TEST_FRAMEWORK_ID, 'testFramework', '   '],
  ] as const)('F-10 AC-003 the field %s stores its value as typed, spaces kept', (id, key, input) => {
    expect(change(id, input)).toEqual({ stack: { ...EMPTY_STACK, [key]: input } });
  });

  it('F-10 AC-003 a change keeps the other stack values', () => {
    const stack: StackValues = { ...EMPTY_STACK, language: 'TypeScript', buildTool: 'Vite' };
    expect(change(FRAMEWORK_ID, 'React', stack)).toEqual({
      stack: { ...stack, framework: 'React' },
    });
  });

  it.each([
    ['99 code points', repeat('a', 99), repeat('a', 99)],
    ['100 code points', repeat('a', 100), repeat('a', 100)],
    ['101 code points', repeat('a', 101), repeat('a', 100)],
    ['an emoji as one code point', `${repeat('a', 99)}😀`, `${repeat('a', 99)}😀`],
    ['an emoji crossing the limit', `${repeat('a', 100)}😀`, repeat('a', 100)],
    ['a paste that crosses the limit', `${repeat('a', 95)}${repeat('b', 10)}`, `${repeat('a', 95)}${repeat('b', 5)}`],
  ])('F-10 AC-004 a single-line stack field keeps the first 100 code points: %s', (_case, input, stored) => {
    expect(change(FRAMEWORK_ID, input)).toEqual({ stack: { ...EMPTY_STACK, framework: stored } });
    expect(change(LANGUAGE_ID, input)).toEqual({ stack: { ...EMPTY_STACK, language: stored } });
  });

  it('F-10 AC-004 the stack shows its limit line below the fields', () => {
    expect(render({ stack: { ...EMPTY_STACK, language: 'TypeScript' } })).toContain(STACK_HELP_LIMIT);
  });
});

describe('F-10 technical details step: architecture text', () => {
  it('F-10 AC-005 the architecture is a multi-line field', () => {
    expect(fieldById(ARCHITECTURE_ID).props.multiline).toBe(true);
    expect(render()).toMatch(/<textarea[^>]*id="technical-architecture"/);
  });

  it('F-10 AC-005 a line break typed in the architecture is kept in the stored value', () => {
    expect(change(ARCHITECTURE_ID, 'first line\nsecond line')).toEqual({
      architecture: 'first line\nsecond line',
    });
  });

  it('F-10 AC-005 the architecture shows no counter', () => {
    const markup = render({ architecture: repeat('a', 4000) });
    expect(markup).not.toMatch(/\d[\d,]* \/ 5,000/);
    expect(markup).toContain(ARCHITECTURE_HELP);
  });

  it('F-10 AC-005 an empty architecture is optional and not required (negative case)', () => {
    expect(fieldById(ARCHITECTURE_ID, { architecture: '' }).props.required).toBeFalsy();
  });

  it.each([
    ['4,999 stored and 2 typed', repeat('a', 4999), 'bb', repeat('a', 4999) + 'b'],
    ['5,000 stored and a paste', repeat('a', 5000), repeat('b', 20), repeat('a', 5000)],
    ['an empty text and 5,001 typed', '', repeat('a', 5001), repeat('a', 5000)],
  ])('F-10 AC-006 the architecture keeps the first 5,000 code points (%s)', (_case, stored, typed, expected) => {
    expect(change(ARCHITECTURE_ID, stored + typed)).toEqual({ architecture: expected });
  });

  it('F-10 AC-006 a surrogate pair that would cross the limit is dropped whole (negative case)', () => {
    expect(change(ARCHITECTURE_ID, repeat('a', 5000) + '😀')).toEqual({ architecture: repeat('a', 5000) });
    expect(change(ARCHITECTURE_ID, repeat('a', 4999) + '😀b')).toEqual({ architecture: repeat('a', 4999) + '😀' });
  });
});

describe('F-10 technical details step: no storage or console', () => {
  it('F-10 AC-022 changing the stack or the architecture makes no localStorage, sessionStorage, indexedDB or console call', () => {
    const calls: string[] = [];
    const record = (label: string) => (): void => {
      calls.push(label);
    };
    const fakeStorage = (label: string) => ({
      length: 0,
      key: record(`${label}.key`),
      getItem: record(`${label}.getItem`),
      setItem: record(`${label}.setItem`),
      removeItem: record(`${label}.removeItem`),
      clear: record(`${label}.clear`),
    });
    vi.stubGlobal('localStorage', fakeStorage('localStorage'));
    vi.stubGlobal('sessionStorage', fakeStorage('sessionStorage'));
    vi.stubGlobal('indexedDB', { open: record('indexedDB.open') });
    for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, method).mockImplementation(record(`console.${method}`));
    }
    try {
      change(LANGUAGE_ID, 'TypeScript');
      change(FRAMEWORK_ID, 'React');
      change(ARCHITECTURE_ID, 'Three packages');
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
    expect(calls).toEqual([]);
  });

  it('F-10 AC-022 the technical step source makes no storage or console call', () => {
    const source = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'wizard', 'TechnicalStep.tsx'),
      'utf8',
    );
    for (const word of ['localStorage', 'sessionStorage', 'indexedDB', 'console']) {
      expect(source.includes(word), `TechnicalStep must not use ${word}`).toBe(false);
    }
  });
});
