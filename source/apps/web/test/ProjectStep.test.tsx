// @vitest-environment jsdom
import { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { theme } from '../src/theme.js';
import { codePointCount } from '../src/wizard/project.js';
import {
  IDEA_HELP_LINES,
  IDEA_LIMIT_NOTE,
  NAME_HELP_LINE,
  NAME_LIMIT_NOTE,
  ProjectStep,
} from '../src/wizard/ProjectStep.js';
import { IDEA_ROWS, getProjectStepStyles } from '../src/wizard/projectStepStyles.js';
import type { ProjectValuesPatch, WizardValues } from '../src/wizard/state.js';
import { valuesWith } from './wizardValues.js';

const EMOJI = '\u{1F600}'; // one code point, two UTF-16 units
const PLACEHOLDER_LINE = 'The content of this step is added in a later feature.';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// The step with fixed values and a handler that records each patch; the values never change.
function renderFixed(values: WizardValues, onChange: (patch: ProjectValuesPatch) => void = () => {}) {
  return render(
    <ThemeProvider theme={theme}>
      <ProjectStep values={values} onChange={onChange} />
    </ThemeProvider>,
  );
}

// The step with its own state, so a change is shown back in the field and the counter.
function Harness({ initial, onPatch }: { initial: WizardValues; onPatch?: (patch: ProjectValuesPatch) => void }) {
  const [values, setValues] = useState(initial);
  return (
    <ThemeProvider theme={theme}>
      <ProjectStep
        values={values}
        onChange={(patch) => {
          onPatch?.(patch);
          setValues((current) => ({
            ...current,
            name: patch.name ?? current.name,
            idea: patch.idea ?? current.idea,
          }));
        }}
      />
    </ThemeProvider>
  );
}

function markupOf(values: WizardValues): string {
  return renderToStaticMarkup(
    <ThemeProvider theme={theme}>
      <ProjectStep values={values} onChange={() => {}} />
    </ThemeProvider>,
  );
}

const EMPTY: WizardValues = valuesWith('', '');

function nameInput(): HTMLInputElement {
  return screen.getByRole('textbox', { name: 'Project name' }) as HTMLInputElement;
}

function ideaInput(): HTMLTextAreaElement {
  return screen.getByRole('textbox', { name: 'Idea' }) as HTMLTextAreaElement;
}

describe('F-09 AC-001 the project name is a single-line input', () => {
  it('F-09 AC-001 renders the name as an input element, not a multi-line field', () => {
    renderFixed(EMPTY);
    expect(nameInput().tagName).toBe('INPUT');
  });

  it('F-09 AC-001 negative case: a line break in the name is removed, not kept', () => {
    const onChange = vi.fn();
    renderFixed(EMPTY, onChange);
    fireEvent.change(nameInput(), { target: { value: 'Demo\nNext' } });
    expect(onChange).toHaveBeenLastCalledWith({ name: 'DemoNext' });
  });
});

describe('F-09 AC-003 the name keeps the first 100 code points', () => {
  const cases: ReadonlyArray<readonly [string, string, string]> = [
    ['99 characters are kept', 'a'.repeat(99), 'a'.repeat(99)],
    ['100 characters are kept', 'a'.repeat(100), 'a'.repeat(100)],
    ['101 characters are cut to 100', 'a'.repeat(101), 'a'.repeat(100)],
    ['an emoji counts as one code point', 'a'.repeat(99) + EMOJI, 'a'.repeat(99) + EMOJI],
    ['an emoji past the limit is dropped whole', 'a'.repeat(100) + EMOJI, 'a'.repeat(100)],
  ];

  it.each(cases)('F-09 AC-003 typing: %s', (_label, typed, expected) => {
    const onChange = vi.fn();
    renderFixed(EMPTY, onChange);
    fireEvent.change(nameInput(), { target: { value: typed } });
    expect(onChange).toHaveBeenLastCalledWith({ name: expected });
  });

  it('F-09 AC-003 pasting across the limit keeps the characters up to 100 and drops the rest', () => {
    const onChange = vi.fn();
    renderFixed(valuesWith('a'.repeat(90), ''), onChange);
    fireEvent.change(nameInput(), { target: { value: 'a'.repeat(90) + 'b'.repeat(20) } });
    expect(onChange).toHaveBeenLastCalledWith({ name: 'a'.repeat(90) + 'b'.repeat(10) });
  });

  it('F-09 AC-003 negative case: the name field renders no counter such as N / 100', () => {
    expect(markupOf(valuesWith('a'.repeat(40), ''))).not.toMatch(/\d+ \/ 100\b/);
  });
});

describe('F-09 AC-005 the idea is a multi-line field that keeps line breaks', () => {
  it('F-09 AC-005 renders the idea as a textarea', () => {
    renderFixed(EMPTY);
    expect(ideaInput().tagName).toBe('TEXTAREA');
  });

  it('F-09 AC-005 pressing Enter in the idea adds a line break that is kept in the stored value', () => {
    const onChange = vi.fn();
    renderFixed(EMPTY, onChange);
    fireEvent.change(ideaInput(), { target: { value: 'line one\nline two' } });
    expect(onChange).toHaveBeenLastCalledWith({ idea: 'line one\nline two' });
  });
});

describe('F-09 AC-006 the idea counter shows N / 5,000 in code points', () => {
  const cases: ReadonlyArray<readonly [string, string, string]> = [
    ['empty text', '', '0 / 5,000'],
    ['three characters', 'abc', '3 / 5,000'],
    ['one emoji', EMOJI, '1 / 5,000'],
    ['exactly 5,000 code points', 'a'.repeat(5000), '5,000 / 5,000'],
  ];

  it.each(cases)('F-09 AC-006 shows the counter for %s', (_label, idea, expected) => {
    expect(markupOf(valuesWith('', idea))).toContain(expected);
  });
});

describe('F-09 AC-007 typing past 5,000 code points keeps the first 5,000', () => {
  it('F-09 AC-007 the 5,001st code point is not stored and the counter stays at 5,000 / 5,000', () => {
    const onPatch = vi.fn();
    render(<Harness initial={valuesWith('', 'a'.repeat(4999))} onPatch={onPatch} />);
    fireEvent.change(ideaInput(), { target: { value: 'a'.repeat(5000) + 'b' } });
    expect(onPatch).toHaveBeenLastCalledWith({ idea: 'a'.repeat(5000) });
    expect(codePointCount(ideaInput().value)).toBe(5000);
    expect(screen.getByText('5,000 / 5,000')).toBeTruthy();
  });
});

describe('F-09 AC-008 a paste that crosses 5,000 keeps the first code points up to the limit', () => {
  const cases: ReadonlyArray<readonly [string, string, string, string]> = [
    ['4,990 stored and 20 pasted keep 5,000', 'a'.repeat(4990), 'b'.repeat(20), 'a'.repeat(4990) + 'b'.repeat(10)],
    ['5,000 stored and any paste is unchanged', 'a'.repeat(5000), 'b'.repeat(7), 'a'.repeat(5000)],
    ['an emoji that would cross the limit is dropped whole', 'a'.repeat(4999), 'b' + EMOJI, 'a'.repeat(4999) + 'b'],
    ['an emoji that fits exactly is kept', 'a'.repeat(4999), EMOJI + EMOJI, 'a'.repeat(4999) + EMOJI],
  ];

  it.each(cases)('F-09 AC-008 %s', (_label, stored, pasted, expected) => {
    const onChange = vi.fn();
    renderFixed(valuesWith('', stored), onChange);
    fireEvent.change(ideaInput(), { target: { value: stored + pasted } });
    expect(onChange).toHaveBeenLastCalledWith({ idea: expected });
  });
});

describe('F-09 AC-012 the project step shows the name field, the idea field and the counter', () => {
  it('F-09 AC-012 renders both fields, their labels and the counter', () => {
    renderFixed(valuesWith('Demo', 'Short idea'));
    expect(nameInput().value).toBe('Demo');
    expect(ideaInput().value).toBe('Short idea');
    expect(screen.getByText('10 / 5,000')).toBeTruthy();
  });

  it('F-09 AC-012 negative case: the F-08 placeholder line is not shown on step 1', () => {
    expect(markupOf(EMPTY)).not.toContain(PLACEHOLDER_LINE);
  });
});

describe('F-09 AC-015 the project step makes no storage or console call on change', () => {
  it('F-09 AC-015 typing in both fields calls no storage, indexedDB or console method', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const clear = vi.spyOn(Storage.prototype, 'clear');
    const indexedDBOpen = vi.fn();
    vi.stubGlobal('indexedDB', { open: indexedDBOpen });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<Harness initial={EMPTY} />);
    fireEvent.change(nameInput(), { target: { value: 'Demo' } });
    fireEvent.change(ideaInput(), { target: { value: 'An idea' } });
    for (const spy of [getItem, setItem, removeItem, clear, indexedDBOpen, log, info, debug, warn, error]) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
});

describe('F-09 AC-016 the help text is exactly the approved wording', () => {
  it('F-09 AC-016 the name help line is the exact approved text', () => {
    expect(NAME_HELP_LINE).toBe(
      'Up to 100 characters; text past the limit is cut. It appears as the project name in the generated CLAUDE.md.',
    );
    expect(markupOf(EMPTY)).toContain(NAME_HELP_LINE);
  });

  it('F-09 AC-016 the three idea help lines are the exact approved texts, in order', () => {
    expect(IDEA_HELP_LINES).toEqual([
      'Describe what the product does and who uses it. Leave out how it is built.',
      'Nothing is stored between visits. Reloading clears the wizard.',
      'Up to 5,000 characters. Text past the limit is cut.',
    ]);
    const html = markupOf(EMPTY);
    for (const line of IDEA_HELP_LINES) {
      expect(html).toContain(line);
    }
  });
});

describe('F-09 AC-017 the limit notes show when a limit is reached (screen 03)', () => {
  it('F-09 AC-017 the name note replaces the name help line at 100 characters', () => {
    const html = markupOf(valuesWith('a'.repeat(100), ''));
    expect(html).toContain(NAME_LIMIT_NOTE);
    expect(html).not.toContain(NAME_HELP_LINE);
  });

  it('F-09 AC-017 the idea note and the 5,000 / 5,000 counter show at the idea limit, with the help lines', () => {
    const html = markupOf(valuesWith('', 'a'.repeat(5000)));
    expect(html).toContain(IDEA_LIMIT_NOTE);
    expect(html).toContain('5,000 / 5,000');
    for (const line of IDEA_HELP_LINES) {
      expect(html).toContain(line);
    }
  });

  it('F-09 AC-017 negative case: below the limit no limit note is shown', () => {
    const html = markupOf(valuesWith('a'.repeat(99), 'a'.repeat(4999)));
    expect(html).not.toContain(NAME_LIMIT_NOTE);
    expect(html).not.toContain(IDEA_LIMIT_NOTE);
  });
});

describe('F-09 AC-017 the layout sizes match screen 01 (name field 40 px, idea box 200 px)', () => {
  it('F-09 AC-017 the name field is 40 px high and the idea box is nine rows of 20 px plus 9 px padding', () => {
    const styles = getProjectStepStyles(theme);
    expect(styles.nameField).toMatchObject({
      '& .MuiOutlinedInput-root': { height: 40, borderRadius: '8px' },
    });
    expect(styles.ideaField).toMatchObject({
      '& .MuiOutlinedInput-input': { lineHeight: '20px', py: '9px' },
    });
  });

  it('F-09 AC-017 the idea textarea renders the nine rows the idea box height is built on', () => {
    renderFixed(EMPTY);
    expect(IDEA_ROWS).toBe(9);
    expect(ideaInput().rows).toBe(IDEA_ROWS);
  });

  it('F-09 AC-017 the idea note box is 34 px high with a 6 px radius (screen 03)', () => {
    expect(getProjectStepStyles(theme).noteBox).toMatchObject({ height: 34, borderRadius: '6px' });
  });
});

describe('F-09 AC-017 project step styles read colours from the theme they are given', () => {
  const other = createTheme({
    palette: {
      error: { main: '#000021', dark: '#000021' },
      warning: { main: '#000023', light: '#000025', dark: '#000022' },
      grey: { 300: '#000024' },
      text: { primary: '#000026', secondary: '#000027' },
      background: { paper: '#000028' },
    },
  });

  it('the asterisk, the note text, the note box and the field outline take their colours from the theme', () => {
    const styles = getProjectStepStyles(other);
    expect(styles.required).toMatchObject({ color: '#000021' });
    expect(styles.nameNote).toMatchObject({ color: '#000022' });
    expect(styles.noteBox).toMatchObject({ bgcolor: '#000025', border: '1px solid #000023' });
    expect(styles.nameField).toMatchObject({
      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#000024' },
    });
  });

  it('the app theme gives the approved screen 03 values', () => {
    const styles = getProjectStepStyles(theme);
    expect(styles.required).toMatchObject({ color: '#BB241A' });
    expect(styles.nameNote).toMatchObject({ color: '#B84D05' });
    expect(styles.noteBox).toMatchObject({ bgcolor: '#FFFAEA', border: '1px solid #FCD34D' });
  });
});
