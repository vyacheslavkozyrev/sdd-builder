// @vitest-environment jsdom
import { ThemeProvider } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { theme } from '../src/theme.js';
import { DESCRIPTION_LABEL, NAME_LABEL, RuleBlock, duplicateMessage } from '../src/wizard/RuleBlock.js';
import type { RulePatch, RuleValues, WizardState } from '../src/wizard/state.js';
import { wizardReducer } from '../src/wizard/state.js';

const EMOJI = '\u{1F600}'; // one code point, two UTF-16 units

function codePoints(text: string): number {
  return Array.from(text).length;
}

interface BlockOptions {
  readonly duplicateOf?: number | undefined;
  readonly onChange?: (patch: RulePatch) => void;
  readonly onRemove?: () => void;
}

// One block with fixed values: the test sees what the block reports, and the values stay as passed in.
function renderBlock(rule: RuleValues, options: BlockOptions = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <RuleBlock
        blockNumber={1}
        rule={rule}
        duplicateOf={options.duplicateOf}
        onChange={options.onChange ?? (() => {})}
        onRemove={options.onRemove ?? (() => {})}
      />
    </ThemeProvider>,
  );
}

// A block whose state is held here, so the file line and the messages change as the user types.
function Controlled({
  initial,
  duplicateOf,
  onRemove = () => {},
}: {
  readonly initial: RuleValues;
  readonly duplicateOf?: number;
  readonly onRemove?: () => void;
}) {
  const [rule, setRule] = useState<RuleValues>(initial);
  const onChange = (patch: RulePatch) => {
    setRule((current) => ({ ...current, ...patch }));
  };
  return (
    <ThemeProvider theme={theme}>
      <RuleBlock
        blockNumber={1}
        rule={rule}
        duplicateOf={duplicateOf}
        onChange={onChange}
        onRemove={onRemove}
      />
    </ThemeProvider>
  );
}

function nameInput(): HTMLInputElement {
  return screen.getByRole('textbox', { name: NAME_LABEL }) as HTMLInputElement;
}

function descriptionInput(): HTMLTextAreaElement {
  return screen.getByRole('textbox', { name: DESCRIPTION_LABEL }) as HTMLTextAreaElement;
}

const BLANK: RuleValues = { name: '', description: '' };

