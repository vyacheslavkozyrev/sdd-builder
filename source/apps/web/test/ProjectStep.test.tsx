import { describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TextField } from '@mui/material';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ProjectStep,
  NAME_ID,
  IDEA_ID,
  NAME_HELP,
  NAME_LIMIT_NOTE,
  IDEA_LIMIT_NOTE,
  BLANK_NOTE,
  IDEA_HELP_LIMIT,
  type ProjectStepProps,
} from '../src/wizard/ProjectStep.js';
import { PLACEHOLDER_LINE } from '../src/wizard/StepBody.js';
import type { WizardValues } from '../src/wizard/state.js';

interface FieldProps {
  id?: string;
  multiline?: boolean;
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
}

function render(props: Partial<ProjectStepProps> = {}): string {
  return renderToStaticMarkup(
    <ProjectStep name={props.name ?? ''} idea={props.idea ?? ''} onChange={props.onChange ?? (() => undefined)} />,
  );
}

/** The TextField elements in the tree ProjectStep returns, in document order. */
function fieldsOf(props: Partial<ProjectStepProps> = {}): ReactElement<FieldProps>[] {
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
  walk(
    ProjectStep({
      name: props.name ?? '',
      idea: props.idea ?? '',
      onChange: props.onChange ?? (() => undefined),
    }),
  );
  return found;
}

function fieldById(id: string, props: Partial<ProjectStepProps> = {}): ReactElement<FieldProps> {
  const field = fieldsOf(props).find((element) => element.props.id === id);
  if (!field) throw new Error(`no field ${id}`);
  return field;
}

/** Calls the field's change handler the way a typed or pasted change does. */
function change(id: string, value: string): Partial<WizardValues> | undefined {
  let patch: Partial<WizardValues> | undefined;
  const onChange = (next: Partial<WizardValues>): void => {
    patch = next;
  };
  const field = fieldById(id, { onChange });
  field.props.onChange?.({ target: { value } });
  return patch;
}

const repeat = (char: string, count: number): string => char.repeat(count);

describe('F-09 project step', () => {
  it('F-09 AC-001 the name is a single-line field, so Enter adds no line break (negative case)', () => {
    const name = fieldById(NAME_ID);
    expect(name.props.multiline).toBeFalsy();
    expect(render()).toMatch(/<input[^>]*id="project-name"/);
    expect(render()).not.toMatch(/<textarea[^>]*id="project-name"/);
  });

  it.each([
    ['99 code points', repeat('a', 99), repeat('a', 99)],
    ['100 code points', repeat('a', 100), repeat('a', 100)],
    ['101 code points', repeat('a', 101), repeat('a', 100)],
    ['an emoji as one code point', `${repeat('a', 99)}😀`, `${repeat('a', 99)}😀`],
    ['a paste that crosses the limit', `${repeat('a', 95)}${repeat('b', 10)}`, `${repeat('a', 95)}${repeat('b', 5)}`],
  ])('F-09 AC-003 the name keeps the first 100 code points when %s is typed or pasted', (_case, input, stored) => {
    expect(change(NAME_ID, input)).toEqual({ name: stored });
  });

  it('F-09 AC-003 the name shows the limit note when it has 100 code points', () => {
    expect(render({ name: repeat('a', 100) })).toContain(NAME_LIMIT_NOTE);
  });

  it('F-09 AC-003 the name shows its help line below the limit', () => {
    const markup = render({ name: repeat('a', 99) });
    expect(markup).toContain(NAME_HELP);
    expect(markup).not.toContain(NAME_LIMIT_NOTE);
  });

  it('F-09 AC-005 the idea is a multi-line field', () => {
    expect(fieldById(IDEA_ID).props.multiline).toBe(true);
    expect(render()).toMatch(/<textarea[^>]*id="project-idea"/);
  });

  it('F-09 AC-006 the idea counter is linked to the idea field for screen readers', () => {
    const markup = render({ idea: 'abc' });
    expect(markup).toContain('id="project-idea-counter"');
    expect(markup).toContain('aria-describedby="project-idea-counter"');
  });

  it('F-09 AC-005 a line break typed in the idea is kept in the stored value', () => {
    expect(change(IDEA_ID, 'first line\nsecond line')).toEqual({ idea: 'first line\nsecond line' });
  });

  it.each([
    ['empty', '', '0 / 5,000'],
    ['abc', 'abc', '3 / 5,000'],
    ['one emoji', '😀', '1 / 5,000'],
    ['exactly 5,000 code points', repeat('a', 5000), '5,000 / 5,000'],
  ])('F-09 AC-006 the idea counter shows the code point count when the idea is %s', (_case, idea, counter) => {
    expect(render({ idea })).toContain(counter);
  });

  it('F-09 AC-007 typing past 5,000 code points keeps the first 5,000 (negative case: the 5,001st is dropped)', () => {
    expect(change(IDEA_ID, repeat('a', 5001))).toEqual({ idea: repeat('a', 5000) });
  });

  it('F-09 AC-007 the idea shows the limit note at 5,000 code points', () => {
    const markup = render({ idea: repeat('a', 5000) });
    expect(markup).toContain(IDEA_LIMIT_NOTE);
    expect(markup).not.toContain(IDEA_HELP_LIMIT);
  });

  it.each([
    ['4,990 stored and 20 pasted', repeat('a', 4990), repeat('b', 20), repeat('a', 4990) + repeat('b', 10)],
    ['5,000 stored and a paste', repeat('a', 5000), repeat('b', 20), repeat('a', 5000)],
  ])('F-09 AC-008 a paste that crosses the limit keeps the first 5,000 code points (%s)', (_case, stored, pasted, expected) => {
    expect(change(IDEA_ID, stored + pasted)).toEqual({ idea: expected });
  });

  it('F-09 AC-008 a surrogate pair that would cross the limit is dropped whole (negative case)', () => {
    const input = repeat('a', 5000) + '😀';
    expect(change(IDEA_ID, input)).toEqual({ idea: repeat('a', 5000) });
    expect(change(IDEA_ID, repeat('a', 4999) + '😀b')).toEqual({ idea: repeat('a', 4999) + '😀' });
  });

  it('F-09 AC-012 the step shows the name field, the idea field and its counter', () => {
    const markup = render({ name: 'Demo', idea: 'abc' });
    expect(markup).toContain('Project name');
    expect(markup).toContain('Idea');
    expect(markup).toContain('3 / 5,000');
    expect(fieldsOf()).toHaveLength(2);
  });

  it('F-09 AC-012 the step no longer shows the F-08 placeholder line', () => {
    expect(render()).not.toContain(PLACEHOLDER_LINE);
  });

  it('F-09 AC-015 changing the name or the idea makes no storage, IndexedDB or console call', () => {
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
      change(NAME_ID, 'Demo');
      change(IDEA_ID, 'An idea');
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
    expect(calls).toEqual([]);
  });

  it('F-09 AC-015 the step source makes no storage or console call', () => {
    const source = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'wizard', 'ProjectStep.tsx'),
      'utf8',
    );
    for (const word of ['localStorage', 'sessionStorage', 'indexedDB', 'console']) {
      expect(source.includes(word), `ProjectStep must not use ${word}`).toBe(false);
    }
  });

  it('shows the blank note when the name and the idea are both empty (screen 02)', () => {
    expect(render({ name: '   ', idea: '' })).toContain(BLANK_NOTE);
    expect(render({ name: 'Demo', idea: '' })).not.toContain(BLANK_NOTE);
  });
});