// The next wizard state from step 2 with these rule blocks; Next moves on when it is enabled.
function nextStepWith(rules: readonly RuleValues[]): number {
  const state: WizardState = {
    step: 2,
    values: {
      name: '',
      idea: '',
      stack: { language: '', framework: '', platform: '', buildTool: '', testFramework: '' },
      architecture: '',
      rules,
    },
  };
  return wizardReducer(state, { type: 'next' }).step;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('F-10 RuleBlock caption and remove control', () => {
  it('F-10 AC-010 shows the block number and a remove control named for the block', () => {
    renderBlock({ name: 'Code Style', description: '' });
    expect(screen.getByText('Rule block 1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove rule block 1' })).toBeTruthy();
  });

  it('F-10 AC-010 calls onRemove once when the remove control is pressed', () => {
    const onRemove = vi.fn();
    renderBlock({ name: 'Code Style', description: '' }, { onRemove });
    fireEvent.click(screen.getByRole('button', { name: 'Remove rule block 1' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe('F-10 AC-013 the rule name is a single-line field limited to 100 code points', () => {
  it('F-10 AC-013 renders the name as an input element, not a multi-line field', () => {
    renderBlock(BLANK);
    expect(nameInput().tagName).toBe('INPUT');
  });

  it.each([
    [100, 100],
    [101, 100],
  ])('F-10 AC-013 %i typed code points are kept as %i', (typed, kept) => {
    const onChange = vi.fn();
    renderBlock(BLANK, { onChange });
    fireEvent.change(nameInput(), { target: { value: 'a'.repeat(typed) } });
    expect(onChange).toHaveBeenCalledWith({ name: 'a'.repeat(kept) });
  });

  it('F-10 AC-013 keeps the name as typed (no trim) and counts an emoji as one', () => {
    const onChange = vi.fn();
    renderBlock(BLANK, { onChange });
    fireEvent.change(nameInput(), { target: { value: `  ${EMOJI.repeat(100)}` } });
    const [patch] = onChange.mock.calls[0] as [RulePatch];
    expect(patch.name).toBe(`  ${EMOJI.repeat(98)}`);
    expect(codePoints(patch.name ?? '')).toBe(100);
  });
});

describe('F-10 AC-014 the file line shows the derived rule file', () => {
  it.each([
    ['Code Style', 'code-style'],
    ['Code   Style', 'code-style'],
    ['Naming & Tests!', 'naming-tests-'],
    ['Rule 2', 'rule-2'],
  ])('F-10 AC-014 shows the file line for the name %s as %s', (name, id) => {
    renderBlock({ name, description: '' });
    expect(screen.getByText(`File: .claude/rules/${id}.md`)).toBeTruthy();
  });
});

describe('F-10 AC-015 a name with no letter or digit shows the message, the block is kept', () => {
  it.each(['', '   ', '!!!'])('F-10 AC-015 shows the message for the name %j instead of a file line', (name) => {
    renderBlock({ name, description: '' });
    expect(screen.getByText('Needs a letter or digit.')).toBeTruthy();
    expect(screen.queryByText(/^File:/)).toBeNull();
  });

  it('F-10 AC-015 keeps the typed name and the message stays while the block is kept (Next stays enabled)', () => {
    render(<Controlled initial={BLANK} />);
    fireEvent.change(nameInput(), { target: { value: '!!!' } });
    expect(nameInput().value).toBe('!!!');
    expect(screen.getByText('Needs a letter or digit.')).toBeTruthy();
    expect(nextStepWith([{ name: '!!!', description: '' }])).toBe(3);
  });
});

describe('F-10 AC-016 an id that does not start with a letter shows its message', () => {
  it.each([
    ['2 tests', 'The id must start with a letter.'],
    ['  Rule', 'The id must start with a letter.'],
  ])('F-10 AC-016 shows the message for the name %j', (name, message) => {
    renderBlock({ name, description: '' });
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText(/^File:/)).toBeNull();
  });

  it('F-10 AC-016 shows the file line for Rule 2, which starts with a letter', () => {
    renderBlock({ name: 'Rule 2', description: '' });
    expect(screen.getByText('File: .claude/rules/rule-2.md')).toBeTruthy();
    expect(screen.queryByText('The id must start with a letter.')).toBeNull();
  });

  it('F-10 AC-016 keeps the block and Next stays enabled for an id that is refused', () => {
    renderBlock({ name: '2 tests', description: '' });
    expect(nextStepWith([{ name: '2 tests', description: '' }])).toBe(3);
  });
});

describe('F-10 AC-017 an id longer than 60 characters shows its message', () => {
  it.each([
    [60, false],
    [61, true],
    [100, true],
  ])('F-10 AC-017 a name of %i letters shows the message: %s', (length, refused) => {
    renderBlock({ name: 'a'.repeat(length), description: '' });
    if (refused) {
      expect(screen.getByText('The id is longer than 60 characters.')).toBeTruthy();
      expect(screen.queryByText(/^File:/)).toBeNull();
    } else {
      expect(screen.getByText(`File: .claude/rules/${'a'.repeat(length)}.md`)).toBeTruthy();
    }
  });
});

describe('F-10 AC-018 the file line or message follows the name as typed', () => {
  it('F-10 AC-018 shows the file line for each step of typing A then Ab', () => {
    render(<Controlled initial={BLANK} />);
    fireEvent.change(nameInput(), { target: { value: 'A' } });
    expect(screen.getByText('File: .claude/rules/a.md')).toBeTruthy();
    fireEvent.change(nameInput(), { target: { value: 'Ab' } });
    expect(screen.getByText('File: .claude/rules/ab.md')).toBeTruthy();
  });

  it('F-10 AC-018 shows the message for 2, then the file line for Rule 2, with no stale message', () => {
    render(<Controlled initial={BLANK} />);
    fireEvent.change(nameInput(), { target: { value: '2' } });
    expect(screen.getByText('The id must start with a letter.')).toBeTruthy();
    fireEvent.change(nameInput(), { target: { value: 'Rule 2' } });
    expect(screen.getByText('File: .claude/rules/rule-2.md')).toBeTruthy();
    expect(screen.queryByText('The id must start with a letter.')).toBeNull();
  });
});

describe('F-10 AC-019 a duplicate id shows the duplicate message', () => {
  it('F-10 AC-019 shows the duplicate message naming the other block when the list flags it', () => {
    renderBlock({ name: 'code style', description: '' }, { duplicateOf: 2 });
    expect(screen.getByText(duplicateMessage(2))).toBeTruthy();
    expect(screen.getByText('File: .claude/rules/code-style.md')).toBeTruthy();
  });

  it('F-10 AC-019 shows no duplicate message for a unique id', () => {
    renderBlock({ name: 'Code Style', description: '' });
    expect(screen.queryByText(/Same file as rule block/)).toBeNull();
  });

  it('F-10 AC-019 shows only the id message, not a duplicate message, for a refused id', () => {
    renderBlock({ name: '!!!', description: '' });
    expect(screen.getByText('Needs a letter or digit.')).toBeTruthy();
    expect(screen.queryByText(/Same file as rule block/)).toBeNull();
  });
});

describe('F-10 AC-020 the description is a multi-line field limited to 1,000 code points', () => {
  it('F-10 AC-020 renders the description as a multi-line field', () => {
    renderBlock(BLANK);
    expect(descriptionInput().tagName).toBe('TEXTAREA');
  });

  it.each([
    [999, 999],
    [1000, 1000],
    [1001, 1000],
  ])('F-10 AC-020 %i typed code points are kept as %i', (typed, kept) => {
    const onChange = vi.fn();
    renderBlock(BLANK, { onChange });
    fireEvent.change(descriptionInput(), { target: { value: 'a'.repeat(typed) } });
    expect(onChange).toHaveBeenCalledWith({ description: 'a'.repeat(kept) });
  });

  it('F-10 AC-020 counts an emoji as one code point when cutting', () => {
    const onChange = vi.fn();
    renderBlock(BLANK, { onChange });
    fireEvent.change(descriptionInput(), { target: { value: EMOJI.repeat(1001) } });
    const [patch] = onChange.mock.calls[0] as [RulePatch];
    expect(codePoints(patch.description ?? '')).toBe(1000);
  });

  it('F-10 AC-020 keeps the line break typed with Enter in the stored value', () => {
    const onChange = vi.fn();
    renderBlock(BLANK, { onChange });
    fireEvent.change(descriptionInput(), { target: { value: 'First line\nSecond line' } });
    expect(onChange).toHaveBeenCalledWith({ description: 'First line\nSecond line' });
  });

  it('F-10 AC-020 a blank description is kept as typed and does not block Next', () => {
    const onChange = vi.fn();
    renderBlock({ name: 'Code Style', description: 'Old text' }, { onChange });
    fireEvent.change(descriptionInput(), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ description: '' });
    expect(nextStepWith([{ name: 'Code Style', description: '' }])).toBe(3);
  });
});
